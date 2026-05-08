import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';

const DESKTOP_DIR     = 'data/config/desktop';
const META_FILE       = 'data/config/desktopMeta.json';
const DEFAULT_PROFILE = 'default';

interface DesktopConfig {
  rows:        number;
  cols:        number;
  wallpapers:  string[];
  notes:       any[];
  links:       any[];
  tabletMode?: boolean;
}

const EMPTY_CONFIG: DesktopConfig = {
  rows:       4,
  cols:       4,
  wallpapers: Array(16).fill(''),
  notes:      [],
  links:      [],
  tabletMode: false,
};

// ── DesktopProfilesService ────────────────────────────────────────────────────

export class DesktopProfilesService {
  static Instance: DesktopProfilesService;

  private profiles      = new Map<string, DesktopConfig>();
  private activeProfile = DEFAULT_PROFILE;

  constructor() {
    DesktopProfilesService.Instance = this;
    this._ensureAndMigrate();
    this._loadAll();
    console.log(`[Desktop] Service ready. Active profile: "${this.activeProfile}". Profiles: [${this.listProfiles().join(', ')}]`);
  }

  // ── Init helpers ──────────────────────────────────────────────────────────

  private _ensureAndMigrate(): void {
    if (!existsSync(DESKTOP_DIR)) {
      mkdirSync(DESKTOP_DIR, { recursive: true });
    }

    // One-time migration: old data/config/desktop.json → desktop/default.json
    const oldFile     = 'data/config/desktop.json';
    const defaultFile = `${DESKTOP_DIR}/${DEFAULT_PROFILE}.json`;
    if (existsSync(oldFile) && !existsSync(defaultFile)) {
      try {
        const data = JSON.parse(readFileSync(oldFile, 'utf8'));
        writeFileSync(defaultFile, JSON.stringify(data, null, 2), 'utf8');
        console.log('[Desktop] Migrated desktop.json → desktop/default.json');
      } catch (e) {
        console.error('[Desktop] Migration error:', e);
      }
    }

    // Always guarantee the default profile file exists
    if (!existsSync(defaultFile)) {
      writeFileSync(defaultFile, JSON.stringify(EMPTY_CONFIG, null, 2), 'utf8');
    }

    // Always guarantee the meta file exists
    if (!existsSync(META_FILE)) {
      writeFileSync(META_FILE, JSON.stringify({ activeProfile: DEFAULT_PROFILE }, null, 2), 'utf8');
    }
  }

  private _loadAll(): void {
    // Load meta
    try {
      const meta = JSON.parse(readFileSync(META_FILE, 'utf8'));
      this.activeProfile = (typeof meta.activeProfile === 'string' && meta.activeProfile)
        ? meta.activeProfile
        : DEFAULT_PROFILE;
    } catch {
      this.activeProfile = DEFAULT_PROFILE;
    }

    // Load all *.json files from the desktop directory
    for (const file of readdirSync(DESKTOP_DIR).filter(f => f.endsWith('.json'))) {
      const name = file.slice(0, -5);
      try {
        const data = JSON.parse(readFileSync(`${DESKTOP_DIR}/${file}`, 'utf8'));
        this.profiles.set(name, data);
      } catch {
        console.error(`[Desktop] Failed to load profile "${name}"`);
      }
    }

    // Fallback: if the active profile wasn't found, reset to default
    if (!this.profiles.has(this.activeProfile)) {
      console.warn(`[Desktop] Active profile "${this.activeProfile}" not found — resetting to "default".`);
      this.activeProfile = DEFAULT_PROFILE;
    }

    // Guarantee the default profile is always in the map
    if (!this.profiles.has(DEFAULT_PROFILE)) {
      this.profiles.set(DEFAULT_PROFILE, { ...EMPTY_CONFIG });
      writeFileSync(
        `${DESKTOP_DIR}/${DEFAULT_PROFILE}.json`,
        JSON.stringify(EMPTY_CONFIG, null, 2),
        'utf8',
      );
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  getActiveProfileName = (): string => this.activeProfile;

  /** Returns profile names sorted: "default" first, then alphabetically. */
  listProfiles = (): string[] =>
    Array.from(this.profiles.keys()).sort((a, b) => {
      if (a === DEFAULT_PROFILE) return -1;
      if (b === DEFAULT_PROFILE) return 1;
      return a.localeCompare(b);
    });

  /** Returns profiles with their metadata (name + tabletMode). */
  listProfilesWithMeta = (): { name: string; tabletMode: boolean }[] =>
    this.listProfiles().map(name => ({
      name,
      tabletMode: this.profiles.get(name)?.tabletMode ?? false,
    }));

  getActiveConfig = (): DesktopConfig =>
    this.profiles.get(this.activeProfile) ?? { ...EMPTY_CONFIG };

  setActiveConfig = (config: DesktopConfig): void => {
    this.profiles.set(this.activeProfile, config);
  };

  flushActiveToDisk = (): void => {
    const config = this.profiles.get(this.activeProfile);
    if (config !== undefined) {
      writeFileSync(
        `${DESKTOP_DIR}/${this.activeProfile}.json`,
        JSON.stringify(config, null, 2),
        'utf8',
      );
      console.log(`[Desktop] Flushed profile "${this.activeProfile}" to disk.`);
    }
  };

  createProfile = (name: string, tabletMode = false): { ok: boolean; error?: string } => {
    const safe = name.trim().replace(/[^a-zA-Z0-9_\-]/g, '_');
    if (!safe)                      return { ok: false, error: 'invalid_name' };
    if (this.profiles.has(safe))    return { ok: false, error: 'already_exists' };

    const config: DesktopConfig = { ...EMPTY_CONFIG, wallpapers: Array(16).fill(''), tabletMode };
    this.profiles.set(safe, config);
    writeFileSync(
      `${DESKTOP_DIR}/${safe}.json`,
      JSON.stringify(config, null, 2),
      'utf8',
    );
    console.log(`[Desktop] Created profile "${safe}" (tabletMode=${tabletMode}).`);
    return { ok: true };
  };

  activateProfile = (name: string): { ok: boolean; error?: string } => {
    if (!this.profiles.has(name)) return { ok: false, error: 'not_found' };
    // Persist the currently active profile before switching
    this.flushActiveToDisk();
    this.activeProfile = name;
    writeFileSync(META_FILE, JSON.stringify({ activeProfile: name }, null, 2), 'utf8');
    console.log(`[Desktop] Active profile switched to "${name}".`);
    return { ok: true };
  };

  /**
   * Reload all profile data from disk.
   * Called by SynchronizeService after a zip import overwrites data/.
   */
  reloadFromDisk = (): void => {
    this.profiles.clear();
    this._loadAll();
    console.log(`[Desktop] Reloaded from disk. Active profile: "${this.activeProfile}". Profiles: [${this.listProfiles().join(', ')}]`);
  };

  /** Returns all profile file paths (for backup). */
  getProfileFilePaths = (): { src: string; dst: string }[] =>
    this.listProfiles().map(name => ({
      src: `${DESKTOP_DIR}/${name}.json`,
      dst: `desktop/${name}.json`,
    }));
}
