import { Box, Button, Checkbox, SxProps, Theme } from "@mui/material";
import React from "react";
import { NotificationsActions } from "../../../core/actions/notifications";
import { AlertData, NotificationsDataModel } from "../../../data-model/notifications";
import { LabelAndDateTimeTextField } from "../../molecules/LabelAndDateTimeTextField/LabelAndDateTimeTextField";
import { LabelAndTextField } from "../../molecules/LabelAndTextField/LabelAndTextField";
import { TitleAndList } from "../../organism/TitleAndList/TitleAndList";

const formStyle: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
};

const SaveNotificationsComponent = ({notifications}: {notifications: NotificationsDataModel}) => {
  const [isSave, setSave] = React.useState<boolean>(false);
  const setConfiguration = () => {
    NotificationsActions.sendNotifications(notifications);
    setSave(true);
    setTimeout(() => setSave(false), 500);
  }
  return <Box
    sx={{ width: '100%', display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingRight: { xs: '0rem', sm: '3rem'}, paddingBottom: '3rem'}}
    >
      <Button
        variant='contained'
        sx={{minWidth: '15.5rem'}}
        onClick={() => setConfiguration()}
        >
        Save
        </Button>
        {isSave && <Box sx={{paddingLeft: '1rem'}}>Saved!</Box>}
    </Box>
};

export const Notifications = () => {
  const [notifications, setNotifications] = React.useState<NotificationsDataModel>();
  const [isNotificationsEnabled, setIsNotificationsEnabled] = React.useState<boolean>(false);
  React.useEffect(() => {
    NotificationsActions.getNotifications().then(data => setNotifications(data));
    NotificationsActions.getAreNotificationsEnabled().then(isAlertReady => setIsNotificationsEnabled(isAlertReady));
  }, []);

  // TODO: PONER TODAS LOS CAMPOS QUE YA ESTÁN EN BACKEND Y QUITAR EL CAMPO isHappensEveryday
  /**
   export interface Alert {
      timeToLaunch: Date;
      message: string;
      isHappensEveryweek?: boolean; // ! NUEVO
      dayOfWeek?: number; // ! NUEVO
      isHappensEverymonth?: boolean; // ! NUEVO
      dayOfMonth?: number; // ! NUEVO
    }
   */
  // TODO: En backend además de la conexión con Telegram, hacerla también con el email (las alertas así se mandarán también ahí)

  const deleteActionList = (idTimeToLaunch: string) => {
    if (!notifications) return;
    const cloneList = [...notifications.alerts];
    const index = cloneList.findIndex(item => item.timeToLaunch === idTimeToLaunch);
    cloneList.splice(index, 1);
    setNotifications({alerts: [...cloneList]});
  };

  const addActionList = (itemToAdd: any) => {
    if (!notifications) return;
    const cloneList = [...notifications.alerts];
    cloneList.push(itemToAdd);
    setNotifications({alerts: [...cloneList]});
  };
  
  const editActionList = (
    idTimeToLaunch: string,
    editConfig: (newConfig: any[], index: number, newData: string | boolean) => AlertData
  ) => (newText: string | boolean) => {
    if (!notifications) return;
    const cloneList = [...notifications.alerts];
    const index = cloneList.findIndex(item => item.timeToLaunch === idTimeToLaunch);
    cloneList[index] = editConfig(cloneList, index, newText);
    setNotifications({alerts: [...cloneList]});
  };
  
  return <Box sx={formStyle}>
    {notifications && <>
      <TitleAndList
        title='Notifications'
        subtext={isNotificationsEnabled ? undefined : <p style={{color: 'red'}}>All notifications are disabled</p>}
        deleteAction={deleteActionList}
        addAction={() => {const today = new Date(); addActionList({timeToLaunch: today.toJSON(), message: 'new alert'})} }
        list={notifications.alerts.map((item) => ({id: `${item.timeToLaunch}`, item: <Box sx={{display: 'flex', flexDirection: {xs: 'column', sm:'row'}, gap: '2rem', alignContent: 'space-between', alignItems: 'center', justifyContent: 'center', width:'100%'}}>
          <LabelAndTextField
            text={item.message}
            onChange={editActionList(
              `${item.timeToLaunch}`,
              (newConfig, index, message) => ({...newConfig[index], message, })
            )}
          />
          <Box sx={{ width:'25rem' }}>
            <LabelAndDateTimeTextField
              text={item.timeToLaunch}
              onChange={editActionList(
                `${item.timeToLaunch}`,
                (newConfig, index, timeToLaunch) => ({...newConfig[index], timeToLaunch,})
              )}
            />
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'row', gap: '1rem' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', fontStyle: 'oblique', fontSize: '8pt'}}>
              <Box>isHappensEveryweek?</Box>
              <Checkbox
                checked={item.isHappensEveryweek}
                onChange={(evt) => editActionList(
                  `${item.timeToLaunch}`,
                  (newConfig, index, isHappensEveryweek) => ({...newConfig[index], isHappensEveryweek,})
                )(evt.target.checked)}
              />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column'}}>
              <Box sx={{fontStyle: 'oblique', fontSize: '8pt'}}>dayOfWeek</Box>
              <LabelAndTextField
                text={item.dayOfWeek === undefined ? '1' : `${item.dayOfWeek}`}
                onChange={editActionList(
                  `${item.timeToLaunch}`,
                  (newConfig, index, dayOfWeek) => ({...newConfig[index], dayOfWeek: +dayOfWeek < 8 ? +dayOfWeek : 7, })
                )}
              />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', fontStyle: 'oblique', fontSize: '8pt'}}>
              <Box>isHappensEverymonth?</Box>
              <Checkbox
                checked={item.isHappensEverymonth}
                onChange={(evt) => editActionList(
                  `${item.timeToLaunch}`,
                  (newConfig, index, isHappensEverymonth) => ({...newConfig[index], isHappensEverymonth,})
                )(evt.target.checked)}
              />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column'}}>
            <Box sx={{fontStyle: 'oblique', fontSize: '8pt'}}>dayOfMonth</Box>
              <LabelAndTextField
                text={item.dayOfMonth === undefined ? '1' : `${item.dayOfMonth}`}
                onChange={editActionList(
                  `${item.timeToLaunch}`,
                  (newConfig, index, dayOfMonth) => ({...newConfig[index], dayOfMonth: +dayOfMonth < 32 ? +dayOfMonth : 28, })
                )}
              />
            </Box>
          </Box>
        </Box> }))}
      />
      <SaveNotificationsComponent notifications={notifications}/>
      
      </>
    }
  </Box>
};
