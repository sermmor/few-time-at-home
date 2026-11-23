---
name: rss-page
description: Work on the Few_Time@Home RSS page (/rss) and its backend — the category selector (Favoritos, Recomiéndame, Mastodon, YouTube + tags, Blog, Noticias, Guardados, Aleatorio), RssMessage cards and their gradual image loading, the scroll top/bottom buttons, the saved list (readLaterRSS), the "Recomiéndame" recommender (backend/src/recommendation), its 6:30 Telegram digest, and the RSS feeds pushed to Supabase for ftahApp. Use when adding a category or card button, touching the recommender, or testing /rss.
---

# RSS page

## Message format (everything is a plain `string`)
Every RSS item travels as one `\n`-separated string; there is no object model.
- blog / news / youtube / saved: `title\nauthor - Thu Jun 12 2025\nbody\nurl`
  (YouTube body is usually empty; saved items added by hand use author `Automatico`).
- mastodon: `@user - Thu Jun 12 2025\n<html>\nurl` (no title line; body is HTML,
  link texts hide parts in `<span class="invisible">`).
- The URL is the **last line**. In the frontend, `getUrlMessage` (Rss.tsx)
  prefers the first `<a href=` in the body, else the last line.
- Backend parser: `parseRssMessage` in `backend/src/recommendation/textUtils.ts`
  (detects the `author - Day Mon DD YYYY` header on line 0 = Mastodon, line 1 = others).
  Reuse it instead of splitting by hand.

## Files
Frontend (`frontend/src`):
- `view/pages/Rss/Rss.tsx` — the whole page: `RSSType` union, the category
  `Select` list (order matters: `['favorites','recommended','mastodon','youtube',
  'blog','news','saved','random']`, labels `t('rss.<type>')`), the **IR** button
  handler (one branch per type), the card list and the scroll Fabs.
- `view/pages/Rss/component/RssMessage.tsx` — one card. Props `message`,
  `unfurlData`, `index`. YouTube thumbnails come from
  `UnfurlActions.getUnfurlYoutubeImage({youtubeUrl, indexItem: index})`; the
  backend **delays by `index`**, which is why images appear gradually. Do not
  change that loading when asked to fix layout/scroll.
- `view/pages/Rss/component/NewMessage.tsx` (add link to Guardados),
  `SavedRSSManagerDialog.tsx` (edit/delete saved).
- `core/actions/rss.ts` (`RSSActions`), `core/actions/readLaterRss.ts`,
  `core/actions/unfurl.ts`; endpoints in `core/urls-and-end-points.ts`;
  types/mocks in `data-model/rss.ts`, `data-model/mock/rssMock.ts`.
- i18n: `rss.*` keys in **both** `locales/es.json` and `en.json`.

Backend (`backend/src`):
- `API/api.service.ts` — `/rss/{mastodon,blog,news,youtube,favorites,saved}`,
  `/rss/recommended`, `/rss/recommended/dismiss`, `/rss/force-update`,
  `/readLaterRSS/*`, `/unfurl`, `/unfurl-youtube-image`.
- `processAutoupdate/mediaRSSAutoupdate.ts` — holds all feeds **in RAM**:
  `MediaRSSAutoupdate.instance.currentCompleteData =
  {messagesMasto, messagesBlog, messagesNewsFeed, messagesYoutube: {tag, content}[]}`
  (persisted to `data/config/media/mediaFilesContent.json`). After each update
  it calls the static hook `onUpdated`, and (only when `connectToTelegram`)
  `pushAllFeedsToSupabase`, which also uploads `extraSupabaseFeeds()`.
- `API/readLaterMessagesRSS.service.ts` — Guardados in
  `data/readLaterMessagesRSS.json` (`{id, message}[]`); static `onChange` hook
  fires with the full list after every write.
- `unfurl/unfurlCache.service.ts` — unfurl cache (`_instance.isLoadedUnfurlCache`,
  `unfurlCache[]` with `description`).
- YouTube tags come from `ConfigurationService.Instance.rssConfig.optionTagsYoutube`
  (local: `null, sesionesMusica, politica, divulgacion, ingles, podcasts, abandonados`).

## Frontend patterns / gotchas
- Lists are **parallel arrays**: `rssMessages[i]` ↔ `unfurlData[i]` (↔
  `reasons[i]` for Recomiéndame). When removing a card, filter **all** of them by
  index or thumbnails shift one slot.
- Card buttons go inside `<Box sx={getButtonCardStyles(alphas.general)}>` under
  each `RssMessage`. Saved/random use `readLaterData` instead of `rssMessages`.
- The `index` passed to `RssMessage` is reversed for most feeds
  (`length-1-index`) but direct for favorites/recommended (best first).
- `fetch-utils` returns the **mock** on failure: if the page shows
  "Título 1 blog / @autor2…", the backend endpoint is broken or not running.
- Scroll-to-bottom keeps following the page while images load
  (`scrollToBottom` + `ResizeObserver` on `document.body`, stops after 4 s idle /
  30 s max / user input). The Fabs only appear after a `scroll` event.

## "Recomiéndame" (backend/src/recommendation)
- `textUtils.ts` — parse/strip HTML/normalize URLs (`normalizeUrl` maps YouTube to
  `youtube.com/watch?v=ID`)/tokenize (ES+EN stopwords, light stemming). Pure.
- `recommender.ts` — pure `recommend(input)`: TF-IDF + cosine against positives
  (top-3 mean), author/domain affinity, recency (7-day half-life), penalty from
  dismissed items, then greedy diversity (author ×0.6, source ×0.9, drop
  near-duplicates > 0.75). Cold start = recent + varied. `getItemKey` =
  normalized URL. Each item carries a `reason` (`similar|author|domain|recent`).
- `recommendation.service.ts` — lazy singleton. Positives = Guardados + all
  desktop profile links (`DesktopProfilesService`, RAM). Candidates = last 300
  of Mastodon/blog/news + YouTube tags except `abandonados`. Ranking (200) lives
  only in RAM, recomputed after RSS updates / saved changes / desktop link
  fingerprint change. `getRecommendations(n)` → `{messages, reasons}`;
  `getTopItems(n)` → full items; `dismiss(message)`.
- `recommendationFeedback.ts` — `RECOMMENDATIONS_PATH =
  data/config/recomendaciones.json` (`{dismissed: [...]}`, max 300): read once,
  writes debounced 30 s. Wired into the weekly backup (`utils.ts`) and the sync
  reload (`synchronize.service.ts`). Kept import-free so `utils.ts` can import it.
- `dailyRecommendations.ts` — 6:30 Telegram digest of the top 7 (not repeating
  links sent in the last 7 days, remembered in RAM only). Created in
  `setup/bootstrap.ts` with the sender only when `connect_to_telegram`.
- **Hooks are registered by `registerRecommendationHooks()` from
  `bootstrap.ts`**, never at module load: there is an import cycle
  (`mediaRSSAutoupdate → … → synchronize.service → recommendation.service →
  mediaRSSAutoupdate`) and touching those classes at load time throws
  `Cannot access 'MediaRSSAutoupdate' before initialization`.
- SD card policy (owner's request): use the in-RAM data, never re-read feeds or
  desktop files from disk, batch writes. Keep it that way when extending.
- Known, accepted: a Mastodon toot sharing the same link as a dismissed blog
  post is a different item (own URL); it is only pushed down, not hidden.

## ftahApp
Feeds reach the app through Supabase `rss_cache` (`feed_key`). Feed list:
`ftahApp/lib/services/rss_service.dart` `baseFeedTypes`; labels/icons/order in
`lib/screens/rss_screen.dart` (`_feedLabels`, `_feedIcons`, two literal lists for
sidebar and mobile chips). A new feed key needs all of these plus an
`upsertRssCache` on the backend.

## Testing
- Pure modules: `cd backend && npm run build`, then a node script in the
  scratchpad that `require`s `build/recommendation/*.js` and feeds it
  `data/config/media/mediaFilesContent.json` + `data/readLaterMessagesRSS.json`
  (read-only). For service-level tests set
  `MediaRSSAutoupdate.instance = { currentCompleteData: <json> }` first and pass a
  fake sender (`msg => list.push(msg)`) — never a real Telegram one.
- Browser: start `backend`, poll `/desktop/profiles`, start `frontend`, open
  `/rss`. The first Vite load may stay on "CARGANDO" — navigate again. Pick the
  category via `find "FAVORITOS"` → option → `IR`.
- Before clicking bookmark/👎, back up `data/readLaterMessagesRSS.json` and
  note whether `data/config/recomendaciones.json` exists; restore/delete after
  stopping the servers. 👎 writes the file only after 30 s.
- Local data is small (≈57 Mastodon, 83 blog, no news, 20 saved); dev mode has
  no Telegram and no Supabase push.
