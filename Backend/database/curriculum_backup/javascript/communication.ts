import { briefingFrom, snippetFrom } from '../text.js';
import type { CurriculumQuest } from '../types.js';

// JavaScript part 4: script communication. Objects holding references to
// each other, modules (one file using another), callbacks and the event loop,
// events, promises and async/await, and fetching data from a server.

const briefing = briefingFrom(import.meta.url);
const snippet = snippetFrom(import.meta.url);

export const communication: CurriculumQuest[] = [
  {
    key: 'crew-channels',
    title: 'Crew Channels',
    concept: 'Object communication',
    difficulty: 'hard',
    isSideQuest: false,
    storyText:
      'Every system on the ship works, but none of them can reach the others. Learn how objects hold references to each other and cooperate to get a job done.',
    xpReward: 200,
    prerequisites: ['docking-contracts'],
    briefing: briefing('crew-channels'),
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read reactor.js. Explain how each Engineer gets hold of the reactor, why both engineers affect the same reactor, and what the three lines log.',
        fileName: 'reactor.js',
        code: snippet('reactor.js'),
        answerKey:
          'One Reactor is created and passed into each Engineer\'s constructor, which stores a reference to it in this.reactor. Objects are shared by reference, so both engineers (and core) point at the same reactor. An engineer talks to it by calling this.reactor.boost(). Ada raises it from 50 to 75, then Bo raises that same reactor to 100: it logs "Ada boosted the reactor to 75", "Bo boosted the reactor to 100" and "Core output: 100".',
        markingCriteria:
          'Must explain that the reactor is passed into each constructor and stored, so both engineers and core refer to one object; must explain that they communicate by calling its method; must give the three outputs.',
      },
      {
        type: 'read_and_explain',
        instructions:
          'Read captain.js. Explain what the Captain has, how plotCourse gets the waypoint and sends the message, and what is logged.',
        fileName: 'captain.js',
        code: snippet('captain.js'),
        answerKey:
          'This is composition: a Captain has a Radio and a Navigator, created as private fields. plotCourse asks the navigator for information (nextWaypoint returns "Waypoint Delta") and then tells the radio to send a message built from it. Code outside only talks to the captain and never needs to know about the radio or navigator. It logs "[Radio] Setting course for Waypoint Delta".',
        markingCriteria:
          'Must explain that the Captain is made of (has-a) a Radio and a Navigator it keeps privately, and that plotCourse asks one and tells the other; must give the output.',
      },
      {
        type: 'bug_hunt',
        instructions:
          'Both turrets should report their hits to the bridge display, which should show 3 kills, but it shows 1. Find the line with the bug and explain what goes wrong.',
        fileName: 'scoreboard.js',
        code: snippet('scoreboard.js'),
        answerKey:
          'The starboard turret is given a brand-new Scoreboard instead of the bridge display. Its two hits are counted on that separate object, which nothing ever shows, so the bridge display only gets the port turret\'s one hit. Both turrets need the same object: new Turret(bridgeDisplay).',
        markingCriteria:
          'Must identify the starboard turret\'s construction and explain that it is given a separate new Scoreboard, so its hits never reach the bridge display; should suggest passing bridgeDisplay.',
        bugLine: 17,
        bugLineContains: 'const starboard = new Turret(new Scoreboard());',
      },
    ],
  },
  {
    key: 'module-uplink',
    title: 'Module Uplink',
    concept: 'Modules',
    difficulty: 'hard',
    isSideQuest: false,
    storyText:
      'The navigation code has grown into one enormous file that nobody dares to touch. Learn how JavaScript modules split a program into files that share only what they choose to export.',
    xpReward: 200,
    prerequisites: ['crew-channels'],
    briefing: briefing('module-uplink'),
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'This snippet shows two files. Read them, then explain the difference between the default export and the named exports, how main.js imports each, and what main.js logs.',
        fileName: 'navigation-and-main.js',
        code: snippet('navigation-modules.js'),
        answerKey:
          'navigation.js has two named exports (HOME and distanceTo) and one default export (plot). main.js imports the default without braces, under any name it likes (plot), and the named exports inside braces using their exact names. "./navigation.js" is the path to the other file. It logs "Ares Base", 628 and "Course plotted to Titan: 1272 million km"; plot calls distanceTo inside its own module to get the number.',
        markingCriteria:
          'Must explain named exports (imported in braces by name) versus the default export (imported without braces, any name); must give the three outputs.',
      },
      {
        type: 'read_and_explain',
        instructions:
          'This snippet shows two files. Explain what current as shieldLevel and import * as shields do, and what bridge.js logs, including the last line.',
        fileName: 'shields-and-bridge.js',
        code: snippet('shield-modules.js'),
        answerKey:
          'current as shieldLevel imports current under a new name. import * as shields gathers every export into one object, so shields.raise is the same raise function. A module runs once and its variables are shared by everyone who imports it, so raise() takes level from 50 to 75, shieldLevel() logs 75, and shields.raise() takes the same level to 100. level itself was never exported, so it stays private to shields.js: in bridge.js it doesn\'t exist and typeof level logs "undefined".',
        markingCriteria:
          'Must explain renaming with as, importing everything with * as, and that unexported variables stay private to their module; must give 75, 100 and "undefined", explaining that both imports share the same level.',
      },
      {
        type: 'bug_hunt',
        instructions:
          'This snippet shows two files. dock.js should log "Tank: 100 of 100", but it fails with "SyntaxError: The requested module \'./fuel.js\' does not provide an export named \'MAX_FUEL\'". Find the line with the bug and explain what goes wrong.',
        fileName: 'fuel-and-dock.js',
        code: snippet('fuel-modules.js'),
        answerKey:
          'A module only shares what it exports. MAX_FUEL is declared in fuel.js without export, so it stays private and dock.js can\'t import it. Adding export (export const MAX_FUEL = 100;) fixes it.',
        markingCriteria:
          'Must identify the MAX_FUEL declaration and explain that it isn\'t exported, so it can\'t be imported; should suggest adding export.',
        bugLine: 2,
        bugLineContains: 'const MAX_FUEL = 100;',
      },
    ],
  },
  {
    key: 'callback-relay',
    title: 'Callback Relay',
    concept: 'Callbacks and the event loop',
    difficulty: 'hard',
    isSideQuest: false,
    storyText:
      'Ship systems answer when they\'re ready, not when you ask, and the logs keep arriving out of order. Learn how callbacks hand a function over to be run later, and how JavaScript decides what runs when.',
    xpReward: 225,
    prerequisites: ['module-uplink'],
    briefing: briefing('callback-relay'),
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read launch-window.js. Explain why the messages are logged in the order 1, 2, 3, 4 even though they are written in a different order, including the setTimeout with 0.',
        fileName: 'launch-window.js',
        code: snippet('launch-window.js'),
        answerKey:
          'setTimeout doesn\'t pause the program: it hands its function over to be called later and the code carries on at once. So 1 and 2 are logged first, as the main code runs. Only when the main code has finished does JavaScript run the waiting callbacks, earliest timer first. The 0 ms timer is due straight away but still has to wait until the main code is done, so it logs 3, and the 1000 ms timer logs 4 a second later.',
        markingCriteria:
          'Must explain that setTimeout schedules its callback and the code carries on immediately; must explain that callbacks only run after the current code finishes, even with a 0 delay, in timer order; must give the order 1, 2, 3, 4.',
      },
      {
        type: 'read_and_explain',
        instructions:
          'Read scans.js. Explain how scanSector uses the function it\'s given, and what is logged.',
        fileName: 'scans.js',
        code: snippet('scans.js'),
        answerKey:
          'scanSector takes a callback, onScanned, and calls it with the sector and its contact count, so the caller decides what happens with the result. With report it logs "Alpha: 2 contacts" and "Gamma: 5 contacts". With recordIfBusy it pushes only the sectors with more than one contact into busy, so the last line logs ["Alpha", "Gamma"] (Beta has 0).',
        markingCriteria:
          'Must explain that scanSector calls whichever function it is given, so the caller chooses what happens with the result; must give the outputs, including ["Alpha", "Gamma"].',
      },
      {
        type: 'bug_hunt',
        instructions:
          'The log should show the telemetry, but it says "Telemetry: no data". Find the line with the bug and explain what goes wrong.',
        fileName: 'telemetry.js',
        code: snippet('telemetry.js'),
        answerKey:
          'fetchTelemetry hands its callback to setTimeout, so the data only arrives 500 ms later. The log line doesn\'t wait: it runs straight after fetchTelemetry is called, while telemetry still holds "no data". Anything that needs the data has to happen inside the callback, so the log should move in there.',
        markingCriteria:
          'Must identify the final log and explain that it runs before the callback delivers the data; should suggest logging (using the data) inside the callback.',
        bugLine: 13,
        bugLineContains: 'console.log(`Telemetry: ${telemetry}`);',
        altBugLines: [10],
      },
    ],
  },
  {
    key: 'beacon-network',
    title: 'Beacon Network',
    concept: 'Events',
    difficulty: 'hard',
    isSideQuest: false,
    storyText:
      'When a ship sends a distress call, the beacon has no idea who should respond, and it shouldn\'t have to. Learn how events let one object announce that something happened, so any number of listeners can react.',
    xpReward: 250,
    prerequisites: ['callback-relay'],
    briefing: briefing('beacon-network'),
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read beacon-events.js. Explain how the two listeners are attached, what dispatchEvent does, and the order of everything logged.',
        fileName: 'beacon-events.js',
        code: snippet('beacon-events.js'),
        answerKey:
          'An EventTarget keeps a list of listener functions for each event name. addEventListener adds launchRescue and then an arrow function to the "distress" list. dispatchEvent sends a CustomEvent whose detail carries the data, and calls every listener for that name in the order they were added, straight away, before the next line runs. So it logs "Beacon armed", "Rescue team launching for Osprey", "Log: Osprey in distress", then "Signal handled". The beacon never refers to the rescue team: it only announces.',
        markingCriteria:
          'Must explain that addEventListener registers listeners for an event name and dispatchEvent calls each one in order, passing the event (with detail); must note that dispatch runs the listeners immediately; must give the four outputs in order.',
      },
      {
        type: 'read_and_explain',
        instructions:
          'Read reactor-events.js. For each of the three heat calls, explain whether the alarm sounds and why, and say what is logged.',
        fileName: 'reactor-events.js',
        code: snippet('reactor-events.js'),
        answerKey:
          'Reactor extends EventTarget, so it can dispatch its own events. The first heat takes it to 120 and dispatches "overheat", but no one is listening yet, so nothing happens. alarm is then added, so the second heat (to 130) calls it: "ALARM: reactor at 130". removeEventListener takes alarm off again, so the third heat (to 140) dispatches to no one. Finally it logs "Final temperature: 140".',
        markingCriteria:
          'Must explain that the first overheat has no listeners, the second calls alarm after it is added, and the third does nothing after it is removed; must give "ALARM: reactor at 130" and "Final temperature: 140".',
      },
      {
        type: 'bug_hunt',
        instructions:
          'The hangar should stop greeting ships for the night shift, so only the Kestrel is welcomed, but the Osprey is greeted too and the count is 2. Find the line with the bug and explain what goes wrong.',
        fileName: 'hangar.js',
        code: snippet('hangar.js'),
        answerKey:
          'removeEventListener only removes the exact same function that was added. Both listeners are written out as separate arrow functions, so even though the code looks identical, they are two different functions and nothing is removed. The listener needs a name (const greet = (event) => { … }) so the same function can be passed to both addEventListener and removeEventListener.',
        markingCriteria:
          'Must identify the removeEventListener call and explain that it is given a new, different function, so the original listener stays attached; should suggest storing the listener in a named variable and removing that.',
        bugLine: 12,
        bugLineContains: 'hangar.removeEventListener("landed", (event) => {',
        altBugLines: [4],
      },
    ],
  },
  {
    key: 'promise-protocol',
    title: 'Promise Protocol',
    concept: 'Promises and async/await',
    difficulty: 'hard',
    isSideQuest: false,
    storyText:
      'Launch sequences are full of steps that take time, and nested callbacks have turned the launch script into a tangle. Learn how promises and async/await let you write waiting code that reads top to bottom.',
    xpReward: 250,
    prerequisites: ['callback-relay'],
    briefing: briefing('promise-protocol'),
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read warm-up.js. Explain what resolve and reject do, how then and catch respond, and why the four lines are logged in the order they are.',
        fileName: 'warm-up.js',
        code: snippet('warm-up.js'),
        answerKey:
          'warmUpEngines returns a promise: a value that will arrive later. resolve fulfils it with a result, which then receives; reject fails it with an error, which catch receives. The main code runs first, logging "Starting engines" and "Waiting...". The -1 promise was rejected immediately, so its catch runs next: "Failed: Time can\'t run backwards". The 2 promise resolves after its 200 ms timer, so "Engines warm after 2s" is logged last.',
        markingCriteria:
          'Must explain resolve (success, handled by then) and reject (failure, handled by catch); must explain that the main code finishes first and the rejected promise is handled before the timer finishes; must give the four outputs in order.',
      },
      {
        type: 'read_and_explain',
        instructions:
          'Read launch-sequence.js. Explain what await does inside launchSequence, and why the six messages are logged in the order they are.',
        fileName: 'launch-sequence.js',
        code: snippet('launch-sequence.js'),
        answerKey:
          'An async function runs normally until its first await, which pauses the function (not the whole program) until the promise finishes. So "Sequence requested" is logged, then launchSequence logs "Fuelling" and pauses, and the main code carries on and logs "Mission control standing by". After 200 ms it resumes ("Fuelled"), waits 100 ms more ("Liftoff!"), and returns "In orbit". An async function always returns a promise, so then logs "In orbit" last.',
        markingCriteria:
          'Must explain that await pauses only the async function while other code carries on, and that an async function returns a promise; must give the six outputs in order.',
      },
      {
        type: 'bug_hunt',
        instructions:
          'The gauge reads 72, which should clear the launch, but the log says "Fuel too low: [object Promise]". Find the line with the bug and explain what goes wrong.',
        fileName: 'preflight.js',
        code: snippet('preflight.js'),
        answerKey:
          'readFuelGauge is async, so calling it gives a promise of the reading, not the number. Without await, fuel is that promise; comparing a promise with 50 is false, and printing it shows [object Promise]. It should be const fuel = await readFuelGauge();',
        markingCriteria:
          'Must identify the readFuelGauge call and explain that without await it gives a promise rather than the number; should suggest adding await.',
        bugLine: 9,
        bugLineContains: 'const fuel = readFuelGauge();',
      },
    ],
  },
  {
    key: 'deep-space-fetch',
    title: 'Deep Space Fetch',
    concept: 'Fetching data',
    difficulty: 'hard',
    isSideQuest: true,
    storyText:
      'The star charts live on a server light-minutes away, and the ship has to ask for them. Learn how fetch requests data, reads the JSON reply, and copes when the server says no.',
    xpReward: 175,
    prerequisites: ['promise-protocol'],
    briefing: briefing('deep-space-fetch'),
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read planets.js. The server answers with status 200 and the JSON {"name": "Tethys", "moons": 5}. Explain each step of loadPlanet and what is logged. What would be logged if the server answered with status 404 instead?',
        fileName: 'planets.js',
        code: snippet('planets.js'),
        answerKey:
          'fetch sends the request and await waits for the response. response.ok is true for a successful status (200), so no error is thrown. response.json() reads the body and turns the JSON into an object (another await, as it also takes time). The function returns "Tethys: 5 moons", which then logs. With a 404, response.ok is false, so the function throws "Chart server said 404" and the catch logs "Lookup failed: Chart server said 404".',
        markingCriteria:
          'Must explain fetch, checking response.ok, and response.json() (each awaited); must give "Tethys: 5 moons" for the 200 case and "Lookup failed: Chart server said 404" for the 404 case.',
      },
      {
        type: 'read_and_explain',
        instructions:
          'Read ops-briefing.js. The weather request returns 200 with {"status": "clear"} and the traffic request returns 200 with {"ships": 14}. Explain what Promise.all does here and what is logged. What changes if the traffic server answers 503?',
        fileName: 'ops-briefing.js',
        code: snippet('ops-briefing.js'),
        answerKey:
          'Promise.all starts both requests at the same time and waits until both have finished, giving their results in the same order, which are unpacked into weather and traffic. It logs "Weather: clear, traffic: 14 ships", then finally logs "Briefing request finished". If the traffic server answers 503, getJson throws for it, Promise.all fails as soon as any request fails, and the catch logs "Briefing unavailable: https://ops.example/traffic failed with 503" before the finally message.',
        markingCriteria:
          'Must explain that Promise.all runs the requests together and waits for all of them, failing if any fails; must give both outputs for the success case and describe the catch message plus the finally message for the 503 case.',
      },
      {
        type: 'bug_hunt',
        instructions:
          'The server answers with status 404 and {"error": "Unknown ship"}. The log should say the code couldn\'t be loaded, but it says "Docking code: undefined". Find the line with the bug and explain what goes wrong.',
        fileName: 'docking-code.js',
        code: snippet('docking-code.js'),
        answerKey:
          'fetch only rejects when the request can\'t be made at all; an error status such as 404 still counts as a response. The code reads the JSON without checking response.ok, so it gets the error object, which has no code property, and returns undefined. It should check response.ok first and throw an error when it is false, so the catch runs.',
        markingCriteria:
          'Must explain that fetch doesn\'t reject on a 404, and that the code reads the body without checking response.ok; should suggest checking response.ok and throwing.',
        bugLine: 3,
        bugLineContains: 'const data = await response.json();',
        altBugLines: [2],
      },
    ],
  },
];
