import React from 'react';
import {
  Alert as MuiAlert,
  Box,
  Button,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import AddIcon               from '@mui/icons-material/Add';
import CakeIcon              from '@mui/icons-material/Cake';
import DeleteIcon            from '@mui/icons-material/Delete';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import SaveIcon              from '@mui/icons-material/Save';
import { useConfiguredDialogAlphas } from '../../../core/context/DialogAlphasContext';
import { NotificationsActions }      from '../../../core/actions/notifications';
import { AlertData, BirthdayData }   from '../../../data-model/notifications';
import { FetchErrorBanner }          from '../../molecules/FetchErrorBanner/FetchErrorBanner';

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS_OF_WEEK = [
  { value: 1, label: 'Lunes'     },
  { value: 2, label: 'Martes'    },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves'    },
  { value: 5, label: 'Viernes'   },
  { value: 6, label: 'Sábado'    },
  { value: 7, label: 'Domingo'   },
];

type RecurrenceType = 'once' | 'weekly' | 'monthly';

const getRecurrenceType = (item: AlertData): RecurrenceType => {
  if (item.isHappensEveryweek)  return 'weekly';
  if (item.isHappensEverymonth) return 'monthly';
  return 'once';
};

const pad = (n: number) => String(n).padStart(2, '0');

/** ISO string → datetime-local input value (YYYY-MM-DDTHH:mm) */
const toDateTimeLocal = (iso: string): string => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch { return ''; }
};

/**
 * Birthday date → date input value (YYYY-MM-DD).
 * When no year is stored, 2000 is used as a visual placeholder.
 */
const toBirthdayDate = (day: number, month: number, year?: number): string =>
  `${year ?? 2000}-${pad(month)}-${pad(day)}`;

/**
 * Date input value → { day, month, year? }.
 * Year 2000 is treated as "no year" (undefined).
 */
const fromBirthdayDate = (value: string): { day: number; month: number; year?: number } => {
  if (!value) return { day: 1, month: 1 };
  const [y, m, d] = value.split('-').map(Number);
  return { day: d, month: m, year: y !== 2000 ? y : undefined };
};

// ─── Title style (same as TitleAndList / Cloud) ───────────────────────────────

const titleSx = {
  textTransform: 'uppercase',
  color: 'white',
  fontWeight: 700,
  textShadow: `
    -1px -1px 0 black,
     1px -1px 0 black,
    -1px  1px 0 black,
     1px  1px 0 black,
    -1px     0 0 black,
     1px     0 0 black,
         0 -1px 0 black,
         0  1px 0 black
  `,
} as const;

// ─── Alert Card ───────────────────────────────────────────────────────────────

interface AlertCardProps {
  item:     AlertData;
  index:    number;
  alpha:    number;
  onEdit:   (index: number, updates: Partial<AlertData>) => void;
  onDelete: (index: number) => void;
}

const AlertCard: React.FC<AlertCardProps> = ({ item, index, alpha, onEdit, onDelete }) => {
  const recurrenceType = getRecurrenceType(item);

  const handleRecurrenceChange = (_: React.MouseEvent<HTMLElement>, value: RecurrenceType | null) => {
    if (!value) return;
    onEdit(index, {
      isHappensEveryweek:  value === 'weekly',
      isHappensEverymonth: value === 'monthly',
      dayOfWeek:  value === 'weekly'  ? (item.dayOfWeek  ?? 1) : item.dayOfWeek,
      dayOfMonth: value === 'monthly' ? (item.dayOfMonth ?? 1) : item.dayOfMonth,
    });
  };

  return (
    <Paper elevation={2} sx={{ p: 2, borderRadius: 2, opacity: alpha }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'text.secondary' }}>
          Alerta {index + 1}
        </Typography>
        <IconButton size="small" onClick={() => onDelete(index)} color="error" aria-label="eliminar alerta">
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Box>

      <TextField
        label="Mensaje"
        size="small"
        fullWidth
        value={item.message}
        onChange={e => onEdit(index, { message: e.target.value })}
      />

      <TextField
        label="Fecha y hora"
        type="datetime-local"
        size="small"
        fullWidth
        sx={{ mt: 1.5 }}
        InputLabelProps={{ shrink: true }}
        value={toDateTimeLocal(item.timeToLaunch)}
        onChange={e => {
          if (e.target.value) onEdit(index, { timeToLaunch: new Date(e.target.value).toISOString() });
        }}
      />

      <Box sx={{ mt: 1.5 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
          Repetición
        </Typography>
        <ToggleButtonGroup
          exclusive
          value={recurrenceType}
          onChange={handleRecurrenceChange}
          size="small"
          sx={{ width: '100%' }}
        >
          <ToggleButton value="once"    sx={{ flex: 1, textTransform: 'none' }}>Una vez</ToggleButton>
          <ToggleButton value="weekly"  sx={{ flex: 1, textTransform: 'none' }}>Semanal</ToggleButton>
          <ToggleButton value="monthly" sx={{ flex: 1, textTransform: 'none' }}>Mensual</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {recurrenceType === 'weekly' && (
        <FormControl fullWidth size="small" sx={{ mt: 1.5 }}>
          <InputLabel>Día de la semana</InputLabel>
          <Select
            label="Día de la semana"
            value={item.dayOfWeek ?? 1}
            onChange={e => onEdit(index, { dayOfWeek: e.target.value as number })}
          >
            {DAYS_OF_WEEK.map(d => (
              <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {recurrenceType === 'monthly' && (
        <TextField
          label="Día del mes (1 – 28)"
          type="number"
          size="small"
          fullWidth
          sx={{ mt: 1.5 }}
          inputProps={{ min: 1, max: 28 }}
          value={item.dayOfMonth ?? 1}
          onChange={e => onEdit(index, { dayOfMonth: Math.max(1, Math.min(28, +e.target.value)) })}
        />
      )}
    </Paper>
  );
};

// ─── Birthday Card ────────────────────────────────────────────────────────────

interface BirthdayCardProps {
  item:     BirthdayData;
  index:    number;
  alpha:    number;
  onEdit:   (index: number, updates: Partial<BirthdayData>) => void;
  onDelete: (index: number) => void;
}

const BirthdayCard: React.FC<BirthdayCardProps> = ({ item, index, alpha, onEdit, onDelete }) => (
  <Paper elevation={2} sx={{ p: 2, borderRadius: 2, opacity: alpha }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <CakeIcon fontSize="small" color="primary" />
        <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'text.secondary' }}>
          Cumpleaños {index + 1}
        </Typography>
      </Box>
      <IconButton size="small" onClick={() => onDelete(index)} color="error" aria-label="eliminar cumpleaños">
        <DeleteIcon fontSize="small" />
      </IconButton>
    </Box>

    {/* Name */}
    <TextField
      label="Nombre"
      size="small"
      fullWidth
      value={item.name}
      onChange={e => onEdit(index, { name: e.target.value })}
    />

    {/* Date — uses type="date" for a native calendar picker */}
    <TextField
      label="Fecha de cumpleaños"
      type="date"
      size="small"
      fullWidth
      sx={{ mt: 1.5 }}
      InputLabelProps={{ shrink: true }}
      value={toBirthdayDate(item.day, item.month, item.year)}
      onChange={e => {
        if (e.target.value) onEdit(index, fromBirthdayDate(e.target.value));
      }}
      helperText="Si el año es 2000 se ignora. Cualquier otro año se usa para calcular la edad."
    />

    {/* Reminder hour */}
    <FormControl fullWidth size="small" sx={{ mt: 1.5 }}>
      <InputLabel>Hora del recordatorio</InputLabel>
      <Select
        label="Hora del recordatorio"
        value={item.reminderHour}
        onChange={e => onEdit(index, { reminderHour: e.target.value as number })}
      >
        {Array.from({ length: 24 }, (_, h) => (
          <MenuItem key={h} value={h}>{pad(h)}:00</MenuItem>
        ))}
      </Select>
    </FormControl>
  </Paper>
);

// ─── Save Button ──────────────────────────────────────────────────────────────

const SaveButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  const [saved, setSaved] = React.useState(false);
  const handleClick = () => {
    onClick();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  return (
    <Button
      variant="contained"
      startIcon={<SaveIcon />}
      onClick={handleClick}
      color={saved ? 'success' : 'primary'}
      sx={{ minWidth: '10rem', textTransform: 'none' }}
    >
      {saved ? '¡Guardado!' : 'Guardar'}
    </Button>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export const Notifications = () => {
  const alphas = useConfiguredDialogAlphas();

  const [tab,                    setTab]                    = React.useState(0);
  const [alerts,                 setAlerts]                 = React.useState<AlertData[]>([]);
  const [birthdays,              setBirthdays]              = React.useState<BirthdayData[]>([]);
  const [isNotificationsEnabled, setIsNotificationsEnabled] = React.useState(true);
  const [loading,                setLoading]                = React.useState(true);
  const [fetchError,             setFetchError]             = React.useState<string | null>(null);
  const [retryCount,             setRetryCount]             = React.useState(0);

  React.useEffect(() => {
    setLoading(true);
    setFetchError(null);
    Promise.all([
      NotificationsActions.getNotifications(),
      NotificationsActions.getBirthdays(),
      NotificationsActions.getAreNotificationsEnabled(),
    ])
      .then(([notifData, birthdayData, enabled]) => {
        setAlerts(notifData.alerts ?? []);
        setBirthdays((birthdayData as any).birthdays ?? []);
        setIsNotificationsEnabled(enabled);
        setLoading(false);
      })
      .catch(() => {
        setFetchError('No se pudieron cargar las notificaciones.');
        setLoading(false);
      });
  }, [retryCount]);

  // ── Alerts ────────────────────────────────────────────────────────────────

  const editAlert   = (index: number, updates: Partial<AlertData>) =>
    setAlerts(prev => prev.map((item, i) => i === index ? { ...item, ...updates } : item));

  const deleteAlert = (index: number) =>
    setAlerts(prev => prev.filter((_, i) => i !== index));

  const addAlert = () => {
    const today = new Date();
    setAlerts(prev => [
      ...prev,
      { timeToLaunch: today.toISOString(), message: 'Nueva alerta', isHappensEveryweek: false, isHappensEverymonth: false },
    ]);
  };

  const saveAlerts = () => NotificationsActions.sendNotifications({ alerts });

  // ── Birthdays ──────────────────────────────────────────────────────────────

  const editBirthday   = (index: number, updates: Partial<BirthdayData>) =>
    setBirthdays(prev => prev.map((item, i) => i === index ? { ...item, ...updates } : item));

  const deleteBirthday = (index: number) =>
    setBirthdays(prev => prev.filter((_, i) => i !== index));

  const addBirthday = () =>
    setBirthdays(prev => [...prev, { name: 'Nuevo', day: 1, month: 1, reminderHour: 9 }]);

  const saveBirthdays = () => NotificationsActions.sendBirthdays({ birthdays });

  // ── Shared style for the sticky toolbar strips ────────────────────────────

  const toolbarSx = {
    backgroundColor: `rgba(255,255,255,${alphas.general})`,
    backdropFilter:  'blur(4px)',
    borderRadius:    1,
    px: { xs: 1, sm: 1.5 },
    py: 0.75,
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">Cargando…</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 640, mx: 'auto', px: { xs: 1.5, sm: 3 }, py: 3 }}>
      {/* Title — same style as Cloud / TitleAndList */}
      <Typography variant="h5" sx={{ ...titleSx, mb: 2 }}>
        Notificaciones
      </Typography>

      {fetchError && (
        <FetchErrorBanner
          message={fetchError}
          onRetry={() => setRetryCount(c => c + 1)}
        />
      )}

      {!isNotificationsEnabled && (
        <MuiAlert severity="warning" sx={{ mb: 2 }}>
          Las notificaciones están desactivadas (el bot de Telegram no está disponible).
        </MuiAlert>
      )}

      {/* Tabs — white translucent strip */}
      <Box sx={{ ...toolbarSx, mb: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 44 }}
        >
          <Tab
            icon={<NotificationsNoneIcon fontSize="small" />}
            iconPosition="start"
            label="Alertas"
            sx={{ textTransform: 'none', fontWeight: 600, minHeight: 44 }}
          />
          <Tab
            icon={<CakeIcon fontSize="small" />}
            iconPosition="start"
            label="Cumpleaños"
            sx={{ textTransform: 'none', fontWeight: 600, minHeight: 44 }}
          />
        </Tabs>
      </Box>

      {/* ── Alertas tab ─────────────────────────────────────────────────── */}
      {tab === 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {alerts.length === 0 && (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              No hay alertas configuradas.
            </Typography>
          )}
          {alerts.map((item, index) => (
            <AlertCard
              key={index}
              item={item}
              index={index}
              alpha={alphas.general}
              onEdit={editAlert}
              onDelete={deleteAlert}
            />
          ))}

          {/* Button row — white translucent strip */}
          <Box sx={{ ...toolbarSx, display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={addAlert} sx={{ textTransform: 'none' }}>
              Añadir alerta
            </Button>
            <SaveButton onClick={saveAlerts} />
          </Box>
        </Box>
      )}

      {/* ── Cumpleaños tab ──────────────────────────────────────────────── */}
      {tab === 1 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {birthdays.length === 0 && (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              No hay cumpleaños guardados.
            </Typography>
          )}
          {birthdays.map((item, index) => (
            <BirthdayCard
              key={index}
              item={item}
              index={index}
              alpha={alphas.general}
              onEdit={editBirthday}
              onDelete={deleteBirthday}
            />
          ))}

          {/* Button row — white translucent strip */}
          <Box sx={{ ...toolbarSx, display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={addBirthday} sx={{ textTransform: 'none' }}>
              Añadir cumpleaños
            </Button>
            <SaveButton onClick={saveBirthdays} />
          </Box>
        </Box>
      )}
    </Box>
  );
};
