import { WebSocketServer, WebSocket } from 'ws';
import { ConfigurationService } from '../API';

interface WebSocketData {
  rssAutoUpdateMessage: string;
  rssSaveMessage: string;
}

export class WebSocketsServerService {
  static Instance: WebSocketsServerService;

  wss: WebSocketServer;

  webSocketData: WebSocketData = {
    rssAutoUpdateMessage: '',
    rssSaveMessage: '',
  };

  constructor() {
    WebSocketsServerService.Instance = this;
    this.wss = new WebSocketServer({ port: ConfigurationService.Instance.webSocketPort });

    this.wss.on('connection', (ws) => {
      // Send the current data snapshot to the newly connected client.
      if (this.webSocketData) {
        ws.send(JSON.stringify(this.webSocketData));
      }

      ws.on('close', () => {
        console.log('WebSocket client disconnected');
      });
    });
  }

  /** Sends newData to every currently-open client. */
  updateData = (newData: WebSocketData): void => {
    this.webSocketData = newData;
    this._sendToAll(JSON.stringify(newData));
  };

  /**
   * Send an arbitrary JSON payload to every connected client.
   * Replaces the old single-client `this.ws` approach so that the UI
   * receives messages even when the browser has opened more than one
   * WebSocket connection (e.g. after a React re-render creates a second
   * WebSocketClientService instance).
   */
  broadcast = (data: object): void => {
    this._sendToAll(JSON.stringify(data));
  };

  private _sendToAll(json: string): void {
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(json);
      }
    });
  }
}
