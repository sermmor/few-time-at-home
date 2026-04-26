import { Box, Button, SxProps, Theme, Typography } from "@mui/material";
import React from "react";
import { useTranslation } from 'react-i18next';
import { NotesActions } from "../../../core/actions/notes";
import { QuotesActions } from "../../../core/actions/quote";
import { NotesDataModel } from "../../../data-model/notes";
import { QuoteDataModel } from "../../../data-model/quote";
import { LabelAndTextField } from "../../molecules/LabelAndTextField/LabelAndTextField";
import { TitleAndList } from "../../organism/TitleAndList/TitleAndList";
import { FetchErrorBanner } from "../../molecules/FetchErrorBanner/FetchErrorBanner";

const formStyle: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
};

const SaveNotesComponent = ({notes}: {notes: NotesDataModel}) => {
  const { t } = useTranslation();
  const [isSave, setSave] = React.useState<boolean>(false);
  const setConfiguration = () => {
    NotesActions.sendNotes(notes);
    setSave(true);
    setTimeout(() => setSave(false), 500);
  }
  return <Box
    sx={{ width: '100%', display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingRight: { xs: '0rem', sm: '3rem'}, paddingBottom: '3rem'}}
    >
      <Button
        variant='contained'
        sx={{minWidth: '15.5rem'}}
        onClick={() => setConfiguration()}
        >
        {t('home.save')}
        </Button>
        {isSave && <Box sx={{paddingLeft: '1rem'}}>{t('home.saved')}</Box>}
    </Box>
};

const InspirationalQuote = ({quote, author}: {quote: string, author: string}) => <Box
    sx={{fontStyle: 'italic', backgroundColor:'#edffa3', margin:'1rem', padding:'1rem', width: { xs: '70%', lg: '40%'}}}
  >
  <Typography variant="subtitle1">
    <span>&#171;</span>{quote}<span>&#187;</span> - {author}
  </Typography>
</Box>;

let indexNewNoteAdded = 0;

export const Home = () => {
  const { t } = useTranslation();
  const [randomQuote, setRandomQuote] = React.useState<QuoteDataModel>();
  const [notes, setNotes] = React.useState<NotesDataModel>();
  const [fetchError, setFetchError] = React.useState<string | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);

  React.useEffect(() => {
    QuotesActions.getRandomQuote()
      .then(data => setRandomQuote(data))
      .catch(() => setFetchError(t('common.error.loadQuote')));
  }, [retryCount, t]);

  React.useEffect(() => {
    NotesActions.getNotes()
      .then(data => setNotes(data))
      .catch(() => setFetchError(t('common.error.loadNotes')));
  }, [retryCount, t]);

  const deleteActionList = (id: string) => {
    if (!notes) return;
    const cloneList = [...notes.data];
    const index = cloneList.findIndex(item => item === id);
    cloneList.splice(index, 1);
    setNotes({data: [...cloneList]});
  };

  const addActionList = (itemToAdd: any) => {
    if (!notes) return;
    const cloneList = [...notes.data];
    cloneList.push(itemToAdd);
    indexNewNoteAdded++;
    setNotes({data: [...cloneList]});
  };
  
  const editActionList = (id: string) => (newText: string) => {
    if (!notes) return;
    const cloneList = [...notes.data];
    const index = cloneList.findIndex(item => item === id);
    cloneList[index] = newText;
    setNotes({data: [...cloneList]});
  };
  
  return <Box sx={formStyle}>
    {fetchError && (
      <FetchErrorBanner
        message={fetchError}
        onRetry={() => { setFetchError(null); setRetryCount(c => c + 1); }}
      />
    )}
    { randomQuote && <InspirationalQuote quote={randomQuote.quote} author={randomQuote.author}/> }
    {notes && <>
      <TitleAndList
        title={t('home.notes')}
        deleteAction={deleteActionList}
        addAction={() => addActionList(`new note ${indexNewNoteAdded}`) }
        list={notes.data.map((item) => ({id:`${item}`, item: <LabelAndTextField text={item} onChange={editActionList(`${item}`)}/> }))}
      />
      <SaveNotesComponent notes={notes}/>
      </>
    }
  </Box>
};
