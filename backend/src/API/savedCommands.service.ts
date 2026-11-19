import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { randomUUID } from 'crypto';

/** Ruta del fichero con los comandos guardados por el usuario (se incluye en el backup semanal). */
export const SAVED_COMMANDS_PATH = 'data/config/savedCommands.json';

export interface SavedCommand {
  id: string;
  name: string;
  command: string;
}

/**
 * Comandos personalizados de la sección "Línea de comandos" de Configuración.
 * Se guardan en data/config/savedCommands.json. Lectura perezosa: el fichero
 * puede no existir todavía (primer uso), en cuyo caso la lista está vacía.
 */
export class SavedCommandsService {
  static Instance: SavedCommandsService;

  private commands: SavedCommand[] | null = null;

  constructor() {
    SavedCommandsService.Instance = this;
  }

  getAll = (): SavedCommand[] => this.load();

  /** Crea un comando nuevo, o actualiza uno existente si llega con `id`. */
  save = (data: { id?: string; name?: string; command?: string }): SavedCommand[] => {
    const command = (data.command ?? '').trim();
    if (!command) return this.load();
    const name = (data.name ?? '').trim() || command;
    const list = this.load();
    const index = data.id ? list.findIndex(c => c.id === data.id) : -1;
    if (index >= 0) {
      list[index] = { ...list[index], name, command };
    } else {
      list.push({ id: randomUUID(), name, command });
    }
    this.persist();
    return list;
  };

  remove = (id: string): SavedCommand[] => {
    this.commands = this.load().filter(c => c.id !== id);
    this.persist();
    return this.commands;
  };

  /** Fuerza una relectura del disco (p. ej. tras importar un zip de sincronización). */
  reloadFromDisk = (): void => {
    this.commands = null;
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
