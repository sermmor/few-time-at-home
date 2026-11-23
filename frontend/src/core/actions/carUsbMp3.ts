import { carUsbStatusMock } from "../../data-model/mock/mp3ConverterMock";
import { CarUsbStartResponse, CarUsbStatus } from "../../data-model/mp3Converter";
import { ConfigurationService } from "../../service/configuration/configuration.service";
import { fetchJsonReceive } from "../fetch-utils";
import { carUsbMp3CancelEndpoint, carUsbMp3StartEndpoint, carUsbMp3StatusEndpoint } from "../urls-and-end-points";
import { CloudActions } from "./cloud";

// POST con captura de errores: si el backend no responde se devuelve el mock en vez de colgar la promesa.
const postJson = <T>(url: string, data: any, mock: T): Promise<T> => {
  if (ConfigurationService.Instance.isUsingMocks) return Promise.resolve(mock);
  return fetch(url, {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
    .then(res => res.ok ? res.json() : mock)
    .then(json => json ?? mock)
    .catch(() => mock);
};

const start = (items: string[], bitrate: number) =>
  postJson<CarUsbStartResponse>(carUsbMp3StartEndpoint(), { items, bitrate }, { ok: false, message: 'Backend no disponible' });

const getStatus = (logFrom: number) =>
  fetchJsonReceive<CarUsbStatus>(carUsbMp3StatusEndpoint(logFrom), carUsbStatusMock());

const cancel = () =>
  postJson<{ ok: boolean }>(carUsbMp3CancelEndpoint(), {}, { ok: false });

/** Descarga el zip resultante con la descarga nativa del navegador. */
const downloadZip = (zipPath: string) =>
  CloudActions.downloadFile({ drive: zipPath.split('/')[0], path: zipPath });

export const CarUsbMp3Actions = { start, getStatus, cancel, downloadZip };
