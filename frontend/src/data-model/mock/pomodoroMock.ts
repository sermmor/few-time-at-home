import { TimerMode } from '../pomodoro';

export const pomodoroDataModelMock = (): {data: TimerMode[]} => ({ data: [
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
  {
    name: 'Test',
    chain: [
      '00:00:25', '00:00:05',
      '00:00:25', '00:00:05',
      '00:00:25', '00:00:05',
      '00:00:25', '00:00:05',
    ],
  }
]});
