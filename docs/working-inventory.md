# The working inventory: research and design

Fourth Step began as one inventory per day: one set of HALT sliders, then resentments, fears, harms, and strengths. Mood does not work that way. It moves with events through the day, and the moments that matter most for recovery (an argument, a lonely evening, an urge on the drive home) are exactly the ones a once-a-day form flattens. This document records the research behind the change to a **working inventory**: timestamped check-ins whenever the app is opened, building history that can be graphed and reviewed across days and weeks, alongside the full guided inventory.

## What the research says

**Recovery practice already has this concept.** AA's Step Ten describes a *spot-check inventory* "taken at any time of the day, whenever we find ourselves getting tangled up", alongside a review at day's end ([Twelve Steps and Twelve Traditions, Step Ten, pp. 88–95](https://www.aa.org/sites/default/files/2022-01/en_step10_0.pdf)). A check-in is a spot-check; the Patterns view is the day's-end review. The full guided session remains the Fourth Step.

**Ecological momentary assessment (EMA)** is the research method for exactly this: brief, repeated self-reports captured in the moment and in context, which reduce the recall bias of end-of-day summaries and reveal within-day change. Two sampling designs matter here. *Event-contingent* sampling records when something happens (the person opens the app because something shifted). *Signal-contingent* sampling prompts at times the person did not choose. Without a server or service worker, the app uses event-contingent check-ins and offers a check-in every time it is opened.

**Momentary change predicts lapses better than background stress.** In EMA studies of substance use treatment, rapid increases in negative affect in the minutes or hours before a lapse predicted it, while higher stress or negative affect in the preceding days did not ([Using EMA to predict relapse after adult substance use treatment](https://pmc.ncbi.nlm.nih.gov/articles/PMC8237687/)). Negative affect and craving frequently rise together within a person, and how tightly they are coupled varies between people ([EMA of negative affect and craving during residential opioid use disorder treatment](https://pmc.ncbi.nlm.nih.gov/articles/PMC10127152/)). Two design consequences follow: record **urges or cravings** next to HALT, and show **within-day** movement, not only daily averages.

**Naming a feeling is itself regulating.** Affect labeling ("putting feelings into words") reduces amygdala response to negative emotional stimuli ([Lieberman et al., 2007, *Psychological Science*](https://sanlab.psych.ucla.edu/wp-content/uploads/sites/31/2015/05/Lieberman_AL-2007.pdf)). The check-in therefore asks the person to tap the feelings that fit, not only rate intensity.

**HALT is a recovery heuristic, not a validated clinical scale.** Its values are treated as personal self-tracking. The app compares a person with themselves, needs several check-ins on both sides of any comparison, describes tendencies ("has tended to", "averaged … compared with"), never causes, and suggests bringing patterns to a sponsor, therapist, or trusted person.

## What a check-in records

| Field | Scale | Why |
|---|---|---|
| Time | UTC instant + the device's UTC offset at that moment | The day and hour are kept as lived, through travel and daylight-saving changes. A late-night check-in belongs to the day it happened. |
| Overall mood | 1–5, five large tap targets | One tap is possible during a panic. A separate scale from needs, because higher is better here. |
| Hungry, angry, lonely, tired | 0–10 sliders | Unchanged from the existing HALT step, so older history stays comparable. The previous check-in's value is shown as "Last time". |
| Cravings or urges | 0–10 | The strongest EMA predictor alongside negative affect. Worded broadly: drinking, using, or an old behavior. |
| Feelings | Multi-select, 16 named feelings | Affect labeling; frequency charts. Difficult and comfortable feelings are both offered. |
| Where, and with whom | Multi-select context tags | Lets patterns connect to events and settings (work, alone, family). |
| What is going on | Optional free text | The event in the person's own words. |

A check-in can be logged for an earlier time ("This happened earlier?") and edited or deleted later from the Patterns log. Finishing the HALT step of a full inventory also records a check-in, and revisiting that step updates the same record. A check-in can lead straight into the inventory: "Write a resentment" opens a new session with HALT already answered and the first resentment question waiting.

After saving, the app offers up to four gentle next steps based on what was recorded. A very low mood or strong urge always comes first, with support contacts and crisis lines (988 and SAMHSA's helpline in the US, or local emergency numbers).

When a vault from an earlier version is opened, its answered HALT steps and older HALT logs are imported as check-ins at their original times, so the timeline starts with real history.

## How it is graphed

The Patterns view follows the data-visualisation method in this repository's tooling:

- **Small multiples on one time axis.** Mood, hunger, anger, loneliness, tiredness, and urges each get a strip with its own scale. This avoids a dual axis (mood is 1–5, needs are 0–10) and a six-line tangle; the row label carries identity, so a single validated colour (`--viz-line`, the brand hue at oklch 0.50 0.12 155) is enough and colour-vision differences cannot cause confusion.
- **Day, week, and 30-day ranges.** The day view plots each check-in at its time of day. Week and month views plot daily averages, with gaps for days without check-ins.
- **A crosshair that snaps to the nearest check-in**, with a readout of every measure. It works with pointer, touch, and arrow keys. Every chart has a table view.
- **Time-of-day grid.** Average of each measure by morning, afternoon, evening, and night over the last 30 days, on a one-hue ramp with numbers printed in each cell.
- **Feelings named**, as horizontal bars.
- **Plain-language insights** over the last 30 days: when a need peaks by time of day, how urges differ when a HALT need is 6 or higher, how settings relate to needs or mood, the most named feeling, mood this week against last week, and how consistently the person checked in. Each rule requires at least three check-ins on both sides of a comparison and a gap of at least 1.5 points (0.6 for mood).
- **CSV export** of every check-in, for charting in Google Sheets, Excel, or Numbers. Text cells are protected against spreadsheet formula injection.

Storage: a year of five check-ins a day is roughly 0.5 MB of JSON; gzip before encryption brings it to about 70 KB in our measurement (more for long notes). Browser storage allows several megabytes per site, which leaves room for many years.

## Unlocking without a long password

The earlier release required a 16-character passphrase at every unlock, which is unrealistic in the middle of a panic attack. The vault now uses a random data key wrapped separately for each unlock method (details in [SECURITY.md](../SECURITY.md)):

- **Face ID, Touch ID, fingerprint, face unlock, Windows Hello, or the device screen lock**, through a passkey using the WebAuthn PRF extension. The device verifies the person and releases a secret from its secure hardware; no server is involved. As of October 2026 this works in Safari 18+ on Apple devices, Chrome and Edge with Google Password Manager or iCloud Keychain (including Android), and Windows Hello since the February 2026 Windows 11 update. Support is detected at runtime with `PublicKeyCredential.getClientCapabilities()` where available.
- **A 6–12 digit PIN**, for browsers without PRF and for the offline file. It stays in one browser, is excluded from backups, and turns off after five wrong attempts. Its offline-guessing limit is stated plainly in the app.
- **A recovery key** that the app generates (100 random bits) and the person saves once, used only on a new device, after clearing the browser, or when other methods fail. It can be replaced while unlocked after re-verifying, which also covers "I lost my recovery key but my fingerprint still works". People who prefer their own passphrase need 12 characters, not 16.

The app also hides the screen as soon as it goes to the background and locks if it was away longer than the chosen time (1, 5, or 15 minutes; quick unlock makes a short setting painless).

### Why not "Sign in with Google"?

The goal behind the request was to get an inventory into a Google Doc. That is now one copy and one paste: **Copy for Google Docs** puts a formatted version (headings intact) on the clipboard, and **Open a new Google Doc** opens docs.new. On phones, **Share…** hands a file to Drive, Docs, email, or notes through the system share sheet. Signing in with Google would have meant loading Google's script into the same page that holds decrypted answers, allowing network connections the app currently blocks, and creating an account link where there is none today, while still storing plaintext with Google. It would not have made the vault more secure. Passkeys stored in Google Password Manager already give Android users a Google-backed, biometric unlock that syncs to their other devices without any of those costs.

## Possible next steps

- **Nightly review.** A Step Ten evening prompt that summarises the day's check-ins and asks what went well, where the person was selfish, dishonest, resentful, or afraid, and what to set right tomorrow.
- **Optional reminders.** Signal-contingent prompts need notifications, which need a service worker or a native wrapper. Both change the update trust model and deserve a deliberate decision.
- **Share a pattern summary with a sponsor**, as a readable one-page export of selected weeks.
- **Real-device testing** of device unlock on iOS, Android, macOS, and Windows, plus an independent security review (see SECURITY.md).
