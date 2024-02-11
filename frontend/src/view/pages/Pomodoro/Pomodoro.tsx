import React from "react";
import { Box, Button, MenuItem, Select, SxProps, Theme, Typography } from "@mui/material";
import { TemporalData } from "../../../service/temporalData.service";

interface TimerMode {
  name: string;
  chain: string[]; // If 0, then use countdown field content.
}

const formStyle: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
};

const rowFormStyle = (): SxProps<Theme> => ({
  display: 'flex',
  flexDirection: {xs: 'column', sm:'row'},
  gap: '2rem',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: {xs: '15.5rem', sm: '27rem', md: '50rem'},
});

const alarmPath = `${process.env.PUBLIC_URL}/alarm.mp3`;

const oneSecond = 1000;

const formatToTwoDigits = (timeDigit: number): string => timeDigit < 10 ? `0${timeDigit}` : `${timeDigit}`;

const setTimeDispachers: {setTimeToShow: React.Dispatch<React.SetStateAction<string>> | undefined; setTimeRunning: React.Dispatch<React.SetStateAction<boolean>> | undefined, onFinishedCountDown: (() => void) | undefined } = {
  setTimeToShow: undefined,
  setTimeRunning: undefined,
  onFinishedCountDown: undefined,
}

const countDownTime = () => {
  if (TemporalData.TimeLeftPomodoro.minutes <= 0 && TemporalData.TimeLeftPomodoro.seconds <= 0) {
    console.log("Pomodoro FINISHED");
    const audio = new Audio(alarmPath);
    audio.volume = 1;
    audio.play();
    setTimeDispachers.setTimeRunning!(false);
    setTimeDispachers.onFinishedCountDown!();
  } else if (TemporalData.TimeLeftPomodoro.seconds <= 0) {
    TemporalData.TimeLeftPomodoro.minutes--;
    TemporalData.TimeLeftPomodoro.seconds = 59;
    setTimeDispachers.setTimeToShow!(`${formatToTwoDigits(TemporalData.TimeLeftPomodoro.minutes)}:${formatToTwoDigits(TemporalData.TimeLeftPomodoro.seconds)}`);
    setTimeout(()=> countDownTime(), oneSecond);
  } else {
    TemporalData.TimeLeftPomodoro.seconds--;
    setTimeDispachers.setTimeToShow!(`${formatToTwoDigits(TemporalData.TimeLeftPomodoro.minutes)}:${formatToTwoDigits(TemporalData.TimeLeftPomodoro.seconds)}`);
    setTimeout(()=> countDownTime(), oneSecond);
  }
};

const formatTimeChain = ([hours, minutes, seconds]: string[]) => `${Math.round((+hours) * 60 + (+minutes) + (+seconds) / 60)}`;

const showTimerChain = (modeList: TimerMode[], currentMode: string, currentTime: string): string => {
  let printed = '';
  const modeIndex = modeList.findIndex(({name}) => name === currentMode);
  modeList[modeIndex].chain.forEach((chainItem, i) => {
    if (i === 0) {
      printed = (chainItem !== '0') ? `${formatTimeChain(chainItem.split(':'))}` : '0';
    } else {
      printed = `${printed} + ${formatTimeChain(chainItem.split(':'))}`;
    }
  });
  return printed === '0' ? formatTimeChain((`00:${currentTime}`).split(':')) : printed;
};

const listBaseMode: TimerMode[] = [
  {
    name: 'One Countdown',
    chain: ['0'], // If 0, then use countdown field content.
  },
  {
    name: 'Pomodoro',
    chain: [
      '00:25:00', '00:05:00',
      '00:25:00', '00:05:00',
      '00:25:00', '00:05:00',
      '00:25:00', '00:05:00',
    ],
  },
  // {
  //   name: 'Test',
  //   chain: [
  //     '00:00:25', '00:00:05',
  //     '00:00:25', '00:00:05',
  //     '00:00:25', '00:00:05',
  //     '00:00:25', '00:00:05',
  //   ],
  // }
];

const getCurrentChainFromModeName = (modeList: TimerMode[], modeName: string): string[] => modeList[modeList.findIndex(({name}) => name === modeName)].chain;

const getCurrentChainItem = (currentChain: string[], index: number, currentTime: string): string => currentChain[index] === '0' ? currentTime : currentChain[index];

const parseFromTimeFieldToTimeToShow = (timeField: string): string => {
  const timeValueSplitted = timeField.split(':');
  return `${formatToTwoDigits((+timeValueSplitted[0] * 60) + +timeValueSplitted[1])}:${timeValueSplitted[2]}`;
}

export const Pomodoro = (): JSX.Element => {
  // MM:SS
  const [isTimeRunning, setTimeRunning] = React.useState<boolean>(false);
  const [time, setTime] = React.useState<string>(TemporalData.getFormatTimeLeftPomodoro());
  const [timeToShow, setTimeToShow] = React.useState<string>(TemporalData.getFormatTimeLeftPomodoro());
  const [currentMode, setCurrentMode] = React.useState<string>(listBaseMode[0].name);
  const [currentChain, setCurrentChain] = React.useState<string[]>(listBaseMode[0].chain);
  const [currentChainIndex, setCurrentChainIndex] = React.useState<number>(0);

  const runTimer = (chainIndex: number) => {
    const realTime = getCurrentChainItem(currentChain, chainIndex, time);
    const realTimeToShow = parseFromTimeFieldToTimeToShow(realTime);
    setTime(realTime);
    setTimeToShow(realTimeToShow);
    setTimeRunning(true);
    const splitedTime = realTimeToShow.split(':');
    TemporalData.TimeLeftPomodoro.minutes = +splitedTime[0];
    TemporalData.TimeLeftPomodoro.seconds = +splitedTime[1];
    countDownTime();
  }

  setTimeDispachers.setTimeRunning = setTimeRunning;
  setTimeDispachers.setTimeToShow = setTimeToShow;
  setTimeDispachers.onFinishedCountDown = () => {
    let nextChainIndex = 0;
    let nextTime = time;
    if (currentChainIndex + 1 >= currentChain.length) {
      nextChainIndex = 0;
      nextTime = getCurrentChainItem(currentChain, nextChainIndex, time);
      setCurrentChainIndex(nextChainIndex);
    } else {
      nextChainIndex = currentChainIndex + 1;
      nextTime = getCurrentChainItem(currentChain, nextChainIndex, time);
      setCurrentChainIndex(nextChainIndex);
    }
    if (nextChainIndex > 0) {
      runTimer(nextChainIndex);
    } else {
      setTime(nextTime);
      setTimeToShow(parseFromTimeFieldToTimeToShow(nextTime));
    }
  };

  return <Box sx={formStyle}>
    <Box sx={{...rowFormStyle(), justifyContent: 'left', marginLeft: '17.75rem'}}>
      <Typography variant='h6' sx={{textTransform: 'uppercase'}}>Mode:</Typography>
      <Select
        value={currentMode}
        onChange={evt => { setCurrentMode(evt.target.value); setCurrentChainIndex(0); setCurrentChain(getCurrentChainFromModeName(listBaseMode, evt.target.value)) }}
        sx={{minWidth: '15.5rem'}}
      >
        {
          listBaseMode.map(({ name: nameMode }) => <MenuItem value={nameMode} key={nameMode} sx={{textTransform: 'uppercase'}}>{nameMode.toUpperCase()}</MenuItem>)
        }
      </Select>
      <Typography variant='h6' sx={{textTransform: 'uppercase'}}>{showTimerChain(listBaseMode, currentMode, time)}</Typography>
    </Box>
    <Box sx={rowFormStyle()}>
      <Typography variant='h6' sx={{textTransform: 'uppercase'}}>Time to countdown:</Typography>
      <input
        id="appt-time"
        type="time"
        name="appt-time"
        step="2"
        style={{
          minWidth: '7rem',
          minHeight: '1.75rem'
        }}
        value={time}
        disabled={isTimeRunning}
        onChange={evt => {
          setTime(evt.target.value);
          setTimeToShow(parseFromTimeFieldToTimeToShow(evt.target.value));
        }}
      />
      <Button
        variant='outlined'
        sx={{minWidth: '7rem'}}
        onClick={() => {
          if (!isTimeRunning) {
            runTimer(currentChainIndex);
          } else {
            setTimeRunning(false);
            TemporalData.TimeLeftPomodoro.minutes = 0;
            TemporalData.TimeLeftPomodoro.seconds = 0;
            setTimeToShow('00:00');
          }
        }}
        >
        {isTimeRunning ? 'Stop' : 'Start'}
      </Button>
    </Box>
    <Typography sx={{textTransform: 'uppercase', fontSize: '20rem'}}>{timeToShow}</Typography> {/* TODO: <= PUT STYLE FOR DIFERENTS SCREEN SIZES */}
  </Box>;
};
