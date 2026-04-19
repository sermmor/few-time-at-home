import React from 'react';

const BOOT_LINES = [
  'BIOS v2.4.1 … OK',
  'Initializing neural interface … OK',
  'Loading kernel modules … OK',
  'Mounting encrypted volumes … OK',
  'Establishing secure channel … OK',
  'Authenticating with backend … WAITING',
];

const neon   = '#00ffe7';
const neonDim = '#00ffe740';
const magenta = '#ff00cc';
const yellow  = '#ffe600';
const bg      = '#020c18';

const keyframes = `
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
@keyframes scanline {
  0%   { background-position: 0 0; }
  100% { background-position: 0 100vh; }
}
@keyframes flicker {
  0%,19%,21%,23%,25%,54%,56%,100% { opacity: 1; }
  20%,24%,55% { opacity: 0.6; }
}
@keyframes glitch-1 {
  0%,100% { clip-path: inset(0 0 98% 0); transform: translate(-2px,0); }
  25%      { clip-path: inset(20% 0 60% 0); transform: translate(2px,0); }
  50%      { clip-path: inset(50% 0 30% 0); transform: translate(-1px,0); }
  75%      { clip-path: inset(80% 0 5% 0);  transform: translate(1px,0);  }
}
@keyframes glitch-2 {
  0%,100% { clip-path: inset(50% 0 30% 0); transform: translate(2px,0); }
  33%     { clip-path: inset(10% 0 80% 0); transform: translate(-2px,0); }
  66%     { clip-path: inset(70% 0 15% 0); transform: translate(1px,0); }
}
@keyframes pulse-border {
  0%,100% { box-shadow: 0 0 8px ${neon}, 0 0 20px ${neonDim}; }
  50%     { box-shadow: 0 0 16px ${neon}, 0 0 40px ${neon}44; }
}
@keyframes dot-pulse {
  0%,80%,100% { opacity:0; }
  40%         { opacity:1; }
}
`;

export const CyberpunkLoadingScreen: React.FC = () => {
  const [visibleLines, setVisibleLines] = React.useState(0);
  const [dots, setDots]                 = React.useState(0);
  const [elapsed, setElapsed]           = React.useState(0);

  // Reveal boot lines one by one
  React.useEffect(() => {
    if (visibleLines >= BOOT_LINES.length) return;
    const t = setTimeout(() => setVisibleLines(v => v + 1), 380 + Math.random() * 300);
    return () => clearTimeout(t);
  }, [visibleLines]);

  // Animated dots on last line
  React.useEffect(() => {
    const t = setInterval(() => setDots(d => (d + 1) % 4), 500);
    return () => clearInterval(t);
  }, []);

  // Elapsed counter
  React.useEffect(() => {
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const pad = (n: number) => n.toString().padStart(2, '0');
  const timeStr = `${pad(Math.floor(elapsed / 60))}:${pad(elapsed % 60)}`;

  return (
    <>
      <style>{keyframes}</style>

      {/* Root */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: bg,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: '"Courier New", Courier, monospace',
        overflow: 'hidden',
        userSelect: 'none',
      }}>

        {/* Grid overlay */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `
            linear-gradient(${neonDim} 1px, transparent 1px),
            linear-gradient(90deg, ${neonDim} 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
          opacity: 0.35,
        }} />

        {/* Scanlines */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.18) 2px,
            rgba(0,0,0,0.18) 4px
          )`,
        }} />

        {/* Corner brackets */}
        {(['topLeft','topRight','bottomLeft','bottomRight'] as const).map(corner => (
          <div key={corner} style={{
            position: 'absolute',
            top:    corner.startsWith('top')    ? 24 : undefined,
            bottom: corner.startsWith('bottom') ? 24 : undefined,
            left:   corner.endsWith('Left')     ? 24 : undefined,
            right:  corner.endsWith('Right')    ? 24 : undefined,
            width: 32, height: 32,
            borderTop:    corner.startsWith('top')    ? `2px solid ${neon}` : undefined,
            borderBottom: corner.startsWith('bottom') ? `2px solid ${neon}` : undefined,
            borderLeft:   corner.endsWith('Left')     ? `2px solid ${neon}` : undefined,
            borderRight:  corner.endsWith('Right')    ? `2px solid ${neon}` : undefined,
            opacity: 0.8,
          }} />
        ))}

        {/* Elapsed clock — top right */}
        <div style={{
          position: 'absolute', top: 28, right: 68,
          color: neon, fontSize: '0.75rem', opacity: 0.7, letterSpacing: '0.12em',
        }}>
          {timeStr}
        </div>

        {/* Main panel */}
        <div style={{
          position: 'relative',
          width: 'min(600px, 90vw)',
          border: `1px solid ${neon}`,
          padding: '2.5rem 2rem',
          animation: 'pulse-border 3s ease-in-out infinite',
        }}>

          {/* Glitch title */}
          <div style={{ position: 'relative', marginBottom: '2rem', textAlign: 'center' }}>
            {/* Base */}
            <h1 style={{
              margin: 0,
              fontSize: 'clamp(1.4rem, 5vw, 2.4rem)',
              color: neon,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              textShadow: `0 0 10px ${neon}, 0 0 30px ${neon}88`,
              animation: 'flicker 6s step-start infinite',
            }}>
              FEW_TIME@HOME
            </h1>
            {/* Glitch layer 1 */}
            <h1 aria-hidden style={{
              position: 'absolute', top: 0, left: 0, right: 0, margin: 0,
              fontSize: 'clamp(1.4rem, 5vw, 2.4rem)',
              color: magenta,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              opacity: 0.7,
              animation: 'glitch-1 4s step-start infinite',
            }}>
              FEW_TIME@HOME
            </h1>
            {/* Glitch layer 2 */}
            <h1 aria-hidden style={{
              position: 'absolute', top: 0, left: 0, right: 0, margin: 0,
              fontSize: 'clamp(1.4rem, 5vw, 2.4rem)',
              color: yellow,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              opacity: 0.5,
              animation: 'glitch-2 3.5s step-start infinite',
            }}>
              FEW_TIME@HOME
            </h1>

            {/* Subtitle */}
            <div style={{ color: magenta, fontSize: '0.7rem', letterSpacing: '0.4em', marginTop: '0.5rem', opacity: 0.9 }}>
              SYSTEM BOOT SEQUENCE
            </div>
          </div>

          {/* Boot log */}
          <div style={{
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '0.8rem',
            lineHeight: '1.9',
            color: neon,
            minHeight: '10rem',
          }}>
            {BOOT_LINES.slice(0, visibleLines).map((line, i) => {
              const isLast = i === BOOT_LINES.length - 1;
              const isWaiting = line.endsWith('WAITING');
              return (
                <div key={i} style={{ display: 'flex', gap: '0.5rem', opacity: isLast ? 1 : 0.6 }}>
                  <span style={{ color: magenta, flexShrink: 0 }}>{'>'}</span>
                  <span style={{ color: isWaiting ? yellow : neon }}>
                    {isWaiting && isLast
                      ? line.replace('WAITING', '') + '.'.repeat(dots)
                      : line}
                  </span>
                </div>
              );
            })}

            {/* Blinking cursor */}
            {visibleLines < BOOT_LINES.length && (
              <span style={{ color: neon, animation: 'blink 1s step-start infinite' }}>█</span>
            )}
          </div>

          {/* Status bar */}
          <div style={{
            marginTop: '1.5rem',
            borderTop: `1px solid ${neonDim}`,
            paddingTop: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}>
            {/* Spinner dots */}
            <div style={{ display: 'flex', gap: '4px' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: neon,
                  animation: `dot-pulse 1.4s ease-in-out ${i * 0.16}s infinite`,
                }} />
              ))}
            </div>
            <span style={{ color: neon, fontSize: '0.75rem', letterSpacing: '0.15em', opacity: 0.9 }}>
              WAITING FOR BACKEND
            </span>
          </div>
        </div>
      </div>
    </>
  );
};
