import { Box, Checkbox, IconButton, SxProps, Theme } from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import React from "react";

interface Props {
  isInSelectListMode: boolean;
  isElementSelected: boolean;
  element: { id: string, isFolder: boolean, item: string | JSX.Element };
  onSelect?: (id: string, checked: boolean) => void;
  deleteAction?: (id: string) => void;
}

export const ItemListWithFoldersComponent = ({element, isInSelectListMode, isElementSelected, deleteAction, onSelect}: Props) => {
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
            checked={isChecked}
          />
        }
        { deleteAction && !isInSelectListMode && <IconButton aria-label="delete" onClick={() => deleteAction(element.id)}>
            <DeleteIcon />
          </IconButton>
        }
        {element.item}
  </>;
}
