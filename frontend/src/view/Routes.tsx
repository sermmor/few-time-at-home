import { Bookmarks } from "./pages/Bookmarks/Bookmarks";
import { Cloud } from "./pages/Cloud/Cloud";
import { ConfigurationComponent } from "./pages/Configuration/Configuration";
import { Home } from "./pages/Home/Home";
import { Notepad } from "./pages/Notepad/Notepad";
import { NotFound } from "./pages/NotFound/NotFound";
import { Notifications } from "./pages/Notifications/Notifications";
import { Pomodoro } from "./pages/Pomodoro/Pomodoro";
import { Rss } from "./pages/Rss/Rss";
import { TextEditor } from "./pages/TextEditor/TextEditor";

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
    name: 'Cloud',
    path: '/cloud',
    element: <Cloud/>,
  },
  {
    name: 'Bookmarks',
    path: '/bookmarks',
    element: <Bookmarks/>,
  },
  {
    name: 'Notifications',
    path: '/notifications',
    element: <Notifications/>,
  },
  {
    name: 'Pomodoro',
    path: '/Pomodoro',
    element: <Pomodoro/>,
  },
  {
    name: 'Rss',
    path: '/rss',
    element: <Rss/>,
  },
  {
    name: 'Notepad',
    path: '/notepad',
    element: <Notepad/>,
  },
  {
    name: 'Text Editor',
    path: '/text-editor',
    element: <TextEditor/>,
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
