---
name: alexa-live
description: Work on the Few_Time@Home live cast ("Emitir en vivo") — the Live button in the music/video player bars that casts cloud music or video to the hidden /alexa receiver page (usually an Android phone wired to a speaker), the /alexa/state|sync|stop endpoints, the alexaLive websocket message, cross-device backend URLs (localhost rewriting) and keeping the phone screen on while music plays. Use when touching /alexa, the Live button, or when testing casting between devices.
---

# Live cast to /alexa

The owner opens `/alexa` on an Android phone wired to a speaker, then presses
**Live** in the music or video player on the computer. Music or video plays on
the phone, in sync. `/alexa` and `/alexa-yt` (a YouTube embed) are hidden from
the menu and fullscreen (`Routes.tsx`).

## Flow
- **Sender**: `view/molecules/MusicPlayerBar/MusicPlayerBar.tsx` and
  `VideoPlayerBar/VideoPlayerBar.tsx`. Their `startLive` POSTs
  `/alexa/state { type: 'audio'|'video', url, title, currentTime, isPlaying }`
  and then POSTs `/alexa/sync { currentTime, isPlaying? }` every 5 s. On a track
  change they send a new state. `stopLive` POSTs `/alexa/stop`.
  `url` is the **absolute** stream URL (`cloud/stream-file?...`) built on the
  sender.
- **While Live, the sender's own media must not play.** In `VideoPlayerBar`,
  the local `<video>` is paused on a frozen frame, and a virtual clock
  (`liveClockRef`: `baseTime` + `startedAt`) drives the bar. Play/pause, seek,
  prev/next, the 5 s sync and the auto-advance at the end all use that clock.
  Seeking moves the frozen frame. The `play` listener re-pauses the video if
  anything starts it. `stopLive` resumes locally at the clock position. Do not
  read `video.currentTime` for the sync while Live: it is frozen.
- **Backend**: `src/API/alexa.service.ts` keeps the state **in RAM only** (no
  data file, so nothing to back up). The handlers live in
  `api.service.ts` → `alexaService()`. Every change is broadcast over the
  websocket as `{ alexaLive: state }`. `timestamp` is set on the server.
- **Receiver**: `view/pages/Alexa/Alexa.tsx`.
  - On load it GETs the state, then subscribes to `alexaLive`.
  - `applyState` reloads the element when the URL changes, and only re-seeks when
    the drift is more than 3 s (`adjustedTime` uses `timestamp`).
  - A "Toca para activar el audio" overlay is shown once to unlock autoplay.
  - The root `Box` is `100dvh` high (falling back to `100vh`). On a phone,
    `100vh` includes the area under the browser bars, so the video was cropped
    at the bottom.
  - **Fullscreen controls**: a tap anywhere shows a button in the top-right for
    7 s (`CONTROLS_VISIBLE_MS`). Each tap restarts the timer. The button toggles
    `document.documentElement.requestFullscreen({ navigationUI: 'hide' })` /
    `exitFullscreen()`, with `webkit*` fallbacks. Its icon follows
    `fullscreenchange`, because the phone's back button also leaves fullscreen.
    The Fullscreen API works over plain http.

## Cross-device URLs (important)
The phone and the computer resolve `localhost` differently.
- When `frontend/src/configuration.json` has `"ip": "localhost"` (the dev PC), the
  frontend uses `resolveBackendHost` (`service/configuration/configuration.service.ts`).
  On a page opened from a LAN IP, it calls the backend on that same host.
- The sender's `url` can still say `http://localhost:3001/...`. That is why the
  receiver passes it through `toReachableBackendUrl` before it plays it. Any new
  field that carries an absolute backend URL from another device needs the same.

## Keep the screen on (music only)
`core/hooks/useKeepScreenAwake.ts`. `Alexa.tsx` enables it only when
`isAndroidDevice() && liveState?.type === 'audio'`. With video, the real video
already keeps the screen on.
- The Screen Wake Lock API needs a secure context (HTTPS or localhost). Over
  plain-http LAN it does not exist.
- The fallback is `public/keep-awake.{webm,mp4}` (black, 64×64, 2 s, made with
  ffmpeg): muted, looping, re-played on `visibilitychange`, on every tap, and
  every 30 s.
- **Chrome ignores tiny or nearly transparent videos.** A 64 px, opacity 0.01
  video did *not* keep a Samsung screen on. It must be visible: full-screen,
  opaque, `z-index: 0`, used as the page background. So the `Alexa` root `Box`
  has `zIndex: 1` and a transparent background while the mode is `'video'`. With
  `z-index: -1`, the app's wallpaper covers the video.
- The hook returns `'wakeLock' | 'video' | 'off'`, driven by the real
  `play`/`pause` events. A faint ☀ in the bottom-right corner shows it is active,
  and its tooltip names the mode.
- A sure alternative on a phone: the Chrome flag
  `chrome://flags/#unsafely-treat-insecure-origin-as-secure` with
  `http://<IP>:7000`. It turns on the real Wake Lock API.

## Testing
- Start the backend and frontend (see CLAUDE.md). Fake a cast with curl:
  `curl -X POST http://localhost:3001/alexa/state -H "Content-Type: application/json" -d '{"type":"audio","url":"http://localhost:3001/cloud/stream-file?drive=cloud&path=x.mp3","title":"Prueba","currentTime":0,"isPlaying":false}'`.
  Always `POST /alexa/stop` afterwards.
- Emulate a phone with `resize_window` preset `mobile`, which sets an Android
  user agent.
- **The browser pane reports `document.visibilityState === 'hidden'`** and pauses
  background media, so wake lock is rejected and the keep-awake video pauses. To
  test, inject a `<script>` (the JS tool runs in an isolated world) that overrides
  `visibilityState` to `'visible'`, dispatches `visibilitychange`, and re-plays
  the video on an interval.
- The browser pane ignores `requestFullscreen` (no change or error event). To
  test the toggle, inject a script that stubs `requestFullscreen`,
  `exitFullscreen` and `document.fullscreenElement`, and dispatches
  `fullscreenchange`.
- The pane blocks a LAN-IP page (`http://<IP>:7000`) from calling `:3001`
  (`ERR_BLOCKED_BY_CLIENT`). To check LAN access, curl the backend on the LAN IP
  with an `Origin` header. Check URL rewriting with
  `await import('/src/service/configuration/configuration.service.ts')` on a page
  opened from the LAN IP.
- The final proof (screen stays on for more than 30 min, sound plays) is only
  possible on the owner's phone: ask them to test.
