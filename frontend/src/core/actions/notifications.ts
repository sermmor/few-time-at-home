
import { notificationsDataModelMock } from "../../data-model/mock/notificationsMock";
import { NotificationsDataModel } from "../../data-model/notifications";
import { fetchJsonReceive, fetchJsonSendAndReceive } from "../fetch-utils";
import { areNotificationsEnabledEndpoint, notificationsEndpoint } from "../urls-and-end-points";

const getNotifications = (): Promise<NotificationsDataModel> => 
  fetchJsonReceive<NotificationsDataModel>(notificationsEndpoint(), notificationsDataModelMock());

const sendNotifications = (data: NotificationsDataModel) => 
  fetchJsonSendAndReceive<NotificationsDataModel>(notificationsEndpoint(), data, notificationsDataModelMock());

const getAreNotificationsEnabled = (): Promise<boolean> => new Promise<boolean>(resolve => {
  fetchJsonReceive<{isAlertReady: boolean}>(areNotificationsEnabledEndpoint(), {isAlertReady: true}).then((({isAlertReady}) => resolve(isAlertReady)));
})

export const NotificationsActions = { getNotifications, sendNotifications, getAreNotificationsEnabled };
