import React from "react";
import { ConfigurationDataZipped } from "../../../../data-model/configuration";
import { ConfigurationSaveButton } from "./ConfigurationSaveButton";
import { LabelAndTextField } from "../../../molecules/LabelAndTextField/LabelAndTextField";
import { TitleAndList } from "../../../organism/TitleAndList/TitleAndList";
import { Accordion, AccordionSummary, AccordionDetails, Typography } from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface NitterInstancesSectionProps {
  config: ConfigurationDataZipped;
  deleteActionList: (keyList: string, equals: (item: any, idToDelete: string) => boolean) => (id: string) => void;
  addActionList: (keyList: string, itemToAdd: any) => void;
  editActionList: (keyList: string, id: string, equals: (item: any, idToEdit: string) => boolean, editConfig?: (newConfig: any[], index: number, newData: string | boolean) => any[]) => (newText: string | boolean) => void;
  indexNewItemAdded: number;
}

export const NitterInstancesSection: React.FC<NitterInstancesSectionProps> = ({
  config,
  deleteActionList,
  addActionList,
  editActionList,
  indexNewItemAdded,
}) => {
  return (
    <Accordion sx={{ opacity: 0.5 }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>Instancias Nitter</Typography>
      </AccordionSummary>
      <AccordionDetails>
      <TitleAndList
        title=''
        deleteAction={deleteActionList('nitterInstancesList', (item: any, idToDelete: string) => item === idToDelete)}
        addAction={() => addActionList('nitterInstancesList', `new Instance ${indexNewItemAdded}`)}
        list={config.nitterInstancesList.map((item) => ({id:`${item}`, item: <LabelAndTextField text={item} onChange={
          editActionList('nitterInstancesList', `${item}`, (item: any, idToEdit: string) => item === idToEdit)
        }/>}))}
      />
      <ConfigurationSaveButton config={config} type={'nitterInstancesList'}/>
      </AccordionDetails>
    </Accordion>
  );
};
