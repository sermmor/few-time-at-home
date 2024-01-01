import React from "react";
import { Box, Button, SxProps, TextField, Theme, Typography } from "@mui/material";

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

const countDownTime = (minutes: number, seconds: number, setTimeToShow: React.Dispatch<React.SetStateAction<string>>, setTimeRunning: React.Dispatch<React.SetStateAction<boolean>>) => {
  if (minutes <= 0 && seconds <= 0) {
    console.log("Pomodoro FINISHED");
    const audio = new Audio(alarmPath);
    audio.play();
    setTimeRunning(false);
  } else if (seconds <= 0) {
    setTimeToShow(`${formatToTwoDigits(minutes - 1)}:${formatToTwoDigits(59)}`);
    setTimeout(()=> countDownTime(minutes - 1, 59, setTimeToShow, setTimeRunning), oneSecond);
  } else {
    setTimeToShow(`${formatToTwoDigits(minutes)}:${formatToTwoDigits(seconds - 1)}`);
    setTimeout(()=> countDownTime(minutes, seconds - 1, setTimeToShow, setTimeRunning), oneSecond);
  }
}

export const Pomodoro = (): JSX.Element => {
  // MM:SS
  const [isTimeRunning, setTimeRunning] = React.useState<boolean>(false);
  const [time, setTime] = React.useState<string>('00:00');
  const [timeToShow, setTimeToShow] = React.useState<string>('00:00');
  return <Box sx={formStyle}>
    <Box sx={{display: 'flex', flexDirection: {xs: 'column', sm:'row'}, gap: '2rem', alignItems: 'center', justifyContent: 'center', minWidth: {xs: '15.5rem', sm: '27rem', md: '50rem'}}}>
      <Typography variant='h6' sx={{textTransform: 'uppercase'}}>Time to countdown:</Typography>
      <TextField
        label="Time to send"
        variant="standard"
        type="time"
        value={time}
        sx={{minWidth: '7rem'}}
        onChange={evt => {
          setTime(evt.target.value);
          setTimeToShow(evt.target.value);
        }}
      />
      <Button
        variant='outlined'
        sx={{minWidth: '7rem'}}
        onClick={() => {
          if (!isTimeRunning) {
            setTimeRunning(true);
            const splitedTime = time.split(':');
            countDownTime(+splitedTime[0], +splitedTime[1], setTimeToShow, setTimeRunning);
          }
        }}
        >
        Start
      </Button>
    </Box>
    <Typography sx={{textTransform: 'uppercase', fontSize: '20rem'}}>{timeToShow}</Typography>
  </Box>;
};
