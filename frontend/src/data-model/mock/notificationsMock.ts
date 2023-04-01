import { NotificationsDataModel } from "../notifications";

export const notificationsDataModelMock = (): NotificationsDataModel => ({
  alerts: [
    {
      "timeToLaunch": "2023-03-21T07:55:02.070Z",
      "message": "hora de desayunar",
      "isHappensEveryday": false
    },
    {
      "timeToLaunch": "2023-03-21T13:55:02.070Z",
      "message": "almuerzo",
      "isHappensEveryday": true
    },
    {
      "timeToLaunch": "2023-03-21T15:55:02.070Z",
      "message": "merienda",
      "isHappensEveryday": false
    },
    {
      "timeToLaunch": "2023-03-21T21:00:02.070Z",
      "message": "cena",
      "isHappensEveryday": false
    },
  ]
});
