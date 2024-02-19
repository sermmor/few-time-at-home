import React from "react";
import { Box, Button, CircularProgress, MenuItem, Select, SxProps, Theme, Typography } from "@mui/material";
import { TemporalData } from "../../../service/temporalData.service";
import { formatToTwoDigits, getCurrentChainFromModeName, getCurrentChainItem, parseFromTimeFieldToTimeToShow, showTimerChain } from "./TimerMode";
import { TimerMode } from "../../../data-model/pomodoro";
import { PomodoroActions } from "../../../core/actions/pomodoro";

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

export const Pomodoro = (): JSX.Element => {
  // MM:SS
  const [listModes, setListModes] = React.useState<TimerMode[]>();
  const [isTimeRunning, setTimeRunning] = React.useState<boolean>(false);
  const [time, setTime] = React.useState<string>(TemporalData.getFormatTimeLeftPomodoro());
  const [timeToShow, setTimeToShow] = React.useState<string>(TemporalData.getFormatTimeLeftPomodoro());
  const [currentMode, setCurrentMode] = React.useState<string>(listModes ? listModes[0].name : '');
  const [currentChain, setCurrentChain] = React.useState<string[]>(listModes ? listModes[0].chain : []);
  const [currentChainIndex, setCurrentChainIndex] = React.useState<number>(0);

  React.useEffect(() => { PomodoroActions.getTimeModeList().then(({data}) => {
    setListModes(data);
    setCurrentMode(data[0].name);
    setCurrentChain(data[0].chain);
  } ) }, []);

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

  if (!listModes) {
    return <Box sx={formStyle}>
    <Box sx={rowFormStyle()}>
      <CircularProgress />
    </Box>
  </Box>;
  }

  return <>
    <Box sx={formStyle}>
      <Box sx={{...rowFormStyle(), justifyContent: 'left', marginLeft: '17.75rem'}}>
        <Typography variant='h6' sx={{textTransform: 'uppercase'}}>Mode:</Typography>
        <Select
          value={currentMode}
          onChange={evt => { setCurrentMode(evt.target.value); setCurrentChainIndex(0); setCurrentChain(getCurrentChainFromModeName(listModes, evt.target.value)) }}
          sx={{minWidth: '15.5rem'}}
        >
          {
            listModes.map(({ name: nameMode }) => <MenuItem value={nameMode} key={nameMode} sx={{textTransform: 'uppercase'}}>{nameMode.toUpperCase()}</MenuItem>)
          }
        </Select>
        <Typography variant='h6' sx={{textTransform: 'uppercase'}}>{showTimerChain(listModes, currentChainIndex, currentMode, time)}</Typography>
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
    <Typography sx={{textTransform: 'uppercase', fontSize: '3rem', textAlign:'right', position: 'fixed', bottom: '0px', right: '0px'}}>{timeToShow}</Typography> {/* TODO: <= PUT STYLE FOR DIFERENTS SCREEN SIZES */}
  </>
};
