import React from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  IconButton,
  Paper,
  SxProps,
  Theme,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";

interface TimeMode {
  name: string;
  chain: string[];
}

interface PomodoroTimeModesEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const timeModePaperStyle: SxProps<Theme> = {
  padding: '1.5rem',
  marginBottom: '1.5rem',
  backgroundColor: 'rgba(245, 245, 245, 0.5)',
  border: '1px solid rgba(0, 0, 0, 0.1)',
};

const chainItemStyle: SxProps<Theme> = {
  display: 'flex',
  gap: '0.5rem',
  alignItems: 'center',
  marginBottom: '0.5rem',
};

export const PomodoroTimeModesEditor: React.FC<PomodoroTimeModesEditorProps> = ({
  value,
  onChange,
}) => {
  const [timeModes, setTimeModes] = React.useState<TimeMode[]>([]);
  const [parseError, setParseError] = React.useState<string>('');

  // Parse initial value
  React.useEffect(() => {
    try {
      if (value) {
        const parsed = JSON.parse(value);
        setTimeModes(Array.isArray(parsed) ? parsed : []);
        setParseError('');
      }
    } catch (error) {
      setParseError('Invalid JSON format');
    }
  }, [value]);

  // Update parent when timeModes changes
  const updateParent = (newTimeModes: TimeMode[]) => {
    setTimeModes(newTimeModes);
    onChange(JSON.stringify(newTimeModes, null, 2));
  };

  const updateTimeModeName = (index: number, newName: string) => {
    const updated = [...timeModes];
    updated[index].name = newName;
    updateParent(updated);
  };

  const updateChainItem = (timeModeIndex: number, chainIndex: number, newValue: string) => {
    const updated = [...timeModes];
    updated[timeModeIndex].chain[chainIndex] = newValue;
    updateParent(updated);
  };

  const addChainItem = (timeModeIndex: number) => {
    const updated = [...timeModes];
    updated[timeModeIndex].chain.push('00:05:00');
    updateParent(updated);
  };

  const removeChainItem = (timeModeIndex: number, chainIndex: number) => {
    const updated = [...timeModes];
    updated[timeModeIndex].chain.splice(chainIndex, 1);
    updateParent(updated);
  };

  const addTimeMode = () => {
    const updated = [...timeModes];
    updated.push({
      name: `New Time Mode ${timeModes.length + 1}`,
      chain: ['00:25:00', '00:05:00'],
    });
    updateParent(updated);
  };

  const removeTimeMode = (index: number) => {
    const updated = timeModes.filter((_, i) => i !== index);
    updateParent(updated);
  };

  if (parseError) {
    return (
      <Box sx={{ padding: '1rem', color: 'red' }}>
        <Typography color="error">{parseError}</Typography>
        <Typography variant="body2" sx={{ marginTop: '0.5rem' }}>
          Error parsing Pomodoro configuration. Please check the JSON format.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {timeModes.map((timeMode, timeModeIndex) => (
        <Paper key={timeModeIndex} sx={timeModePaperStyle}>
          <Box sx={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center' }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" sx={{ display: 'block', marginBottom: '0.3rem' }}>
                Time Mode Name
              </Typography>
              <TextField
                size="small"
                fullWidth
                value={timeMode.name}
                onChange={(evt) => updateTimeModeName(timeModeIndex, evt.target.value)}
                placeholder="e.g., Pomodoro, Exercise, etc."
              />
            </Box>
            <IconButton
              color="error"
              onClick={() => removeTimeMode(timeModeIndex)}
              size="small"
              sx={{ marginTop: '1.5rem' }}
            >
              <DeleteIcon />
            </IconButton>
          </Box>

          <Box sx={{ marginTop: '1rem' }}>
            <Typography variant="subtitle2" sx={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Chain Times:
            </Typography>
            {timeMode.chain.map((time, chainIndex) => (
              <Box key={chainIndex} sx={chainItemStyle}>
                <Typography sx={{ minWidth: '2rem', color: 'rgba(0, 0, 0, 0.6)' }}>
                  {chainIndex + 1}.
                </Typography>
                <TextField
                  size="small"
                  value={time}
                  onChange={(evt) => updateChainItem(timeModeIndex, chainIndex, evt.target.value)}
                  placeholder="HH:MM:SS or 0"
                  sx={{ flex: 1 }}
                />
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => removeChainItem(timeModeIndex, chainIndex)}
                  disabled={timeMode.chain.length === 1}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => addChainItem(timeModeIndex)}
              sx={{ marginTop: '0.5rem' }}
            >
              Add Time
            </Button>
          </Box>
        </Paper>
      ))}

      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={addTimeMode}
        sx={{ marginTop: '1rem', minWidth: '15.5rem' }}
      >
        Add Time Mode
      </Button>
    </Box>
  );
};
