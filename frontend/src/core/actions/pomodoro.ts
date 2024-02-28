import { pomodoroDataModelMock } from "../../data-model/mock/pomodoroMock";
import { TimerMode } from "../../data-model/pomodoro";
import { fetchJsonReceive, fetchJsonSendAndReceive } from "../fetch-utils";
import { pomodoroEndpoint } from "../urls-and-end-points";

const getTimeModeList = (): Promise<{data: TimerMode[]}> => 
  fetchJsonReceive<{data: TimerMode[]}>(pomodoroEndpoint(), pomodoroDataModelMock());

const sendNewTimeMode = (data: TimerMode[]) =>
  fetchJsonSendAndReceive<{data: TimerMode[]}>(pomodoroEndpoint(), {data}, pomodoroDataModelMock());

export const PomodoroActions = { getTimeModeList, sendNewTimeMode };
