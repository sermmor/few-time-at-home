import React from "react";
import { ConfigurationDataZipped, getContentConfigurationZippedByType } from "../../../../data-model/configuration";
import { ConfigurationActions } from "../../../../core/actions/configuration";
import { Box, Button } from "@mui/material";
import { useConfigurationSnackbar } from "./ConfigurationSnackbarContext";

interface ConfigurationSaveButtonProps {
  config: ConfigurationDataZipped;
  type: string;
}

export const ConfigurationSaveButton: React.FC<ConfigurationSaveButtonProps> = ({
  config,
  type,
}) => {
  const showSaveNotification = useConfigurationSnackbar();

  const setConfiguration = () => {
    ConfigurationActions.sendConfiguration({
      type,
      content: getContentConfigurationZippedByType(config, type),
    }).then(() => showSaveNotification());
  };

  return (
    <Box
      sx={{
        width:          '100%',
        display:        'flex',
        flexDirection:  'row',
        justifyContent: 'center',
        alignItems:     'center',
        paddingY:       '1.5rem',
        borderTop:      '1px solid rgba(0,255,231,0.12)',
        marginTop:      '0.5rem',
      }}
    >
      <Button
        variant="contained"
        onClick={() => setConfiguration()}
        sx={{
          minWidth:        '15.5rem',
          fontFamily:      '"Courier New", Courier, monospace',
          letterSpacing:   '0.15rem',
          fontSize:        '0.8rem',
          textTransform:   'uppercase',
          backgroundColor: 'transparent',
          border:          '1px solid #00ffe7',
          color:           '#00ffe7',
          borderRadius:    0,
          boxShadow:       '0 0 8px rgba(0,255,231,0.2)',
          transition:      'box-shadow 0.2s, background 0.2s',
          '&:hover': {
            backgroundColor: 'rgba(0,255,231,0.07)',
            boxShadow:       '0 0 20px rgba(0,255,231,0.45)',
          },
        }}
      >
        // SAVE //
      </Button>
    </Box>
  );
};
