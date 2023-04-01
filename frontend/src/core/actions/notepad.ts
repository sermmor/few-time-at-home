import { fetchJsonSendAndReceive } from "../fetch-utils";
import { sendToTelegramEndpoint } from "../urls-and-end-points";

const sendTextToTelegram = (text: string) => 
  fetchJsonSendAndReceive<{ text: string }>(sendToTelegramEndpoint(), {text}, { text: 'Write what you want' });

export const NotepadActions = { sendTextToTelegram };
