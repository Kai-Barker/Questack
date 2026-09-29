// =====================================================================
// TEMPORARY quest content, until week 3 moves quests into the database
// (code_challenge_details holds these same fields).
//
// This is the only place answer keys, marking criteria and bug lines exist.
// They are used to build the Ship's AI prompts and are never sent to the
// browser. The code snippets must match Frontend/src/data/mockQuests.ts.
//
// Keep line numbers out of answer keys and marking criteria: they go into
// the AI's prompt, and the model could repeat them. Bug lines live only in
// `bugLine`, which the server checks itself and never gives to the model.
// =====================================================================

export type Proficiency = 'cadet' | 'pilot' | 'commander';
export type ChallengeType = 'read_and_explain' | 'bug_hunt' | 'decode_transmission' | 'architecture';

export interface ChallengeContent {
  challengeId: number;
  questId: number;
  questTitle: string;
  concept: string;
  language: string;
  challengeType: ChallengeType;
  instructions: string;
  codeSnippet?: string; // decode_transmission has none: the pilot pastes their own
  answerKey?: string;
  markingCriteria: string;
  bugLine?: number; // bug_hunt only
}

function code(snippet: string): string {
  return snippet.replace(/^\n/, '').trimEnd();
}

const loopLabyrinth = { questId: 5, questTitle: 'The Loop Labyrinth', concept: 'Loops', language: 'C#' };
const switchStation = { questId: 6, questTitle: 'Switch Station', concept: 'Switch statements', language: 'C#' };

const challenges: ChallengeContent[] = [
  {
    ...loopLabyrinth,
    challengeId: 501,
    challengeType: 'read_and_explain',
    instructions:
      'Read Program.cs. Explain what the Main method prints, line by line, and how many times the loop body runs.',
    codeSnippet: code(`
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
    ...loopLabyrinth,
    challengeId: 502,
    challengeType: 'read_and_explain',
    instructions:
      'Read the fuel loop in Program.cs. Explain what the loop does, when it stops, and how many jumps the ship makes.',
    codeSnippet: code(`
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
    ...loopLabyrinth,
    challengeId: 503,
    challengeType: 'bug_hunt',
    instructions:
      'The refuel routine should top up every tank in the bay, but the ship crashes with an IndexOutOfRangeException. Find the line with the bug and explain what goes wrong.',
    codeSnippet: code(`
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
  },
  {
    ...loopLabyrinth,
    challengeId: 504,
    challengeType: 'decode_transmission',
    instructions:
      "Intercepted transmission: paste a piece of C# code that uses a loop, such as something you found online or that an AI wrote for you. The Ship's AI will walk you through it section by section, then check your understanding. Don't paste confidential or company code.",
    markingCriteria:
      "The pilot must explain in their own words what the pasted code does overall, including what its loop repeats and when that loop stops. Judge against the pasted code itself. Reward genuine understanding; don't require every detail.",
  },
  {
    ...switchStation,
    challengeId: 601,
    challengeType: 'read_and_explain',
    instructions:
      'Read DockingControl.cs. Explain which bay the freighter is sent to, and why two case labels share one block.',
    codeSnippet: code(`
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
    ...switchStation,
    challengeId: 602,
    challengeType: 'bug_hunt',
    instructions:
      'Hostile ships are docking at the station unchallenged. Find the line that lets them through and explain what it should do instead.',
    codeSnippet: code(`
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
  },
  {
    ...switchStation,
    challengeId: 603,
    challengeType: 'read_and_explain',
    instructions:
      'This is a switch expression, a shorter form of switch. Explain what each line of Main prints and what the _ case does.',
    codeSnippet: code(`
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
];

export function findChallenge(challengeId: number): ChallengeContent | undefined {
  return challenges.find((c) => c.challengeId === challengeId);
}

export function findQuest(questId: number): { questTitle: string; language: string } | undefined {
  const challenge = challenges.find((c) => c.questId === questId);
  return challenge && { questTitle: challenge.questTitle, language: challenge.language };
}
