import React from "react";
import { ConfigurationDataZipped } from "../../../../data-model/configuration";
import { ConfigurationSaveButton } from "./ConfigurationSaveButton";
import { LabelAndTextField } from "../../../molecules/LabelAndTextField/LabelAndTextField";
import { TitleAndList } from "../../../organism/TitleAndList/TitleAndList";
import { Box } from "@mui/material";

interface CitasSectionProps {
  config: ConfigurationDataZipped;
  deleteActionList: (keyList: string, equals: (item: any, idToDelete: string) => boolean) => (id: string) => void;
  addActionList: (keyList: string, itemToAdd: any) => void;
  editActionList: (keyList: string, id: string, equals: (item: any, idToEdit: string) => boolean, editConfig?: (newConfig: any[], index: number, newData: string | boolean) => any[]) => (newText: string | boolean) => void;
  indexNewItemAdded: number;
}

export const CitasSection: React.FC<CitasSectionProps> = ({
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
        deleteAction={deleteActionList('quoteList', ({author, quote}: any, idToDelete: string) => `@${author}@${quote}` === idToDelete)}
        addAction={() => addActionList('quoteList', {author: `new author ${indexNewItemAdded}`, quote: `new quote ${indexNewItemAdded}`})}
        list={config.quoteList.map(({author, quote}) => ({
          id: `@${author}@${quote}`,
          item: <><LabelAndTextField
            text={author}
            onChange={
              editActionList(
                'quoteList',
                `@${author}@${quote}`,
                ({author: authorToEdit, quote: quoteToEdit}: any, idToEdit: string) => `@${authorToEdit}@${quoteToEdit}` === idToEdit,
                (newConfig, index, newText) => ({...newConfig[index], author: newText,})
              )
            }
            /><LabelAndTextField
            text={quote}
            onChange={
              editActionList(
                'quoteList',
                `@${author}@${quote}`,
                ({author: authorToEdit, quote: quoteToEdit}: any, idToEdit: string) => `@${authorToEdit}@${quoteToEdit}` === idToEdit,
                (newConfig, index, newText) => ({...newConfig[index], quote: newText,})
              )
            }
            />
          </>
        }))}
      />
      <ConfigurationSaveButton config={config} type={'quoteList'} />
    </>
  );
};
