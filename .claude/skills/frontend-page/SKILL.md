---
name: frontend-page
description: Add or modify a page in the Few_Time@Home React frontend — route registration, the core/actions API call, data-model types, and the fullscreen/websocket (Alexa) page pattern. Use when creating a new dashboard page or wiring it to the backend.
---

# Frontend page pattern

The frontend is React + MUI + TypeScript (CRA). UI text is Spanish; comments are
Spanish.

## Files involved per feature
- `src/view/pages/<Name>/<Name>.tsx` — the page component (named export).
- `src/view/Routes.tsx` — register the route in `routesFTAH`.
- `src/core/actions/<feature>.ts` — API calls via `fetch-utils`.
- `src/core/urls-and-end-points.ts` — endpoint URLs/getters.
- `src/data-model/<feature>.ts` — response types + `*Mock()` fallbacks.

## Registering a route (`Routes.tsx`)
- Pages are lazy-loaded (`lazy(() => import(...).then(m => ({ default: m.X })))`).
- Add an entry to `routesFTAH` with `name`, `path`, `group`
  (`'Cloud'`, `'Internet'`, or `''`), and `element`.
- Flags: `isHiddenInMenuBar`, `includeSubroutes`, and `isFullscreen` (renders
  without the menu chrome — used by `/alexa`, `/alexa-yt`).

## Action pattern (`core/actions/*.ts`)
Use the helpers from `fetch-utils` with a mock fallback, e.g.:

    const getDevices = () =>
      fetchJsonReceive<SmartDevicesResponse>(getSmartHomeEndpoint('devices'), smartDevicesResponseMock());
    const turnOn = (entityId: string) =>
      fetchJsonSendAndReceive<SmartActionResponse>(getSmartHomeEndpoint('turnOn'), { entityId }, smartActionResponseMock());
    export const SmartHomeActions = { getDevices, turnOn, ... };

The mock is returned when the backend is unreachable, so pages degrade instead of
crashing. Pages typically do optimistic local updates then reconcile on the
response (see `Auto.tsx` `patchDevice`).

## Live/websocket pages (Alexa)
`/alexa` and `/alexa-yt` mirror media state pushed over websockets
(`WebSocketClientService.Instance`, `subscribeToUpdates`) and fetch an initial
state. They are `isFullscreen` and take the whole viewport.

## Global ScreenSaver
`src/view/ScreenSaver.tsx` is a global DVD-style screensaver rendered in
`App.tsx` **outside** `<BrowserRouter>`. It reads `window.location.pathname`
directly (case-insensitive) and is **excluded on `/alexa` and `/alexa-yt`**. If
you add media/always-on pages, add them to `EXCLUDED_PATHS`.
