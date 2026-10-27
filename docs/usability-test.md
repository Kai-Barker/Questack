# Informal usability test

**Goal:** someone outside the project tries the core flow unaided, so we can see where they get stuck. Watch and take notes; only help if they're completely stuck, and note when you do.

## 1. Session details

| | |
|---|---|
| Facilitator | Kai Barker |
| Date | Wed 14 Oct 2026 |
| Where | Not recorded |
| Build tested | `2bedf73`, run locally. Two AI fixes were made during the session (see finding 5). |
| Device and browser | Windows PC, Chrome |
| Recording | Notes only |

## 2. Before the session

- [x] Backend and frontend running locally, quests seeded
- [x] A fresh browser profile, so the tester enlists a brand-new pilot
- [x] Tester agreed to take part and to their notes (not their name) being used in the project docs
- [x] Told them: "Think out loud. We're testing the app, not you."

## 3. Tasks

Read aloud as written, without explaining where things are.

| # | Task (read to the tester) | Success looks like |
|---|---|---|
| 1 | "Create an account and get ready for your first lesson." | Enlists, completes onboarding (sector, class, concept) |
| 2 | "Complete your first quest." | Reads the code, answers, gets AI feedback, reaches the debrief |
| 3 | "You're stuck on an objective: get help without being given the answer." | Uses Request hint or the Ship's AI chat |
| 4 | "Find the bug in a bug-hunt objective." | Marks the line in the code viewer and explains the bug |
| 5 | "You found some code online you don't understand. Get Questack to explain it." | Finds the decoder, steps through the sections, passes the check |
| 6 | "Make the Ship's AI explain things more simply." | Switches to Cadet (in the AI panel or in Settings) |
| 7 | "See how much you've progressed, then sign out." | Opens the Profile, then signs out |

## 4. Tester A

**Name:** Tester A · **Date:** 14 Oct 2026 · **Background:** web developer, MERN stack · **Coding experience:** confident, but only in JavaScript · **Used an AI coding tool before?** Yes

She worked through the tasks mostly without help from the facilitator. When stuck, she used the Ship's AI chat and usually worked it out from there. Times and ease scores weren't recorded, and nor was which tasks needed facilitator help.

| Task | Completed? | What they did, said or got stuck on |
|---|---|---|
| 1 | Yes | Tried to open the Terms of Service and Privacy Policy from the enlist form: neither page appeared. |
| 2 | Yes, with the Ship's AI | Typed her answer into the Ship's AI chat instead of the answer box, expecting it to count. Felt a screen explaining the concept was needed before using the AI. A valid answer reached a different way wasn't accepted. In the JavaScript "Type Storm" quest a correct answer was marked wrong, then the same answer was marked correct after she talked to the Ship's AI. Disliked the "Decode the Transmission" objective, where she had to go and find a piece of code about the quest's concept herself. Ship's AI replies took a very long time, and some never arrived. |
| 3 | Yes | Requested hints, but they didn't take what she had already written in the answer box into account. |
| 4 | Yes | Fixed a bug differently from the answer key (changing a data type to `int` instead of parsing the value) and wasn't given credit. |
| 5 | Yes | **Really liked the standalone decoder.** Smaller points: the code editor didn't resize to fit its box; she suggested the Quest screen's layout (resizable panes, text size, responsive editor), and a prompt to leave once finished. |
| 6 | Not needed | As an experienced JavaScript developer she had no need to switch to Cadet; the default level suited her. |
| 7 | Yes | Clicked the callsign/avatar at the top right expecting to open the Profile. Tried clicking an insignia to feature it. |

**Answers afterwards:**
1. **Most confusing moment:** the JavaScript "Type Storm" quest. She entered a correct answer and was marked wrong, asked the Ship's AI about it, then entered the same answer again and was marked correct.
2. **Did the Ship's AI match their level? Did it ever just give the answer?** It matched her level (she never needed to switch to Cadet). Whether it ever gave an answer away wasn't recorded.
3. **Did the space theme help or get in the way? Was "C# Sector" clear?** Yes, the sector names were clear, and she liked the theme.
4. **How likely to use it to learn:** likely. She enjoyed it. (No 1–5 score recorded.)
5. **What she'd change first:** the "Decode the Transmission" quest objective, then making it clear where to answer, then everything else. (The standalone decoder, by contrast, was one of her favourite parts.)

## 5. Results

One tester, so each column is 0 or 1.

| Task | Completed | With the Ship's AI's help | Failed |
|---|---|---|---|
| 1 Enlist and onboarding | 1 | | |
| 2 First quest | 1 | 1 | |
| 3 Get a hint | 1 | | |
| 4 Bug hunt | 1 | | |
| 5 Decoder | 1 | | |
| 6 Simpler explanations | Not needed | | |
| 7 Progress and sign out | 1 | | |

**Likely to use it:** yes (no 1–5 score recorded).

## 6. Findings

Each finding is logged in the [bug log](bug-log.md). Severity: **P1** blocks a core flow · **P2** wrong but there's a workaround · **P3** cosmetic or an improvement.

| # | Finding | Task | Severity | Bug log |
|---|---|---|---|---|
| 1 | Terms of Service and Privacy Policy links on the enlist form don't show their pages | 1 | P2 | #19 |
| 2 | Answers typed into the Ship's AI chat don't count; it wasn't clear the answer box is the only place to answer | 2 | P2 | #20 |
| 3 | Correct answers that take a different approach from the answer key are marked wrong (e.g. fixing a bug by changing a type to `int` instead of parsing) | 2, 4 | P2 | #21 |
| 4 | Marking is inconsistent in the JavaScript "Type Storm" quest: the same answer was marked wrong, then correct | 2 | P2 | #22 |
| 5 | Ship's AI replies were very slow, and some never arrived: Gemini Flash was overloaded and its calls hung | 2, 3 | P1 | #23 (fixed during the session) |
| 6 | Hints ignore what the pilot has already written | 3 | P2 | #24 |
| 7 | No screen introducing the concept before the quest starts | 2 | P2 | #25 |
| 8 | Standalone decoder (well liked): the code editor doesn't fit its box; layout could match the Quest screen (resizable panes, text size) | 5 | P3 | #26 |
| 9 | Standalone decoder: no prompt to leave once a transmission is decoded | 5 | P3 | #27 |
| 10 | Loading messages repeat; rotating, more playful lines would make waits feel shorter | 2, 3 | P3 | #28 |
| 11 | The callsign/avatar at the top right doesn't open the Profile | 7 | P3 | #29 |
| 12 | Clicking an insignia doesn't feature it | 7 | P3 | #30 |
| 13 | **The "Decode the Transmission" quest objective was disliked:** having to find a piece of code about the concept yourself breaks the flow of a quest. Ranked first of the things to change. | 2 | P2 | #31 |

## 7. Summary

**What worked well:**
- She completed the core flow (enlist, onboard, quests, hints, bug hunt, decoder, profile) mostly without the facilitator's help.
- The Ship's AI chat worked as intended: when stuck, she used it and usually worked out the answer from there.
- **The standalone decoder was a highlight:** she really liked having any code explained section by section.
- She enjoyed the space theme, the sector names were clear, and she said she's likely to use Questack.
- The default explanation level suited an experienced JavaScript developer; she didn't need to change it.

**What didn't** (in the order she ranked them):
1. **The "Decode the Transmission" quest objective was her least favourite part:** stopping mid-quest to find code about the concept herself (finding 13).
2. **It wasn't clear where to answer:** answers typed into the Ship's AI chat didn't count (finding 2).
3. **Everything else:**
   - Marking: valid alternative answers were marked wrong, and marking was inconsistent in "Type Storm" (findings 3–4).
   - AI responsiveness: replies were very slow or never arrived until the Gemini timeout and fallback were fixed during the session (finding 5).
   - Smaller issues, including standalone-decoder layout tweaks (findings 6–12).

**Limits of this test:** one tester, who is an experienced JavaScript developer, so it says little about how complete beginners or the C# Sector fare. Testing with a beginner is still to do.

**Top 3 changes before hand-in**, in the tester's order of priority (to add to the [sprint plan](sprint-plan.md)):
1. Remove the "Decode the Transmission" objective from quests, or replace it with one that doesn't ask the pilot to go and find code; keep the standalone decoder, which tested well (finding 13).
2. Make it clear where to answer: let a final answer typed in the chat be submitted, or point the pilot to the answer box (finding 2).
3. Make marking consistent and accept valid alternative approaches; recheck the "Type Storm" answer keys (findings 3, 4).

## 8. Evidence

- Facilitator's notes from the session (summarised above)
- Server log of the Gemini 503s and fallbacks during the session (finding 5)
