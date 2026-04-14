import { Checkbox, IconButton } from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import React from "react";

interface Props {
  isInSelectListMode: boolean;
  isElementSelected: boolean;
  element: { id: string, isFolder: boolean, item: string | JSX.Element };
  IconOpenFileInEditor?: JSX.Element;
  onSelect?: (id: string, checked: boolean) => void;
  deleteAction?: (id: string) => void;
  onOpenFileInEditor?: (id: string) => void;
  onAddToPlaylist?: (id: string) => void;
}

export const ItemListWithFoldersComponent = ({element, isInSelectListMode, isElementSelected, IconOpenFileInEditor, deleteAction, onSelect, onOpenFileInEditor, onAddToPlaylist}: Props) => {
  const [isChecked, setChecked] = React.useState<boolean>(isElementSelected);

  if (isChecked !== isElementSelected) setChecked(isElementSelected);

  return <>
        {
          isInSelectListMode && <Checkbox
            onChange={(evt => {
              if (onSelect) {
                onSelect(element.id, evt.target.checked);
              }
              setChecked(evt.target.checked);
            })}
            // checked={isChecked} // This doesn't be useful, refactor all related to this.
          />
        }
        { deleteAction && !isInSelectListMode && <IconButton aria-label="delete" onClick={() => deleteAction(element.id)}>
            <DeleteIcon />
          </IconButton>
        }
        {element.item}
        {
          onAddToPlaylist && !isInSelectListMode && <IconButton aria-label="add to playlist" title="Añadir a la cola de reproducción" onClick={() => onAddToPlaylist(element.id)}>
            <AddIcon />
          </IconButton>
        }
        {
          onOpenFileInEditor  && !isInSelectListMode && <IconButton aria-label="edit" onClick={() => onOpenFileInEditor(element.id)}>
            {IconOpenFileInEditor ? IconOpenFileInEditor : <EditIcon />}
          </IconButton>
        }
  </>;
}
