import type { QuestDetail } from '../types/quest';

// Full dummy content for the two quests that can be deployed in the demo.
// Only used while questService has USE_MOCKS = true.
// Answer keys and marking criteria are left out on purpose: they belong in the
// backend seed data (see types/quest.ts).

// Lets snippets start on the line after the opening backtick
function code(snippet: string): string {
  return snippet.replace(/^\n/, '').trimEnd();
}

const loopLabyrinth: QuestDetail = {
  questId: 5,
  languageId: 1,
  sectorDisplayName: 'C#',
  title: 'The Loop Labyrinth',
  concept: 'Loops',
  difficulty: 'medium',
  isSideQuest: false,
  storyText:
    'A Swarm infestation has corrupted the navigation core of the supply ship Kestrel. Before we can purge it, we need to understand exactly how its fuel system works.',
  xpReward: 150,
  challenges: [
    {
      challengeId: 501,
      challengeOrder: 1,
      challengeType: 'read_and_explain',
      instructions:
        'Read Program.cs. Explain what the Main method prints, line by line, and how many times the loop body runs.',
      code: {
        fileName: 'Program.cs',
        snippet: code(`
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
      },
    },
    {
      challengeId: 502,
      challengeOrder: 2,
      challengeType: 'read_and_explain',
      instructions:
        'Read the fuel loop in Program.cs. Explain what the loop does, when it stops, and how many jumps the ship makes.',
      code: {
        fileName: 'Program.cs',
        snippet: code(`
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
      },
    },
    {
      challengeId: 503,
      challengeOrder: 3,
      challengeType: 'bug_hunt',
      instructions:
        'The refuel routine should top up every tank in the bay, but the ship crashes with an IndexOutOfRangeException. Find the line with the bug and explain what goes wrong.',
      code: {
        fileName: 'RefuelBay.cs',
        snippet: code(`
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
      },
    },
    {
      challengeId: 504,
      challengeOrder: 4,
      challengeType: 'decode_transmission',
      instructions:
        "Intercepted transmission: paste a piece of C# code that uses a loop, such as something you found online or that an AI wrote for you. The Ship's AI will walk you through it section by section, then check your understanding. Don't paste confidential or company code.",
    },
  ],
};

const switchStation: QuestDetail = {
  questId: 6,
  languageId: 1,
  sectorDisplayName: 'C#',
  title: 'Switch Station',
  concept: 'Switch statements',
  difficulty: 'medium',
  isSideQuest: true,
  storyText:
    'Switch Station routes every ship that docks, and hostile vessels have started slipping through. Read the routing logic and find where the Swarm got its clearance.',
  xpReward: 120,
  challenges: [
    {
      challengeId: 601,
      challengeOrder: 1,
      challengeType: 'read_and_explain',
      instructions:
        'Read DockingControl.cs. Explain which bay the freighter is sent to, and why two case labels share one block.',
      code: {
        fileName: 'DockingControl.cs',
        snippet: code(`
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
      },
    },
    {
      challengeId: 602,
      challengeOrder: 2,
      challengeType: 'bug_hunt',
      instructions:
        'Hostile ships are docking at the station unchallenged. Find the line that lets them through and explain what it should do instead.',
      code: {
        fileName: 'ClearanceCheck.cs',
        snippet: code(`
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
      },
    },
    {
      challengeId: 603,
      challengeOrder: 3,
      challengeType: 'read_and_explain',
      instructions:
        'This is a switch expression, a shorter form of switch. Explain what each line of Main prints and what the _ case does.',
      code: {
        fileName: 'ShieldControl.cs',
        snippet: code(`
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
      },
    },
  ],
};

export const mockQuests: QuestDetail[] = [loopLabyrinth, switchStation];
