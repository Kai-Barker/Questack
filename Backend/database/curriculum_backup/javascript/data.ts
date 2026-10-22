import { briefingFrom, snippetFrom } from '../text.js';
import type { CurriculumQuest } from '../types.js';

// JavaScript part 2: working with data. Objects, errors, the array methods
// (JavaScript's answer to C#'s LINQ), destructuring and spread, and how
// objects are shared by reference.

const briefing = briefingFrom(import.meta.url);
const snippet = snippetFrom(import.meta.url);

export const data: CurriculumQuest[] = [
  {
    key: 'crew-dossiers',
    title: 'Crew Dossiers',
    concept: 'Objects',
    difficulty: 'medium',
    isSideQuest: false,
    storyText:
      'Every crew member\'s dossier is scattered across a dozen loose variables. Learn how a JavaScript object bundles related values (and the functions that use them) under one name.',
    xpReward: 150,
    prerequisites: ['arrow-relay', 'cargo-train'],
    briefing: briefing('crew-dossiers'),
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read dossier.js. Explain the two ways properties are read here, what this means inside describe, and what each of the five lines logs.',
        fileName: 'dossier.js',
        code: snippet('dossier.js'),
        answerKey:
          'pilot is an object of key/value properties. Dot notation (pilot.callsign) works for simple names; "home port" has a space, so it needs bracket notation with quotes. describe is a method, and inside it this is the object it was called on, so it reads pilot\'s own values. missions goes up to 13 and a new ship property is added afterwards. It logs "Vega", "Ares Base", "Pilot Vega, 13 missions", "Kestrel", and undefined for medals, which was never set.',
        markingCriteria:
          'Must explain dot versus bracket notation (needed for a name with a space), that this in a method is the object it was called on, and that properties can be changed or added later; must give the five outputs, with undefined for the missing property.',
      },
      {
        type: 'read_and_explain',
        instructions:
          'Read manifest.js. Explain what Object.keys, Object.values and Object.entries give, why cargo[key] and cargo.key differ, and what is logged.',
        fileName: 'manifest.js',
        code: snippet('manifest.js'),
        answerKey:
          'Object.keys gives an array of the property names, ["fuel", "rations", "medkits"], and Object.values their values, [40, 25, 10]. Object.entries gives [name, value] pairs, which the loop unpacks into item and amount, logging "fuel: 40", "rations: 25", "medkits: 10" and adding up the total. cargo[key] uses the value of the variable key, "fuel", so it gives 40, while cargo.key looks for a property literally called "key", which doesn\'t exist, so it gives undefined. Finally it logs "Total: 75".',
        markingCriteria:
          'Must explain what keys, values and entries return and that the loop visits each name/value pair; must explain that brackets use a variable\'s value while dot notation uses the literal name; must give the outputs including 40, undefined and Total: 75.',
      },
      {
        type: 'bug_hunt',
        instructions:
          'ship.report() should log "Heron has 80 fuel", but it crashes with "TypeError: Cannot read properties of undefined (reading \'name\')". Find the line with the bug and explain what goes wrong.',
        fileName: 'ship-report.js',
        code: snippet('ship-report.js'),
        answerKey:
          'report is written as an arrow function. Arrow functions don\'t get their own this; they use the this from where they were written, which here is not the ship (in a module it is undefined), so this.name crashes. Writing report as a normal method, report() { ... }, gives it this = ship when it is called as ship.report().',
        markingCriteria:
          'Must identify the report definition and explain that an arrow function has no this of its own, so this is not the ship; should suggest a normal method (report() { … }).',
        bugLine: 4,
        bugLineContains: 'report: () => {',
      },
    ],
  },
  {
    key: 'hazard-protocols',
    title: 'Hazard Protocols',
    concept: 'Errors',
    difficulty: 'medium',
    isSideQuest: true,
    storyText:
      'Garbled readings and missing parts keep crashing the ship\'s scripts mid-flight. Learn how JavaScript throws and catches errors, and how ?. stops a missing value from taking everything down.',
    xpReward: 120,
    prerequisites: ['arrow-relay'],
    briefing: briefing('hazard-protocols'),
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read coordinates.js. For each input, explain which blocks run (try, catch, finally) and list everything that is logged.',
        fileName: 'coordinates.js',
        code: snippet('coordinates.js'),
        answerKey:
          'parseCoordinate converts the text with Number and throws an Error if the result is NaN. "42" converts fine, so the try logs "Plotting course to 42". "4x2" is not a number, so the function throws, the rest of the try is skipped, and catch logs "Rejected: \'4x2\' isn\'t a coordinate" using error.message. "-7" converts fine. finally runs after every attempt, so "Input checked" is logged three times, once after each result.',
        markingCriteria:
          'Must explain that throw stops the try and jumps to catch, which reads error.message, and that finally always runs; must list the outputs in order, with the 4x2 input rejected and "Input checked" after each.',
      },
      {
        type: 'read_and_explain',
        instructions:
          'Read optional.js. Explain what ?. and ?? do, and why the last attempt ends up in the catch.',
        fileName: 'optional.js',
        code: snippet('optional.js'),
        answerKey:
          'The Kestrel has an engine, so the first line logs 80. ?. (optional chaining) stops and gives undefined instead of crashing when the thing before it is null or undefined: the Osprey\'s engine is null and the Heron doesn\'t exist, so the next two lines log undefined. ?? gives a fallback value when the left side is null or undefined, so the fourth line logs "no data". The last attempt uses a plain dot on the Osprey\'s null engine, which throws a TypeError, so the catch logs "Crash avoided: TypeError".',
        markingCriteria:
          'Must explain that ?. gives undefined instead of crashing on a null or missing value, and ?? supplies a fallback; must explain that a plain dot on null throws a TypeError, which is caught; must give the outputs 80, undefined, undefined, no data, Crash avoided: TypeError.',
      },
      {
        type: 'bug_hunt',
        instructions:
          'The scale sent the word "heavy" instead of a number, and the log now says "Cargo weight: 0 tonnes" as if that were real. Find the line where the problem gets hidden and explain what goes wrong.',
        fileName: 'scale.js',
        code: snippet('scale.js'),
        answerKey:
          'readScale correctly throws an error for "heavy", but the catch block is empty, so the error is silently swallowed. weight keeps its starting value of 0 and the program carries on as if 0 were a real reading. The catch should deal with it, for example by logging that the reading is invalid instead of reporting a weight.',
        markingCriteria:
          'Must identify the empty catch and explain that it swallows the error, so the default 0 is reported as if it were real; should suggest reporting or handling the bad reading.',
        bugLine: 12,
        bugLineContains: '} catch (error) {',
        // The empty block is spread over two lines
        altBugLines: [13],
      },
    ],
  },
  {
    key: 'fleet-filters',
    title: 'Fleet Filters',
    concept: 'Array methods',
    difficulty: 'medium',
    isSideQuest: false,
    storyText:
      'Fleet Command asks a new question every minute: who\'s low on fuel, who\'s an officer, what\'s the total? Learn the array methods that answer each one in a single line instead of a whole loop.',
    xpReward: 175,
    prerequisites: ['crew-dossiers'],
    briefing: briefing('fleet-filters'),
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read fuel-levels.js. Explain what filter, map, find and reduce each do here, what the five lines log, and why the last line shows the original numbers.',
        fileName: 'fuel-levels.js',
        code: snippet('fuel-levels.js'),
        answerKey:
          'Each method takes a function and runs it for every item. filter keeps the items where it returns true: [15, 5]. map builds a new array from what it returns for each item: [160, 30, 120, 10, 90]. find gives the first item where it returns true: 80. reduce carries a running value through the array (starting at 0 here), adding each item, so it gives 205. None of them change the original array, so fuel is still [80, 15, 60, 5, 45].',
        markingCriteria:
          'Must explain filter (keeps matches), map (transforms each item), find (first match) and reduce (combines into one value from a starting value); must give the five outputs; must say these methods leave the original array unchanged.',
      },
      {
        type: 'read_and_explain',
        instructions:
          'Read roster.js. Explain the officers chain, why the sort works on [...crew] rather than crew, and what is logged.',
        fileName: 'roster.js',
        code: snippet('roster.js'),
        answerKey:
          'forEach runs the function for each member, logging "Ari reporting", "Bo reporting" and "Cy reporting". The officers chain filters to members with rank 3 or more, then maps each to their name: ["Ari", "Cy"]. sort changes the array it is called on, so [...crew] makes a copy first and the original order is kept. The compare function b.rank - a.rank sorts highest rank first, then map takes the names: ["Cy", "Ari", "Bo"].',
        markingCriteria:
          'Must explain the filter-then-map chain giving ["Ari", "Cy"], that sort changes its array so a copy is sorted, and that the compare function puts the highest rank first; must give all the outputs.',
      },
      {
        type: 'bug_hunt',
        instructions:
          'The scanner should report the closest contact as 3 and the furthest as 1000, but it says the closest is 1000 and the furthest is 9. Find the line with the bug and explain what goes wrong.',
        fileName: 'distances.js',
        code: snippet('distances.js'),
        answerKey:
          'sort() with no compare function sorts values as text, character by character, so "1000" comes before "120", "3", "45" and "9". The array becomes [1000, 120, 3, 45, 9]. Numbers need a compare function: distances.sort((a, b) => a - b), which sorts smallest first.',
        markingCriteria:
          'Must identify the sort call and explain that without a compare function it sorts as text, which puts 1000 first; should suggest a numeric compare function such as (a, b) => a - b.',
        bugLine: 4,
        bugLineContains: 'distances.sort();',
      },
    ],
  },
  {
    key: 'unpacking-bay',
    title: 'Unpacking Bay',
    concept: 'Destructuring and spread',
    difficulty: 'medium',
    isSideQuest: true,
    storyText:
      'Supply crates arrive packed inside crates inside crates. Learn the shorthand for unpacking values out of objects and arrays, and for spreading them into new ones.',
    xpReward: 120,
    prerequisites: ['crew-dossiers'],
    briefing: briefing('unpacking-bay'),
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read unpack.js. Explain each part of the object destructuring line (renaming, the nested part and the default), the array destructuring, and what the three lines log.',
        fileName: 'unpack.js',
        code: snippet('unpack.js'),
        answerKey:
          'Object destructuring creates variables from properties by name: name gets "Kestrel", crew: crewCount reads crew but names the variable crewCount (6), cargo: { fuel } reaches into the nested cargo object for fuel (40), and captain = "unassigned" is a default because ship has no captain. It logs "Kestrel 6 40 unassigned". Array destructuring works by position: first is "Ari", second is "Bo", and ...rest collects everything left into an array, ["Cy", "Dee"].',
        markingCriteria:
          'Must explain renaming, nested destructuring and the default value, and that array destructuring goes by position with ...rest collecting the remainder; must give the three outputs.',
      },
      {
        type: 'read_and_explain',
        instructions:
          'Read spread.js. Explain what ... does in each of its three places here, and what the four lines log.',
        fileName: 'spread.js',
        code: snippet('spread.js'),
        answerKey:
          'In an object, ...base copies all of base\'s properties into a new object; later properties win, so shields becomes 80 and cloak is added: { speed: 5, shields: 80, cloak: true }. base itself is untouched, so base.shields is still 50. In an array, ... spreads each array\'s items into a new one: ["Ari", "Bo", "Cy", "Dee"]. In a parameter list, ...tanks is a rest parameter that gathers all the arguments into an array, so totalFuel(10, 20, 30) adds them to 60.',
        markingCriteria:
          'Must explain object spread (copy, later properties win), array spread (combine items) and rest parameters (gather arguments); must give the four outputs including that base.shields is still 50.',
      },
      {
        type: 'bug_hunt',
        instructions:
          'The custom setting of 90 should win, but the log says "Shields: 50". Find the line with the bug and explain what goes wrong.',
        fileName: 'settings.js',
        code: snippet('settings.js'),
        answerKey:
          'When objects are spread together, later properties overwrite earlier ones with the same name. The custom settings are spread first and the defaults second, so the default shields (50) overwrites the custom 90. The order needs swapping: { ...defaults, ...custom }.',
        markingCriteria:
          'Must identify the spread line and explain that later properties win, so the defaults overwrite the custom value; should suggest spreading defaults first, then custom.',
        bugLine: 5,
        bugLineContains: 'const settings = { ...custom, ...defaults };',
      },
    ],
  },
  {
    key: 'mirror-images',
    title: 'Mirror Images',
    concept: 'References and copies',
    difficulty: 'hard',
    isSideQuest: true,
    storyText:
      'Engineers renamed a ship in the simulator and the real ship\'s name changed too. Learn why some values are copied and objects are shared, and how to make a real copy when you need one.',
    xpReward: 150,
    prerequisites: ['crew-dossiers'],
    briefing: briefing('mirror-images'),
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read twins.js. Explain why changing b, alias and copy have different effects, and what the five lines log.',
        fileName: 'twins.js',
        code: snippet('twins.js'),
        answerKey:
          'Numbers are copied: b = a gives b its own 10, so changing b leaves a at 10. Objects are shared by reference: alias = original makes both names point at the same object, so renaming through alias changes original too, and it logs "Renamed". { ...original } makes a new object with copies of the properties, so changing copy.name doesn\'t touch original; copy.name logs "Copy". === on objects checks whether they are the same object: alias === original is true, copy === original is false.',
        markingCriteria:
          'Must explain that numbers are copied while objects are shared by reference, and that spread makes a new object; must explain that === on objects means "the same object"; must give the outputs 10, Renamed, Copy, true, false.',
      },
      {
        type: 'read_and_explain',
        instructions:
          'Read deep-copy.js. Explain why changing shallow.crew changes ship.crew but changing deep.crew doesn\'t, and what the four lines log.',
        fileName: 'deep-copy.js',
        code: snippet('deep-copy.js'),
        answerKey:
          'Spread makes a shallow copy: a new outer object, but its crew property still points at the same array as ship.crew. Pushing "Cy" through shallow changes that shared array, so ship.crew logs ["Ari", "Bo", "Cy"] and shallow.crew === ship.crew is true. structuredClone makes a deep copy, including a new crew array, so adding "Dee" only affects deep: ["Ari", "Bo", "Dee"]. Two separately written objects are never the same object, even with the same contents, so the last line logs false.',
        markingCriteria:
          'Must explain that spread is a shallow copy (nested arrays and objects are still shared) while structuredClone copies everything; must give the four outputs, including false for two separate objects with the same contents.',
      },
      {
        type: 'bug_hunt',
        instructions:
          'withFullShields should return a repaired copy for the simulator and leave the real Heron at 20, but the real ship\'s shields are changed to 100 too. Find the line with the bug and explain what goes wrong.',
        fileName: 'repair.js',
        code: snippet('repair.js'),
        answerKey:
          'const repaired = ship doesn\'t copy the object; it just gives the same object a second name. Setting repaired.shields therefore changes the real ship that was passed in. The function should make a copy first, for example const repaired = { ...ship };',
        markingCriteria:
          'Must identify the line that assigns ship to repaired and explain that it shares the same object rather than copying it, so the real ship is changed; should suggest copying (spread or structuredClone).',
        bugLine: 2,
        bugLineContains: 'const repaired = ship;',
      },
    ],
  },
];
