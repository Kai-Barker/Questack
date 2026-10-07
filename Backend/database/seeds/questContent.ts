// =====================================================================
// Quest content, seeded into the database by `npm run db:seed`.
//
// This file (and the code_challenge_details table it fills) is the only
// place answer keys, marking criteria and bug lines exist. They're used to
// build the Ship's AI prompts and are never sent to the browser.
//
// Rules for writing content:
// - Keep line numbers out of answer keys and marking criteria: they go into
//   the AI's prompt, and the model could repeat them. Bug lines live only in
//   `bugLine`, which the server checks itself.
// - `bugLineContains` is a piece of text from the buggy line. The seed script
//   checks it, so a wrong bugLine is caught before it reaches pilots.
// - Ids are fixed so re-seeding updates content in place. Challenge ids are
//   questId * 100 + order.
// =====================================================================

export type ChallengeType = 'read_and_explain' | 'bug_hunt' | 'decode_transmission';

export interface SeedChallenge {
  type: ChallengeType;
  instructions: string;
  fileName?: string;
  code?: string; // decode objectives have none: the pilot pastes their own
  answerKey?: string;
  markingCriteria: string;
  bugLine?: number;
  bugLineContains?: string;
}

export interface SeedQuest {
  questId: number;
  languageId: number; // 1 = C#, 2 = JavaScript (seeded by migration 001)
  title: string;
  concept: string;
  difficulty: 'easy' | 'medium' | 'hard';
  isSideQuest: boolean;
  storyText: string;
  xpReward: number;
  displayOrder: number;
  prerequisites: number[];
  grantsBooster?: string; // rewards.code of a booster given on the first clear
  challenges: SeedChallenge[];
}

export interface SeedBooster {
  code: string;
  name: string;
  description: string;
  xpMultiplier: number;
  charges: number;
}

export const boosters: SeedBooster[] = [
  {
    code: 'overdrive-core',
    name: 'Overdrive Core',
    description: 'Doubles the XP from your next 3 first-time quest clears.',
    xpMultiplier: 2,
    charges: 3,
  },
];

// Lets snippets start on the line after the opening backtick
function code(snippet: string): string {
  return snippet.replace(/^\n/, '').trimEnd();
}

const decodeInstructions = (language: string, topic: string) =>
  `Intercepted transmission: paste a piece of ${language} code that ${topic}, such as something you found online or that an AI wrote for you. The Ship's AI will walk you through it section by section, then check your understanding. Don't paste confidential or company code.`;

export const quests: SeedQuest[] = [
  // -------------------------------------------------------------------
  // C# Sector
  // -------------------------------------------------------------------
  {
    questId: 1,
    languageId: 1,
    title: 'Cargo Manifest',
    concept: 'Variables',
    difficulty: 'easy',
    isSideQuest: false,
    storyText:
      'Your first sortie. The Swarm has scrambled the cargo manifests of an outpost supply run. Learn how C# stores values so you can read what each crate really holds.',
    xpReward: 50,
    displayOrder: 1,
    prerequisites: [],
    grantsBooster: 'overdrive-core',
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read CargoManifest.cs. Explain what each variable stores, how quantity changes, and what the program prints.',
        fileName: 'CargoManifest.cs',
        code: code(`
using System;

class CargoManifest
{
    static void Main()
    {
        string crate = "Fuel cells";
        int quantity = 12;
        quantity = quantity + 8;

        Console.WriteLine(crate + ": " + quantity);
    }
}
`),
        answerKey:
          'crate is a string holding the text "Fuel cells". quantity is an int that starts at 12. quantity = quantity + 8 reads the current value, adds 8 and stores the result (20) back in quantity, replacing the 12. The program prints "Fuel cells: 20".',
        markingCriteria:
          'Must mention: crate stores the text "Fuel cells"; quantity starts at 12 and becomes 20 because the new value replaces the old one; the output "Fuel cells: 20".',
      },
      {
        type: 'bug_hunt',
        instructions:
          'The docking log should show 5 ships once the new arrivals are recorded, but it says 2. Find the line with the bug and explain what goes wrong.',
        fileName: 'DockingLog.cs',
        code: code(`
using System;

class DockingLog
{
    static void Main()
    {
        int shipsDocked = 3;
        int arrivals = 2;

        // Record the new arrivals
        shipsDocked = arrivals;

        Console.WriteLine("Ships docked: " + shipsDocked);
    }
}
`),
        answerKey:
          'The assignment shipsDocked = arrivals replaces the value of shipsDocked with 2 instead of adding the arrivals to it, so the original 3 ships are lost. It should be shipsDocked = shipsDocked + arrivals (or shipsDocked += arrivals), which gives 5.',
        markingCriteria:
          'Must identify the line that assigns arrivals to shipsDocked and explain that = overwrites the old value instead of adding to it; should suggest adding the arrivals (shipsDocked + arrivals or +=).',
        bugLine: 11,
        bugLineContains: 'shipsDocked = arrivals;',
      },
      {
        type: 'read_and_explain',
        instructions:
          'Read Navigator.cs. Explain the difference between MaxJumps and jumpsLeft, and what the program prints.',
        fileName: 'Navigator.cs',
        code: code(`
using System;

class Navigator
{
    static void Main()
    {
        const int MaxJumps = 4;
        int jumpsLeft = MaxJumps;
        jumpsLeft -= 1;

        string status = "Jumps left: " + jumpsLeft;
        Console.WriteLine(status);
    }
}
`),
        answerKey:
          'MaxJumps is a constant: it is set to 4 once and can never be changed. jumpsLeft is a normal variable that starts with a copy of that 4; jumpsLeft -= 1 subtracts one, so it becomes 3. status joins the text "Jumps left: " with the number, and the program prints "Jumps left: 3".',
        markingCriteria:
          'Must explain that MaxJumps is a constant that cannot change while jumpsLeft is a variable that can; jumpsLeft goes from 4 to 3; the output "Jumps left: 3".',
      },
    ],
  },
  {
    questId: 2,
    languageId: 1,
    title: 'Sensor Sweep',
    concept: 'Data types',
    difficulty: 'easy',
    isSideQuest: false,
    storyText:
      'Sensor readings are coming back as nonsense because every value is being treated the same. Learn the difference between int, double, bool and string before the next scan.',
    xpReward: 75,
    displayOrder: 2,
    prerequisites: [1],
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read SensorReadings.cs. Name the kind of value each variable holds, and explain what each line prints, especially the first one.',
        fileName: 'SensorReadings.cs',
        code: code(`
using System;

class SensorReadings
{
    static void Main()
    {
        int probes = 7;
        double temperature = -40.5;
        bool shieldsUp = true;
        string sector = "Kepler-9";

        Console.WriteLine(probes / 2);
        Console.WriteLine(temperature);
        Console.WriteLine(shieldsUp);
        Console.WriteLine(sector);
    }
}
`),
        answerKey:
          'probes is an int (a whole number), temperature is a double (a number with a decimal part), shieldsUp is a bool (true or false) and sector is a string (text). probes / 2 divides one int by another, so C# does integer division and drops the remainder: it prints 3, not 3.5. Then it prints -40.5, True and Kepler-9.',
        markingCriteria:
          'Must name what each type holds (whole number, decimal number, true/false, text) and explain that the first line prints 3 because dividing two ints drops the decimal part.',
      },
      {
        type: 'bug_hunt',
        instructions:
          'The fuel report should say each tank holds 62.5 on average, but it prints 62. Find the line with the bug and explain what goes wrong.',
        fileName: 'FuelReport.cs',
        code: code(`
using System;

class FuelReport
{
    static void Main()
    {
        int totalFuel = 250;
        int tanks = 4;

        // Average fuel per tank, e.g. 62.5
        double average = totalFuel / tanks;

        Console.WriteLine("Average per tank: " + average);
    }
}
`),
        answerKey:
          'totalFuel and tanks are both ints, so totalFuel / tanks is integer division and gives 62 before the result is ever stored in the double. Storing it in a double does not bring the .5 back. One value must be a double before dividing, for example (double)totalFuel / tanks, which gives 62.5.',
        markingCriteria:
          'Must identify the division line and explain that dividing two ints does integer division (losing the .5) before the value reaches the double; should suggest making one side a double first.',
        bugLine: 11,
        bugLineContains: 'double average = totalFuel / tanks;',
      },
      {
        type: 'decode_transmission',
        instructions: decodeInstructions('C#', 'declares variables of a few different types (int, double, bool, string)'),
        markingCriteria:
          'The pilot must explain in their own words what the pasted code does, including what kind of value each of its main variables holds. Judge against the pasted code itself. Reward genuine understanding; don’t require every detail.',
      },
    ],
  },
  {
    questId: 3,
    languageId: 1,
    title: 'The Loop Labyrinth',
    concept: 'Loops',
    difficulty: 'medium',
    isSideQuest: false,
    storyText:
      'A Swarm infestation has corrupted the navigation core of the supply ship Kestrel. Before we can purge it, we need to understand exactly how its fuel system works.',
    xpReward: 150,
    displayOrder: 3,
    prerequisites: [2],
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read Program.cs. Explain what the Main method prints, line by line, and how many times the loop body runs.',
        fileName: 'Program.cs',
        code: code(`
using System;

class Program
{
    static void Main()
    {
        for (int deck = 1; deck <= 3; deck++)
        {
            Console.WriteLine($"Scanning deck {deck}...");
        }

        Console.WriteLine("Scan complete.");
    }
}
`),
        answerKey:
          'It prints "Scanning deck 1...", "Scanning deck 2..." and "Scanning deck 3...", then "Scan complete." once after the loop. deck starts at 1 and goes up by 1 while it is 3 or less, so the loop body runs 3 times.',
        markingCriteria:
          'Must mention: the three "Scanning deck" lines with the numbers 1, 2 and 3; "Scan complete." printed once after the loop ends; the loop body running 3 times.',
      },
      {
        type: 'read_and_explain',
        instructions:
          'Read the fuel loop in Program.cs. Explain what the loop does, when it stops, and how many jumps the ship makes.',
        fileName: 'Program.cs',
        code: code(`
using System;

class Program
{
    static void Main()
    {
        int fuel = 10;
        int jumps = 0;

        while (fuel >= 3)
        {
            fuel -= 3;
            jumps++;
        }

        Console.WriteLine($"Jumps made: {jumps}");
    }
}
`),
        answerKey:
          'While fuel is at least 3, each pass subtracts 3 from fuel and adds 1 to jumps. Fuel goes 10, 7, 4, 1. When fuel is 1 the condition fuel >= 3 is false, so the loop stops. The ship makes 3 jumps and it prints "Jumps made: 3".',
        markingCriteria:
          'Must mention: the loop condition (fuel >= 3); fuel decreasing by 3 each pass; the loop stopping when fuel drops below 3 (it ends at 1); 3 jumps in total.',
      },
      {
        type: 'bug_hunt',
        instructions:
          'The refuel routine should top up every tank in the bay, but the ship crashes with an IndexOutOfRangeException. Find the line with the bug and explain what goes wrong.',
        fileName: 'RefuelBay.cs',
        code: code(`
using System;

class RefuelBay
{
    static void Main()
    {
        int[] tanks = { 40, 25, 60, 10 };
        int topUp = 15;

        // Top up every tank in the bay
        for (int i = 0; i <= tanks.Length; i++)
        {
            tanks[i] += topUp;
        }

        Console.WriteLine("All tanks refuelled.");
    }
}
`),
        answerKey:
          'The for loop condition uses i <= tanks.Length. The array has 4 tanks, so valid indexes are 0 to 3, but <= lets i reach 4. tanks[4] does not exist, which throws the IndexOutOfRangeException. It should be i < tanks.Length (an off-by-one error).',
        markingCriteria:
          'Must identify the for loop condition (<= instead of <) and explain that the loop goes one index past the end of the array (index 4, when the last valid index is 3).',
        bugLine: 11,
        bugLineContains: 'i <= tanks.Length',
      },
      {
        type: 'decode_transmission',
        instructions: decodeInstructions('C#', 'uses a loop'),
        markingCriteria:
          'The pilot must explain in their own words what the pasted code does overall, including what its loop repeats and when that loop stops. Judge against the pasted code itself. Reward genuine understanding; don’t require every detail.',
      },
    ],
  },
  {
    questId: 4,
    languageId: 1,
    title: 'Switch Station',
    concept: 'Switch statements',
    difficulty: 'medium',
    isSideQuest: true,
    storyText:
      'Switch Station routes every ship that docks, and hostile vessels have started slipping through. Read the routing logic and find where the Swarm got its clearance.',
    xpReward: 120,
    displayOrder: 4,
    prerequisites: [2],
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read DockingControl.cs. Explain which bay the freighter is sent to, and why two case labels share one block.',
        fileName: 'DockingControl.cs',
        code: code(`
using System;

class DockingControl
{
    static void Main()
    {
        string shipClass = "freighter";
        string bay;

        switch (shipClass)
        {
            case "fighter":
                bay = "Hangar A";
                break;
            case "freighter":
            case "tanker":
                bay = "Cargo Bay 3";
                break;
            default:
                bay = "Holding Pattern";
                break;
        }

        Console.WriteLine($"Assigned to: {bay}");
    }
}
`),
        answerKey:
          'The freighter is sent to Cargo Bay 3 and it prints "Assigned to: Cargo Bay 3". The "freighter" and "tanker" labels are stacked, so both values run the same block. It is a way of saying "freighter or tanker" without repeating the code. break then leaves the switch.',
        markingCriteria:
          'Must say the freighter goes to Cargo Bay 3, and explain that stacked case labels share one block so freighter and tanker both run it.',
      },
      {
        type: 'bug_hunt',
        instructions:
          'Hostile ships are docking at the station unchallenged. Find the line that lets them through and explain what it should do instead.',
        fileName: 'ClearanceCheck.cs',
        code: code(`
using System;

class ClearanceCheck
{
    static string GetClearance(string status)
    {
        switch (status)
        {
            case "friendly":
                return "Granted";
            case "unknown":
                return "Scan required";
            case "hostile":
                return "Granted";
            default:
                return "Denied";
        }
    }

    static void Main()
    {
        Console.WriteLine(GetClearance("hostile"));
    }
}
`),
        answerKey:
          'The "hostile" case returns "Granted", so hostile ships get clearance. It should return "Denied" (or the case could be removed so hostile ships fall to the default).',
        markingCriteria:
          'Must identify that the hostile case returns "Granted" and explain it should deny clearance instead.',
        bugLine: 14,
        bugLineContains: 'return "Granted";',
      },
      {
        type: 'read_and_explain',
        instructions:
          'This is a switch expression, a shorter form of switch. Explain what each line of Main prints and what the _ case does.',
        fileName: 'ShieldControl.cs',
        code: code(`
using System;

class ShieldControl
{
    static int ShieldLevel(string alert) => alert switch
    {
        "green" => 10,
        "yellow" => 50,
        "red" => 100,
        _ => 25,
    };

    static void Main()
    {
        Console.WriteLine(ShieldLevel("red"));
        Console.WriteLine(ShieldLevel("purple"));
    }
}
`),
        answerKey:
          'ShieldLevel("red") matches the "red" arm and returns 100, so the first line prints 100. "purple" matches none of the named arms, so the _ (discard) arm catches it and returns 25, so the second line prints 25. _ works like default: it matches anything not matched above.',
        markingCriteria:
          'Must say the first line prints 100 and the second prints 25, and explain that _ is the catch-all (default) arm for any value not matched above.',
      },
    ],
  },

  // -------------------------------------------------------------------
  // JavaScript Sector
  // -------------------------------------------------------------------
  {
    questId: 11,
    languageId: 2,
    title: 'Signal Relay',
    concept: 'Variables',
    difficulty: 'easy',
    isSideQuest: false,
    storyText:
      'The relay beacons on the edge of the web nebula are broadcasting stale numbers. Learn how JavaScript stores and updates values with let and const to bring them back online.',
    xpReward: 50,
    displayOrder: 1,
    prerequisites: [],
    grantsBooster: 'overdrive-core',
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read cargo.js. Explain what each variable stores, the difference between let and const here, and what gets logged.',
        fileName: 'cargo.js',
        code: code(`
let crate = "Fuel cells";
let quantity = 12;
quantity = quantity + 8;

const ship = "Kestrel";
console.log(ship + " carries " + quantity + " " + crate);
`),
        answerKey:
          'crate holds the text "Fuel cells" and quantity starts at 12. Both are declared with let, so they can be reassigned: quantity = quantity + 8 replaces 12 with 20. ship is declared with const, so it can never be reassigned. The log joins the pieces with + and prints "Kestrel carries 20 Fuel cells".',
        markingCriteria:
          'Must mention: quantity changes from 12 to 20; let variables can be reassigned but const cannot; the logged text "Kestrel carries 20 Fuel cells".',
      },
      {
        type: 'bug_hunt',
        instructions:
          'Each jump should burn 15 fuel, so the log should say 85, but it still says 100. Find the line with the bug and explain what goes wrong.',
        fileName: 'fuel.js',
        code: code(`
let fuel = 100;
let burnRate = 15;

// Burn fuel for one jump
fuel - burnRate;

console.log("Fuel left: " + fuel);
`),
        answerKey:
          'fuel - burnRate works out 85 but the result is thrown away, because it is never stored anywhere, so fuel stays 100. It should be fuel = fuel - burnRate (or fuel -= burnRate) so the new value replaces the old one.',
        markingCriteria:
          'Must identify the subtraction line and explain that the result is calculated but never assigned back to fuel; should suggest = or -= to store it.',
        bugLine: 5,
        bugLineContains: 'fuel - burnRate;',
      },
    ],
  },
  {
    questId: 12,
    languageId: 2,
    title: 'Type Storm',
    concept: 'Data types',
    difficulty: 'easy',
    isSideQuest: false,
    storyText:
      'A type storm is mixing numbers and text in the navigation feed. Learn how JavaScript tells numbers, strings and booleans apart before the readings send the fleet off course.',
    xpReward: 75,
    displayOrder: 2,
    prerequisites: [11],
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read types.js. Explain what each typeof line logs, and what the last line logs.',
        fileName: 'types.js',
        code: code(`
const probes = 7;
const temperature = -40.5;
const shieldsUp = true;
const sector = "Kepler-9";

console.log(typeof probes);
console.log(typeof temperature);
console.log(typeof shieldsUp);
console.log(typeof sector);
console.log(probes / 2);
`),
        answerKey:
          'typeof probes and typeof temperature both log "number", because JavaScript uses one number type for whole numbers and decimals. typeof shieldsUp logs "boolean" and typeof sector logs "string". probes / 2 logs 3.5: unlike C#, JavaScript keeps the decimal part when dividing.',
        markingCriteria:
          'Must say both numeric values are of type "number" (one type for whole and decimal numbers), the others are "boolean" and "string", and that probes / 2 logs 3.5.',
      },
      {
        type: 'bug_hunt',
        instructions:
          'After refuelling, the tank should hold 65, but the log says "Total fuel: 4025". Find the line with the bug and explain what goes wrong.',
        fileName: 'refuel.js',
        code: code(`
const fuelInTank = "40";
const refuel = 25;

// Total fuel after refuelling should be 65
const total = fuelInTank + refuel;

console.log("Total fuel: " + total);
`),
        answerKey:
          'fuelInTank is the string "40", not the number 40. Using + with a string joins text instead of adding, so "40" + 25 becomes "4025". The string needs converting first, for example Number(fuelInTank) + refuel, which gives 65.',
        markingCriteria:
          'Must identify the line that adds fuelInTank and refuel, and explain that fuelInTank is a string so + joins the text instead of adding; should suggest converting it to a number.',
        bugLine: 5,
        bugLineContains: 'fuelInTank + refuel',
      },
      {
        type: 'decode_transmission',
        instructions: decodeInstructions('JavaScript', 'works with a few different types of value (numbers, strings, booleans)'),
        markingCriteria:
          'The pilot must explain in their own words what the pasted code does, including what kind of value its main variables hold. Judge against the pasted code itself. Reward genuine understanding; don’t require every detail.',
      },
    ],
  },
];
