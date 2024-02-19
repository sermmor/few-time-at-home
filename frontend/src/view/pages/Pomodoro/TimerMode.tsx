import { TimerMode } from "../../../data-model/pomodoro";

export const formatToTwoDigits = (timeDigit: number): string => timeDigit < 10 ? `0${timeDigit}` : `${timeDigit}`;

export const formatTimeChain = ([hours, minutes, seconds]: string[]) => `${Math.round((+hours) * 60 + (+minutes) + (+seconds) / 60)}`;

export const prefixTimeChainItem = (indexItem: number) => (indexItem === 0) ? <></> : <> + </>;

export const showTimerChain = (modeList: TimerMode[], currentModeIndex: number, currentMode: string, currentTime: string): JSX.Element => {
  let printed = '';
  const modeIndex = modeList.findIndex(({name}) => name === currentMode);

  if (printed === '0') {
    const currentTimeSplited = currentTime.split(':');
    return (currentTimeSplited.length < 3) ?
        <span>{formatTimeChain(['00', ...currentTimeSplited])}</span>
        : <span>{formatTimeChain(currentTimeSplited)}</span>
  }

  return <>
    {modeList[modeIndex].chain.map((chainItem, i) => {
      if (i === 0) {
        return (chainItem !== '0') ? `${printed}${formatTimeChain(chainItem.split(':'))}` : `${printed}0`;
      } else {
        return `${formatTimeChain(chainItem.split(':'))}`;
      }
    }).map((chainItem, i) => {
      if (i === currentModeIndex) {
        return <>{prefixTimeChainItem(i)}<span style={{color: 'red'}}>{chainItem}</span></>;
      } else if (i < currentModeIndex) {
        return <>{prefixTimeChainItem(i)}<span style={{color: '#dddddd'}}>{chainItem}</span></>;
      } else {
        return <span>{prefixTimeChainItem(i)}{chainItem}</span>
      }
    })}
  </>;
};

export const getCurrentChainFromModeName = (modeList: TimerMode[], modeName: string): string[] => modeList[modeList.findIndex(({name}) => name === modeName)].chain;

export const getCurrentChainItem = (currentChain: string[], index: number, currentTime: string): string => currentChain[index] === '0' ? currentTime : currentChain[index];

export const parseFromTimeFieldToTimeToShow = (timeField: string): string => {
  const timeValueSplitted = timeField.split(':');
  return `${formatToTwoDigits((+timeValueSplitted[0] * 60) + +timeValueSplitted[1])}:${timeValueSplitted[2]}`;
};
