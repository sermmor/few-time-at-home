import React, { useRef, useEffect } from 'react';
import type { ClipData } from './types';

interface WaveformProps {
  clip: ClipData;
  width: number;
  height: number;
  pixelsPerSecond: number;
}

export const Waveform: React.FC<WaveformProps> = ({ clip, width, height, pixelsPerSecond }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width  = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.clearRect(0, 0, width, height);

    const buffer = clip.buffer;
    const channelData = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;

    const startSample        = Math.floor(clip.offset * sampleRate);
    const endSample          = Math.floor((clip.offset + clip.duration) * sampleRate);
    const totalSamplesToDraw = endSample - startSample;

    const step = Math.ceil(totalSamplesToDraw / width);
    const amp  = height / 2;

    // Color based on fade mode
    let fillStyle = '#111111';
    if (clip.fadeMode === 'fade-in')      fillStyle = '#eab308';
    else if (clip.fadeMode === 'fade-out')     fillStyle = '#22c55e';
    else if (clip.fadeMode === 'fade-in-out')  fillStyle = '#3b82f6';

    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    ctx.moveTo(0, amp);

    for (let i = 0; i < width; i++) {
      let min = 1.0;
      let max = -1.0;
      const sampleOffset = startSample + i * step;

      for (let j = 0; j < step && sampleOffset + j < endSample; j++) {
        const datum = channelData[sampleOffset + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }

      ctx.lineTo(i, (1 + min) * amp);
      ctx.lineTo(i, (1 + max) * amp);
    }

    ctx.lineTo(width, amp);
    ctx.fill();
  }, [clip, width, height, pixelsPerSecond]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', opacity: 0.9 }}
    />
  );
};
