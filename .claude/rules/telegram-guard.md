# Rule: guard Telegram sends

Any code path that sends a Telegram message **must** be guarded so it does not
fire in dev mode or when Telegram connectivity is intentionally off.

## The pattern
- Services receive the sender as an **optional** dependency and only call it when
  present — e.g. `aemet.service.ts`:

      constructor(private sendMessageToTelegram?: (message: string) => void) { ... }
      // later:
      this.sendMessageToTelegram?.(message);

- Background update flows take a `connectToTelegram` flag and skip the send (and
  any production-data mutation) when it is false — e.g.
  `processAutoupdate/mediaRSSAutoupdate.ts`:

      constructor(private commands: TelegramBotCommand, private connectToTelegram: boolean = true) { ... }
      if (this.connectToTelegram) { /* send + mutate */ }

- In `api.service.ts`, sends go through `TelegramBot.Instance().sendMessageToTelegram`.

## What to do
When adding a service that can notify via Telegram:
1. Take the sender as an optional param / respect the `connectToTelegram` flag.
2. Never send unconditionally at module load or in a constructor.
3. Guard every call site so dev mode and offline runs stay silent and safe.
4. Scheduled messages (`node-schedule`): create the service in
   `setup/bootstrap.ts` with `keyData?.connect_to_telegram ? bot.sendMessageToTelegram : undefined`
   and **only call `scheduleJob` when the sender exists** (see `AemetService`,
   `recommendation/dailyRecommendations.ts`).
5. Test with a fake sender (`msg => list.push(msg)`) in a scratchpad script; never
   flip `connect_to_telegram` in the local `keys.json` to try a message.
