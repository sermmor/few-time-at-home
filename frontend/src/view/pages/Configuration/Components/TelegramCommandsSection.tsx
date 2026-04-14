import React from "react";
import { ConfigurationDataZipped } from "../../../../data-model/configuration";
import { ConfigurationSaveButton } from "./ConfigurationSaveButton";
import { LabelAndTextField } from "../../../molecules/LabelAndTextField/LabelAndTextField";
import { TitleAndList } from "../../../organism/TitleAndList/TitleAndList";
import { Box } from "@mui/material";

interface TelegramCommandsSectionProps {
  config: ConfigurationDataZipped;
  setConfig: (config: ConfigurationDataZipped) => void;
}

export const TelegramCommandsSection: React.FC<TelegramCommandsSectionProps> = ({
  config,
  setConfig,
}) => {
  return (
    <>
      <TitleAndList
        title=''
        list={Object.keys(config.listBotCommands).map((commandName, index) => ({
            id:`${index}`,
            item: <Box sx={{display: 'flex', flexDirection: {xs: 'column', sm:'row'}, gap: '2rem', alignContent: 'space-between', alignItems: 'center', justifyContent: 'center', width:'100%'}}>
              <Box>{commandName}</Box>
              <Box sx={{ marginLeft: {xs: 'none', sm:'auto'}}}>
                <LabelAndTextField
                  text={config.listBotCommands[commandName]}
                  onChange={(newText: string) => {
                    const cloneList = {...config.listBotCommands};
                    (cloneList as any)[commandName] = newText;
                    setConfig({
                      ...config,
                      listBotCommands: cloneList,
                    });
                  }          
                  }
                />
              </Box>
            </Box>
        })
      )} />
      <ConfigurationSaveButton config={config} type={'listBotCommands'} />
    </>
  );
};
