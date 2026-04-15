import React, { createContext, ReactNode, useEffect, useState } from 'react';
import { ConfigurationActions } from '../actions/configuration';

export interface DialogAlphas {
  general: number;
  rssCard: number;
  pomodoroEditorConfig: number;
}

const defaultAlphas: DialogAlphas = {
  general: 0.7,
  rssCard: 0.7,
  pomodoroEditorConfig: 0.5,
};

export const DialogAlphasContext = createContext<DialogAlphas>(defaultAlphas);

interface DialogAlphasProviderProps {
  children: ReactNode;
  alphas: DialogAlphas;
}

export const DialogAlphasProvider: React.FC<DialogAlphasProviderProps> = ({
  children,
  alphas,
}) => {
  return (
    <DialogAlphasContext.Provider value={alphas}>
      {children}
    </DialogAlphasContext.Provider>
  );
};

export const useDialogAlphas = (): DialogAlphas => {
  const context = React.useContext(DialogAlphasContext);
  if (!context) {
    return defaultAlphas;
  }
  return context;
};

/**
 * Hook to fetch and use dialog alphas from configuration.
 * Components should use this hook to get the currently configured alpha values.
 */
export const useConfiguredDialogAlphas = (): DialogAlphas => {
  const [alphas, setAlphas] = useState<DialogAlphas>(defaultAlphas);

  useEffect(() => {
    ConfigurationActions.getConfigurationType()
      .then(types => ConfigurationActions.getConfiguration(types.data))
      .then(data => {
        const configData = data.find((config: any) => config.type === 'configuration');
        if (configData && configData.content && typeof configData.content === 'object' && 'dialogAlphas' in configData.content) {
          const content = configData.content as any;
          if (content.dialogAlphas) {
            setAlphas(content.dialogAlphas);
          }
        }
      })
      .catch(() => {
        // If configuration fetch fails, use default alphas
        setAlphas(defaultAlphas);
      });
  }, []);

  return alphas;
};
