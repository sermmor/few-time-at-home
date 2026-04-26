import { Bookmarks } from "./pages/Bookmarks/Bookmarks";
import { Cloud } from "./pages/Cloud/Cloud";
import { ConfigurationComponent } from "./pages/Configuration/Configuration";
import { Home } from "./pages/Home/Home";
import { Mp3Converter } from "./pages/Mp3Converter/Mp3Converter";
import { VideoPlayer } from "./pages/VideoPlayer/VideoPlayer";
import { Telegram } from "./pages/Notepad/Telegram";
import { NotFound } from "./pages/NotFound/NotFound";
import { Notifications } from "./pages/Notifications/Notifications";
import { Pomodoro } from "./pages/Pomodoro/Pomodoro";
import { Rss } from "./pages/Rss/Rss";
import { Weather } from "./pages/Weather/Weather";
import { TextEditor } from "./pages/TextEditor/TextEditor";
import { TrashBookmarks } from "./pages/TrashBookmarks/TrashBookmarks";
import { GoogleDrive } from "./pages/GoogleDrive/GoogleDrive";

export interface RouteFTAHElement {
  name: string;
  path: string;
  group: string;
  element: JSX.Element;
  isHiddenInMenuBar?: boolean;
  includeSubroutes?: boolean;
}

export const cloudFilesName = 'Cloud files';
export const bookmarkRouteName = 'Bookmarks';

export const routesFTAH: RouteFTAHElement[] = [
  {
    name: 'Home',
    path: '/',
    group: '',
    element: <Home/>,
  },
  {
    name: cloudFilesName,
    path: '/cloud/files',
    group: 'Cloud',
    element: <Cloud/>,
    includeSubroutes: true,
  },
  {
    name: bookmarkRouteName,
    path: '/bookmarks',
    group: 'Internet',
    element: <Bookmarks/>,
    includeSubroutes: true,
  },
  {
    name: 'Trash Bookmarks',
    path: '/trash-bookmarks',
    group: 'Internet',
    element: <TrashBookmarks/>,
  },
  {
    name: 'Notifications',
    path: '/notifications',
    group: '',
    element: <Notifications/>,
  },
  {
    name: 'Rss',
    path: '/rss',
    group: 'Internet',
    element: <Rss/>,
  },
  {
    name: 'Pomodoro',
    path: '/Pomodoro',
    group: '',
    element: <Pomodoro/>,
  },
  {
    name: 'Weather',
    path: '/weather',
    group: '',
    element: <Weather/>,
  },
  {
    name: 'Telegram',
    path: '/Telegram',
    group: 'Internet',
    element: <Telegram/>,
  },
  {
    name: 'Google Drive',
    path: '/google-drive',
    group: 'Internet',
    element: <GoogleDrive/>,
  },
  {
    name: 'Text Editor',
    path: '/cloud/text-editor',
    group: 'Cloud',
    element: <TextEditor/>,
  },
  {
    name: 'MP3 Converter',
    path: '/cloud/mp3-converter',
    group: 'Cloud',
    element: <Mp3Converter/>,
  },
  {
    name: 'Video Player',
    path: '/cloud/video-player',
    group: 'Cloud',
    element: <VideoPlayer/>,
  },
  {
    name: 'Configuration',
    path: '/configuration',
    group: '',
    element: <ConfigurationComponent/>,
  },
  {
    name: 'Error',
    path: "*",
    group: '',
    element: <NotFound />,
    isHiddenInMenuBar: true,
  },
];
