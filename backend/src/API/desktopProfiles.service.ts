import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';

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

  private profiles       = new Map<string, DesktopConfig>();
  private activeProfile  = DEFAULT_PROFILE;
  private remoteProfiles = new Set<string>();
  /**
   * Names of profiles whose in-memory config has been modified by the frontend
   * since the last pull from Google Drive. Used by /desktop/flush to decide
   * whether to push to Drive — pushing a non-dirty profile can overwrite
   * Drive-side changes made by another client (e.g. the Flutter desktop app)
   * when our in-memory copy is still the stale-on-disk version loaded at boot.
   */
  private dirtyProfiles  = new Set<string>();

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

  private _saveMeta(): void {
    writeFileSync(META_FILE, JSON.stringify({
      activeProfile:  this.activeProfile,
      remoteProfiles: Array.from(this.remoteProfiles),
    }, null, 2), 'utf8');
  }

  private _loadAll(): void {
    // Load meta
    try {
      const meta = JSON.parse(readFileSync(META_FILE, 'utf8'));
      this.activeProfile = (typeof meta.activeProfile === 'string' && meta.activeProfile)
        ? meta.activeProfile
        : DEFAULT_PROFILE;
      this.remoteProfiles = new Set(Array.isArray(meta.remoteProfiles) ? meta.remoteProfiles : []);
    } catch {
      this.activeProfile  = DEFAULT_PROFILE;
      this.remoteProfiles = new Set();
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

  /** Returns profiles with their metadata (name + tabletMode + isRemote). */
  listProfilesWithMeta = (): { name: string; tabletMode: boolean; isRemote: boolean }[] =>
    this.listProfiles().map(name => ({
      name,
      tabletMode: this.profiles.get(name)?.tabletMode ?? false,
      isRemote:   this.remoteProfiles.has(name),
    }));

  isProfileRemote = (name: string): boolean => this.remoteProfiles.has(name);

  // ── Dirty tracking ────────────────────────────────────────────────────────
  // Marked by the /configuration save endpoint after a user-initiated edit;
  // cleared by /configuration/type/list after a successful pull from Drive
  // (or after a flush has just pushed the dirty state up).
  markActiveDirty  = (): void => { this.dirtyProfiles.add(this.activeProfile); };
  clearActiveDirty = (): void => { this.dirtyProfiles.delete(this.activeProfile); };
  isActiveDirty    = (): boolean => this.dirtyProfiles.has(this.activeProfile);

  getActiveConfig = (): DesktopConfig =>
    this.profiles.get(this.activeProfile) ?? { ...EMPTY_CONFIG };

  setActiveConfig = (config: DesktopConfig): void => {
    this.profiles.set(this.activeProfile, config);
  };

  /** Returns the config of any profile by name, or undefined if not found. */
  getProfileConfig = (name: string): DesktopConfig | undefined =>
    this.profiles.get(name);

  /** Overwrites the in-memory config for a profile and immediately flushes it to disk. */
  saveProfileConfig = (name: string, config: DesktopConfig): void => {
    if (!this.profiles.has(name)) return;
    this.profiles.set(name, config);
    writeFileSync(`${DESKTOP_DIR}/${name}.json`, JSON.stringify(config, null, 2), 'utf8');
    console.log(`[Desktop] Saved updated config for profile "${name}" to disk.`);
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

  createProfile = (name: string, tabletMode = false, isRemote = false): { ok: boolean; error?: string } => {
    const safe = name.trim().replace(/[^a-zA-Z0-9_\-]/g, '_');
    if (!safe)                      return { ok: false, error: 'invalid_name' };
    if (this.profiles.has(safe))    return { ok: false, error: 'already_exists' };

    const config: DesktopConfig = { ...EMPTY_CONFIG, wallpapers: Array(16).fill(''), tabletMode };
    this.profiles.set(safe, config);
    writeFileSync(`${DESKTOP_DIR}/${safe}.json`, JSON.stringify(config, null, 2), 'utf8');
    if (isRemote) this.remoteProfiles.add(safe);
    this._saveMeta();
    console.log(`[Desktop] Created profile "${safe}" (tabletMode=${tabletMode}, isRemote=${isRemote}).`);
    return { ok: true };
  };

  /**
   * Imports a profile that was discovered from Google Drive.
   * Unlike createProfile, it accepts a full config and does NOT reset the active profile.
   */
  importProfile = (name: string, config: DesktopConfig): void => {
    const safe = name.trim().replace(/[^a-zA-Z0-9_\-]/g, '_');
    if (!safe) return;
    this.profiles.set(safe, config);
    writeFileSync(`${DESKTOP_DIR}/${safe}.json`, JSON.stringify(config, null, 2), 'utf8');
    this.remoteProfiles.add(safe);
    this._saveMeta();
    console.log(`[Desktop] Imported remote profile "${safe}" from GDrive.`);
  };

  /**
   * Duplicates a local (non-remote) profile under a new name.
   * The new profile gets an identical config; it is created as a local profile.
   * Returns an error if the source doesn't exist, is remote, or the target name is taken.
   */
  duplicateProfile = (sourceName: string, newName: string): { ok: boolean; error?: string } => {
    const safe = newName.trim().replace(/[^a-zA-Z0-9_\-]/g, '_');
    if (!safe)                           return { ok: false, error: 'invalid_name' };
    if (!this.profiles.has(sourceName))  return { ok: false, error: 'source_not_found' };
    if (this.remoteProfiles.has(sourceName)) return { ok: false, error: 'source_is_remote' };
    if (this.profiles.has(safe))         return { ok: false, error: 'already_exists' };

    const sourceConfig = this.profiles.get(sourceName)!;
    // Deep-clone so the two profiles are fully independent
    const cloned: DesktopConfig = JSON.parse(JSON.stringify(sourceConfig));
    this.profiles.set(safe, cloned);
    writeFileSync(`${DESKTOP_DIR}/${safe}.json`, JSON.stringify(cloned, null, 2), 'utf8');
    this._saveMeta();
    console.log(`[Desktop] Duplicated profile "${sourceName}" → "${safe}".`);
    return { ok: true };
  };

  /**
   * Converts an existing local profile to a remote profile.
   * Returns an error if the profile does not exist or is already remote.
   * This operation cannot be undone from the app.
   */
  makeProfileRemote = (name: string): { ok: boolean; error?: string } => {
    if (!this.profiles.has(name))      return { ok: false, error: 'not_found' };
    if (this.remoteProfiles.has(name)) return { ok: false, error: 'already_remote' };
    this.remoteProfiles.add(name);
    this._saveMeta();
    console.log(`[Desktop] Profile "${name}" converted to remote.`);
    return { ok: true };
  };

  /**
   * Deletes a profile: removes it from memory, deletes its JSON file from disk
   * and strips it from remoteProfiles if needed.
   * The active profile and the "default" profile cannot be deleted.
   * Returns wasRemote=true when callers must also clean up GDrive.
   */
  deleteProfile = (name: string): { ok: boolean; error?: string; wasRemote?: boolean } => {
    if (name === DEFAULT_PROFILE)      return { ok: false, error: 'cannot_delete_default' };
    if (name === this.activeProfile)   return { ok: false, error: 'cannot_delete_active' };
    if (!this.profiles.has(name))      return { ok: false, error: 'not_found' };

    const wasRemote = this.remoteProfiles.has(name);
    this.profiles.delete(name);
    this.remoteProfiles.delete(name);

    const filePath = `${DESKTOP_DIR}/${name}.json`;
    if (existsSync(filePath)) {
      try { unlinkSync(filePath); } catch (e) {
        console.error(`[Desktop] Failed to delete profile file "${filePath}":`, e);
      }
    }

    this._saveMeta();
    console.log(`[Desktop] Deleted profile "${name}" (wasRemote=${wasRemote}).`);
    return { ok: true, wasRemote };
  };

  activateProfile = (name: string): { ok: boolean; error?: string } => {
    if (!this.profiles.has(name)) return { ok: false, error: 'not_found' };
    // Persist the currently active profile before switching
    this.flushActiveToDisk();
    this.activeProfile = name;
    this._saveMeta();
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
