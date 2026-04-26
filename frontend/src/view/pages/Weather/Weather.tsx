import * as React from 'react';
import { Box, CircularProgress, Tab, Tabs, Tooltip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { WeatherActions, DailyWeatherRow, HourlyWeatherRow } from '../../../core/actions/weather';

// ── Cyberpunk palette ─────────────────────────────────────────────────────────
const C = {
  bg:        '#050508',
  panel:     '#0b0b14',
  border:    '#00ffee',
  borderDim: '#004444',
  cyan:      '#00ffee',
  magenta:   '#ff00cc',
  yellow:    '#ffcc00',
  green:     '#00ff88',
  red:       '#ff3355',
  orange:    '#ff8800',
  text:      '#c8f0f0',
  textDim:   '#4a7a7a',
  headerBg:  '#00ffee18',
  rowAlt:    '#ffffff05',
  font:      '"Courier New", Courier, monospace',
};

// ── Scanline overlay (CSS gradient trick) ────────────────────────────────────
const scanlineStyle: React.CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,238,0.025) 2px, rgba(0,255,238,0.025) 4px)',
  pointerEvents: 'none',
  position: 'absolute',
  inset: 0,
  zIndex: 0,
};

// ── Emoji helpers ─────────────────────────────────────────────────────────────
const skyEmoji = (desc: string): string => {
  if (!desc) return '—';
  const d = desc.toLowerCase();
  if (d.includes('tormenta'))                          return '⛈️';
  if (d.includes('lluvia') || d.includes('llovizna') || d.includes('chubasco')) return '🌧️';
  if (d.includes('nieve'))                             return '❄️';
  if (d.includes('niebla') || d.includes('bruma'))     return '🌫️';
  if (d.includes('muy nuboso') || d.includes('cubierto')) return '☁️';
  if (d.includes('nuboso'))                            return '⛅';
  if (d.includes('poco nuboso') || d.includes('nubes altas')) return '🌤️';
  if (d.includes('despejado') || d.includes('soleado')) return '☀️';
  return '🌡️';
};

const windDirEmoji = (dir: string): string => {
  const map: Record<string, string> = {
    N: '↑', NE: '↗', E: '→', SE: '↘',
    S: '↓', SO: '↙', O: '←', NO: '↖',
    C: '·',
  };
  return map[dir?.toUpperCase()] ?? dir ?? '—';
};

// ── Color helpers ─────────────────────────────────────────────────────────────
const tempColor = (t: number | null): string => {
  if (t === null) return C.textDim;
  if (t >= 35)  return '#ff2200';
  if (t >= 28)  return C.orange;
  if (t >= 20)  return C.yellow;
  if (t >= 10)  return C.green;
  if (t >= 0)   return C.cyan;
  return '#8888ff';
};

const rainColor = (p: number): string => {
  if (p >= 70) return C.red;
  if (p >= 40) return C.orange;
  if (p >= 20) return C.yellow;
  return C.textDim;
};

const uvColor = (uv: number | null): string => {
  if (uv === null) return C.textDim;
  if (uv >= 8) return C.red;
  if (uv >= 6) return C.orange;
  if (uv >= 3) return C.yellow;
  return C.green;
};

const humidityColor = (h: number | null): string => {
  if (h === null) return C.textDim;
  if (h >= 80)  return C.cyan;
  if (h >= 60)  return C.green;
  if (h >= 40)  return C.yellow;
  return C.orange;
};

// ── Shared styles ─────────────────────────────────────────────────────────────
const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontFamily: C.font,
  fontSize: '0.75rem',
  color: C.text,
};

const thStyle: React.CSSProperties = {
  padding: '0.55rem 0.6rem',
  textAlign: 'left',
  color: C.cyan,
  borderBottom: `1px solid ${C.border}`,
  background: C.headerBg,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
  fontWeight: 700,
};

const tdStyle: React.CSSProperties = {
  padding: '0.5rem 0.6rem',
  borderBottom: `1px solid ${C.borderDim}`,
  verticalAlign: 'middle',
  whiteSpace: 'nowrap',
};

const subLabel: React.CSSProperties = {
  fontSize: '0.65rem',
  color: C.textDim,
  display: 'block',
  marginBottom: '0.1rem',
};

// ── Spanish date formatter ────────────────────────────────────────────────────
const DAYS_ES   = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const formatDate = (iso: string): string => {
  const d = new Date(`${iso}T12:00:00`);
  return `${DAYS_ES[d.getDay()]} ${d.getDate()} ${MONTHS_ES[d.getMonth()]}`;
};

const isToday = (iso: string): boolean => {
  const now = new Date();
  return iso === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

// ── Neon badge ────────────────────────────────────────────────────────────────
const NeonBadge: React.FC<{ color: string; children: React.ReactNode }> = ({ color, children }) => (
  <span style={{
    color,
    textShadow: `0 0 6px ${color}`,
    fontWeight: 700,
  }}>{children}</span>
);

// ── Wind cell (direction + speed) ─────────────────────────────────────────────
const WindCell: React.FC<{ dir: string; speed: number | null; gust?: number | null }> = ({ dir, speed, gust }) => {
  if (!dir && speed === null) return <span style={{ color: C.textDim }}>—</span>;
  return (
    <span>
      <span style={{ color: C.cyan, marginRight: '0.2rem' }}>{windDirEmoji(dir)}</span>
      {speed !== null && <span style={{ color: C.text }}>{speed} km/h</span>}
      {gust != null && gust > 0 && (
        <span style={{ color: C.orange, marginLeft: '0.3rem', fontSize: '0.65rem' }}>
          ↑{gust}
        </span>
      )}
    </span>
  );
};

// ── Sky cell ──────────────────────────────────────────────────────────────────
const SkyCell: React.FC<{ desc: string }> = ({ desc }) => {
  if (!desc || desc === 'No disponible') return <span style={{ color: C.textDim }}>—</span>;
  return (
    <Tooltip title={desc} arrow>
      <span style={{ cursor: 'default' }}>
        <span style={{ fontSize: '1rem' }}>{skyEmoji(desc)}</span>
        <span style={{ marginLeft: '0.3rem', color: C.text, fontSize: '0.7rem' }}>
          {desc.length > 18 ? desc.slice(0, 17) + '…' : desc}
        </span>
      </span>
    </Tooltip>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DAILY TABLE
// ─────────────────────────────────────────────────────────────────────────────
const DailyTable: React.FC<{ rows: DailyWeatherRow[] }> = ({ rows }) => {
  const { t } = useTranslation();
  if (rows.length === 0)
    return <p style={{ color: C.textDim, fontFamily: C.font, textAlign: 'center', padding: '2rem' }}>{t('weather.noData')}</p>;

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>{t('weather.colDate')}</th>
            <th style={{ ...thStyle, textAlign: 'center' }}>{t('weather.colTemp')}</th>
            <th style={{ ...thStyle, textAlign: 'center' }}>{t('weather.colThermal')}</th>
            <th style={thStyle}>{t('weather.colMorning')}</th>
            <th style={thStyle}>{t('weather.colAfternoon')}</th>
            <th style={thStyle}>{t('weather.colNight')}</th>
            <th style={{ ...thStyle, textAlign: 'center' }}>{t('weather.colRain')}</th>
            <th style={thStyle}>{t('weather.colWindMorning')}</th>
            <th style={thStyle}>{t('weather.colWindAfternoon')}</th>
            <th style={{ ...thStyle, textAlign: 'center' }}>{t('weather.colHumidity')}</th>
            <th style={{ ...thStyle, textAlign: 'center' }}>{t('weather.colUv')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const today = isToday(row.date);
            const rowBg = today ? '#00ffee0c' : i % 2 === 0 ? 'transparent' : C.rowAlt;
            const dateHighlight = today ? C.cyan : C.text;
            return (
              <tr key={row.date} style={{ background: rowBg }}>
                {/* Fecha */}
                <td style={{ ...tdStyle, color: dateHighlight, fontWeight: today ? 700 : 400 }}>
                  {today && <span style={{ color: C.magenta, marginRight: '0.3rem', textShadow: `0 0 8px ${C.magenta}` }}>▶</span>}
                  {formatDate(row.date)}
                </td>

                {/* Temperatura */}
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <span style={subLabel}>{t('weather.minMax')}</span>
                  <NeonBadge color={tempColor(row.tempMin)}>{row.tempMin ?? '--'}</NeonBadge>
                  <span style={{ color: C.textDim }}> / </span>
                  <NeonBadge color={tempColor(row.tempMax)}>{row.tempMax ?? '--'}</NeonBadge>
                  <span style={{ color: C.textDim }}> {t('weather.celsius')}</span>
                </td>

                {/* Sens. térmica */}
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <span style={subLabel}>{t('weather.minMax')}</span>
                  <span style={{ color: tempColor(row.thermalSensMin) }}>{row.thermalSensMin ?? '--'}</span>
                  <span style={{ color: C.textDim }}> / </span>
                  <span style={{ color: tempColor(row.thermalSensMax) }}>{row.thermalSensMax ?? '--'}</span>
                  <span style={{ color: C.textDim }}> {t('weather.celsius')}</span>
                </td>

                {/* Cielo mañana */}
                <td style={tdStyle}><SkyCell desc={row.skyMorning} /></td>

                {/* Cielo tarde */}
                <td style={tdStyle}><SkyCell desc={row.skyAfternoon} /></td>

                {/* Cielo noche */}
                <td style={tdStyle}><SkyCell desc={row.skyNight} /></td>

                {/* Lluvia */}
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <span style={subLabel}>{t('weather.rainSubLabel')}</span>
                  <NeonBadge color={rainColor(row.rainProb)}>{row.rainProb}%</NeonBadge>
                  <span style={{ color: C.textDim, fontSize: '0.65rem', marginLeft: '0.2rem' }}>
                    ({row.rainProbMorning}/{row.rainProbAfternoon}/{row.rainProbNight})
                  </span>
                </td>

                {/* Viento mañana */}
                <td style={tdStyle}>
                  <WindCell dir={row.windMorningDir} speed={row.windMorningSpeed} />
                </td>

                {/* Viento tarde */}
                <td style={tdStyle}>
                  <WindCell dir={row.windAfternoonDir} speed={row.windAfternoonSpeed} gust={row.maxGust ?? undefined} />
                </td>

                {/* Humedad */}
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <span style={subLabel}>mín / máx</span>
                  <span style={{ color: humidityColor(row.humidityMin) }}>{row.humidityMin ?? '--'}</span>
                  <span style={{ color: C.textDim }}>/</span>
                  <span style={{ color: humidityColor(row.humidityMax) }}>{row.humidityMax ?? '--'}</span>
                  <span style={{ color: C.textDim }}> %</span>
                </td>

                {/* UV */}
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <NeonBadge color={uvColor(row.uvMax)}>{row.uvMax ?? '—'}</NeonBadge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// HOURLY TABLE
// ─────────────────────────────────────────────────────────────────────────────
const HourlyTable: React.FC<{ rows: HourlyWeatherRow[] }> = ({ rows }) => {
  const { t } = useTranslation();
  if (rows.length === 0)
    return <p style={{ color: C.textDim, fontFamily: C.font, textAlign: 'center', padding: '2rem' }}>{t('weather.noData')}</p>;

  // Group by date so we can show date headers
  const grouped: { date: string; hours: HourlyWeatherRow[] }[] = [];
  for (const row of rows) {
    const last = grouped[grouped.length - 1];
    if (last && last.date === row.date) last.hours.push(row);
    else grouped.push({ date: row.date, hours: [row] });
  }

  // Current hour for highlight
  const now = new Date();
  const nowDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const nowHour = String(now.getHours()).padStart(2, '0');

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>{t('weather.colHour')}</th>
            <th style={{ ...thStyle, textAlign: 'center' }}>{t('weather.colTemp')}</th>
            <th style={{ ...thStyle, textAlign: 'center' }}>{t('weather.colThermal')}</th>
            <th style={thStyle}>{t('weather.colSky')}</th>
            <th style={{ ...thStyle, textAlign: 'center' }}>{t('weather.colPrecip')}</th>
            <th style={{ ...thStyle, textAlign: 'center' }}>{t('weather.colProb')}</th>
            <th style={thStyle}>{t('weather.colWind')}</th>
            <th style={{ ...thStyle, textAlign: 'center' }}>{t('weather.colHumidity')}</th>
          </tr>
        </thead>
        <tbody>
          {grouped.map(({ date, hours }) => (
            <React.Fragment key={date}>
              {/* Date separator row */}
              <tr>
                <td colSpan={8} style={{
                  ...tdStyle,
                  background: '#00ffee12',
                  color: C.cyan,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  borderTop: `1px solid ${C.border}`,
                  paddingTop: '0.6rem',
                  paddingBottom: '0.6rem',
                }}>
                  {isToday(date) && (
                    <span style={{ color: C.magenta, marginRight: '0.5rem', textShadow: `0 0 8px ${C.magenta}` }}>▶</span>
                  )}
                  {formatDate(date)}
                  {isToday(date) && (
                    <span style={{ color: C.magenta, marginLeft: '0.6rem', fontSize: '0.7rem' }}>{t('weather.today')}</span>
                  )}
                </td>
              </tr>
              {hours.map((row, i) => {
                const isCurrent = date === nowDate && row.hour === nowHour;
                const rowBg = isCurrent ? '#ff00cc18' : i % 2 === 0 ? 'transparent' : C.rowAlt;
                return (
                  <tr key={`${date}-${row.hour}`} style={{ background: rowBg }}>
                    {/* Hora */}
                    <td style={{ ...tdStyle, fontWeight: isCurrent ? 700 : 400 }}>
                      {isCurrent && (
                        <span style={{ color: C.magenta, marginRight: '0.3rem', textShadow: `0 0 8px ${C.magenta}` }}>▶</span>
                      )}
                      <NeonBadge color={isCurrent ? C.magenta : C.cyan}>{row.hour}:00</NeonBadge>
                    </td>

                    {/* Temperatura */}
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <NeonBadge color={tempColor(row.temperature)}>{row.temperature ?? '--'} °C</NeonBadge>
                    </td>

                    {/* Sens. térmica */}
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <span style={{ color: tempColor(row.thermalSens) }}>{row.thermalSens ?? '--'} °C</span>
                    </td>

                    {/* Cielo */}
                    <td style={tdStyle}><SkyCell desc={row.sky} /></td>

                    {/* Precipitación */}
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      {row.precipMm == null
                        ? <span style={{ color: C.textDim }}>—</span>
                        : row.precipMm > 0
                          ? <NeonBadge color={C.cyan}>{row.precipMm} mm</NeonBadge>
                          : <span style={{ color: C.textDim, fontSize: '0.65rem' }}>0 mm</span>
                      }
                    </td>

                    {/* Prob. lluvia */}
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <NeonBadge color={rainColor(row.rainProb)}>{row.rainProb}%</NeonBadge>
                    </td>

                    {/* Viento */}
                    <td style={tdStyle}>
                      <WindCell dir={row.windDir} speed={row.windSpeed} gust={row.maxGust} />
                    </td>

                    {/* Humedad */}
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <span style={{ color: humidityColor(row.humidity) }}>
                        {row.humidity != null ? `${row.humidity}%` : '—'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export const Weather: React.FC = () => {
  const { t } = useTranslation();
  const [tab, setTab] = React.useState<0 | 1>(0);
  const [dailyRows,  setDailyRows]  = React.useState<DailyWeatherRow[]>([]);
  const [hourlyRows, setHourlyRows] = React.useState<HourlyWeatherRow[]>([]);
  const [loadingDaily,  setLoadingDaily]  = React.useState(true);
  const [loadingHourly, setLoadingHourly] = React.useState(true);
  const [errorDaily,  setErrorDaily]  = React.useState(false);
  const [errorHourly, setErrorHourly] = React.useState(false);
  const [updatedAt, setUpdatedAt] = React.useState<string>('');

  React.useEffect(() => {
    const ts = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    setUpdatedAt(ts);

    WeatherActions.getDaily()
      .then(rows => {
        setDailyRows(rows);
        setLoadingDaily(false);
      })
      .catch(() => {
        setErrorDaily(true);
        setLoadingDaily(false);
      });

    WeatherActions.getHourly()
      .then(rows => {
        setHourlyRows(rows);
        setLoadingHourly(false);
      })
      .catch(() => {
        setErrorHourly(true);
        setLoadingHourly(false);
      });
  }, []);

  const glowCyan    = `0 0 10px ${C.cyan}, 0 0 20px ${C.cyan}44`;
  const glowMagenta = `0 0 10px ${C.magenta}, 0 0 20px ${C.magenta}44`;

  return (
    <Box sx={{
      minHeight: '100vh',
      background: C.bg,
      color: C.text,
      fontFamily: C.font,
      position: 'relative',
    }}>
      {/* scanlines */}
      <div style={scanlineStyle} />

      <Box sx={{ position: 'relative', zIndex: 1, p: { xs: '1rem', md: '1.5rem 2rem' } }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <Box sx={{ mb: '1.5rem', borderBottom: `1px solid ${C.border}`, pb: '1rem' }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap' }}>
            <h1 style={{
              margin: 0,
              fontFamily: C.font,
              fontSize: 'clamp(1.4rem, 4vw, 2rem)',
              color: C.cyan,
              textShadow: glowCyan,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}>
              {t('weather.title')}
            </h1>
            {updatedAt && (
              <span style={{ color: C.textDim, fontSize: '0.7rem', letterSpacing: '0.05em' }}>
                {t('weather.updatedAt')} {updatedAt}
              </span>
            )}
          </Box>
          <p style={{ margin: '0.4rem 0 0', color: C.textDim, fontSize: '0.72rem', letterSpacing: '0.04em' }}>
            {t('weather.source')}
          </p>
        </Box>

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          TabIndicatorProps={{ style: { background: C.magenta, boxShadow: glowMagenta, height: '3px' } }}
          sx={{ mb: '1.5rem', minHeight: 'unset' }}
        >
          {([t('weather.tabDaily'), t('weather.tabHourly')] as const).map((label, idx) => (
            <Tab
              key={label}
              label={label}
              sx={{
                fontFamily: C.font,
                fontSize: '0.75rem',
                letterSpacing: '0.08em',
                color: tab === idx ? C.cyan : C.textDim,
                textShadow: tab === idx ? glowCyan : 'none',
                '&.Mui-selected': { color: C.cyan },
                minHeight: 'unset',
                py: '0.5rem',
              }}
            />
          ))}
        </Tabs>

        {/* ── Daily tab ──────────────────────────────────────────────────── */}
        {tab === 0 && (
          <Box sx={{
            background: C.panel,
            border: `1px solid ${C.borderDim}`,
            borderRadius: '4px',
            boxShadow: `0 0 12px ${C.cyan}22`,
            overflow: 'hidden',
          }}>
            {loadingDaily
              ? <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '12rem' }}>
                  <CircularProgress sx={{ color: C.cyan }} />
                </Box>
              : errorDaily
                ? <p style={{ color: C.red, fontFamily: C.font, textAlign: 'center', padding: '2rem', margin: 0 }}>
                    {t('weather.errorDaily')}
                  </p>
                : <DailyTable rows={dailyRows} />
            }
          </Box>
        )}

        {/* ── Hourly tab ─────────────────────────────────────────────────── */}
        {tab === 1 && (
          <Box sx={{
            background: C.panel,
            border: `1px solid ${C.borderDim}`,
            borderRadius: '4px',
            boxShadow: `0 0 12px ${C.cyan}22`,
            overflow: 'hidden',
          }}>
            {loadingHourly
              ? <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '12rem' }}>
                  <CircularProgress sx={{ color: C.cyan }} />
                </Box>
              : errorHourly
                ? <p style={{ color: C.red, fontFamily: C.font, textAlign: 'center', padding: '2rem', margin: 0 }}>
                    {t('weather.errorHourly')}
                  </p>
                : <HourlyTable rows={hourlyRows} />
            }
          </Box>
        )}

        {/* ── Legend ─────────────────────────────────────────────────────── */}
        <Box sx={{
          mt: '1.5rem',
          pt: '1rem',
          borderTop: `1px solid ${C.borderDim}`,
          display: 'flex',
          gap: '1.5rem',
          flexWrap: 'wrap',
          fontSize: '0.68rem',
          color: C.textDim,
          fontFamily: C.font,
          letterSpacing: '0.03em',
        }}>
          <span><span style={{ color: C.magenta }}>▶</span> {t('weather.legendCurrent')}</span>
          <span>{t('weather.legendThermal')}</span>
          <span>{t('weather.legendGust')}</span>
          <span>{t('weather.legendNoData')}</span>
          <LegendTemp />
          <LegendRain />
          <LegendUV />
        </Box>
      </Box>
    </Box>
  );
};

// ── Inline legend helpers ─────────────────────────────────────────────────────
const LegendTemp: React.FC = () => {
  const { t } = useTranslation();
  return (
    <span>
      {t('weather.legendTempLabel')}{' '}
      <span style={{ color: '#8888ff' }}>{'<0'}</span>{' '}
      <span style={{ color: C.cyan }}>0-10</span>{' '}
      <span style={{ color: C.green }}>10-20</span>{' '}
      <span style={{ color: C.yellow }}>20-28</span>{' '}
      <span style={{ color: C.orange }}>28-35</span>{' '}
      <span style={{ color: '#ff2200' }}>{'>35 °C'}</span>
    </span>
  );
};

const LegendRain: React.FC = () => {
  const { t } = useTranslation();
  return (
    <span>
      {t('weather.legendRainLabel')}{' '}
      <span style={{ color: C.textDim }}>0-20%</span>{' '}
      <span style={{ color: C.yellow }}>20-40%</span>{' '}
      <span style={{ color: C.orange }}>40-70%</span>{' '}
      <span style={{ color: C.red }}>{'>70%'}</span>
    </span>
  );
};

const LegendUV: React.FC = () => {
  const { t } = useTranslation();
  return (
    <span>
      {t('weather.legendUvLabel')}{' '}
      <span style={{ color: C.green }}>{t('weather.legendUvLow')}</span>{' '}
      <span style={{ color: C.yellow }}>{t('weather.legendUvMid')}</span>{' '}
      <span style={{ color: C.orange }}>{t('weather.legendUvHigh')}</span>{' '}
      <span style={{ color: C.red }}>{t('weather.legendUvVeryHigh')}</span>
    </span>
  );
};
