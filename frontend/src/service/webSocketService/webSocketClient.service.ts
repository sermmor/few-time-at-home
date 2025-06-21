interface WebSocketData {
  rssAutoUpdateMessage: string;
}

export class WebSocketClientService {
  static Instance: WebSocketClientService;

  socket: WebSocket;

  webSocketData: WebSocketData = {
    rssAutoUpdateMessage: '',
  };

  onUpdateData: ((webSocketData: WebSocketData) => void)[];

  constructor(
    url: string,
    onClose: () => void,
  ) {
    WebSocketClientService.Instance = this;
    this.onUpdateData = [];
    this.socket = new WebSocket(url);
    
    console.log("CREADO CLIENT", this.socket)
    this.socket.onopen = () => {
      console.log("Connected to WebSocket");
    };

    this.updatingData();

    this.socket.onclose = () => {
      console.log("Disconnected to WebSocket");
      onClose();
    };

    this.socket.onerror = (error) => {
      console.error("Error WebSocket:", error);
      onClose();
    };
  }

  subscribeToUpdates = (onUpdate: (webSocketData: WebSocketData) => void): void => {
    if (typeof onUpdate === 'function') { 
      this.onUpdateData.push(onUpdate);
    }
  }

  updatingData = () => {
    if (this.socket.onmessage) {
      this.socket.removeEventListener("message", this.socket.onmessage);
    }
    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      // console.log(`> UPDATE: Message:`, data);
      this.webSocketData = data;
      if (this.onUpdateData.length > 0) {
        this.onUpdateData.forEach(onUpdate => onUpdate(data));
      }
    };
  };
}
