# Fourth Step privacy and security

Status: the implementation is public and has automated regression checks. **No independent security audit has been completed.** Please do not describe it as audited, unconditionally anonymous, or immune to a malicious website update.

## What the current release does

The app has no answer API, inventory database, account system, analytics, or inventory administration screen. All inventory content (including in-progress drafts, support contacts, and migrated legacy data) is encrypted on the user's device before it is persisted. The passphrase is entered locally and is not stored or transmitted. Website hosting still sees ordinary request metadata when the app is downloaded.

The envelope in `fourthstep_vault_v1` contains only format/version, a random vault ID, KDF parameters and salt, a nonce, and ciphertext. Web Crypto derives a nonextractable AES-256-GCM key using PBKDF2-HMAC-SHA-256, a random 128-bit salt, and 600,000 iterations. Each encrypted write and backup uses a fresh random 96-bit nonce and a 128-bit authentication tag. Envelope metadata is authenticated as additional data. The format strictly validates supported parameters before derivation, with a 32 MB file limit. Passphrases for new vaults require at least 16 characters; users should choose random words or a password-manager-generated secret. Length alone does not ensure entropy.

Sources: [Web Crypto deriveKey](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveKey), [AES-GCM nonce requirements](https://developer.mozilla.org/en-US/docs/Web/API/AesGcmParams), [OWASP cryptographic storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html), [OWASP PBKDF2 work factor](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).

## Storage, migration, and recovery

The vault module owns active persistence. Plaintext storage functions remain in the earlier code for migration compatibility and existing domain tests; the live inventory screens cannot call them. Session writes are queued, and session/contact updates merge against the latest in-memory state. Expected ciphertext is compared before a write. Web Locks serialize cooperating tabs where supported; the comparison is a best-effort conflict guard on browsers without Web Locks, not a universal cross-process transaction.

Migration validates old sessions, makes an encrypted archive of all original inventory keys (including older HALT logs and tasks), encrypts and decrypts a copy, writes it, verifies the stored copy, and only then removes exact matching originals. It never clears unrelated storage. Corrupt/future-version data blocks replacement. If another tab changes an original, that original is kept and the UI reports incomplete cleanup. Close older app tabs before migrating. Browser storage deletion is not secure physical erasure: device backups, browser sync/history, disk recovery, or copies already made may still contain previous readable records.

A failed save keeps the last stored ciphertext and retains the latest changes in memory. The UI warns, protects against accidental page closure while saving, and offers an encrypted recovery backup. Another-tab conflicts do not overwrite its ciphertext. A backup encrypts the current memory snapshot, including unsaved edits. Restore verifies decryption before writing and is allowed only when no inventory already exists in the destination. Restore into an empty browser profile or offline edition to keep existing copies safe. There is no automatic merge of backups and no server-side password reset. A backup needs its original passphrase.

Lock saves first, then unmounts inventory screens and drops the module's key/data references. The app attempts to lock after 15 minutes without interaction, checking the deadline every five seconds; suspended browsers may delay timers until execution resumes. **If saving fails, automatic or manual locking leaves the page open to protect unsaved work and shows a recovery warning.** Esc hides the workspace but retains the key. JavaScript cannot guarantee physical memory zeroization. An attacker with process access remains out of scope.

## Website updates and offline edition

A website owner or compromised deployment pipeline could ship code that captures passphrases or decrypted answers on a future visit. Browser encryption cannot eliminate this trust boundary. The current production CSP blocks `fetch`, XHR, WebSocket, and beacon connections (`connect-src 'none'`), framing, forms, and plugins. It still permits same-origin scripts/images and inline Next.js bootstrap scripts. These headers are defense in depth, not proof against malicious first-party code. Ordinary navigation, hosting logs, and downloads remain possible.

The offline edition bundles the same vault and UI in a single HTML file. It has no auto-update mechanism, external assets, or module imports. Its embedded CSP denies connections and uses an exact SHA-256 hash to authorize the one bundled script. It can be retained and inspected before the user chooses another version. Explicit source links open online pages only when clicked. The published SHA-256 checksum and source-revision file identify release content; because they are distributed by the same owner, they are not independent attestations. Self-contained does not mean audited.

Local `file:` URL storage and Web Crypto support vary by browser. The app checks capability and refuses to continue if encrypted persistent storage is unavailable. Keep the offline file in a stable location and make backups; clearing browser data, private browsing, storage eviction, or moving the file can lose access to the local vault. See [MDN localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage).

## Threat model

Protected: passive reading of the app's current browser storage or encrypted backups without the passphrase; accidental plaintext persistence of new inventory content; ciphertext/header tampering; routine failed saves; cooperating stale-tab writes; accidental loss during migration.

Not protected: weak/passphrase reuse and offline guessing; compromised website releases; hostile extensions, malware, browser/OS compromise; an unlocked screen; memory inspection; screenshots; printed or readable exported reviews; backups already made from the old plaintext release. The UI labels readable exports explicitly. Nobody should put answers in URLs, error reports, issue attachments, console logs, or analytics.

## Evidence and independent review handoff

Run `pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm test:privacy`. CI repeats these on pushes and PRs. Unit checks use real Node Web Crypto with fixture data. They cover wrong passphrases, authenticated-header/ciphertext tampering, unique nonces, queued updates, failed writes and recovery, complete migration archives, malformed/future data preservation, conflicting tabs, and restore refusal into an occupied browser. Source/offline checks verify the persistence boundary, known egress APIs, absence of answer API routes, the offline script/CSP hash, syntax, checksum, and external assets. **Static API checks are limited and are not a browser runtime network audit.** Dependency vulnerabilities and arbitrary future code are not proven absent by these checks.

An independent reviewer should:

- Review `lib/inventory-vault.ts` against the encryption and migration properties above, including nonce uniqueness, AAD coverage, KDF validation, nonextractability, cleanup failures, and conflict handling.
- Inspect the entire emitted JavaScript and offline HTML for egress paths, logging, remote assets, and code not covered by the source pattern checks.
- Use only synthetic inventories while recording browser network traffic through create, unlock, each guided step, reload, edit, complete, contacts, export, backup, restore, lock, and idle timeout.
- Confirm that no synthetic answers or passphrases leave the browser, including via paths, query strings, forms, image requests, error reporting, and unexpected dependencies.
- Exercise storage denial/quota, older/corrupt versions, tab races, suspended timers, browser restart, private browsing, and supported local-file browsers. Confirm users can recover unsaved edits and no existing data is silently overwritten.
- Publish reviewer identity, exact commit/file checksum, scope, findings, fixes, and date before updating the audit status.

Report suspected issues privately to the repository owner via their GitHub profile. Never include real inventory answers or passphrases in a report. A dedicated private vulnerability-reporting channel should be established before claiming a formal disclosure program.
