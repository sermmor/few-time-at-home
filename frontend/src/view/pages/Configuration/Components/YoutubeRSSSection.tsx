import React from "react";
import { ConfigurationDataZipped } from "../../../../data-model/configuration";
import { ConfigurationSaveButton } from "./ConfigurationSaveButton";
import { LabelAndTextField } from "../../../molecules/LabelAndTextField/LabelAndTextField";
import { LabelAndComboField } from "../../../molecules/LabelAndComboField/LabelAndComboField";
import { TitleAndList } from "../../../organism/TitleAndList/TitleAndList";
import { Box, Checkbox, Typography, Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useConfiguredDialogAlphas } from "../../../../core/context/DialogAlphasContext";
import { useTranslation } from 'react-i18next';

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
  const alphas = useConfiguredDialogAlphas();
  const { t } = useTranslation();
  return (
    <Accordion sx={{ opacity: alphas.configurationCards }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>{t('youtubeRss.sectionTitle')}</Typography>
      </AccordionSummary>
      <AccordionDetails>
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
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                <ul style={{ paddingLeft: '1.25rem', margin: 0 }}>
                  <li style={{ maxWidth: '30rem', width: '100%' }}>
                    {t('youtubeRss.url')} <LabelAndTextField text={item.url} onChange={
                      editActionList(
                        'youtubeRssList',
                        `${item.url}`,
                        (item: any, idToEdit: string) => item.url === idToEdit,
                        (newConfig, index, newText) => ({...newConfig[index], url: newText,})
                      )
                    }/>
                  </li>
                  <li>
                    {t('youtubeRss.wordsToFilter')}<LabelAndTextField text={item.words_to_filter || ''} onChange={
                      editActionList(
                        'youtubeRssList',
                        `${item.url}`,
                        (item: any, idToEdit: string) => item.url === idToEdit,
                        (newConfig, index, newText) => ({...newConfig[index], words_to_filter: newText,})
                      )
                    }/>
                  </li>
                  <li>
                    {t('youtubeRss.mandatoryWords')} <LabelAndTextField text={item.mandatory_words || ''} onChange={
                      editActionList(
                        'youtubeRssList',
                        `${item.url}`,
                        (item: any, idToEdit: string) => item.url === idToEdit,
                        (newConfig, index, newText) => ({...newConfig[index], mandatory_words: newText,})
                      )
                    }/>
                  </li>
                  <li>
                    {t('youtubeRss.tags')} <LabelAndComboField
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
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', mt: { xs: 1, md: 0 } }}>
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
                    {t('youtubeRss.notFilterShorts')}
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
                    {t('youtubeRss.showProximamente')}
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
                    {t('youtubeRss.isFavorite')}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </>})
        )}
      />
      <ConfigurationSaveButton config={config} type={'youtubeRssList'} />
      </AccordionDetails>
    </Accordion>
  );
};
