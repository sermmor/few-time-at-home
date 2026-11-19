---
name: smart-home
description: Work on the "Auto" page / smart-home backend — controlling smart plugs and bulbs via Tuya/SmartLife, TP-Link Tapo, and eWeLink. Use when adding or debugging a provider or device, the entityId scheme, the Python tapo helper, or TPAP issues.
---

# Smart home (the "Auto" page)

Controls the owner's smart plugs and a bulb from the dashboard (`Cloud → Auto`,
route `/cloud/auto`). Three brands, three providers behind one aggregator.

## Backend layout — `backend/src/smartHome/`
- `smartDevice.ts` — `SmartDevice` type, `SmartProvider` interface,
  `makeEntityId` / `parseEntityId`, `ProviderName`, `LightUpdate`.
- `smartHomeConfig.ts` — reads the `smart_home` block from `keys.json`.
- `providers/tuyaProvider.ts` — Tuya/SmartLife via `tuyapi` (local control).
- `providers/tapoProvider.ts` — TP-Link Tapo via a **Python** helper (`tapo` lib).
- `providers/ewelinkProvider.ts` — eWeLink via `ewelink-api-next` (cloud API).
- `ensurePythonTapo.ts` — best-effort install of the Python `tapo` lib, gated by
  `vars.json`; never throws.

Aggregator + HTTP: `backend/src/API/smartHome.service.ts` exposes
`ping / listDevices / turnOn / turnOff / setLight`. Endpoints are registered in
`api.service.ts` (`smartHomeService()`):
`/smart/status`, `/smart/devices`, `/smart/device/turn-on`, `/smart/device/turn-off`,
`/smart/device/light`.

Frontend: page `frontend/src/view/pages/Auto/Auto.tsx`, action
`frontend/src/core/actions/smartHome.ts` (`SmartHomeActions`), types in
`frontend/src/data-model/smartHome.ts`.

## entityId scheme
A device is addressed by an opaque `entityId = "<provider>:<localId>"`
(`tuya:` / `tapo:` / `ewelink:`). `parseEntityId` routes a command to the right
provider. The frontend never parses it — it just passes it back.

## Provider contract (`SmartProvider`)
`isConfigured()`, `prefix` (provider name), `listDevices()`, `turnOn(localId)`,
`turnOff(localId)`, `setLight(localId, update)`. `isConfigured()` is what the
aggregator uses to decide which providers are active; a provider with no config
simply contributes no devices.

## Per-brand notes
- **Tuya/SmartLife** (`tuyapi`): needs `id` + local `key` + `ip` per device
  (the local key comes from the Tuya IoT Platform API Explorer). `tuyaProvider`
  attaches `device.on('error', …)` — mandatory, or an async `ECONNRESET` crashes
  the whole backend. Handles RGB↔Tuya-HSV, brightness (DPS 22, 10–1000), color
  temp (DPS 23), Kelvin range 2700–6500.
- **Tapo** (Python `tapo` lib): newer firmware uses **KLAP v2 / TPAP** encryption
  that no Node library supports, so Tapo goes through an embedded Python script.
  `keys.json` needs `email`, `password`, and `devices` (host/ip + optional
  `model`, e.g. `P100`). The helper auto-tries handlers (p100/p110/p115/p105/…).
  Requires Python 3.10+; install is best-effort via `ensurePythonTapo.ts`.
  - **TPAP troubleshooting:** if Tapo devices return `InvalidResponse`, the fix is
    to toggle **"Compatibilidad con terceros" (Third-Party Compatibility) OFF then
    ON** in the Tapo app. (This resolved it for the owner.)
- **eWeLink** (`ewelink-api-next`): dual ESM/CJS — import as
  `require('ewelink-api-next').default` then `new eWeLink.WebAPI({appId, appSecret, region})`.
  Methods: `user.login({account, password})`, `device.getAllThings({})`,
  `device.setThingStatus({ type: 1, id, params: { switch } })`. Needs
  `appId`/`appSecret` from the eWeLink developer portal. Cloud-based, so it works
  off the home LAN.

## Config shape (`keys.json` → `smart_home`)
    "smart_home": {
      "tuya":    { "devices": [ { "name", "id", "key", "ip", "version", "type" } ] },
      "tapo":    { "email", "password", "devices": [ { "name", "host", "model" } ] },
      "ewelink": { "appId", "appSecret", "region", "account", "password" }
    }

## Adding a new device
1. Add it under the right brand in `keys.json` → `smart_home`.
2. Restart backend, open the Auto page, press refresh.
3. Unreachable devices render greyed out with "no alcanzable" — never an error.

## Adding a new provider
1. Implement `SmartProvider` in `providers/<brand>Provider.ts`.
2. Add it to `ProviderName` and to the `providers` map in `smartHome.service.ts`.
3. Follow crash-safety rules (try/catch, EventEmitter `'error'` handlers,
   on-demand network only).
