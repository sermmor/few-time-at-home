import React from 'react';
import { SetupActions, SetupWizardData } from '../../../core/actions/setup';

// ── Paleta cyberpunk (igual que CyberpunkLoadingScreen) ──────────────────────
const neon    = '#00ffe7';
const neonDim = '#00ffe740';
const magenta = '#ff00cc';
const yellow  = '#ffe600';
const red     = '#ff4444';
const bg      = '#020c18';

const css = `
@keyframes flicker   { 0%,19%,21%,23%,25%,54%,56%,100%{opacity:1} 20%,24%,55%{opacity:.6} }
@keyframes pulse-box { 0%,100%{box-shadow:0 0 8px ${neon},0 0 20px ${neonDim}} 50%{box-shadow:0 0 16px ${neon},0 0 40px ${neon}44} }
@keyframes blink     { 0%,100%{opacity:1} 50%{opacity:0} }
@keyframes fadeIn    { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
`;

// ── Estilos reutilizables ────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'rgba(0,255,231,0.05)',
  border: `1px solid ${neon}`,
  borderRadius: 4,
  color: neon,
  fontFamily: '"Courier New", monospace',
  fontSize: '0.95rem',
  padding: '0.55rem 0.75rem',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  color: neon, fontSize: '0.72rem', letterSpacing: '0.2em',
  textTransform: 'uppercase', marginBottom: '0.35rem', display: 'block',
};

const hintStyle: React.CSSProperties = {
  color: `${neon}80`, fontSize: '0.72rem', marginTop: '0.3rem',
  fontFamily: '"Courier New", monospace',
};

const errorStyle: React.CSSProperties = {
  color: red, fontSize: '0.75rem', marginTop: '0.3rem',
  fontFamily: '"Courier New", monospace',
};

// ── Tipos ────────────────────────────────────────────────────────────────────
interface FormState {
  cloudRootPath:     string;
  connectToTelegram: boolean;
  telegramBotToken:  string;
  telegramUsername:  string;
  telegramTokenPass: string;
}

interface FieldErrors { cloudRootPath?: string; telegramBotToken?: string; telegramUsername?: string; telegramTokenPass?: string; }

// ── Componente principal ─────────────────────────────────────────────────────
export const SetupWizard: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [step,    setStep]    = React.useState(0);   // 0=bienvenida 1=cloud 2=telegram 3=confirmar
  const [installing, setInstalling] = React.useState(false);
  const [installError, setInstallError] = React.useState('');
  const [errors,  setErrors]  = React.useState<FieldErrors>({});
  const [form, setForm] = React.useState<FormState>({
    cloudRootPath:     '',
    connectToTelegram: false,
    telegramBotToken:  '',
    telegramUsername:  '',
    telegramTokenPass: '',
  });

  const set = (key: keyof FormState, value: string | boolean) =>
    setForm(f => ({ ...f, [key]: value }));

  // ── Validación por paso ──────────────────────────────────────────────────
  const validate = (): boolean => {
    const e: FieldErrors = {};
    if (step === 1 && !form.cloudRootPath.trim()) {
      e.cloudRootPath = 'La ruta es obligatoria.';
    }
    if (step === 2 && form.connectToTelegram) {
      if (!form.telegramBotToken.trim())  e.telegramBotToken  = 'Introduce el token del bot.';
      if (!form.telegramUsername.trim())  e.telegramUsername  = 'Introduce tu usuario de Telegram.';
      if (!form.telegramTokenPass.trim()) e.telegramTokenPass = 'Introduce una contraseña de acceso.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validate()) setStep(s => s + 1); };
  const back = () => { setErrors({}); setStep(s => s - 1); };

  const install = async () => {
    setInstalling(true);
    setInstallError('');
    try {
      const payload: SetupWizardData = {
        cloudRootPath:     form.cloudRootPath.trim(),
        connectToTelegram: form.connectToTelegram,
        telegramBotToken:  form.telegramBotToken.trim(),
        telegramUsername:  form.telegramUsername.trim(),
        telegramTokenPass: form.telegramTokenPass.trim(),
      };
      const result = await SetupActions.complete(payload);
      if (result.success) {
        onComplete();
      } else {
        setInstallError(result.error ?? 'Error desconocido.');
        setInstalling(false);
      }
    } catch {
      setInstallError('No se pudo conectar con el backend.');
      setInstalling(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <style>{css}</style>
      <div style={{
        position: 'fixed', inset: 0, background: bg, zIndex: 9999,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontFamily: '"Courier New", Courier, monospace', overflow: 'hidden',
      }}>
        {/* Grid overlay */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `linear-gradient(${neonDim} 1px,transparent 1px),linear-gradient(90deg,${neonDim} 1px,transparent 1px)`,
          backgroundSize: '40px 40px', opacity: 0.3,
        }} />
        {/* Scanlines */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.15) 2px,rgba(0,0,0,.15) 4px)',
        }} />

        {/* Corner brackets */}
        {(['topLeft','topRight','bottomLeft','bottomRight'] as const).map(c => (
          <div key={c} style={{
            position: 'absolute',
            top:    c.startsWith('top')    ? 20 : undefined,
            bottom: c.startsWith('bottom') ? 20 : undefined,
            left:   c.endsWith('Left')     ? 20 : undefined,
            right:  c.endsWith('Right')    ? 20 : undefined,
            width: 28, height: 28,
            borderTop:    c.startsWith('top')    ? `2px solid ${neon}` : undefined,
            borderBottom: c.startsWith('bottom') ? `2px solid ${neon}` : undefined,
            borderLeft:   c.endsWith('Left')     ? `2px solid ${neon}` : undefined,
            borderRight:  c.endsWith('Right')    ? `2px solid ${neon}` : undefined,
            opacity: 0.7,
          }} />
        ))}

        {/* Panel */}
        <div style={{
          position: 'relative', width: 'min(560px,92vw)',
          border: `1px solid ${neon}`, padding: '2rem 2rem 1.75rem',
          animation: 'pulse-box 3s ease-in-out infinite',
        }}>
          {/* Título */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h1 style={{
              margin: 0, fontSize: 'clamp(1.2rem,4vw,1.9rem)',
              color: neon, letterSpacing: '0.2em', textTransform: 'uppercase',
              textShadow: `0 0 10px ${neon}`,
              animation: 'flicker 6s step-start infinite',
            }}>FEW_TIME@HOME</h1>
            <div style={{ color: magenta, fontSize: '0.68rem', letterSpacing: '0.4em', marginTop: '0.3rem' }}>
              ASISTENTE DE CONFIGURACIÓN INICIAL
            </div>
          </div>

          {/* Indicador de pasos (solo cuando no es bienvenida ni instalando) */}
          {step > 0 && step < 4 && !installing && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {[1, 2, 3].map(n => (
                <div key={n} style={{
                  width: 28, height: 28, borderRadius: '50%', border: `1px solid ${neon}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem',
                  background: step === n ? neon : 'transparent',
                  color: step === n ? bg : step > n ? `${neon}80` : neon,
                  transition: 'all .3s',
                }}>{n}</div>
              ))}
            </div>
          )}

          {/* ── PASO 0: Bienvenida ────────────────────────────────────────── */}
          {step === 0 && (
            <div style={{ animation: 'fadeIn .4s ease' }}>
              <p style={{ color: `${neon}cc`, fontSize: '0.85rem', lineHeight: 1.7, margin: '0 0 1rem' }}>
                Es la primera vez que arrancas <span style={{ color: neon }}>Few_Time@Home</span>.
                Este asistente creará todos los ficheros de configuración necesarios
                en <span style={{ color: yellow }}>3 pasos</span>.
              </p>
              <p style={{ color: `${neon}80`, fontSize: '0.78rem', lineHeight: 1.6, margin: '0 0 1.5rem' }}>
                Una vez completado, la aplicación arrancará automáticamente sin necesidad de reiniciar nada.
              </p>
              <CyberButton onClick={() => setStep(1)} fullWidth>INICIAR CONFIGURACIÓN</CyberButton>
            </div>
          )}

          {/* ── PASO 1: Almacenamiento ────────────────────────────────────── */}
          {step === 1 && (
            <div style={{ animation: 'fadeIn .4s ease' }}>
              <StepTitle icon="☁️" title="ALMACENAMIENTO" subtitle="Carpeta raíz de la Cloud" />
              <Field label="Ruta de la carpeta Cloud *"
                hint="Ej: /home/sergio/cloud  |  C:\Users\sergio\cloud"
                error={errors.cloudRootPath}>
                <input style={inputStyle} value={form.cloudRootPath} autoFocus
                  placeholder="/home/usuario/cloud"
                  onChange={e => set('cloudRootPath', e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && next()} />
              </Field>
              <Nav onBack={back} onNext={next} />
            </div>
          )}

          {/* ── PASO 2: Telegram ─────────────────────────────────────────── */}
          {step === 2 && (
            <div style={{ animation: 'fadeIn .4s ease' }}>
              <StepTitle icon="🤖" title="TELEGRAM BOT" subtitle="Opcional — control remoto vía Telegram" />

              {/* Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <button onClick={() => { set('connectToTelegram', !form.connectToTelegram); setErrors({}); }}
                  style={{
                    width: 44, height: 24, borderRadius: 12, cursor: 'pointer', border: 'none',
                    background: form.connectToTelegram ? neon : `${neon}30`,
                    position: 'relative', transition: 'background .3s', flexShrink: 0,
                  }}>
                  <span style={{
                    position: 'absolute', top: 3, left: form.connectToTelegram ? 22 : 2,
                    width: 18, height: 18, borderRadius: '50%',
                    background: form.connectToTelegram ? bg : neon,
                    transition: 'left .3s',
                  }} />
                </button>
                <span style={{ color: neon, fontSize: '0.82rem', letterSpacing: '0.1em' }}>
                  {form.connectToTelegram ? 'Bot de Telegram activado' : 'Bot de Telegram desactivado'}
                </span>
              </div>

              {form.connectToTelegram && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <Field label="Token del bot (de @BotFather) *" error={errors.telegramBotToken}>
                    <input style={inputStyle} value={form.telegramBotToken}
                      placeholder="123456789:AAF..."
                      onChange={e => set('telegramBotToken', e.target.value)} />
                  </Field>
                  <Field label="Tu usuario de Telegram (sin @) *" error={errors.telegramUsername}>
                    <input style={inputStyle} value={form.telegramUsername}
                      placeholder="mi_usuario"
                      onChange={e => set('telegramUsername', e.target.value)} />
                  </Field>
                  <Field label="Contraseña de acceso al bot *"
                    hint="La usarás con /login <contraseña> en el chat del bot"
                    error={errors.telegramTokenPass}>
                    <input style={inputStyle} type="password" value={form.telegramTokenPass}
                      placeholder="••••••••"
                      onChange={e => set('telegramTokenPass', e.target.value)} />
                  </Field>
                </div>
              )}

              {!form.connectToTelegram && (
                <p style={{ color: `${neon}60`, fontSize: '0.78rem', lineHeight: 1.6 }}>
                  Puedes activarlo más adelante desde la sección de Configuración de la app.
                </p>
              )}
              <Nav onBack={back} onNext={next} />
            </div>
          )}

          {/* ── PASO 3: Resumen + instalar ────────────────────────────────── */}
          {step === 3 && !installing && (
            <div style={{ animation: 'fadeIn .4s ease' }}>
              <StepTitle icon="✅" title="RESUMEN" subtitle="Revisa y confirma" />
              <div style={{
                border: `1px solid ${neonDim}`, borderRadius: 4,
                padding: '0.75rem 1rem', marginBottom: '1.25rem',
                fontSize: '0.8rem', lineHeight: 1.9, color: `${neon}cc`,
              }}>
                <Row label="Cloud"    value={form.cloudRootPath} />
                <Row label="Telegram" value={form.connectToTelegram
                  ? `@${form.telegramUsername}`
                  : 'Desactivado'} />
              </div>
              {installError && (
                <p style={{ ...errorStyle, marginBottom: '0.75rem' }}>❌ {installError}</p>
              )}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <CyberButton onClick={back} secondary>← VOLVER</CyberButton>
                <CyberButton onClick={install} fullWidth>INSTALAR ⚡</CyberButton>
              </div>
            </div>
          )}

          {/* ── Estado: instalando ────────────────────────────────────────── */}
          {installing && (
            <div style={{ textAlign: 'center', padding: '1rem 0', animation: 'fadeIn .4s ease' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⚙️</div>
              <p style={{ color: neon, fontSize: '0.9rem', letterSpacing: '0.15em' }}>
                CREANDO FICHEROS<span style={{ animation: 'blink 1s step-start infinite' }}>…</span>
              </p>
              <p style={{ color: `${neon}70`, fontSize: '0.75rem', marginTop: '0.5rem' }}>
                La aplicación arrancará automáticamente en unos segundos.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// ── Sub-componentes ──────────────────────────────────────────────────────────

const StepTitle: React.FC<{ icon: string; title: string; subtitle: string }> = ({ icon, title, subtitle }) => (
  <div style={{ marginBottom: '1.1rem' }}>
    <div style={{ color: neon, fontSize: '0.9rem', letterSpacing: '0.25em', fontWeight: 700 }}>
      {icon} {title}
    </div>
    <div style={{ color: `${neon}70`, fontSize: '0.72rem', letterSpacing: '0.15em', marginTop: '0.2rem' }}>
      {subtitle}
    </div>
  </div>
);

const Field: React.FC<{
  label: string; hint?: string; error?: string; children: React.ReactNode;
}> = ({ label, hint, error, children }) => (
  <div>
    <label style={labelStyle}>{label}</label>
    {children}
    {hint  && !error && <div style={hintStyle}>{hint}</div>}
    {error && <div style={errorStyle}>⚠ {error}</div>}
  </div>
);

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ display: 'flex', gap: '0.5rem' }}>
    <span style={{ color: magenta, minWidth: 80 }}>{label}:</span>
    <span style={{ wordBreak: 'break-all' }}>{value || '—'}</span>
  </div>
);

const Nav: React.FC<{ onBack: () => void; onNext: () => void }> = ({ onBack, onNext }) => (
  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
    <CyberButton onClick={onBack} secondary>← VOLVER</CyberButton>
    <CyberButton onClick={onNext} fullWidth>SIGUIENTE →</CyberButton>
  </div>
);

const CyberButton: React.FC<{
  onClick: () => void; children: React.ReactNode;
  fullWidth?: boolean; secondary?: boolean;
}> = ({ onClick, children, fullWidth, secondary }) => (
  <button onClick={onClick} style={{
    flex: fullWidth ? 1 : undefined,
    padding: '0.6rem 1.1rem',
    background:   secondary ? 'transparent' : neon,
    color:        secondary ? neon          : bg,
    border:       `1px solid ${neon}`,
    borderRadius: 4,
    cursor:       'pointer',
    fontFamily:   '"Courier New", monospace',
    fontSize:     '0.8rem',
    letterSpacing:'0.15em',
    fontWeight:   700,
    textTransform:'uppercase',
    transition:   'opacity .2s',
  }}
    onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
  >{children}</button>
);
