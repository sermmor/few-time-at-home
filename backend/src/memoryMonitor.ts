import { appendFile, mkdir, rename, stat } from 'fs/promises';
import { getHeapStatistics } from 'v8';
import { WorkerChildParentHandle } from './workerModule/workersManager/workerChildParentHandle';
import { WorkerManager } from './workerModule/workersManager/workerManager';
import { WebSocketsServerService } from './webSockets/webSocketsServer.service';

// Monitor de memoria: cada cierto tiempo escribe en consola y en
// logs/memory.log (gitignored) el uso de memoria del proceso, los workers
// vivos, los gather pendientes y los clientes websocket. Sirve para localizar
// la fuga que acaba cerrando el backend tras varios días en la Raspberry:
// la métrica que no para de crecer apunta al culpable.

const LOG_DIR = 'logs';
const LOG_PATH = `${LOG_DIR}/memory.log`;
const MAX_LOG_BYTES = 2 * 1024 * 1024; // al pasar de 2 MB se rota a memory.log.old
const INTERVAL_MS = 6 * 60 * 60 * 1000;

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)}MB`;

const buildLine = (): string => {
  const mem = process.memoryUsage();
  const heapLimit = getHeapStatistics().heap_size_limit;
  const heapPct = ((mem.heapUsed / heapLimit) * 100).toFixed(1);

  let wsClients = -1;
  let wsBuffered = 0;
  const wss = WebSocketsServerService.Instance?.wss;
  if (wss) {
    wsClients = wss.clients.size;
    wss.clients.forEach((c) => { wsBuffered += c.bufferedAmount; });
  }

  const uptimeH = (process.uptime() / 3600).toFixed(1);
  return `${new Date().toISOString()} uptime=${uptimeH}h`
    + ` rss=${mb(mem.rss)} heapUsed=${mb(mem.heapUsed)} heapTotal=${mb(mem.heapTotal)}`
    + ` heapLimit=${mb(heapLimit)} (${heapPct}%) external=${mb(mem.external)}`
    + ` arrayBuffers=${mb(mem.arrayBuffers)}`
    + ` workers=${WorkerChildParentHandle.liveWorkers} pendingGathers=${WorkerManager.pendingGathers}`
    + ` wsClients=${wsClients} wsBuffered=${mb(wsBuffered)}`;
};

const writeLine = async (line: string): Promise<void> => {
  try {
    await mkdir(LOG_DIR, { recursive: true });
    try {
      const { size } = await stat(LOG_PATH);
      if (size > MAX_LOG_BYTES) await rename(LOG_PATH, `${LOG_PATH}.old`);
    } catch { /* el fichero aún no existe */ }
    await appendFile(LOG_PATH, line + '\n');
  } catch (e: any) {
    console.error(`> [memory] No se pudo escribir ${LOG_PATH}: ${e?.message ?? e}`);
  }
};

const logMemory = (): void => {
  try {
    const line = buildLine();
    console.log(`> [memory] ${line}`);
    void writeLine(line);
  } catch (e: any) {
    console.error(`> [memory] Error al medir la memoria: ${e?.message ?? e}`);
  }
};

export const startMemoryMonitor = (): void => {
  logMemory();
  // unref: el temporizador no mantiene vivo el proceso por sí solo
  setInterval(logMemory, INTERVAL_MS).unref();
};
