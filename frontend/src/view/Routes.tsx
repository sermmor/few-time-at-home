import { lazy } from 'react';

// Each page is loaded only when the user first navigates to it.
// Named-export modules are re-wrapped as default exports for React.lazy.
const Bookmarks             = lazy(() => import('./pages/Bookmarks/Bookmarks').then(m => ({ default: m.Bookmarks })));
const Cloud                 = lazy(() => import('./pages/Cloud/Cloud').then(m => ({ default: m.Cloud })));
const ConfigurationComponent = lazy(() => import('./pages/Configuration/Configuration').then(m => ({ default: m.ConfigurationComponent })));
const Home                  = lazy(() => import('./pages/Home/Home').then(m => ({ default: m.Home })));
const Mp3Converter          = lazy(() => import('./pages/Mp3Converter/Mp3Converter').then(m => ({ default: m.Mp3Converter })));
const VideoPlayer           = lazy(() => import('./pages/VideoPlayer/VideoPlayer').then(m => ({ default: m.VideoPlayer })));
const Telegram              = lazy(() => import('./pages/Notepad/Telegram').then(m => ({ default: m.Telegram })));
const NotFound              = lazy(() => import('./pages/NotFound/NotFound').then(m => ({ default: m.NotFound })));
const Notifications         = lazy(() => import('./pages/Notifications/Notifications').then(m => ({ default: m.Notifications })));
const Pomodoro              = lazy(() => import('./pages/Pomodoro/Pomodoro').then(m => ({ default: m.Pomodoro })));
const Rss                   = lazy(() => import('./pages/Rss/Rss').then(m => ({ default: m.Rss })));
const Weather               = lazy(() => import('./pages/Weather/Weather').then(m => ({ default: m.Weather })));
const TextEditor            = lazy(() => import('./pages/TextEditor/TextEditor').then(m => ({ default: m.TextEditor })));
const TrashBookmarks        = lazy(() => import('./pages/TrashBookmarks/TrashBookmarks').then(m => ({ default: m.TrashBookmarks })));
const Alexa                 = lazy(() => import('./pages/Alexa/Alexa').then(m => ({ default: m.Alexa })));
const Desktop               = lazy(() => import('./pages/Desktop/Desktop').then(m => ({ default: m.Desktop })));
const GoogleDrive           = lazy(() => import('./pages/GoogleDrive/GoogleDrive').then(m => ({ default: m.GoogleDrive })));

export interface RouteFTAHElement {
  name: string;
  path: string;
  group: string;
  element: JSX.Element;
  isHiddenInMenuBar?: boolean;
  includeSubroutes?: boolean;
  /** Render without EnvelopComponent (no menu, no padding) — used for full-screen pages. */
  isFullscreen?: boolean;
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
    name: 'Desktop',
    path: '/desktop',
    group: '',
    element: <Desktop/>,
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
    name: 'Alexa',
    path: '/alexa',
    group: '',
    element: <Alexa />,
    isHiddenInMenuBar: true,
    isFullscreen: true,
  },
  {
    name: 'Error',
    path: "*",
    group: '',
    element: <NotFound />,
    isHiddenInMenuBar: true,
  },
];
