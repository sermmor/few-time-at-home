import React from "react";
import { Box, Button, SxProps, Theme, Typography } from "@mui/material";
import { TemporalData } from "../../../service/temporalData.service";

const formStyle: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
};

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
}

export const Pomodoro = (): JSX.Element => {
  // MM:SS
  const [isTimeRunning, setTimeRunning] = React.useState<boolean>(false);
  const [time, setTime] = React.useState<string>(TemporalData.getFormatTimeLeftPomodoro());
  const [timeToShow, setTimeToShow] = React.useState<string>(TemporalData.getFormatTimeLeftPomodoro());

  setTimeDispachers.setTimeRunning = setTimeRunning;
  setTimeDispachers.setTimeToShow = setTimeToShow;
  setTimeDispachers.onFinishedCountDown = () => {
    const timeValueSplitted = time.split(':');
    const timeValue = `${formatToTwoDigits((+timeValueSplitted[0] * 60) + +timeValueSplitted[1])}:${timeValueSplitted[2]}`;
    setTimeToShow(timeValue);
  };

  return <Box sx={formStyle}>
    <Box sx={{display: 'flex', flexDirection: {xs: 'column', sm:'row'}, gap: '2rem', alignItems: 'center', justifyContent: 'center', minWidth: {xs: '15.5rem', sm: '27rem', md: '50rem'}}}>
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
          const timeValueSplitted = evt.target.value.split(':');
          const timeValue = `${formatToTwoDigits((+timeValueSplitted[0] * 60) + +timeValueSplitted[1])}:${timeValueSplitted[2]}`;
          setTime(evt.target.value);
          setTimeToShow(timeValue);
        }}
      />
      <Button
        variant='outlined'
        sx={{minWidth: '7rem'}}
        onClick={() => {
          if (!isTimeRunning) {
            setTimeRunning(true);
            const splitedTime = timeToShow.split(':');
            TemporalData.TimeLeftPomodoro.minutes = +splitedTime[0];
            TemporalData.TimeLeftPomodoro.seconds = +splitedTime[1];
            countDownTime();
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
