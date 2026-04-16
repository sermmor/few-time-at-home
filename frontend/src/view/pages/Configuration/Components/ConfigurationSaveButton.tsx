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
        width: "100%",
        display: "flex",
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        paddingRight: { xs: "0rem", sm: "3rem" },
        paddingBottom: "3rem",
      }}
    >
      <Button
        variant="contained"
        sx={{ minWidth: "15.5rem" }}
        onClick={() => setConfiguration()}
      >
        Save
      </Button>
    </Box>
  );
};
