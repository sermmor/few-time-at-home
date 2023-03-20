import { Typography } from "@mui/material";
import { ListComponent } from "../../molecules/ListComponent/ListComponent";

export const TitleAndList = ({title, list, deleteAction, addAction}: {
  title: string;
  list: { id: string, item: string | JSX.Element }[];
  deleteAction?: (id: string) => void;
  addAction?: () => void;
}) => <>
  <Typography variant='h6' sx={{textTransform: 'uppercase'}}>
    {title}
  </Typography>
  <ListComponent {...{list, deleteAction, addAction}} />
</>;
