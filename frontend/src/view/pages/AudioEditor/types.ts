export interface TrackData {
  id: string;
  name: string;
  muted?: boolean;
  volume: number;
}

export interface ClipData {
  id: string;
  trackId: string;
  buffer: AudioBuffer;   // Decoded audio buffer (kept in memory)
  start: number;         // Start time on the timeline (seconds)
  duration: number;      // Duration of this clip (seconds)
  offset: number;        // Start offset within the original buffer (seconds)
  sourceFile: string;    // Original file name
  selected?: boolean;
  fadeMode: 'normal' | 'fade-in' | 'fade-out' | 'fade-in-out';
}
