import React from "react";
import { ConfigurationDataZipped } from "../../../../data-model/configuration";
import { ConfigurationSaveButton } from "./ConfigurationSaveButton";
import { LabelAndTextField } from "../../../molecules/LabelAndTextField/LabelAndTextField";
import { TitleAndList } from "../../../organism/TitleAndList/TitleAndList";
import { Accordion, AccordionSummary, AccordionDetails, Typography } from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useConfiguredDialogAlphas } from "../../../../core/context/DialogAlphasContext";
import { useTranslation } from 'react-i18next';

interface NewsRSSSectionProps {
  config: ConfigurationDataZipped;
  deleteActionList: (keyList: string, equals: (item: any, idToDelete: string) => boolean) => (id: string) => void;
  addActionList: (keyList: string, itemToAdd: any) => void;
  editActionList: (keyList: string, id: string, equals: (item: any, idToEdit: string) => boolean, editConfig?: (newConfig: any[], index: number, newData: string | boolean) => any[]) => (newText: string | boolean) => void;
  indexNewItemAdded: number;
}

export const NewsRSSSection: React.FC<NewsRSSSectionProps> = ({
  config,
  deleteActionList,
  addActionList,
  editActionList,
  indexNewItemAdded,
}) => {
  const alphas = useConfiguredDialogAlphas();
  const { t } = useTranslation();
  return (
    <Accordion sx={{ opacity: alphas.configurationCards }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>{t('newsRss.sectionTitle')}</Typography>
      </AccordionSummary>
      <AccordionDetails>
      <TitleAndList
        title=''
        deleteAction={deleteActionList('newsRSSList', (item: any, idToDelete: string) => item === idToDelete)}
        addAction={() => addActionList('newsRSSList', `new News ${indexNewItemAdded}`)}
        list={config.newsRSSList.map((item) => ({id:`${item}`, item: <LabelAndTextField text={item} onChange={
          editActionList('newsRSSList', `${item}`, (item: any, idToEdit: string) => item === idToEdit)
        }/>}))}
      />
      <ConfigurationSaveButton config={config} type={'newsRSSList'}/>
      </AccordionDetails>
    </Accordion>
  );
};
