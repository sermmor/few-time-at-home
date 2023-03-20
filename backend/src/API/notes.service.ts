import { readFile, readFileSync } from "fs";
import { saveInAFile } from "../utils";

const pathNotesFile = 'data/notes.txt';
const notesSeparator = '---***---';

export class NotesService {
  static Instance: NotesService;
  notes: string[];

  constructor() {
    this.notes = [];
    NotesService.Instance = this;
  }

  getNotes = (): Promise<string[]> => new Promise<string[]>(resolve => {
    if (this.notes.length > 0) {
      resolve(this.notes);
    } else {
      const data = readFileSync(pathNotesFile, 'utf-8');
      this.notes = data.split(notesSeparator);
      resolve(this.notes);
    }
  });

  addNotes = (newNote: string): Promise<string[]> => new Promise<string[]>(resolve => {
    if (this.notes.length > 0) {
      this.notes.push(newNote);
      this.saveNotes().then((newNoteList) => resolve(newNoteList));
    } else {
      this.getNotes().then(() => {
        this.notes.push(newNote);
        this.saveNotes().then((newNoteList) => resolve(newNoteList));
      });
    }
  });

  updateNotes = (notes: string[]): Promise<string[]> => new Promise<string[]>(resolve => {
    if (this.notes.length > 0) {
      this.notes = notes;
      this.saveNotes().then((newNoteList) => resolve(newNoteList));
    } else {
      this.getNotes().then(() => {
        this.notes = notes;
        this.saveNotes().then((newNoteList) => resolve(newNoteList));
      });
    }
  });

  saveNotes = (): Promise<string[]> => new Promise<string[]>(resolve => {
    const noteFileContent = this.notes.join(notesSeparator);
    saveInAFile(noteFileContent, pathNotesFile);
    resolve(this.notes);
    console.log("> Notes saved!");
  });
}