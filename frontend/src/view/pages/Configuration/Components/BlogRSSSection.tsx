import React from "react";
import { ConfigurationDataZipped } from "../../../../data-model/configuration";
import { ConfigurationSaveButton } from "./ConfigurationSaveButton";
import { LabelAndTextField } from "../../../molecules/LabelAndTextField/LabelAndTextField";
import { TitleAndList } from "../../../organism/TitleAndList/TitleAndList";
import { Box } from "@mui/material";

interface BlogRSSSectionProps {
  config: ConfigurationDataZipped;
  deleteActionList: (keyList: string, equals: (item: any, idToDelete: string) => boolean) => (id: string) => void;
  addActionList: (keyList: string, itemToAdd: any) => void;
  editActionList: (keyList: string, id: string, equals: (item: any, idToEdit: string) => boolean, editConfig?: (newConfig: any[], index: number, newData: string | boolean) => any[]) => (newText: string | boolean) => void;
  indexNewItemAdded: number;
}

export const BlogRSSSection: React.FC<BlogRSSSectionProps> = ({
  config,
  deleteActionList,
  addActionList,
  editActionList,
  indexNewItemAdded,
}) => {
  return (
    <>
      <TitleAndList
        title='Blog RSS'
        deleteAction={deleteActionList('blogRssList', (item: any, idToDelete: string) => item === idToDelete)}
        addAction={() => addActionList('blogRssList', `new Blog ${indexNewItemAdded}`)}
        list={config.blogRssList.map((item) => ({id:`${item}`, item: <LabelAndTextField text={item} onChange={
          editActionList('blogRssList', `${item}`, (item: any, idToEdit: string) => item === idToEdit)
        }/>}))}
      />
      <ConfigurationSaveButton config={config} type={'blogRssList'}/>
    </>
  );
};
