import { TimerMode } from "../../../data-model/pomodoro";

export const formatToTwoDigits = (timeDigit: number): string => timeDigit < 10 ? `0${timeDigit}` : `${timeDigit}`;

export const formatTimeChain = ([hours, minutes, seconds]: string[]) => `${Math.round((+hours) * 60 + (+minutes) + (+seconds) / 60)}`;

export const showTimerChain = (modeList: TimerMode[], currentMode: string, currentTime: string): string => {
  let printed = '';
  const modeIndex = modeList.findIndex(({name}) => name === currentMode);
  modeList[modeIndex].chain.forEach((chainItem, i) => {
    if (i === 0) {
      printed = (chainItem !== '0') ? `${formatTimeChain(chainItem.split(':'))}` : '0';
    } else {
      printed = `${printed} + ${formatTimeChain(chainItem.split(':'))}`;
    }
  });
  const currentTimeSplited = currentTime.split(':');
  return printed === '0' ? (
    (currentTimeSplited.length < 3) ?
      formatTimeChain(['00', ...currentTimeSplited])
      : formatTimeChain(currentTimeSplited)
  ) : printed;
};

export const getCurrentChainFromModeName = (modeList: TimerMode[], modeName: string): string[] => modeList[modeList.findIndex(({name}) => name === modeName)].chain;

export const getCurrentChainItem = (currentChain: string[], index: number, currentTime: string): string => currentChain[index] === '0' ? currentTime : currentChain[index];

export const parseFromTimeFieldToTimeToShow = (timeField: string): string => {
  const timeValueSplitted = timeField.split(':');
  return `${formatToTwoDigits((+timeValueSplitted[0] * 60) + +timeValueSplitted[1])}:${timeValueSplitted[2]}`;
};
