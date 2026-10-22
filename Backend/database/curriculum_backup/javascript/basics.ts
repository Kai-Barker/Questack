import { briefingFrom, snippetFrom } from '../text.js';
import type { CurriculumQuest } from '../types.js';

// JavaScript part 1: the fundamentals, from the first console.log to Map and
// Set. Seeded quests (by id) are woven into the path with a briefing each.
// Objective code lives in snippets/ (JavaScript's own `${...}` template
// literals would clash with TypeScript template strings); every snippet has
// been run in Node and the answer keys match its real output.

const briefing = briefingFrom(import.meta.url);
const snippet = snippetFrom(import.meta.url);

export const basics: CurriculumQuest[] = [
  {
    key: 'hello-console',
    title: 'Hello Console',
    concept: 'Syntax basics',
    difficulty: 'easy',
    isSideQuest: false,
    storyText:
      'A relay buoy at the edge of the sector speaks only JavaScript, and it has started sending status reports. Learn how a JavaScript program runs and how it talks back through the console.',
    xpReward: 50,
    prerequisites: [],
    briefing: briefing('hello-console'),
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read status.js. Explain what each console.log shows (including the one with three values), and why one of the messages never appears.',
        fileName: 'status.js',
        code: snippet('status.js'),
        answerKey:
          'The statements run from top to bottom. It logs "Hull: OK", then "Shields: 80 %" because console.log prints all the values it is given separated by spaces. 3 + 4 is a calculation, so it logs 7, but "3 + 4" is in quotes, so it is text and is logged exactly as written. "Engines: offline" never appears because that line is inside a /* */ comment, and the // line at the top is a comment too. Finally it logs "Report complete".',
        markingCriteria:
          'Must give the outputs in order (Hull: OK, Shields: 80 %, 7, 3 + 4, Report complete); must explain that several values are logged separated by spaces, that 3 + 4 without quotes is worked out while "3 + 4" in quotes is text, and that the commented-out line never runs.',
      },
      {
        type: 'read_and_explain',
        instructions:
          'Read countdown.js. Explain what the semicolons do (including the line with two statements and the line with none), and exactly what gets logged.',
        fileName: 'countdown.js',
        code: snippet('countdown.js'),
        answerKey:
          'Each statement is one instruction, and a semicolon marks where it ends, so two statements can share a line: console.log(3); console.log(2); logs 3 then 2. The line with no semicolon still works because JavaScript inserts one at the end of the line for you (automatic semicolon insertion), though it is good practice to write them. Everything runs top to bottom, so it logs "Countdown starting", 3, 2, 1 and then "Liftoff!".',
        markingCriteria:
          'Must explain that a semicolon ends a statement so two can share a line, and that JavaScript adds a missing semicolon at the end of a line; must give the output in order: Countdown starting, 3, 2, 1, Liftoff!.',
      },
      {
        type: 'bug_hunt',
        instructions:
          'The docking report should log four lines, but nothing is logged at all: the program stops with "SyntaxError: missing ) after argument list". Find the line with the bug and explain what goes wrong.',
        fileName: 'docking.js',
        code: snippet('docking.js'),
        answerKey:
          'The message Clamps engaged has no quotes around it, so JavaScript tries to read it as code: two names side by side, which is not valid syntax. A syntax error is found before anything runs, so not even the first two lines are logged. Putting the text in quotes, "Clamps engaged", fixes it.',
        markingCriteria:
          'Must identify the Clamps engaged line and explain that text needs quotes, otherwise JavaScript reads it as code; should mention that a syntax error stops the whole file before any line runs, and suggest adding quotes.',
        bugLine: 3,
        bugLineContains: 'console.log(Clamps engaged);',
      },
    ],
  },
  { key: 'signal-relay', seededQuestId: 11, prerequisites: ['hello-console'], briefing: briefing('signal-relay') },
  { key: 'type-storm', seededQuestId: 12, prerequisites: ['signal-relay'], briefing: briefing('type-storm') },
  {
    key: 'booster-arithmetic',
    title: 'Booster Arithmetic',
    concept: 'Operators',
    difficulty: 'easy',
    isSideQuest: false,
    storyText:
      'The booster computer keeps miscounting burns and mixing up readings that only look the same. Learn how JavaScript works out arithmetic, and the difference between "equal" and "really equal".',
    xpReward: 75,
    prerequisites: ['type-storm'],
    briefing: briefing('booster-arithmetic'),
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read thrust.js. Explain what each of the five lines logs, including why the first two differ, what % and ** do, and why the division keeps its decimal part.',
        fileName: 'thrust.js',
        code: snippet('thrust.js'),
        answerKey:
          '* is worked out before +, so 2 + 3 * 4 is 2 + 12 and logs 14. Brackets go first, so (2 + 3) * 4 is 5 * 4 and logs 20. JavaScript has one number type, so 17 / 5 keeps its decimal part and logs 3.4. % gives the remainder of a division: 17 split into groups of 5 leaves 2. ** raises to a power, so 2 ** 3 is 2 × 2 × 2 and logs 8.',
        markingCriteria:
          'Must give the five outputs (14, 20, 3.4, 2, 8); must explain that * happens before + unless brackets change it, that % gives the remainder and ** a power, and that JavaScript division keeps the decimal part.',
      },
      {
        type: 'read_and_explain',
        instructions:
          'Read gauge.js. Trace fuel through each update, then explain what each of the five lines logs, especially the difference between == and ===.',
        fileName: 'gauge.js',
        code: snippet('gauge.js'),
        answerKey:
          'fuel starts at 10; += 5 makes it 15, *= 2 makes it 30 and -- takes one off, so it is 29 and the first line logs 29. == compares loosely, converting types first, so 29 == "29" is true. === compares strictly, so a number and a string are never equal: 29 === "29" is false, while 29 === 29 is true. !== means "not strictly equal", and 29 is not 30, so it logs true.',
        markingCriteria:
          'Must trace fuel through 15, 30 and 29; must explain that == converts types before comparing while === also requires the same type; must give the outputs 29, true, false, true, true.',
      },
      {
        type: 'bug_hunt',
        instructions:
          'Seventeen crates plus four extra should share out to 7 per pod, but the log says "Crates per pod: 18.333333333333332". Find the line with the bug and explain what goes wrong.',
        fileName: 'pods.js',
        code: snippet('pods.js'),
        answerKey:
          'Division happens before addition, so only extra is divided by pods: 17 + 4 / 3 is 17 + 1.333…, which gives 18.333…. The crates need adding together first by putting them in brackets: (crates + extra) / pods, which is 21 / 3 = 7.',
        markingCriteria:
          'Must identify the perPod calculation and explain that / is applied before +, so only the extra crates are divided; should suggest brackets around the sum.',
        bugLine: 6,
        bugLineContains: 'const perPod = crates + extra / pods;',
      },
    ],
  },
  {
    key: 'signal-strings',
    title: 'Signal Strings',
    concept: 'Strings',
    difficulty: 'easy',
    isSideQuest: false,
    storyText:
      'Comms messages are arriving garbled: names missing, placeholders where numbers belong. Learn how JavaScript builds text with template literals and picks it apart again.',
    xpReward: 75,
    prerequisites: ['booster-arithmetic'],
    briefing: briefing('signal-strings'),
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read hail.js. Explain how the two ways of building a message differ, what the third line shows about template literals, and what \\t and \\n do in the last line.',
        fileName: 'hail.js',
        code: snippet('hail.js'),
        answerKey:
          'joined glues pieces together with +, and templated is a template literal: backticks with ${ } placeholders that drop values straight into the text. Both give "Pilot Vega with 4 crew". A placeholder can hold any expression, so ${crew + 2} is worked out first and the third line logs "Crew next shift: 6". In the last string \\t is a tab and \\n starts a new line, so it logs "Status:" a tab and "ready", then "Over and out" on the next line.',
        markingCriteria:
          'Must explain that + joins pieces while a template literal (backticks with ${ }) inserts values, and that both log "Pilot Vega with 4 crew"; must say the placeholder works out crew + 2 (6); must explain \\t (tab) and \\n (new line).',
      },
      {
        type: 'read_and_explain',
        instructions:
          'Read bay.js. Explain what each of the six lines logs and how you worked it out.',
        fileName: 'bay.js',
        code: snippet('bay.js'),
        answerKey:
          'length counts every character including spaces: 20. toUpperCase gives a capitalised copy, "CARGO BAY DOORS OPEN" (message itself is unchanged). includes("doors") is true because that text appears. Positions start at 0, so message[0] is "c". slice(6, 9) takes the characters from position 6 up to but not including 9, which is "bay". split(" ") cuts the text at each space into an array: ["cargo", "bay", "doors", "open"].',
        markingCriteria:
          'Must give the six results (20, "CARGO BAY DOORS OPEN", true, "c", "bay", and the array of four words); must explain that positions start at 0, that slice stops before its end position, and that split turns the text into an array.',
      },
      {
        type: 'bug_hunt',
        instructions:
          'The arrivals board should say "Kestrel is docking at bay 7", but it shows the ${...} placeholders instead. Find the line with the bug and explain what goes wrong.',
        fileName: 'board.js',
        code: snippet('board.js'),
        answerKey:
          'Placeholders only work inside a template literal, which is written with backticks. This message uses ordinary double quotes, so ${ship} and ${bay} are just characters in the text and are logged as they are. Swapping the quotes for backticks makes it a template literal.',
        markingCriteria:
          'Must identify the docking message and explain that ${ } placeholders only work in backtick strings, so double quotes print them literally; should suggest backticks.',
        bugLine: 5,
        bugLineContains: 'console.log("${ship} is docking at bay ${bay}");',
      },
    ],
  },
  { key: 'conditional-canyon', seededQuestId: 13, prerequisites: ['booster-arithmetic'], briefing: briefing('conditional-canyon') },
  {
    key: 'orbit-loop',
    seededQuestId: 14,
    prerequisites: ['signal-strings', 'conditional-canyon'],
    briefing: briefing('orbit-loop'),
  },
  {
    key: 'switchyard',
    title: 'Switchyard',
    concept: 'Switch statements',
    difficulty: 'easy',
    isSideQuest: true,
    storyText:
      'The switchyard routes every ship that arrives, and lately ships are ending up in the wrong bays. Learn how JavaScript\'s switch picks a branch, and what happens when a case forgets to stop.',
    xpReward: 75,
    prerequisites: ['conditional-canyon'],
    briefing: briefing('switchyard'),
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read yard.js. Explain which bay the tanker is assigned to, why two case labels share one block, and what break does.',
        fileName: 'yard.js',
        code: snippet('yard.js'),
        answerKey:
          'switch compares shipClass with each case in turn. "freighter" and "tanker" are stacked, so either one runs the same block: the tanker is assigned "Cargo Bay 3" and it logs "Assigned to: Cargo Bay 3". break ends the switch so the code below (the default) is not run as well. default would have been used if no case matched.',
        markingCriteria:
          'Must say the tanker goes to Cargo Bay 3; must explain that stacked case labels share a block and that break stops the switch running into the next case.',
      },
      {
        type: 'read_and_explain',
        instructions:
          'Read channels.js. Explain what each of the three lines logs, and why channelName("1") doesn\'t give "Command".',
        fileName: 'channels.js',
        code: snippet('channels.js'),
        answerKey:
          'switch compares strictly, like ===, so the value must match in type as well as value. channelName(1) matches case 1 and returns "Command", and channelName(2) returns "Engineering". "1" is a string, and a string is never strictly equal to the number 1, so no case matches and default returns "Unknown channel". Each case uses return, which leaves the function, so no break is needed.',
        markingCriteria:
          'Must give the outputs Command, Unknown channel and Engineering; must explain that switch compares strictly (like ===), so the string "1" does not match the number 1.',
      },
      {
        type: 'bug_hunt',
        instructions:
          'On a yellow alert the shields should be at 50%, but the log says "Shields at 10%". Find the line with the bug and explain what goes wrong.',
        fileName: 'shields.js',
        code: snippet('shields.js'),
        answerKey:
          'The "yellow" case sets shields to 50 but has no break after it, so the switch falls through into the "green" case and sets shields to 10 as well. A break is needed straight after shields = 50.',
        markingCriteria:
          'Must identify the yellow case and explain that without a break the switch falls through into the green case, overwriting 50 with 10; should suggest adding a break.',
        bugLine: 9,
        bugLineContains: 'shields = 50;',
        // The missing break sits between the two cases
        altBugLines: [10],
      },
    ],
  },
  {
    key: 'alert-codes',
    title: 'Alert Codes',
    concept: 'Enums',
    difficulty: 'easy',
    isSideQuest: true,
    storyText:
      'Someone typed "in flight" where the system expected "in-flight", and a whole squadron was reported as docked. Learn how named constants give a fixed set of options, so a typo can\'t slip through as a status.',
    xpReward: 75,
    prerequisites: ['switchyard'],
    briefing: briefing('alert-codes'),
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read alerts.js. Explain what Alert is and what Object.freeze does to it, then what each of the four lines logs.',
        fileName: 'alerts.js',
        code: snippet('alerts.js'),
        answerKey:
          'JavaScript has no enum keyword, so Alert is an object of named constants used like one: code writes Alert.YELLOW instead of typing the text "yellow" each time. Object.freeze locks the object so its values can never be changed, added or removed. It logs "yellow", then (since level is now Alert.RED) "All hands to battle stations", then true because Alert is frozen, and finally the names ["GREEN", "YELLOW", "RED"].',
        markingCriteria:
          'Must explain that Alert is a frozen object of named constants used like an enum, and that freeze stops it being changed; must give the four outputs: yellow, the battle stations message, true, and the three names.',
      },
      {
        type: 'read_and_explain',
        instructions:
          'Read engine.js. Explain what fuelPerMinute returns for each mode, what the three lines log, and why Engine.CRUISE < Engine.BOOST works.',
        fileName: 'engine.js',
        code: snippet('engine.js'),
        answerKey:
          'The switch matches the mode against the named constants: OFF gives 0, IDLE 1, CRUISE 5, and anything else falls to default and gives 12. So CRUISE logs 5 and BOOST, which has no case of its own, logs 12. The constants are numbers in order (OFF 0 up to BOOST 3), so CRUISE (2) < BOOST (3) is true.',
        markingCriteria:
          'Must give the outputs 5, 12 and true; must explain that BOOST reaches the default, and that the constants are ordered numbers, which is why they can be compared.',
      },
      {
        type: 'bug_hunt',
        instructions:
          'The Osprey is in flight, but the log says "Osprey is still docked". Find the line with the bug and explain what goes wrong.',
        fileName: 'shuttle-status.js',
        code: snippet('shuttle-status.js'),
        answerKey:
          'The check compares against the typed text "in flight", but the real value of Status.IN_FLIGHT is "in-flight", with a hyphen, so they never match and the else runs. This is exactly what named constants prevent: compare with Status.IN_FLIGHT instead of typing the text.',
        markingCriteria:
          'Must identify the if condition and explain that the hand-typed text does not match the constant\'s value ("in flight" vs "in-flight"); should suggest comparing with Status.IN_FLIGHT.',
        bugLine: 5,
        bugLineContains: 'if (shuttleStatus === "in flight")',
      },
    ],
  },
  {
    key: 'cargo-train',
    title: 'Cargo Train',
    concept: 'Arrays',
    difficulty: 'medium',
    isSideQuest: false,
    storyText:
      'A cargo train of supply pods is coupled up at the station, and pods are added and dropped all day. Learn how JavaScript arrays hold many values in order, and grow and shrink as you go.',
    xpReward: 125,
    prerequisites: ['orbit-loop'],
    briefing: briefing('cargo-train'),
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read hold.js. Track what the array holds after each change, and explain what each of the seven lines logs.',
        fileName: 'hold.js',
        code: snippet('hold.js'),
        answerKey:
          'push adds "ore" to the end, so there are 4 items and length logs 4. crates[0] is the first item, "fuel", and crates[crates.length - 1] is the last, "ore". shift removes the first item and returns it, so first is "fuel" and the array is now ["rations", "medkits", "ore"]. includes("fuel") is false because it was removed. indexOf("medkits") gives its position, 1, since positions start at 0.',
        markingCriteria:
          'Must track the array through push and shift; must give the outputs 4, fuel, ore, fuel, the three remaining items, false and 1; must explain that positions start at 0 and length - 1 is the last item.',
      },
      {
        type: 'read_and_explain',
        instructions:
          'Read yields.js. Explain how the for...of loop works out total and best, what pop does, and what the three lines log.',
        fileName: 'yields.js',
        code: snippet('yields.js'),
        answerKey:
          'for...of visits each value in turn. Every amount is added to total, and whenever an amount is bigger than the best so far it becomes the new best, so total ends at 18 + 52 + 30 = 100 and best at 52. pop removes the last item (30) after the loop. It logs "Total: 100", "Best: 52" and the array [18, 52].',
        markingCriteria:
          'Must explain that for...of visits each value, adding it to total and keeping the largest in best; must explain that pop removes the last item; must give "Total: 100", "Best: 52" and [18, 52].',
      },
      {
        type: 'bug_hunt',
        instructions:
          'The refuelling queue should say the Heron is last, but the log says "Last to refuel: undefined". Find the line with the bug and explain what goes wrong.',
        fileName: 'queue.js',
        code: snippet('queue.js'),
        answerKey:
          'The queue has 3 ships, so queue.length is 3, but positions start at 0, so the last ship is at position 2. queue[queue.length] asks for position 3, which doesn\'t exist; JavaScript doesn\'t crash, it just gives undefined. The last item is at queue.length - 1.',
        markingCriteria:
          'Must identify the last-to-refuel line and explain that length is one past the last position, so it reads a missing item and gets undefined; should suggest length - 1.',
        bugLine: 4,
        bugLineContains: 'queue[queue.length]',
      },
    ],
  },
  { key: 'function-forge', seededQuestId: 15, prerequisites: ['orbit-loop'], briefing: briefing('function-forge') },
  {
    key: 'arrow-relay',
    title: 'Arrow Relay',
    concept: 'Functions in depth',
    difficulty: 'medium',
    isSideQuest: false,
    storyText:
      'The relay network passes small routines from ship to ship, written in the short arrow style. Learn arrow functions, default values and scope, so you can read the routines before they run.',
    xpReward: 125,
    prerequisites: ['function-forge'],
    briefing: briefing('arrow-relay'),
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read relay.js. Explain the three ways these arrow functions are written, what rank = "Cadet" does, and what the four lines log.',
        fileName: 'relay.js',
        code: snippet('relay.js'),
        answerKey:
          'double and greet are arrow functions with a single expression after =>, which is returned automatically. describe has a body in braces, so it needs an explicit return. rank = "Cadet" is a default parameter, used when no rank is passed. It logs 42, "Cadet Ari, report!" (default rank), "Commander Ari, report!" and "Ship KESTREL ready".',
        markingCriteria:
          'Must explain that a one-expression arrow function returns its value automatically while a braced body needs return, and that rank has a default used when it is left out; must give the four outputs.',
      },
      {
        type: 'read_and_explain',
        instructions:
          'Read scope.js. Explain why fuel is still 20 after topUp but 70 after refuel, and what the four lines log.',
        fileName: 'scope.js',
        code: snippet('scope.js'),
        answerKey:
          'Inside topUp, let fuel creates a new variable that only exists inside that function and hides the outer fuel, so it logs "Inside topUp: 70" but the outer fuel is untouched and "After topUp: 20" is logged. refuel returns its result and the caller stores it in fuel, so "After refuel: 70" is logged. status is declared inside the if block, so it only exists there; inside the block it logs "full".',
        markingCriteria:
          'Must explain that the let inside topUp is a separate local variable (it does not change the outer fuel), and that returning a value and storing it is what changes fuel; must mention that variables only exist in the block or function where they are declared; must give the four outputs.',
      },
      {
        type: 'bug_hunt',
        instructions:
          'Two light seconds should log about 599584 km, but the log says "Distance: undefined km". Find the line with the bug and explain what goes wrong.',
        fileName: 'distance.js',
        code: snippet('distance.js'),
        answerKey:
          'The arrow function has a body in braces, and a braced body does not return anything automatically. The multiplication is worked out and thrown away, so the function returns undefined. It needs return in front of the calculation, or the braces removed so the single expression is returned automatically.',
        markingCriteria:
          'Must identify the calculation inside the braced arrow function and explain that a braced body needs an explicit return, so it gives undefined; should suggest adding return (or using the brace-free form).',
        bugLine: 2,
        bugLineContains: 'lightSeconds * 299792;',
        // Dropping the braces on the first line fixes it there
        altBugLines: [1],
      },
    ],
  },
  {
    key: 'star-index',
    title: 'Star Index',
    concept: 'Maps and sets',
    difficulty: 'medium',
    isSideQuest: true,
    storyText:
      'The star index has to look up any ship by name instantly, and the sensor log is full of repeated pings. Learn how a Map finds a value by its key, and how a Set keeps only one of each value.',
    xpReward: 120,
    prerequisites: ['cargo-train'],
    briefing: briefing('star-index'),
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read registry.js. Explain what the third set does, then what each line logs, including the loop.',
        fileName: 'registry.js',
        code: snippet('registry.js'),
        answerKey:
          'A Map stores key/value pairs and each key appears once. Setting "Kestrel" a second time replaces its value (6 becomes 7) instead of adding a new entry, so size is 2. get("Kestrel") gives 7, has("Falcon") is false, and get("Falcon") gives undefined because that key doesn\'t exist. The loop visits the pairs in the order they were first added, unpacking each into ship and crew: "Kestrel: 7" then "Osprey: 4".',
        markingCriteria:
          'Must explain that setting an existing key replaces its value, so size is 2 and Kestrel is 7; must give the outputs 2, 7, false, undefined, then Kestrel: 7 and Osprey: 4; must say a missing key gives undefined.',
      },
      {
        type: 'read_and_explain',
        instructions:
          'Read pings.js. Explain how the loop counts each ping, what the Set does with the repeated names, and what the four lines log.',
        fileName: 'pings.js',
        code: snippet('pings.js'),
        answerKey:
          'For each ping, counts.get(ping) is the count so far, or undefined the first time, and ?? 0 turns that into 0. One is added and stored back, so alpha (seen three times) ends at 3. A Set only keeps one of each value, so the five pings become the three unique names. It logs 3 (alpha), 3 (the Set\'s size), false (no "delta"), and spreading the Set into an array gives ["alpha", "beta", "gamma"].',
        markingCriteria:
          'Must explain that the loop reads the current count (?? 0 for a new name) and stores it one higher; must explain that a Set keeps only unique values; must give the outputs 3, 3, false and the three unique names.',
      },
      {
        type: 'bug_hunt',
        instructions:
          'The Osprey should be cleared with code O-204, but the log says "Osprey cleared with code undefined". Find the line with the bug and explain what goes wrong.',
        fileName: 'codes.js',
        code: snippet('codes.js'),
        answerKey:
          'A Map\'s entries are read with get, not with square brackets. codes[visitor] looks for an ordinary property called "Osprey" on the Map object, which doesn\'t exist, so it gives undefined. It should be codes.get(visitor).',
        markingCriteria:
          'Must identify the lookup and explain that square brackets read a property of the Map object rather than one of its entries; should suggest codes.get(visitor).',
        bugLine: 6,
        bugLineContains: 'const code = codes[visitor];',
      },
    ],
  },
];
