
import { notificationsDataModelMock } from "../../data-model/mock/notificationsMock";
import { NotificationsDataModel } from "../../data-model/notifications";
import { fetchJsonReceive, fetchJsonSendAndReceive } from "../fetch-utils";
import { notificationsEndpoint } from "../urls-and-end-points";

const getNotifications = (): Promise<NotificationsDataModel> => 
  fetchJsonReceive<NotificationsDataModel>(notificationsEndpoint(), notificationsDataModelMock());

const sendNotifications = (data: NotificationsDataModel) => 
  fetchJsonSendAndReceive<NotificationsDataModel>(notificationsEndpoint(), data, notificationsDataModelMock());

export const NotificationsActions = { getNotifications, sendNotifications };
