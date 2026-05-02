import { v4 as uuidv4 } from 'uuid';
import type { ClipData, TrackData } from './types';

export class AudioEngine {
  private ctx: AudioContext;
  private sourceNodes: Map<string, { source: AudioBufferSourceNode; gain: GainNode }> = new Map();
  private trackNodes: Map<string, GainNode> = new Map();
  private startTime: number = 0;
  private pauseTime: number = 0;
  public isPlaying: boolean = false;

  constructor() {
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  async loadAudio(url: string): Promise<AudioBuffer> {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return await this.ctx.decodeAudioData(arrayBuffer);
  }

  createClip(buffer: AudioBuffer, sourceFile: string, trackId: string): ClipData {
    return {
      id: uuidv4(),
      trackId,
      buffer,
      start: 0,
      duration: buffer.duration,
      offset: 0,
      sourceFile,
      fadeMode: 'normal',
    };
  }

  private applyClipFades(
    gainNode: GainNode,
    clip: ClipData,
    contextStartTime: number,
    currentTime: number,
  ) {
    const fadeMode = clip.fadeMode || 'normal';

    gainNode.gain.setValueAtTime(1, Math.max(currentTime, contextStartTime));

    if (fadeMode === 'fade-in' || fadeMode === 'fade-in-out') {
      gainNode.gain.setValueAtTime(0, Math.max(currentTime, contextStartTime));
      gainNode.gain.linearRampToValueAtTime(1, Math.max(currentTime, contextStartTime + 2));
    }

    if (fadeMode === 'fade-out' || fadeMode === 'fade-in-out') {
      const fadeOutStart = Math.max(contextStartTime, contextStartTime + clip.duration - 3);
      gainNode.gain.setValueAtTime(1, Math.max(currentTime, fadeOutStart));
      gainNode.gain.linearRampToValueAtTime(0, Math.max(currentTime, contextStartTime + clip.duration));
    }
  }

  play(clips: ClipData[], tracks: TrackData[], startPosition: number = 0) {
    if (this.isPlaying) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.isPlaying = true;
    this.startTime = this.ctx.currentTime - startPosition;
    this.pauseTime = 0;

    tracks.forEach(track => {
      const trackGain = this.ctx.createGain();
      trackGain.gain.value = track.volume !== undefined ? track.volume : 1.0;
      trackGain.connect(this.ctx.destination);
      this.trackNodes.set(track.id, trackGain);
    });

    clips.forEach(clip => {
      const clipStartInTimeline = clip.start;
      const clipEndInTimeline = clip.start + clip.duration;

      if (startPosition < clipEndInTimeline) {
        const source = this.ctx.createBufferSource();
        source.buffer = clip.buffer;

        const clipGain = this.ctx.createGain();
        source.connect(clipGain);

        const trackGain = this.trackNodes.get(clip.trackId);
        if (trackGain) {
          clipGain.connect(trackGain);
        } else {
          clipGain.connect(this.ctx.destination);
        }

        let playOffset = clip.offset;
        let scheduleTime = clipStartInTimeline;

        if (startPosition > clipStartInTimeline) {
          playOffset += startPosition - clipStartInTimeline;
          scheduleTime = startPosition;
        }

        const durationToPlay = clipEndInTimeline - scheduleTime;
        const contextScheduleTime = this.startTime + scheduleTime;
        const absoluteClipContextStartTime = this.startTime + clipStartInTimeline;

        this.applyClipFades(clipGain, clip, absoluteClipContextStartTime, this.ctx.currentTime);
        source.start(contextScheduleTime, playOffset, durationToPlay);
        this.sourceNodes.set(clip.id, { source, gain: clipGain });
      }
    });
  }

  pause() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this.pauseTime = this.getCurrentTime();

    this.sourceNodes.forEach(({ source, gain }) => {
      try { source.stop(); } catch (_e) { /* already finished */ }
      source.disconnect();
      gain.disconnect();
    });
    this.sourceNodes.clear();

    this.trackNodes.forEach(gain => gain.disconnect());
    this.trackNodes.clear();
  }

  getCurrentTime(): number {
    if (this.isPlaying) return this.ctx.currentTime - this.startTime;
    return this.pauseTime;
  }

  setPauseTime(time: number) {
    this.pauseTime = Math.max(0, time);
  }

  async renderToWav(clips: ClipData[], tracks: TrackData[]): Promise<Blob> {
    if (clips.length === 0) return new Blob();

    const maxDuration = Math.max(...clips.map(c => c.start + c.duration));
    const sampleRate = 44100;
    const offlineCtx = new OfflineAudioContext(2, sampleRate * maxDuration, sampleRate);

    const offlineTrackNodes = new Map<string, GainNode>();
    tracks.forEach(track => {
      const trackGain = offlineCtx.createGain();
      trackGain.gain.value = track.volume !== undefined ? track.volume : 1.0;
      trackGain.connect(offlineCtx.destination);
      offlineTrackNodes.set(track.id, trackGain);
    });

    clips.forEach(clip => {
      const source = offlineCtx.createBufferSource();
      source.buffer = clip.buffer;

      const clipGain = offlineCtx.createGain();
      source.connect(clipGain);

      const trackGain = offlineTrackNodes.get(clip.trackId);
      if (trackGain) {
        clipGain.connect(trackGain);
      } else {
        clipGain.connect(offlineCtx.destination);
      }

      this.applyClipFades(clipGain, clip, clip.start, 0);
      source.start(clip.start, clip.offset, clip.duration);
    });

    const renderedBuffer = await offlineCtx.startRendering();
    return this.audioBufferToWav(renderedBuffer);
  }

  private audioBufferToWav(buffer: AudioBuffer): Blob {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const bufferArray = new ArrayBuffer(length);
    const view = new DataView(bufferArray);
    const channels: Float32Array[] = [];
    let offset = 0;
    let pos = 0;

    const setUint16 = (data: number) => { view.setUint16(offset, data, true); offset += 2; };
    const setUint32 = (data: number) => { view.setUint32(offset, data, true); offset += 4; };

    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8);
    setUint32(0x45564157); // "WAVE"
    setUint32(0x20746d66); // "fmt "
    setUint32(16);
    setUint16(1);           // PCM
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan);
    setUint16(numOfChan * 2);
    setUint16(16);          // 16-bit
    setUint32(0x61746164); // "data"
    setUint32(length - pos - 4);

    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (pos < buffer.length) {
      for (let i = 0; i < numOfChan; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][pos]));
        sample = ((0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0);
        view.setInt16(offset, sample, true);
        offset += 2;
      }
      pos++;
    }

    return new Blob([bufferArray], { type: 'audio/wav' });
  }
}

export const audioEngine = new AudioEngine();
