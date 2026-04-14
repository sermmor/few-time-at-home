import React from "react";
import { ConfigurationDataZipped } from "../../../../data-model/configuration";
import { ConfigurationSaveButton } from "./ConfigurationSaveButton";
import { LabelAndTextField } from "../../../molecules/LabelAndTextField/LabelAndTextField";
import { LabelAndComboField } from "../../../molecules/LabelAndComboField/LabelAndComboField";
import { TitleAndList } from "../../../organism/TitleAndList/TitleAndList";
import { Box, Checkbox, Typography } from "@mui/material";

interface YoutubeRSSSectionProps {
  config: ConfigurationDataZipped;
  deleteActionList: (keyList: string, equals: (item: any, idToDelete: string) => boolean) => (id: string) => void;
  addActionList: (keyList: string, itemToAdd: any) => void;
  editActionList: (keyList: string, id: string, equals: (item: any, idToEdit: string) => boolean, editConfig?: (newConfig: any[], index: number, newData: string | boolean) => any[]) => (newText: string | boolean) => void;
  indexNewItemAdded: number;
}

export const YoutubeRSSSection: React.FC<YoutubeRSSSectionProps> = ({
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
        showRowLine={true}
        deleteAction={deleteActionList('youtubeRssList', (item: any, idToDelete: string) => item.url === idToDelete)}
        addAction={() => addActionList('youtubeRssList', {
          url: `new channel ${indexNewItemAdded}`,
          show_not_publised_videos: true,
          not_filter_shorts: false,
          words_to_filter: 'defaultToIgnore',
          mandatory_words: 'null',
        })}
        list={config.youtubeRssList.map((item) =>  ({id:`${item.url}`, item: <>
            <Box sx={{ display: 'flex' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <ul>
                  <li style={{ width: '30rem' }}>
                    Url: <LabelAndTextField text={item.url} onChange={
                      editActionList(
                        'youtubeRssList',
                        `${item.url}`,
                        (item: any, idToEdit: string) => item.url === idToEdit,
                        (newConfig, index, newText) => ({...newConfig[index], url: newText,})
                      )
                    }/>
                  </li>
                  <li>
                    Words to filter:<LabelAndTextField text={item.words_to_filter || ''} onChange={
                      editActionList(
                        'youtubeRssList',
                        `${item.url}`,
                        (item: any, idToEdit: string) => item.url === idToEdit,
                        (newConfig, index, newText) => ({...newConfig[index], words_to_filter: newText,})
                      )
                    }/>
                  </li>
                  <li>
                    Mandatory words: <LabelAndTextField text={item.mandatory_words || ''} onChange={
                      editActionList(
                        'youtubeRssList',
                        `${item.url}`,
                        (item: any, idToEdit: string) => item.url === idToEdit,
                        (newConfig, index, newText) => ({...newConfig[index], mandatory_words: newText,})
                      )
                    }/>
                  </li>
                  <li>
                    Tags: <LabelAndComboField
                      text={item.tag || config.rssConfig.optionTagsYoutube[0]}
                      options={config.rssConfig.optionTagsYoutube}
                      onChange={
                        editActionList(
                          'youtubeRssList',
                          `${item.url}`,
                          (item: any, idToEdit: string) => item.url === idToEdit,
                          (newConfig, index, newText) => ({...newConfig[index], tag: newText,})
                        )
                      }
                      />
                  </li>
                </ul>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'left', justifyContent: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center'}}>
                  <Checkbox
                    checked={item.not_filter_shorts}
                    onChange={evt => {
                      editActionList(
                        'youtubeRssList',
                        `${item.url}`,
                        (item: any, idToEdit: string) => item.url === idToEdit,
                        (newConfig, index, newText) => ({...newConfig[index], not_filter_shorts: newText,})
                      )(evt.target.checked)
                    }}
                  />
                  <Typography variant='subtitle2' sx={{textTransform: 'uppercase'}}>
                    Not filter youtube shorts
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Checkbox
                    checked={item.show_not_publised_videos}
                    onChange={evt => {
                      editActionList(
                        'youtubeRssList',
                        `${item.url}`,
                        (item: any, idToEdit: string) => item.url === idToEdit,
                        (newConfig, index, newText) => ({...newConfig[index], show_not_publised_videos: newText,})
                      )(evt.target.checked)
                    }}
                  />
                  <Typography variant='subtitle2' sx={{textTransform: 'uppercase'}}>
                    Show "Proximamente" videos
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Checkbox
                    checked={item.favorite}
                    onChange={evt => {
                      editActionList(
                        'youtubeRssList',
                        `${item.url}`,
                        (item: any, idToEdit: string) => item.url === idToEdit,
                        (newConfig, index, newText) => ({...newConfig[index], favorite: newText,})
                      )(evt.target.checked)
                    }}
                  />
                  <Typography variant='subtitle2' sx={{textTransform: 'uppercase'}}>
                    Is favorite?
                  </Typography>
                </Box>
              </Box>
            </Box>
          </>})
        )}
      />
      <ConfigurationSaveButton config={config} type={'youtubeRssList'} />
    </>
  );
};
