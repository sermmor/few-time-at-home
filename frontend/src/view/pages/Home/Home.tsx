import { Box, Button, SxProps, Theme, Typography } from "@mui/material";
import React from "react";
import { NotesActions } from "../../../core/actions/notes";
import { NotesDataModel } from "../../../data-model/notes";
import { getAInspirationalQuote } from "../../../services/quote/quote.service";
import { LabelAndTextField } from "../../molecules/LabelAndTextField/LabelAndTextField";
import { TitleAndList } from "../../organism/TitleAndList/TitleAndList";

const formStyle: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
};

const SaveNotesComponent = ({notes}: {notes: NotesDataModel}) => {
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
        Save
        </Button>
        {isSave && <Box sx={{paddingLeft: '1rem'}}>Saved!</Box>}
    </Box>
};

const InspirationalQuote = ({quote, author}: {quote: string, author: string}) => <Box
    sx={{fontStyle: 'italic', backgroundColor:'#edffa3', margin:'1rem', padding:'1rem', width:'40%'}}
  >
  <Typography variant="subtitle1">
    <span>&#171;</span>{quote}<span>&#187;</span> - {author}
  </Typography>
</Box>;

let indexNewNoteAdded = 0;

export const Home = () => {
  const randomQuote = getAInspirationalQuote();
  const [notes, setNotes] = React.useState<NotesDataModel>();
  React.useEffect(() => { NotesActions.getNotes().then(data => setNotes(data)) }, []);

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
  
  return <>
    {notes && <Box sx={formStyle}>
      <InspirationalQuote quote={randomQuote.quote} author={randomQuote.author}/>
      <TitleAndList
        title='Notes'
        deleteAction={deleteActionList}
        addAction={() => addActionList(`new note ${indexNewNoteAdded}`) }
        list={notes.data.map((item) => ({id:`${item}`, item: <LabelAndTextField text={item} onChange={editActionList(`${item}`)}/> }))}
      />
      <SaveNotesComponent notes={notes}/>
    </Box>}
  </>
};
