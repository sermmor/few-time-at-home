import React, { createContext, useContext } from 'react';

type ShowSaveNotification = () => void;

const ConfigurationSnackbarContext = createContext<ShowSaveNotification>(() => {});

export const ConfigurationSnackbarProvider: React.FC<{
  onSave: ShowSaveNotification;
  children: React.ReactNode;
}> = ({ onSave, children }) => (
  <ConfigurationSnackbarContext.Provider value={onSave}>
    {children}
  </ConfigurationSnackbarContext.Provider>
);

export const useConfigurationSnackbar = (): ShowSaveNotification =>
  useContext(ConfigurationSnackbarContext);
