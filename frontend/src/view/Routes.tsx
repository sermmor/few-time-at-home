import { Home } from "@mui/icons-material";
import { Configuration } from "./pages/_Configuration/Configuration";
import { NotFound } from "./pages/NotFound/NotFound";
import { Rss } from "./pages/_Rss/Rss";

interface RouteFTAHElement {
  name: string;
  path: string;
  element: JSX.Element;
  isHiddenInMenuBar?: boolean;
}

export const routesFTAH: RouteFTAHElement[] = [
  {
    name: 'Home',
    path: '/',
    element: <Home/>,
  },
  {
    name: 'Rss',
    path: '/rss',
    element: <Rss/>,
  },
  {
    name: 'Configuration',
    path: '/configuration',
    element: <Configuration/>,
  },
  {
    name: 'Error',
    path: "*",
    element: <NotFound />,
    isHiddenInMenuBar: true,
  },
];
