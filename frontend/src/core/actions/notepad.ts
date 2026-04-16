import { fetchJsonSendAndReceive } from "../fetch-utils";
import { sendToTelegramEndpoint, sendFileToTelegramEndpoint } from "../urls-and-end-points";
import { ConfigurationService } from "../../service/configuration/configuration.service";

const sendTextToTelegram = (text: string) =>
  fetchJsonSendAndReceive<{ text: string }>(sendToTelegramEndpoint(), {text}, { text: 'Write what you want' });

const sendFileToTelegram = (file: File): Promise<{ isSended: boolean }> => {
  if (ConfigurationService.Instance.isUsingMocks) {
    return Promise.resolve({ isSended: true });
  }
  const formData = new FormData();
  formData.append('file', file, file.name);
  return fetch(sendFileToTelegramEndpoint(), {
    method: 'POST',
    body: formData,
  }).then(res => res.json());
};

export const NotepadActions = { sendTextToTelegram, sendFileToTelegram };
