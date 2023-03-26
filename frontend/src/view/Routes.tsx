import { Bookmarks } from "./pages/Bookmarks/Bookmarks";
import { ConfigurationComponent } from "./pages/Configuration/Configuration";
import { Home } from "./pages/Home/Home";
import { NotFound } from "./pages/NotFound/NotFound";
import { Notifications } from "./pages/Notifications/Notifications";
import { Rss } from "./pages/Rss/Rss";

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
    name: 'Bookmarks',
    path: '/bookmarks',
    element: <Bookmarks/>,
  },
  {
    name: 'Rss',
    path: '/rss',
    element: <Rss/>,
  },
  {
    name: 'Notifications',
    path: '/notifications',
    element: <Notifications/>,
  },
  {
    name: 'Configuration',
    path: '/configuration',
    element: <ConfigurationComponent/>,
  },
  {
    name: 'Error',
    path: "*",
    element: <NotFound />,
    isHiddenInMenuBar: true,
  },
];
