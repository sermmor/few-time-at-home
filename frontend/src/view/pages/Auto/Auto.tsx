import { Alert, Box, Card, CardContent, CircularProgress, IconButton, Slider, Switch, SxProps, Theme, Tooltip, Typography } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import React from "react";
import { SmartDevice } from "../../../data-model/smartHome";
import { SmartHomeActions } from "../../../core/actions/smartHome";

const pageStyle: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  padding: '1.5rem',
  fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
};

const gridStyle: SxProps<Theme> = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
  gap: '1rem',
};

const rgbToHex = (rgb?: [number, number, number]): string => {
  if (!rgb) return '#ffffff';
  return '#' + rgb.map(c => c.toString(16).padStart(2, '0')).join('');
};

const hexToRgb = (hex: string): [number, number, number] => {
  const v = hex.replace('#', '');
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
};

export const Auto = () => {
  const [devices, setDevices] = React.useState<SmartDevice[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [statusMsg, setStatusMsg] = React.useState<string>('');
  const [statusOk, setStatusOk] = React.useState<boolean>(true);

  const load = React.useCallback(() => {
    setLoading(true);
    SmartHomeActions.getStatus().then(status => {
      setStatusOk(status.ok);
      setStatusMsg(status.message);
    });
    SmartHomeActions.getDevices().then(res => {
      setDevices(res.devices ?? []);
      if (res.error) { setStatusOk(false); setStatusMsg(res.error); }
      setLoading(false);
    });
  }, []);

  React.useEffect(() => { load(); }, [load]);

  // Optimistic local update of a single device.
  const patchDevice = (entityId: string, patch: Partial<SmartDevice>) =>
    setDevices(prev => prev.map(d => d.entityId === entityId ? { ...d, ...patch } : d));

  const onToggle = (device: SmartDevice) => {
    const next = !device.isOn;
    patchDevice(device.entityId, { isOn: next });
    const action = next ? SmartHomeActions.turnOn(device.entityId) : SmartHomeActions.turnOff(device.entityId);
    action.then(res => { if (!res.ok) patchDevice(device.entityId, { isOn: device.isOn }); });
  };

  const onBrightness = (device: SmartDevice, value: number) => {
    patchDevice(device.entityId, { brightnessPct: value, isOn: true });
    SmartHomeActions.setLight({ entityId: device.entityId, brightnessPct: value });
  };

  const onColorTemp = (device: SmartDevice, value: number) => {
    patchDevice(device.entityId, { colorTempKelvin: value, isOn: true });
    SmartHomeActions.setLight({ entityId: device.entityId, colorTempKelvin: value });
  };

  const onColor = (device: SmartDevice, hex: string) => {
    const rgb = hexToRgb(hex);
    patchDevice(device.entityId, { rgbColor: rgb, isOn: true });
    SmartHomeActions.setLight({ entityId: device.entityId, rgbColor: rgb });
  };

  return <Box sx={pageStyle}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <Typography variant='h5' sx={{ textTransform: 'uppercase' }}>Auto · Casa inteligente</Typography>
      <Tooltip title="Actualizar">
        <IconButton onClick={load}><RefreshIcon /></IconButton>
      </Tooltip>
      {loading && <CircularProgress size={20} />}
    </Box>

    {!statusOk && <Alert severity="warning">{statusMsg}</Alert>}
    {statusOk && statusMsg && <Alert severity="success" sx={{ display: { xs: 'none', sm: 'flex' } }}>{statusMsg}</Alert>}

    {!loading && devices.length === 0 && statusOk &&
      <Alert severity="info">
        No se ha encontrado ningún dispositivo. Configura tus enchufes y bombillas
        (Tuya/SmartLife, Tapo, eWeLink) en la sección <code>smart_home</code> de
        <code> keys.json</code> y pulsa actualizar. Consulta el README para los pasos.
      </Alert>}

    <Box sx={gridStyle}>
      {devices.map(device => (
        <DeviceCard
          key={device.entityId}
          device={device}
          onToggle={() => onToggle(device)}
          onBrightness={v => onBrightness(device, v)}
          onColorTemp={v => onColorTemp(device, v)}
          onColor={hex => onColor(device, hex)}
        />
      ))}
    </Box>
  </Box>;
};

interface DeviceCardProps {
  device: SmartDevice;
  onToggle: () => void;
  onBrightness: (value: number) => void;
  onColorTemp: (value: number) => void;
  onColor: (hex: string) => void;
}

const DeviceCard = ({ device, onToggle, onBrightness, onColorTemp, onColor }: DeviceCardProps) => {
  const isLight = device.type === 'light';
  const unreachable = device.reachable === false;
  const accent = unreachable ? '#9e9e9e' : (device.isOn ? (isLight ? '#ffb300' : '#2e7d32') : '#9e9e9e');
  const subtitle = [isLight ? 'Bombilla' : 'Enchufe', device.provider]
    .filter(Boolean).join(' · ') + (unreachable ? ' · no alcanzable' : '');

  return <Card variant="outlined" sx={{ borderColor: device.isOn && !unreachable ? accent : undefined, opacity: unreachable ? 0.6 : 1 }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isLight
            ? <LightbulbIcon sx={{ color: accent }} />
            : <PowerSettingsNewIcon sx={{ color: accent }} />}
          <Box>
            <Typography variant='subtitle1'>{device.name}</Typography>
            <Typography variant='caption' sx={{ color: unreachable ? 'error.main' : 'text.secondary' }}>
              {subtitle}
            </Typography>
          </Box>
        </Box>
        <Switch checked={device.isOn} onChange={onToggle} disabled={unreachable} />
      </Box>

      {isLight && device.isOn && !unreachable && <Box sx={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {device.supportsBrightness && <Box>
          <Typography variant='caption'>Brillo: {device.brightnessPct ?? 0}%</Typography>
          <Slider
            size="small" min={1} max={100} value={device.brightnessPct ?? 0}
            onChange={(_, v) => onBrightness(v as number)}
          />
        </Box>}

        {device.supportsColorTemp && <Box>
          <Typography variant='caption'>Calidez: {device.colorTempKelvin ?? 0} K</Typography>
          <Slider
            size="small"
            min={device.minColorTempKelvin ?? 2000}
            max={device.maxColorTempKelvin ?? 6500}
            step={50}
            value={device.colorTempKelvin ?? device.minColorTempKelvin ?? 2700}
            onChange={(_, v) => onColorTemp(v as number)}
          />
        </Box>}

        {device.supportsColor && <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Typography variant='caption'>Color:</Typography>
          <input
            type="color"
            value={rgbToHex(device.rgbColor)}
            onChange={evt => onColor(evt.target.value)}
            style={{ width: '2.5rem', height: '2rem', border: 'none', background: 'none', cursor: 'pointer' }}
          />
        </Box>}
      </Box>}
    </CardContent>
  </Card>;
};
