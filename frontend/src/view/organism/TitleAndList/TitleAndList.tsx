import { Typography } from "@mui/material";
import { ListComponent } from "../../molecules/ListComponent/ListComponent";

const titleStyle = () => ({
  textTransform: 'uppercase',
  color: "white",
  textShadow: `
    -1px -1px 0 black,
    1px -1px 0 black,
    -1px 1px 0 black,
    1px 1px 0 black,
    -1px 0 0 black,
    1px 0 0 black,
    0 -1px 0 black,
    0 1px 0 black
  `,
});

export const TitleAndList = ({title, list, subtext, showRowLine, deleteAction, addAction}: {
  title: string;
  subtext?: JSX.Element;
  list: { id: string, item: string | JSX.Element }[];
  showRowLine?: boolean;
  deleteAction?: (id: string) => void;
  addAction?: () => void;
}) => <>
  <Typography variant='h6' sx={titleStyle()}>
    {title}
  </Typography>
  {subtext}
  <ListComponent {...{list, deleteAction, addAction, showRowLine}} />
</>;
