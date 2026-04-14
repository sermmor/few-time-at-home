import React from "react";
import { ConfigurationDataZipped } from "../../../../data-model/configuration";
import { ConfigurationSaveButton } from "./ConfigurationSaveButton";
import { LabelAndTextField } from "../../../molecules/LabelAndTextField/LabelAndTextField";
import { TitleAndList } from "../../../organism/TitleAndList/TitleAndList";
import { Box } from "@mui/material";

interface MastodonUsersSectionProps {
  config: ConfigurationDataZipped;
  deleteActionList: (keyList: string, equals: (item: any, idToDelete: string) => boolean) => (id: string) => void;
  addActionList: (keyList: string, itemToAdd: any) => void;
  editActionList: (keyList: string, id: string, equals: (item: any, idToEdit: string) => boolean, editConfig?: (newConfig: any[], index: number, newData: string | boolean) => any[]) => (newText: string | boolean) => void;
  indexNewItemAdded: number;
}

export const MastodonUsersSection: React.FC<MastodonUsersSectionProps> = ({
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
        deleteAction={deleteActionList('mastodonRssUsersList', ({user, instance}: any, idToDelete: string) => `@${user}@${instance}` === idToDelete)}
        addAction={() => addActionList('mastodonRssUsersList', {user: `new User ${indexNewItemAdded}`, instance: `new Instance ${indexNewItemAdded}`})}
        list={config.mastodonRssUsersList.map(({instance, user}) => ({
          id: `@${user}@${instance}`,
          item: <>@<LabelAndTextField
            text={user}
            onChange={
              editActionList(
                'mastodonRssUsersList',
                `@${user}@${instance}`,
                ({user: userToEdit, instance: instanceToEdit}: any, idToEdit: string) => `@${userToEdit}@${instanceToEdit}` === idToEdit,
                (newConfig, index, newText) => ({...newConfig[index], user: newText,})
              )
            }
            />@<LabelAndTextField
            text={instance}
            onChange={
              editActionList(
                'mastodonRssUsersList',
                `@${user}@${instance}`,
                ({user: userToEdit, instance: instanceToEdit}: any, idToEdit: string) => `@${userToEdit}@${instanceToEdit}` === idToEdit,
                (newConfig, index, newText) => ({...newConfig[index], instance: newText,})
              )
            }
            />
          </>
        }))}
      />
      <ConfigurationSaveButton config={config} type={'mastodonRssUsersList'} />
    </>
  );
};
