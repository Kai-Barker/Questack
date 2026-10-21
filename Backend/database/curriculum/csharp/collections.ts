import { code, briefingFrom } from '../text.js';
import type { CurriculumQuest } from '../types.js';

// C# part 2: collections that grow, looking things up by key, and handling
// things going wrong

const briefing = briefingFrom(import.meta.url);

export const collections: CurriculumQuest[] = [
  {
    key: 'supply-lists',
    title: 'Supply Lists',
    concept: 'Lists',
    difficulty: 'medium',
    isSideQuest: false,
    storyText:
      'The quartermaster’s supply manifest changes every hour: crates come aboard, crates get used up. Fixed-size arrays can’t keep up. Learn how C# lists grow and shrink as the voyage goes on.',
    xpReward: 125,
    prerequisites: ['cargo-bay-grid', 'return-trip'],
    briefing: briefing('supply-lists'),
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read Supplies.cs. Explain what the list holds after each change, and what each line prints.',
        fileName: 'Supplies.cs',
        code: code(`
using System;
using System.Collections.Generic;

class Supplies
{
    static void Main()
    {
        List<string> manifest = new List<string>();
        manifest.Add("water");
        manifest.Add("oxygen");
        manifest.Add("rations");

        manifest.Remove("oxygen");
        manifest.Add("fuel");

        Console.WriteLine(manifest.Count);
        Console.WriteLine(manifest[1]);
        Console.WriteLine(manifest.Contains("oxygen"));

        foreach (string item in manifest)
        {
            Console.WriteLine(item);
        }
    }
}
`),
        answerKey:
          'The list starts empty and Add puts each item on the end: water, oxygen, rations. Remove("oxygen") takes oxygen out and the items after it move up, giving water, rations; then fuel is added on the end: water, rations, fuel. Count prints 3, manifest[1] is the second item, rations, and Contains("oxygen") prints False because it was removed. The foreach prints water, rations and fuel.',
        markingCriteria:
          'Must track the list to water, rations, fuel (Remove takes oxygen out and later items move up; Add puts items on the end); must give the outputs 3, rations, False, then water, rations and fuel.',
      },
      {
        type: 'read_and_explain',
        instructions:
          'Read Recruitment.cs. Explain what the Ready method does with its two lists, and what the program prints.',
        fileName: 'Recruitment.cs',
        code: code(`
using System;
using System.Collections.Generic;

class Recruitment
{
    static List<string> Ready(List<string> names, List<int> scores)
    {
        List<string> ready = new List<string>();
        for (int i = 0; i < names.Count; i++)
        {
            if (scores[i] >= 70)
            {
                ready.Add(names[i]);
            }
        }
        return ready;
    }

    static void Main()
    {
        List<string> cadets = new List<string> { "Ari", "Bo", "Cy" };
        List<int> scores = new List<int> { 82, 64, 70 };

        List<string> squad = Ready(cadets, scores);
        Console.WriteLine($"Squad size: {squad.Count}");
        Console.WriteLine(string.Join(", ", squad));
    }
}
`),
        answerKey:
          'The two lists line up by position: each cadet’s score is at the same index as their name. Ready builds a new, empty list and, for each index, adds the name if that score is 70 or more, then returns the new list. Ari (82) and Cy (70) qualify; Bo (64) does not. It prints "Squad size: 2", then string.Join puts the names together with ", " between them: "Ari, Cy".',
        markingCriteria:
          'Must explain that names and scores are matched by index and that Ready returns a new list of the names scoring 70 or more; must give the outputs "Squad size: 2" and "Ari, Cy" (Cy counts because 70 meets >= 70).',
      },
      {
        type: 'bug_hunt',
        instructions:
          'The medical bay tries to move infected crew out of the healthy list, but the program crashes with "Collection was modified; enumeration operation may not execute". Find the line with the bug and explain what goes wrong.',
        fileName: 'Quarantine.cs',
        code: code(`
using System;
using System.Collections.Generic;

class Quarantine
{
    static void Main()
    {
        List<string> crew = new List<string> { "Ari", "Bo", "Cy", "Dee" };
        List<string> infected = new List<string> { "Bo", "Dee" };

        foreach (string member in crew)
        {
            if (infected.Contains(member))
            {
                crew.Remove(member);
            }
        }

        Console.WriteLine($"Healthy crew: {crew.Count}");
    }
}
`),
        answerKey:
          'The loop removes items from crew while a foreach is still walking through crew. A foreach does not allow the list it is looping over to change, so the first Remove makes the next step of the loop throw. The fix is to avoid changing the list being looped over: for example, loop backwards with a for loop using an index, or loop over a copy, or build a new list of healthy crew instead.',
        markingCriteria:
          'Must identify the Remove inside the foreach and explain that a list cannot be changed while a foreach is looping over it; should suggest a safe alternative such as a backwards for loop, looping over a copy, or building a new list.',
        bugLine: 15,
        bugLineContains: 'crew.Remove(member);',
        // Swapping the foreach for a backwards for loop fixes it there
        altBugLines: [11],
      },
    ],
  },
  {
    key: 'damage-control',
    title: 'Damage Control',
    concept: 'Exceptions',
    difficulty: 'medium',
    isSideQuest: true,
    storyText:
      'Garbled sensor input and empty power cells keep crashing the ship’s systems mid-flight. Learn how C# reports problems with exceptions, and how to catch them so one bad reading doesn’t take the whole ship down.',
    xpReward: 120,
    prerequisites: ['return-trip'],
    briefing: briefing('damage-control'),
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read CoordinateInput.cs. Explain what int.TryParse does with each input, what out int value means, and what is printed.',
        fileName: 'CoordinateInput.cs',
        code: code(`
using System;

class CoordinateInput
{
    static void Main()
    {
        string[] inputs = { "42", "4x2", "-7" };

        foreach (string text in inputs)
        {
            if (int.TryParse(text, out int value))
            {
                Console.WriteLine($"Plotting course to {value}");
            }
            else
            {
                Console.WriteLine($"'{text}' isn't a coordinate");
            }
        }
    }
}
`),
        answerKey:
          'int.TryParse tries to turn the text into an int without crashing. It returns true or false to say whether it worked, and out int value is where it puts the number when it does. "42" and "-7" are valid whole numbers, so it prints "Plotting course to 42" and "Plotting course to -7". "4x2" is not a number, so TryParse returns false and it prints "\'4x2\' isn\'t a coordinate" instead of throwing an exception.',
        markingCriteria:
          'Must explain that TryParse returns true or false instead of crashing and hands the number back through the out variable; must give the three outputs, with "4x2" reported as not a coordinate.',
      },
      {
        type: 'read_and_explain',
        instructions:
          'Read WarpDrive.cs. For each of the three attempts, explain which block runs (try, which catch, finally) and list everything that is printed.',
        fileName: 'WarpDrive.cs',
        code: code(`
using System;

class WarpDrive
{
    static int Charge(int cells)
    {
        if (cells < 0) throw new ArgumentException("Cells can't be negative");
        return 100 / cells;
    }

    static void Main()
    {
        foreach (int cells in new[] { 4, 0, -1 })
        {
            try
            {
                Console.WriteLine($"Charge per cell: {Charge(cells)}");
            }
            catch (DivideByZeroException)
            {
                Console.WriteLine("No cells loaded");
            }
            catch (ArgumentException error)
            {
                Console.WriteLine($"Rejected: {error.Message}");
            }
            finally
            {
                Console.WriteLine("Attempt logged");
            }
        }
    }
}
`),
        answerKey:
          'With 4 cells nothing goes wrong: it prints "Charge per cell: 25", then the finally block prints "Attempt logged". With 0 cells, 100 / 0 throws a DivideByZeroException, so the first catch prints "No cells loaded", then "Attempt logged". With -1 cells, Charge throws an ArgumentException itself, so the second catch prints "Rejected: Cells can\'t be negative", then "Attempt logged". finally runs every time, whether or not something was thrown.',
        markingCriteria:
          'Must explain each attempt: 4 succeeds (25), 0 is caught by the DivideByZeroException catch, -1 is thrown by Charge and caught by the ArgumentException catch with its message; must explain that finally runs after every attempt, so "Attempt logged" appears three times.',
      },
      {
        type: 'bug_hunt',
        instructions:
          'A faulty sensor sent the word "heavy" instead of a number, and the cargo log now says the crate weighs 0 tonnes as if that were a real reading. Find the line where the problem gets hidden and explain what goes wrong.',
        fileName: 'CargoScale.cs',
        code: code(`
using System;

class CargoScale
{
    static void Main()
    {
        string reading = "heavy";
        int weight = 0;

        try
        {
            weight = int.Parse(reading);
        }
        catch (FormatException)
        {
        }

        Console.WriteLine($"Cargo weight: {weight} tonnes");
    }
}
`),
        answerKey:
          'int.Parse throws a FormatException because "heavy" is not a number, but the catch block is empty, so the error is silently swallowed. weight keeps its starting value of 0 and the program carries on as if 0 were a real reading. The catch should handle the problem, for example by logging that the reading is invalid and not reporting a weight (or by using int.TryParse and checking the result).',
        markingCriteria:
          'Must identify the empty catch and explain that it swallows the FormatException, so the default 0 is reported as if it were real; should suggest reporting the bad reading (or using TryParse) instead of ignoring it.',
        bugLine: 14,
        bugLineContains: 'catch (FormatException)',
        // Switching int.Parse to int.TryParse and checking it fixes it there
        altBugLines: [12],
      },
    ],
  },
  {
    key: 'star-registry',
    title: 'Star Registry',
    concept: 'Dictionaries',
    difficulty: 'medium',
    isSideQuest: true,
    storyText:
      'The fleet registry is one long list, and finding a ship means checking every entry in turn. Learn how a dictionary looks a value up instantly by its key, so the registry can answer before the next ship docks.',
    xpReward: 120,
    prerequisites: ['supply-lists'],
    briefing: briefing('star-registry'),
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read StarRegistry.cs. Explain what crewByShip stores, what the two lines using square brackets do, and what is printed.',
        fileName: 'StarRegistry.cs',
        code: code(`
using System;
using System.Collections.Generic;

class StarRegistry
{
    static void Main()
    {
        Dictionary<string, int> crewByShip = new Dictionary<string, int>
        {
            { "Kestrel", 6 },
            { "Osprey", 4 }
        };

        crewByShip["Heron"] = 9;
        crewByShip["Kestrel"] = 7;

        Console.WriteLine(crewByShip.Count);
        Console.WriteLine(crewByShip["Kestrel"]);
        Console.WriteLine(crewByShip.ContainsKey("Falcon"));

        foreach (KeyValuePair<string, int> entry in crewByShip)
        {
            Console.WriteLine($"{entry.Key}: {entry.Value}");
        }
    }
}
`),
        answerKey:
          'crewByShip maps each ship name (the key) to its crew count (the value). Assigning with square brackets adds the key if it is new and replaces the value if it already exists: "Heron" is added with 9, and "Kestrel" is changed from 6 to 7. Count prints 3, crewByShip["Kestrel"] prints 7, and ContainsKey("Falcon") prints False. The foreach visits every pair, printing each ship with its crew: Kestrel: 7, Osprey: 4, Heron: 9.',
        markingCriteria:
          'Must explain that keys (ship names) map to values (crew counts) and that assigning with [ ] adds a new key or replaces an existing value; must give the outputs 3, 7 and False, and say the loop prints every ship with its crew count (Kestrel now 7, plus Osprey 4 and Heron 9).',
      },
      {
        type: 'read_and_explain',
        instructions:
          'Read SignalCounter.cs. Explain how the loop counts each ping using TryGetValue, and what the three lines print.',
        fileName: 'SignalCounter.cs',
        code: code(`
using System;
using System.Collections.Generic;

class SignalCounter
{
    static void Main()
    {
        string[] pings = { "alpha", "beta", "alpha", "gamma", "alpha" };
        Dictionary<string, int> counts = new Dictionary<string, int>();

        foreach (string ping in pings)
        {
            if (counts.TryGetValue(ping, out int seen))
            {
                counts[ping] = seen + 1;
            }
            else
            {
                counts[ping] = 1;
            }
        }

        Console.WriteLine(counts["alpha"]);
        Console.WriteLine(counts["gamma"]);
        Console.WriteLine(counts.ContainsKey("delta"));
    }
}
`),
        answerKey:
          'For each ping, TryGetValue checks whether that name is already a key. If it is, it returns true and puts the current count in seen, and the count is stored back one higher. If not, it returns false and the count starts at 1. alpha appears three times, so counts["alpha"] prints 3; gamma appears once, so it prints 1; delta never appears, so ContainsKey("delta") prints False.',
        markingCriteria:
          'Must explain that TryGetValue returns whether the key exists and hands back its value through seen, so existing counts go up by one and new pings start at 1; must give the outputs 3, 1 and False.',
      },
      {
        type: 'bug_hunt',
        instructions:
          'When the Heron requests docking, the station should say it has no code on file, but the program crashes with a KeyNotFoundException. Find the line with the bug and explain what goes wrong.',
        fileName: 'DockingCodes.cs',
        code: code(`
using System;
using System.Collections.Generic;

class DockingCodes
{
    static void Main()
    {
        Dictionary<string, string> codes = new Dictionary<string, string>
        {
            { "Kestrel", "K-117" },
            { "Osprey", "O-204" }
        };

        string visitor = "Heron";
        string code = codes[visitor];
        Console.WriteLine($"{visitor} cleared with code {code}");
    }
}
`),
        answerKey:
          'Reading a dictionary with square brackets assumes the key is there. "Heron" is not a key in codes, so codes[visitor] throws a KeyNotFoundException. The lookup should check first, for example with codes.TryGetValue(visitor, out string code), and print that there is no code on file when it returns false.',
        markingCriteria:
          'Must identify the lookup with codes[visitor] and explain that reading a missing key with [ ] throws KeyNotFoundException; should suggest TryGetValue (or ContainsKey) and handling the missing case.',
        bugLine: 15,
        bugLineContains: 'string code = codes[visitor];',
      },
    ],
  },
];
