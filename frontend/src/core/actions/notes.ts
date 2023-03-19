import { notesDataModelMock } from "../../data-model/mock/notesMock";
import { NotesDataModel } from "../../data-model/notes";
import { fetchJsonReceive, fetchJsonSendAndReceive } from "../fetch-utils";
import { notesEndpoint } from "../urls-and-end-points";

const getNotes = (): Promise<NotesDataModel> => 
  fetchJsonReceive<NotesDataModel>(notesEndpoint, notesDataModelMock());

const sendNotes = (data: NotesDataModel) => 
  fetchJsonSendAndReceive<NotesDataModel>(notesEndpoint, data, notesDataModelMock());

export const NotesActions = { getNotes, sendNotes };
