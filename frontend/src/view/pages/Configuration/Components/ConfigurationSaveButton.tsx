import React from "react";
import { ConfigurationDataZipped, getContentConfigurationZippedByType } from "../../../../data-model/configuration";
import { ConfigurationActions } from "../../../../core/actions/configuration";
import { Box, Button } from "@mui/material";

interface ConfigurationSaveButtonProps {
  config: ConfigurationDataZipped;
  type: string;
}

export const ConfigurationSaveButton: React.FC<ConfigurationSaveButtonProps> = ({
  config,
  type,
}) => {
  const [isSave, setSave] = React.useState<boolean>(false);

  const setConfiguration = () => {
    ConfigurationActions.sendConfiguration({
      type,
      content: getContentConfigurationZippedByType(config, type),
    });
    setSave(true);
    setTimeout(() => setSave(false), 500);
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
      {isSave && <Box sx={{ paddingLeft: "1rem" }}>Saved!</Box>}
    </Box>
  );
};
