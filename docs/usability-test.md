# Informal usability test

**Goal:** someone outside the project tries the core flow unaided, so we can see where they get stuck. Aim for 2–3 people, 15–20 minutes each. Watch and take notes; only help if they're completely stuck, and note when you do.

Fill in every `______` and empty table cell. Delete the Tester C section if only two people took part.

## 1. Session details

| | |
|---|---|
| Facilitator | ______ |
| Date(s) | ______ |
| Where | ______ (e.g. campus lab, home, online call) |
| Build tested | ______ (commit hash from `git log -1 --format=%h`, or the live URL) |
| Device and browser | ______ (e.g. Windows laptop, Chrome 141, 1920×1080) |
| Recording | ______ (screen recording / notes only) |

## 2. Before the session

- [ ] Backend and frontend running (or the live URL), quests seeded (`npm run db:migrate` and `npm run db:seed`)
- [ ] A fresh browser profile, so the tester enlists a brand-new pilot
- [ ] Admin test account ready if running task 8 (`npm run db:make-admin -- <callsign>`)
- [ ] Tester agreed to take part and to their notes (not their name) being used in the project docs
- [ ] Tell them: "Think out loud. We're testing the app, not you."

## 3. Tasks

Read each task aloud as written. Don't explain where things are.

| # | Task (read to the tester) | Success looks like |
|---|---|---|
| 1 | "Create an account and get ready for your first lesson." | Enlists, completes onboarding (sector, class, concept) |
| 2 | "Complete your first quest." | Reads the code, answers, gets AI feedback, reaches the debrief |
| 3 | "You're stuck on an objective: get help without being given the answer." | Uses Request hint or the Ship's AI chat |
| 4 | "Find the bug in a bug-hunt objective." | Marks the line in the code viewer and explains the bug |
| 5 | "You found some code online you don't understand. Get Questack to explain it." | Finds the decoder, steps through the sections, passes the check |
| 6 | "Make the Ship's AI explain things more simply." | Switches to Cadet (in the AI panel or in Settings) |
| 7 | "See how much you've progressed, then sign out." | Opens the Profile, then signs out |
| 8 | *Optional, admin account:* "Add a new quest to the JavaScript sector with one objective and make it available to learners." | Opens Admin › Quests, fills in the details and an objective, publishes, and the quest appears on the sector map |

## 4. Testers

### Tester A

**Initials:** ______ · **Date:** ______ · **Background:** ______ (e.g. first-year IT student) · **Coding experience:** none / some / confident · **Used an AI coding tool before?** Y / N

| Task | Completed? (Y / with help / N) | Time | Ease (1 hard – 5 easy) | What they did, said or got stuck on |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |
| 6 | | | | |
| 7 | | | | |
| 8 | | | | |

**Answers afterwards:**
1. Most confusing moment: ______
2. Did the Ship's AI match their level? Did it ever just give the answer? ______
3. Did the space theme help or get in the way? Was "C# Sector" clear? ______
4. How likely to use it to learn (1–5), and why: ______

**Quotes worth keeping:** ______

### Tester B

**Initials:** ______ · **Date:** ______ · **Background:** ______ · **Coding experience:** none / some / confident · **Used an AI coding tool before?** Y / N

| Task | Completed? (Y / with help / N) | Time | Ease (1 hard – 5 easy) | What they did, said or got stuck on |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |
| 6 | | | | |
| 7 | | | | |
| 8 | | | | |

**Answers afterwards:**
1. Most confusing moment: ______
2. Did the Ship's AI match their level? Did it ever just give the answer? ______
3. Did the space theme help or get in the way? Was "C# Sector" clear? ______
4. How likely to use it to learn (1–5), and why: ______

**Quotes worth keeping:** ______

### Tester C

**Initials:** ______ · **Date:** ______ · **Background:** ______ · **Coding experience:** none / some / confident · **Used an AI coding tool before?** Y / N

| Task | Completed? (Y / with help / N) | Time | Ease (1 hard – 5 easy) | What they did, said or got stuck on |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |
| 6 | | | | |
| 7 | | | | |
| 8 | | | | |

**Answers afterwards:**
1. Most confusing moment: ______
2. Did the Ship's AI match their level? Did it ever just give the answer? ______
3. Did the space theme help or get in the way? Was "C# Sector" clear? ______
4. How likely to use it to learn (1–5), and why: ______

**Quotes worth keeping:** ______

## 5. Results across testers

| Task | Completed unaided (n of testers) | Needed help | Failed | Average ease (1–5) |
|---|---|---|---|---|
| 1 Enlist and onboarding | | | | |
| 2 First quest | | | | |
| 3 Get a hint | | | | |
| 4 Bug hunt | | | | |
| 5 Decoder | | | | |
| 6 Simpler explanations | | | | |
| 7 Progress and sign out | | | | |
| 8 Admin: add a quest | | | | |

**Average "likely to use it" score:** ______ / 5

## 6. Findings

Log each problem in the [bug log](bug-log.md) and put its number in the last column.

| # | Finding | Seen by (n of testers) | Severity (P1 / P2 / P3) | Action (bug-log #) |
|---|---|---|---|---|
| | | | | |
| | | | | |
| | | | | |

## 7. Summary

**What worked well:**
- ______

**What didn't:**
- ______

**Top 3 changes before hand-in** (also added to the [sprint plan](sprint-plan.md)):
1. ______
2. ______
3. ______

## 8. Evidence

- ______ (screenshots, recordings or photos of notes, and where they're kept)
