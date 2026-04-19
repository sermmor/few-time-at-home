import { WebSocketServer, WebSocket } from 'ws';
import { ConfigurationService } from '../API';

interface WebSocketData {
  rssAutoUpdateMessage: string;
  rssSaveMessage: string;
}

export class WebSocketsServerService {
  static Instance: WebSocketsServerService;

  wss: WebSocketServer;

  ws: WebSocket | undefined;
  
  webSocketData: WebSocketData = {
    rssAutoUpdateMessage: '',
    rssSaveMessage: '',
  };

  constructor() {
    WebSocketsServerService.Instance = this;
    this.wss = new WebSocketServer({ port: ConfigurationService.Instance.webSocketPort });

    this.wss.on('connection', (ws) => {
      this.ws = ws;

      if (this.webSocketData) {
        ws.send(JSON.stringify(this.webSocketData));
      }

      ws.on('close', () => {
        console.log('Client disconnected');
      });
    });
  }

  updateData = (newData: WebSocketData): void => {
    this.webSocketData = newData;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(this.webSocketData));
    } else {
      console.warn('WebSocket is not open. Cannot send data.');
    }
  };

  /**
   * Send an arbitrary JSON payload to the active client.
   * Uses the same `this.ws` reference as updateData(), which is proven to work.
   */
  broadcast = (data: object): void => {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  };
}
