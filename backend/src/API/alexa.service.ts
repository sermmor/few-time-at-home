export interface AlexaLiveState {
  type: 'audio' | 'video' | null;
  url: string;
  title: string;
  currentTime: number;
  isPlaying: boolean;
  /** Unix ms timestamp of the moment this state was last written (for time compensation). */
  timestamp: number;
}

const STOPPED_STATE: AlexaLiveState = {
  type: null,
  url: '',
  title: '',
  currentTime: 0,
  isPlaying: false,
  timestamp: 0,
};

export class AlexaService {
  static Instance: AlexaService;

  private state: AlexaLiveState = { ...STOPPED_STATE };

  constructor() {
    AlexaService.Instance = this;
  }

  getState(): AlexaLiveState {
    return this.state;
  }

  /** Replace the full state (called when the sender starts or changes track). */
  setState(incoming: Omit<AlexaLiveState, 'timestamp'>): AlexaLiveState {
    this.state = { ...incoming, timestamp: Date.now() };
    return this.state;
  }

  /** Update currentTime and optionally isPlaying (called by heartbeat and on play/pause/seek). */
  syncTime(currentTime: number, isPlaying?: boolean): AlexaLiveState {
    this.state = {
      ...this.state,
      currentTime,
      ...(typeof isPlaying === 'boolean' ? { isPlaying } : {}),
      timestamp: Date.now(),
    };
    return this.state;
  }

  stop(): AlexaLiveState {
    this.state = { ...STOPPED_STATE, timestamp: Date.now() };
    return this.state;
  }
}
