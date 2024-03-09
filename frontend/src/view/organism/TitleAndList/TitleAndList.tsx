import { Typography } from "@mui/material";
import { ListComponent } from "../../molecules/ListComponent/ListComponent";

export const TitleAndList = ({title, list, subtext, showRowLine, deleteAction, addAction}: {
  title: string;
  subtext?: JSX.Element;
  list: { id: string, item: string | JSX.Element }[];
  showRowLine?: boolean;
  deleteAction?: (id: string) => void;
  addAction?: () => void;
}) => <>
  <Typography variant='h6' sx={{textTransform: 'uppercase'}}>
    {title}
  </Typography>
  {subtext}
  <ListComponent {...{list, deleteAction, addAction, showRowLine}} />
</>;
