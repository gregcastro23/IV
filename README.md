# IV · Fourth Step

A guided inventory you can work through a little at a time and repeat daily.

The active workflow is **HALT → resentments → fears → harms → strengths → review**. Each entry uses short prompts, with a clear next action and progress through the session. Sections can be explicitly reviewed with nothing to add.

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

The tests cover date boundaries, draft restoration, entry editing, save failures, corrupt data, history preservation, completion rules, and review exports. Production builds enforce TypeScript validation.

The original `pnpm lint` command still requires an ESLint installation and configuration; it is not currently a working check.

## Vercel hosting

The existing Vercel project is `cookingwithcastro-llc/v0-fourth-step-ledger`, connected to `gregcastro23/IV` with `main` as its production branch. The intended custom domain is `fourthstep.app`.

`vercel.json` uses the standard pnpm install and build commands. It overrides the older project build command, which references a `.v0/inject-built-with-v0.mjs` script that is absent from this repository.

## Storage and privacy

Data is stored in this browser's local storage. New sessions use the versioned `inventory_sessions_v1` key; original ledger keys are read without modifying them. No server account or cloud synchronization is used.

**Hide inventory** and Escape replace the visible workspace with a cover. Escape only hides; revealing requires an explicit action. Existing PIN/password screen locks remain supported, and a screen lock can be configured from the lock screen.

A screen lock is an interface gate. Records and downloaded files are readable, not encrypted. Keep review downloads and JSON backups private. Clearing browser data removes the local copy; download a copy if you want to retain it elsewhere.

The app no longer mounts the production analytics component. The font loader fetches Geist during development/build; fonts are served with the app after build.

## Main modules

- `lib/inventory-sessions.ts`: session schema, persistence, draft transitions, completion, search, and text export.
- `components/inventory/inventory-shell.tsx`: navigation, autosave status, screen lock, privacy cover, and earlier-entry access.
- `components/inventory/session-runner.tsx`: the six-part guided flow.
- `components/inventory/entry-editor.tsx`: one-question-at-a-time entry prompts.
- `components/inventory/session-review.tsx`: structured review, printing, and downloads.
- `components/inventory/home-view.tsx` and `library-view.tsx`: practice home and saved sessions.

Earlier standalone views remain in the source for reference; the guided workflow replaces them in the active app.
