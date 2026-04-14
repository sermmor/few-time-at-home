import React from "react";
import { ConfigurationDataZipped } from "../../../../data-model/configuration";
import { ConfigurationSaveButton } from "./ConfigurationSaveButton";
import { RSSActions } from "../../../../core/actions/rss";
import { TitleAndSection } from "../../../organism/TitleAndSection/TitleAndSection";
import { Box, Button } from "@mui/material";

interface RSSConfigurationSectionProps {
  config: ConfigurationDataZipped;
  setConfig: (config: ConfigurationDataZipped) => void;
}

export const RSSConfigurationSection: React.FC<RSSConfigurationSectionProps> = ({
  config,
  setConfig,
}) => {
  const [isUpdateRss, setIsUpdateRss] = React.useState<boolean>(false);

  return (
    <>
      <TitleAndSection
        title=""
        body={config.rssConfig}
        onChange={(key: string, newText: number | boolean | string | string[]) => {
          const cloneList = {...config.rssConfig};
          (cloneList as any)[key] = newText;
          setConfig({
            ...config,
            rssConfig: cloneList,
          });
        }}
        subtext={<Button
        variant='outlined'
        sx={{minWidth: {xs: '15.5rem', sm: '5rem', md: '5rem'},}}
        disabled={isUpdateRss}
        onClick={() => {
          setIsUpdateRss(true);
          RSSActions.postForceUpdate().then(() => {
            setIsUpdateRss(false);
          });
        }}>
          Force Update
        </Button>}
      />
      <ConfigurationSaveButton config={config} type={'rssConfig'} />
    </>
  );
};
