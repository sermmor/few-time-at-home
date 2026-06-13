import {
  SmartDevicesResponse, SmartHomeStatus, SmartActionResponse, LightUpdateRequest,
  smartDevicesResponseMock, smartHomeStatusMock, smartActionResponseMock,
} from "../../data-model/smartHome";
import { fetchJsonReceive, fetchJsonSendAndReceive } from "../fetch-utils";
import { getSmartHomeEndpoint } from "../urls-and-end-points";

const getStatus = (): Promise<SmartHomeStatus> =>
  fetchJsonReceive<SmartHomeStatus>(getSmartHomeEndpoint('status'), smartHomeStatusMock());

const getDevices = (): Promise<SmartDevicesResponse> =>
  fetchJsonReceive<SmartDevicesResponse>(getSmartHomeEndpoint('devices'), smartDevicesResponseMock());

const turnOn = (entityId: string): Promise<SmartActionResponse> =>
  fetchJsonSendAndReceive<SmartActionResponse>(getSmartHomeEndpoint('turnOn'), { entityId }, smartActionResponseMock());

const turnOff = (entityId: string): Promise<SmartActionResponse> =>
  fetchJsonSendAndReceive<SmartActionResponse>(getSmartHomeEndpoint('turnOff'), { entityId }, smartActionResponseMock());

const setLight = (data: LightUpdateRequest): Promise<SmartActionResponse> =>
  fetchJsonSendAndReceive<SmartActionResponse>(getSmartHomeEndpoint('setLight'), data, smartActionResponseMock());

export const SmartHomeActions = { getStatus, getDevices, turnOn, turnOff, setLight };
