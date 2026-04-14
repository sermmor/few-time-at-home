import React from "react";
import { ConfigurationDataZipped } from "../../../../data-model/configuration";
import { ConfigurationSaveButton } from "./ConfigurationSaveButton";
import { LabelAndTextField } from "../../../molecules/LabelAndTextField/LabelAndTextField";
import { TitleAndList } from "../../../organism/TitleAndList/TitleAndList";
import { Box } from "@mui/material";

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
  return (
    <>
      <TitleAndList
        title=''
        deleteAction={deleteActionList('newsRSSList', (item: any, idToDelete: string) => item === idToDelete)}
        addAction={() => addActionList('newsRSSList', `new News ${indexNewItemAdded}`)}
        list={config.newsRSSList.map((item) => ({id:`${item}`, item: <LabelAndTextField text={item} onChange={
          editActionList('newsRSSList', `${item}`, (item: any, idToEdit: string) => item === idToEdit)
        }/>}))}
      />
      <ConfigurationSaveButton config={config} type={'newsRSSList'}/>
    </>
  );
};
