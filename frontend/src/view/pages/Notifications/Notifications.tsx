import { Box, Button, SxProps, Theme } from "@mui/material";
import React from "react";
import { NotificationsActions } from "../../../core/actions/notifications";
import { NotificationsDataModel } from "../../../data-model/notifications";
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
  React.useEffect(() => { NotificationsActions.getNotifications().then(data => setNotifications(data)) }, []);

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
    editConfig: (newConfig: any[], index: number, newData: string) => ({ timeToLaunch: string; message: string; })
  ) => (newText: string) => {
    if (!notifications) return;
    const cloneList = [...notifications.alerts];
    const index = cloneList.findIndex(item => item.timeToLaunch === idTimeToLaunch);
    console.log(index, idTimeToLaunch)
    cloneList[index] = editConfig(cloneList, index, newText);
    setNotifications({alerts: [...cloneList]});
  };
  
  return <Box sx={formStyle}>
    {notifications && <>
      <TitleAndList
        title='Notifications'
        deleteAction={deleteActionList}
        addAction={() => addActionList({timeToLaunch: (new Date()).toJSON(), message: 'new alert'}) }
        list={notifications.alerts.map((item) => ({id: `${item.timeToLaunch}`, item: <Box sx={{display: 'flex', flexDirection: {xs: 'column', sm:'row'}, gap: '2rem', alignContent: 'space-between', alignItems: 'center', justifyContent: 'center', width:'100%'}}>
          <LabelAndTextField
            text={item.message}
            onChange={editActionList(
              `${item.timeToLaunch}`,
              (newConfig, index, message) => ({...newConfig[index], message})
            )}
          />
          <Box sx={{ width:'18rem' }}>
            <LabelAndDateTimeTextField
              text={item.timeToLaunch}
              onChange={editActionList(
                `${item.timeToLaunch}`,
                (newConfig, index, timeToLaunch) => ({...newConfig[index], timeToLaunch})
              )}
            />
          </Box>
        </Box> }))}
      />
      <SaveNotificationsComponent notifications={notifications}/>
      
      </>
    }
  </Box>
};
