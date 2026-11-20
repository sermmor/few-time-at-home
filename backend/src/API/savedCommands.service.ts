import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { randomUUID } from 'crypto';
import { exec } from 'child_process';
import { Job, scheduleJob } from 'node-schedule';

/** Ruta del fichero con los comandos guardados por el usuario (se incluye en el backup semanal). */
export const SAVED_COMMANDS_PATH = 'data/config/savedCommands.json';

export interface SavedCommand {
  id: string;
  name: string;
  command: string;
  /**
   * Hora opcional "HH:MM" (hora local de la máquina). Si existe, el comando se
   * ejecuta automáticamente cada día a esa hora. Ausente = sólo manual.
   */
  time?: string;
}

/** Valida y normaliza una hora "H:MM"/"HH:MM" a "HH:MM"; devuelve null si no es válida. */
export const normalizeCommandTime = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

/**
 * Comandos personalizados de la sección "Línea de comandos" de Configuración.
 * Se guardan en data/config/savedCommands.json. Lectura perezosa: el fichero
 * puede no existir todavía (primer uso), en cuyo caso la lista está vacía.
 *
 * Los comandos con `time` se programan con node-schedule para ejecutarse a
 * diario a esa hora. La programación se rehace al guardar, borrar o recargar.
 */
export class SavedCommandsService {
  static Instance: SavedCommandsService;

  private commands: SavedCommand[] | null = null;
  /** Trabajos programados, por id de comando. */
  private jobs = new Map<string, Job>();

  constructor() {
    SavedCommandsService.Instance = this;
  }

  getAll = (): SavedCommand[] => this.load();

  /**
   * Crea un comando nuevo, o actualiza uno existente si llega con `id`.
   * `time`: "HH:MM" programa el comando; cadena vacía/inválida lo desprograma;
   * si no viene en el body, se conserva la hora que tuviera.
   */
  save = (data: { id?: string; name?: string; command?: string; time?: string }): SavedCommand[] => {
    const command = (data.command ?? '').trim();
    if (!command) return this.load();
    const name = (data.name ?? '').trim() || command;
    const list = this.load();
    const index = data.id ? list.findIndex(c => c.id === data.id) : -1;
    const base: SavedCommand = index >= 0 ? { ...list[index], name, command } : { id: randomUUID(), name, command };
    if ('time' in data) {
      const time = normalizeCommandTime(data.time);
      // No se escribe `time` si no hay hora: los ficheros antiguos quedan igual
      if (time) base.time = time; else delete base.time;
    }
    if (index >= 0) list[index] = base; else list.push(base);
    this.persist();
    this.reschedule();
    return list;
  };

  remove = (id: string): SavedCommand[] => {
    this.commands = this.load().filter(c => c.id !== id);
    this.persist();
    this.reschedule();
    return this.commands;
  };

  /** Fuerza una relectura del disco (p. ej. tras importar un zip de sincronización). */
  reloadFromDisk = (): void => {
    this.commands = null;
    this.reschedule();
  };

  /** Programa los comandos con hora. Se llama una vez al arrancar el backend. */
  startScheduler = (): void => {
    this.reschedule();
  };

  /** Cancela todos los trabajos y vuelve a crear uno por cada comando con hora válida. */
  private reschedule = (): void => {
    try {
      this.jobs.forEach(job => job.cancel());
      this.jobs.clear();
      for (const cmd of this.load()) {
        const time = normalizeCommandTime(cmd.time);
        if (!time) continue;
        const [hours, minutes] = time.split(':').map(Number);
        const job = scheduleJob(`${minutes} ${hours} * * *`, () => this.runScheduled(cmd.id));
        if (job) this.jobs.set(cmd.id, job);
      }
      if (this.jobs.size > 0) {
        console.log(`[SavedCommands] ${this.jobs.size} comando(s) programado(s)`);
      }
    } catch (e) {
      console.error('[SavedCommands] No se pudieron programar los comandos:', e);
    }
  };

  /** Ejecuta el comando programado (releído por id, por si cambió) y registra el resultado. */
  private runScheduled = (id: string): void => {
    const cmd = this.load().find(c => c.id === id);
    if (!cmd) return;
    console.log(`[SavedCommands] Ejecutando "${cmd.name}" (${cmd.time}): ${cmd.command}`);
    try {
      exec(cmd.command, (err, stdout, stderr) => {
        if (err) {
          console.error(`[SavedCommands] "${cmd.name}" falló:`, err.message);
        } else {
          const output = (stdout || stderr || '').trim();
          console.log(`[SavedCommands] "${cmd.name}" terminado${output ? `: ${output.slice(0, 500)}` : ''}`);
        }
      });
    } catch (e) {
      console.error(`[SavedCommands] "${cmd.name}" no se pudo lanzar:`, e);
    }
  };

  private load = (): SavedCommand[] => {
    if (this.commands) return this.commands;
    try {
      if (existsSync(SAVED_COMMANDS_PATH)) {
        const parsed = JSON.parse(readFileSync(SAVED_COMMANDS_PATH, 'utf-8'));
        this.commands = Array.isArray(parsed) ? parsed : [];
      } else {
        this.commands = [];
      }
    } catch (e) {
      console.error('[SavedCommands] No se pudo leer el fichero de comandos:', e);
      this.commands = [];
    }
    return this.commands;
  };

  private persist = (): void => {
    try {
      mkdirSync(dirname(SAVED_COMMANDS_PATH), { recursive: true });
      writeFileSync(SAVED_COMMANDS_PATH, JSON.stringify(this.commands ?? [], null, 2));
    } catch (e) {
      console.error('[SavedCommands] No se pudo guardar el fichero de comandos:', e);
    }
  };
}
