# IV · Fourth Step

Private check-ins through the day, and a guided inventory you can work through a little at a time.

**Check-ins (a working, Step Ten-style inventory).** Opening the app starts a quick spot-check: mood, HALT (hungry, angry, lonely, tired), cravings or urges, named feelings, where and with whom, and a note. Each is saved with its time and time zone. After saving, the app suggests a next step, from reaching out to writing a resentment right then. **Patterns** charts mood, needs, and urges through the day, by week, and over 30 days, shows averages by time of day, lists feelings named, and describes tendencies in plain language. Check-ins export as CSV for Google Sheets or Excel. See [docs/working-inventory.md](docs/working-inventory.md) for the research and design.

**The guided Fourth Step.** The workflow is **HALT → resentments → fears → harms → strengths → review**. Each entry uses short prompts, with a clear next action and progress through the session. Sections can be explicitly reviewed with nothing to add.

Answers and unfinished entries save as you go. **Save & pause** returns to the home screen; continuing restores the same question. Each new session starts clean and keeps previous sessions in **Your inventory**. The library supports search, completion filters, printable reviews, and session backups. **Export review** provides selectable text and a readable file download. Entries from the earlier ledger remain available in a separate review.

## Run locally

Use Node.js 22 and pnpm.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open http://localhost:3000.

## Checks

```sh
pnpm typecheck
pnpm test
pnpm build
```

The tests cover date boundaries, draft restoration, entry editing, save failures, corrupt data, history preservation, completion rules, review exports, check-in time zones and summaries, insight thresholds, CSV safety, and every vault unlock method. Production builds enforce TypeScript validation.

The original `pnpm lint` command still requires an ESLint installation and configuration; it is not currently a working check.

## Vercel hosting

The existing Vercel project is `cookingwithcastro-llc/v0-fourth-step-ledger`, connected to `gregcastro23/IV` with `main` as its production branch. The intended custom domain is `fourthstep.app`.

`vercel.json` uses the standard pnpm install and build commands. It overrides the older project build command, which references a `.v0/inject-built-with-v0.mjs` script that is absent from this repository.

## Storage and privacy

Everything is stored in this browser, encrypted (see below). No server account or cloud synchronization is used. Earlier readable keys (`inventory_sessions_v1` and the original ledger keys) are migrated into the vault and removed only after verification.

**Hide inventory** and Escape replace the visible workspace with a cover; the cover also appears automatically whenever the app goes to the background. Readable exports (print, text, Google Docs copy, CSV) are labelled as leaving the vault.

The app does not mount an analytics component. The font loader fetches Geist during development/build; fonts are served with the app after build. The web app manifest makes the site installable to a home screen under the discreet name "IV"; there is intentionally no service worker.

## Main modules

- `lib/inventory-vault.ts`: encrypted vault, key slots (recovery key, device passkeys, PIN), migration, backups.
- `lib/device-unlock.ts`: WebAuthn passkey creation and PRF evaluation for Face ID, fingerprint, Windows Hello, or screen lock.
- `lib/moments.ts`: check-in schema, local-time handling, summaries, insights, suggestions, and CSV export.
- `lib/inventory-sessions.ts`: session schema, persistence, draft transitions, completion, search, and text/HTML export.
- `components/inventory/vault-gate.tsx` and `unlock-methods.tsx`: setup, recovery key, quick unlock, and unlock screens.
- `components/inventory/inventory-shell.tsx`: navigation, autosave status, locking, privacy cover, and earlier-entry access.
- `components/inventory/check-in.tsx`, `patterns-view.tsx`, `moment-chart.tsx`: check-ins, Patterns, and charts.
- `components/inventory/security-settings.tsx`: Privacy & security settings.
- `components/inventory/session-runner.tsx`: the six-part guided flow.
- `components/inventory/entry-editor.tsx`: one-question-at-a-time entry prompts.
- `components/inventory/session-review.tsx`: structured review, printing, and downloads.
- `components/inventory/home-view.tsx` and `library-view.tsx`: practice home and saved sessions.

Earlier standalone views remain in the source for reference; the guided workflow replaces them in the active app.

## Private local vault and offline edition

Inventory content is encrypted on-device with a random data key. Setup creates a **recovery key** (or accepts a passphrase of at least 12 characters), then offers **quick unlock**: Face ID, Touch ID, fingerprint, face unlock, Windows Hello, or the device screen lock through a passkey (WebAuthn PRF), and/or a 6–12 digit PIN kept in this browser only. Vaults from the previous release open with their existing passphrase and are upgraded on the first save. The recovery key can be replaced while unlocked. There is no server recovery: keep an encrypted backup and your recovery key. Use **Lock vault** when stepping away; the app also locks after a chosen time in the background or 15 minutes idle.

Read the [security design and limitations](SECURITY.md), including the website-update trust boundary and pending independent audit. The public `/privacy` page explains these limits before the first check-in.

`pnpm build` creates both the Next.js website and `public/downloads/fourthstep-offline.html`, plus its SHA-256 checksum and source revision. The HTML is self-contained and updates only when the user downloads another copy. Local-file browser storage varies; make backups and keep the file in a stable location.

Validation: `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:privacy`. The last command performs limited source and artifact checks, not a runtime traffic audit. Independent review instructions are in `SECURITY.md`.
