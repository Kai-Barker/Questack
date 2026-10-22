import { code, briefingFrom } from '../text.js';
import type { CurriculumQuest } from '../types.js';

// C# part 1: the fundamentals, from the first line of syntax to enums.
// Seeded quests (by id) are woven into the path with a briefing each.

const briefing = briefingFrom(import.meta.url);

export const basics: CurriculumQuest[] = [
  {
    key: 'first-contact',
    title: 'First Contact',
    concept: 'Syntax basics',
    difficulty: 'easy',
    isSideQuest: false,
    storyText:
      'A silent outpost on the edge of the sector has finally answered our hails, but only in C#. Learn how a C# program is put together and how it talks back, so you can read the outpost’s first transmissions.',
    xpReward: 50,
    prerequisites: [],
    briefing: briefing('first-contact'),
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read FirstContact.cs. Explain where the program starts running, what appears on screen (and on how many lines), and why one of the messages never appears.',
        fileName: 'FirstContact.cs',
        code: code(`
using System;

class FirstContact
{
    static void Main()
    {
        // Open a channel to the outpost
        Console.WriteLine("Hailing outpost Theta...");
        Console.Write("Signal strength: ");
        Console.WriteLine("strong");
        /* Console.WriteLine("Static detected"); */
        Console.WriteLine("Channel open.");
    }
}
`),
        answerKey:
          'The program starts at static void Main and runs its statements from top to bottom. It prints three lines: "Hailing outpost Theta...", then "Signal strength: strong" (Console.Write prints without moving to a new line, so the next WriteLine carries on the same line), then "Channel open.". "Static detected" never appears because that statement is inside a /* */ comment, and comments are ignored. The // line is a comment too.',
        markingCriteria:
          'Must mention: the program starts in Main; Write stays on the same line so "Signal strength: strong" is printed as one line; the commented-out statement is ignored, so "Static detected" never prints; three lines appear in total.',
      },
      {
        type: 'read_and_explain',
        instructions:
          'Read DockingLog.cs. Explain what the using line, the class and the Main method are each for, what the semicolons and curly braces do, and exactly what appears on screen.',
        fileName: 'DockingLog.cs',
        code: code(`
using System;

class DockingLog
{
    static void Main()
    {
        Console.WriteLine("Docking clamps engaged");
        Console.WriteLine();
        Console.WriteLine("Crew may disembark");
    }
}
`),
        answerKey:
          'using System; lets the code use Console without writing System.Console every time. The class DockingLog is the container the code lives in, and Main is the method where the program starts. Each semicolon ends one statement, and each pair of curly braces groups everything that belongs to the class or the method. It prints "Docking clamps engaged", then an empty line (WriteLine with nothing inside just ends the line), then "Crew may disembark".',
        markingCriteria:
          'Must explain: using System gives access to Console; the class holds the code and Main is where it starts; semicolons end statements and braces group a block; the output is the first message, a blank line, then the second message.',
      },
      {
        type: 'bug_hunt',
        instructions:
          'The status report should show each system on its own line, but "Hull: OK" and "Engines: OK" come out squashed together on one line. Find the line with the bug and explain what goes wrong.',
        fileName: 'StatusReport.cs',
        code: code(`
using System;

class StatusReport
{
    static void Main()
    {
        Console.WriteLine("=== Status report ===");
        Console.Write("Hull: OK");
        Console.WriteLine("Engines: OK");
        Console.WriteLine("Shields: OK");
    }
}
`),
        answerKey:
          'The hull status uses Console.Write instead of Console.WriteLine. Write prints the text but does not move to a new line afterwards, so the engines message is printed straight after it and the output reads "Hull: OKEngines: OK". Changing it to Console.WriteLine puts each system on its own line.',
        markingCriteria:
          'Must identify the hull statement and explain that Console.Write does not end the line, so the next message is printed on the same line; should suggest using Console.WriteLine instead.',
        bugLine: 8,
        bugLineContains: 'Console.Write("Hull: OK");',
      },
    ],
  },
  { key: 'cargo-manifest', seededQuestId: 1, prerequisites: ['first-contact'] },
  { key: 'sensor-sweep', seededQuestId: 2, prerequisites: ['cargo-manifest'], briefing: briefing('sensor-sweep') },
  {
    key: 'thruster-math',
    title: 'Thruster Math',
    concept: 'Operators',
    difficulty: 'easy',
    isSideQuest: false,
    storyText:
      'The thruster computer keeps miscalculating burn times, and a pilot nearly overshot the docking ring. Learn how C# works out arithmetic, and in what order, before the next approach.',
    xpReward: 75,
    prerequisites: ['sensor-sweep'],
    briefing: briefing('thruster-math'),
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read ThrusterMath.cs. Explain what each of the four lines prints, including why the first two differ and what the % operator does.',
        fileName: 'ThrusterMath.cs',
        code: code(`
using System;

class ThrusterMath
{
    static void Main()
    {
        int thrust = 2 + 3 * 4;
        int balanced = (2 + 3) * 4;
        int crates = 17;
        int perPod = 5;

        Console.WriteLine(thrust);
        Console.WriteLine(balanced);
        Console.WriteLine(crates / perPod);
        Console.WriteLine(crates % perPod);
    }
}
`),
        answerKey:
          'Multiplication happens before addition, so 2 + 3 * 4 is 2 + 12 and prints 14. Brackets are worked out first, so (2 + 3) * 4 is 5 * 4 and prints 20. 17 / 5 divides two ints, which drops the remainder, so it prints 3. % gives the remainder of a division: 17 split into groups of 5 leaves 2, so it prints 2.',
        markingCriteria:
          'Must give all four outputs (14, 20, 3, 2); must explain that * is done before + unless brackets change the order, that int division drops the remainder, and that % gives the remainder.',
      },
      {
        type: 'read_and_explain',
        instructions:
          'Read FuelGauge.cs. Trace the value of fuel after every statement, and explain what the program prints at the end.',
        fileName: 'FuelGauge.cs',
        code: code(`
using System;

class FuelGauge
{
    static void Main()
    {
        int fuel = 50;
        fuel -= 20;
        fuel *= 2;
        fuel++;
        fuel /= 3;
        Console.WriteLine("Fuel: " + fuel);
    }
}
`),
        answerKey:
          'fuel starts at 50. fuel -= 20 subtracts 20, giving 30. fuel *= 2 doubles it to 60. fuel++ adds one, giving 61. fuel /= 3 divides by 3, and because fuel is an int the decimal part is dropped, so 61 / 3 gives 20 rather than 20.33. The program prints "Fuel: 20".',
        markingCriteria:
          'Must trace fuel through 50, 30, 60, 61 and 20; must explain that each compound operator updates fuel using its current value, that ++ adds one, and that int division drops the decimal part; must give the output "Fuel: 20".',
      },
      {
        type: 'bug_hunt',
        instructions:
          'The scouts reported 12, 18 and 30 contacts, so the average should be 20, but the log says 40. Find the line with the bug and explain what goes wrong.',
        fileName: 'ScoutAverage.cs',
        code: code(`
using System;

class ScoutAverage
{
    static void Main()
    {
        int northScan = 12;
        int southScan = 18;
        int eastScan = 30;

        // Average of the three scans: should be 20
        int average = northScan + southScan + eastScan / 3;

        Console.WriteLine("Average contacts: " + average);
    }
}
`),
        answerKey:
          'Division happens before addition, so only eastScan is divided by 3. The calculation becomes 12 + 18 + 10, which is 40. The three scans need to be added first by putting them in brackets: (northScan + southScan + eastScan) / 3, which gives 60 / 3 = 20.',
        markingCriteria:
          'Must identify the average calculation and explain that / is applied before + so only the last scan is divided; should suggest brackets around the sum before dividing.',
        bugLine: 12,
        bugLineContains: 'int average = northScan + southScan + eastScan / 3;',
      },
    ],
  },
  {
    key: 'comms-text',
    title: 'Comms Text',
    concept: 'Strings',
    difficulty: 'easy',
    isSideQuest: false,
    storyText:
      'The fleet’s comms system is spitting out garbled messages: missing names, odd spacing, placeholders where numbers should be. Learn how C# builds and inspects text so every transmission reads clearly.',
    xpReward: 75,
    prerequisites: ['thruster-math'],
    briefing: briefing('comms-text'),
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read CommsLog.cs. Explain how the two ways of building a message differ, and exactly what the three WriteLine calls print, including what the \\t and \\n inside the last message do.',
        fileName: 'CommsLog.cs',
        code: code(String.raw`
using System;

class CommsLog
{
    static void Main()
    {
        string callsign = "Vega";
        int crew = 4;

        string joined = "Pilot " + callsign + " with " + crew + " crew";
        string interpolated = $"Pilot {callsign} with {crew} crew";

        Console.WriteLine(joined);
        Console.WriteLine(interpolated);
        Console.WriteLine("Status:\tready\nOver and out");
    }
}
`),
        answerKey:
          'joined glues pieces together with +, converting the number 4 to text along the way. interpolated starts with $ so the values inside { } are dropped straight into the text. Both build the same message, so the first two lines both print "Pilot Vega with 4 crew". In the last message \\t is a tab and \\n starts a new line, so it prints "Status:" followed by a tab and "ready", then "Over and out" on the next line.',
        markingCriteria:
          'Must explain that + joins pieces of text while $ with { } inserts values into the text, and that both print "Pilot Vega with 4 crew"; must explain that \\t inserts a tab and \\n starts a new line, so the last message spans two lines.',
      },
      {
        type: 'read_and_explain',
        instructions:
          'Read SignalParser.cs. Explain what each of the five lines prints and how you worked it out.',
        fileName: 'SignalParser.cs',
        code: code(`
using System;

class SignalParser
{
    static void Main()
    {
        string message = "mayday from sector nine";

        Console.WriteLine(message.Length);
        Console.WriteLine(message.ToUpper());
        Console.WriteLine(message.Contains("sector"));
        Console.WriteLine(message[0]);
        Console.WriteLine(message.Substring(7, 4));
    }
}
`),
        answerKey:
          'Length counts every character including the spaces, so it prints 23. ToUpper returns a capitalised copy: "MAYDAY FROM SECTOR NINE" (message itself is unchanged). Contains("sector") is true because that text appears in the message, so it prints True. message[0] is the first character, because positions start at 0, so it prints m. Substring(7, 4) takes 4 characters starting at position 7, which is the start of "from", so it prints from.',
        markingCriteria:
          'Must give the five outputs (23, "MAYDAY FROM SECTOR NINE", True, m, from); must explain that Length counts spaces too, that positions start at 0, and that Substring takes a start position and a number of characters.',
      },
      {
        type: 'bug_hunt',
        instructions:
          'The arrivals board should say "Kestrel is docking at bay 7", but it shows the curly-brace placeholders instead. Find the line with the bug and explain what goes wrong.',
        fileName: 'ArrivalBoard.cs',
        code: code(`
using System;

class ArrivalBoard
{
    static void Main()
    {
        string ship = "Kestrel";
        int bay = 7;

        Console.WriteLine("Arrivals board");
        Console.WriteLine("{ship} is docking at bay {bay}");
    }
}
`),
        answerKey:
          'The message is missing the $ in front of the opening quote. Without it, C# treats the text as an ordinary string, so the curly braces and the names inside them are printed exactly as written instead of being replaced by the values of ship and bay. Adding $ before the quote turns it into an interpolated string.',
        markingCriteria:
          'Must identify the docking message and explain that it lacks the $ that makes it an interpolated string, so the placeholders print literally; should suggest adding $ before the opening quote.',
        bugLine: 11,
        bugLineContains: 'Console.WriteLine("{ship} is docking at bay {bay}");',
      },
    ],
  },
  {
    key: 'hull-breach',
    title: 'Hull Breach Protocol',
    concept: 'Conditionals',
    difficulty: 'easy',
    isSideQuest: false,
    storyText:
      'Alarms are sounding on every deck, but the damage-control computer keeps choosing the wrong response. Learn how C# makes decisions so the ship reacts the right way when it counts.',
    xpReward: 75,
    prerequisites: ['thruster-math'],
    briefing: briefing('hull-breach'),
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read HullMonitor.cs. Explain what it prints and why, and what it would print instead if hull were exactly 30.',
        fileName: 'HullMonitor.cs',
        code: code(`
using System;

class HullMonitor
{
    static void Main()
    {
        int hull = 35;

        if (hull > 70)
        {
            Console.WriteLine("Hull stable");
        }
        else if (hull > 30)
        {
            Console.WriteLine("Hull damaged: head for repairs");
        }
        else
        {
            Console.WriteLine("Hull critical: abandon ship!");
        }
        Console.WriteLine("Check complete");
    }
}
`),
        answerKey:
          'The conditions are checked from the top and only the first true one runs. hull > 70 is false for 35, hull > 30 is true, so it prints "Hull damaged: head for repairs" and skips the rest of the chain. "Check complete" is outside the if, so it always prints afterwards. If hull were exactly 30, hull > 30 would be false (30 is not greater than 30), so the else would run and print "Hull critical: abandon ship!".',
        markingCriteria:
          'Must explain that the conditions are checked in order and only the first true branch runs; must give the output ("Hull damaged: head for repairs" then "Check complete"); must say a hull of 30 would reach the else and print the critical message because > does not include 30.',
      },
      {
        type: 'read_and_explain',
        instructions:
          'Read LaunchCheck.cs. Explain what &&, || and ! do here, and what each of the four outputs is.',
        fileName: 'LaunchCheck.cs',
        code: code(`
using System;

class LaunchCheck
{
    static void Main()
    {
        int fuel = 80;
        bool doorsSealed = true;
        bool stormWarning = true;

        bool canLaunch = fuel >= 50 && doorsSealed;
        bool needsCaution = stormWarning || fuel < 20;

        Console.WriteLine(canLaunch);
        Console.WriteLine(needsCaution);
        Console.WriteLine(!stormWarning);

        if (canLaunch && !stormWarning)
        {
            Console.WriteLine("Launching now");
        }
        else
        {
            Console.WriteLine("Launch on hold");
        }
    }
}
`),
        answerKey:
          '&& is true only when both sides are true: fuel >= 50 and doorsSealed are both true, so canLaunch is True. || is true when at least one side is true: stormWarning is true, so needsCaution is True even though fuel < 20 is false. ! flips a bool, so !stormWarning prints False. canLaunch && !stormWarning is true && false, which is false, so the else runs and prints "Launch on hold".',
        markingCriteria:
          'Must explain && (both must be true), || (at least one must be true) and ! (flips true and false); must give the outputs True, True, False and "Launch on hold", explaining why the launch is held.',
      },
      {
        type: 'bug_hunt',
        instructions:
          'Sensors detect 12 enemy ships, which should be reported as a high threat, but the bridge display says "Threat: low". Find the line with the bug and explain what goes wrong.',
        fileName: 'ThreatLevel.cs',
        code: code(`
using System;

class ThreatLevel
{
    static void Main()
    {
        int enemies = 12;

        if (enemies > 0)
        {
            Console.WriteLine("Threat: low");
        }
        else if (enemies > 10)
        {
            Console.WriteLine("Threat: high");
        }
        else
        {
            Console.WriteLine("All clear");
        }
    }
}
`),
        answerKey:
          'The checks are in the wrong order. An if / else if chain runs only the first condition that is true, and enemies > 0 is already true for 12, so "Threat: low" is printed and the high-threat check is never reached. The more specific check, enemies > 10, must come first, followed by enemies > 0.',
        markingCriteria:
          'Must identify the first condition (enemies > 0) and explain that it catches every positive number, including 12, so the high-threat branch can never run; should suggest checking enemies > 10 first.',
        bugLine: 9,
        bugLineContains: 'if (enemies > 0)',
        // The two checks swap places, so either one can be marked
        altBugLines: [13],
      },
    ],
  },
  { key: 'loop-labyrinth', seededQuestId: 3, prerequisites: ['comms-text', 'hull-breach'], briefing: briefing('loop-labyrinth') },
  {
    key: 'cargo-bay-grid',
    title: 'Cargo Bay Grid',
    concept: 'Arrays',
    difficulty: 'medium',
    isSideQuest: false,
    storyText:
      'The supply hauler Mule carries its cargo in numbered slots, and the loading crew keep grabbing the wrong crate. Learn how C# stores many values in one array, and how to walk through them all.',
    xpReward: 125,
    prerequisites: ['loop-labyrinth'],
    briefing: briefing('cargo-bay-grid'),
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read CargoBay.cs. Explain what each line prints, why crates[2] is "medkits", and what changes before the foreach runs.',
        fileName: 'CargoBay.cs',
        code: code(`
using System;

class CargoBay
{
    static void Main()
    {
        string[] crates = { "fuel", "rations", "medkits", "ore" };

        Console.WriteLine(crates.Length);
        Console.WriteLine(crates[0]);
        Console.WriteLine(crates[2]);

        crates[3] = "spare parts";

        foreach (string crate in crates)
        {
            Console.WriteLine($"Crate: {crate}");
        }
    }
}
`),
        answerKey:
          'crates holds four strings, so Length prints 4. Positions (indexes) start at 0, so crates[0] is "fuel" and crates[2] is the third item, "medkits". crates[3] = "spare parts" replaces "ore" in the last slot. The foreach then visits every item in order and prints "Crate: fuel", "Crate: rations", "Crate: medkits" and "Crate: spare parts".',
        markingCriteria:
          'Must give the outputs 4, fuel and medkits and explain that indexes start at 0; must explain that the last slot is replaced with "spare parts"; must list the four Crate lines printed by the foreach.',
      },
      {
        type: 'read_and_explain',
        instructions:
          'Read MiningReport.cs. Explain what new int[3] creates, how the loop works out total and best, and what is printed.',
        fileName: 'MiningReport.cs',
        code: code(`
using System;

class MiningReport
{
    static void Main()
    {
        int[] yields = new int[3];
        yields[0] = 40;
        yields[1] = 25;
        yields[2] = 60;

        int total = 0;
        int best = yields[0];
        foreach (int amount in yields)
        {
            total += amount;
            if (amount > best)
            {
                best = amount;
            }
        }

        Console.WriteLine($"Total: {total}");
        Console.WriteLine($"Best: {best}");
    }
}
`),
        answerKey:
          'new int[3] creates an array with room for exactly three ints, all starting at 0, which are then filled with 40, 25 and 60. The loop visits each amount: it adds it to total, and if it is bigger than the best seen so far it becomes the new best. total ends at 125 and best at 60, so it prints "Total: 125" and "Best: 60".',
        markingCriteria:
          'Must explain that new int[3] makes a fixed-size array of three (starting at 0) that is then filled; must explain that the loop adds every amount to total and keeps the largest in best; must give the outputs "Total: 125" and "Best: 60".',
      },
      {
        type: 'bug_hunt',
        instructions:
          'The convoy report should name the Heron as the rear guard, but the program crashes with an IndexOutOfRangeException. Find the line with the bug and explain what goes wrong.',
        fileName: 'Convoy.cs',
        code: code(`
using System;

class Convoy
{
    static void Main()
    {
        string[] ships = { "Kestrel", "Osprey", "Heron" };

        Console.WriteLine($"Lead ship: {ships[0]}");
        Console.WriteLine($"Rear guard: {ships[ships.Length]}");
    }
}
`),
        answerKey:
          'The array has 3 ships, so ships.Length is 3, but indexes start at 0, so the valid indexes are 0, 1 and 2. ships[ships.Length] asks for index 3, which does not exist, so C# throws an IndexOutOfRangeException. The last item is at ships.Length - 1.',
        markingCriteria:
          'Must identify the rear-guard line and explain that ships.Length (3) is one past the last valid index because indexes start at 0; should suggest ships.Length - 1.',
        bugLine: 10,
        bugLineContains: 'ships[ships.Length]',
      },
    ],
  },
  { key: 'method-moons', seededQuestId: 5, prerequisites: ['loop-labyrinth'], briefing: briefing('method-moons') },
  {
    key: 'return-trip',
    title: 'Return Trip',
    concept: 'Methods in depth',
    difficulty: 'medium',
    isSideQuest: false,
    storyText:
      'The fleet is heading home, and the navigation routines need to work for every ship, every route and every fuel load. Learn how methods share names, take optional values and keep their own variables to themselves.',
    xpReward: 125,
    prerequisites: ['method-moons'],
    briefing: briefing('return-trip'),
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read Signals.cs. Explain how C# decides which Hail method to run, what perJump = 10 means, and what each of the four lines prints.',
        fileName: 'Signals.cs',
        code: code(`
using System;

class Signals
{
    static string Hail(string ship)
    {
        return $"Hailing {ship}";
    }

    static string Hail(string ship, int times)
    {
        return $"Hailing {ship} x{times}";
    }

    static int Distance(int jumps, int perJump = 10)
    {
        return jumps * perJump;
    }

    static void Main()
    {
        Console.WriteLine(Hail("Osprey"));
        Console.WriteLine(Hail("Heron", 3));
        Console.WriteLine(Distance(4));
        Console.WriteLine(Distance(4, 25));
    }
}
`),
        answerKey:
          'There are two Hail methods with the same name but different parameters (overloading). C# picks the one whose parameters match the arguments: one string runs the first, a string and an int run the second. perJump = 10 is an optional parameter: if the caller leaves it out it is 10. The output is "Hailing Osprey", "Hailing Heron x3", 40 (4 * 10) and 100 (4 * 25).',
        markingCriteria:
          'Must explain overloading (same name, different parameters, chosen by the arguments given) and the optional parameter that defaults to 10; must give the four outputs: "Hailing Osprey", "Hailing Heron x3", 40 and 100.',
      },
      {
        type: 'read_and_explain',
        instructions:
          'Read Refuel.cs. Explain why tank is unchanged after the first call but changed after the second, and what the three lines print.',
        fileName: 'Refuel.cs',
        code: code(`
using System;

class Refuel
{
    static void TopUp(int fuel)
    {
        fuel = fuel + 50;
        Console.WriteLine($"Inside TopUp: {fuel}");
    }

    static int TopUpAndReturn(int fuel)
    {
        int topped = fuel + 50;
        return topped;
    }

    static void Main()
    {
        int tank = 20;

        TopUp(tank);
        Console.WriteLine($"After TopUp: {tank}");

        tank = TopUpAndReturn(tank);
        Console.WriteLine($"After TopUpAndReturn: {tank}");
    }
}
`),
        answerKey:
          'TopUp receives a copy of tank in its parameter fuel. Changing fuel only changes that copy, which exists only inside TopUp (its scope), so it prints "Inside TopUp: 70" but tank in Main is still 20 and "After TopUp: 20" is printed. TopUpAndReturn hands its result back with return, and Main stores it in tank, so tank becomes 70 and "After TopUpAndReturn: 70" is printed.',
        markingCriteria:
          'Must explain that the parameter is a copy and its variables only exist inside the method, so the first call cannot change tank; must explain that returning a value and assigning it is how tank changes; must give the outputs 70, 20 and 70 in the right messages.',
      },
      {
        type: 'bug_hunt',
        instructions:
          'After repairs of 30, the hull should read 90, but the log still says 60. Find the line with the bug and explain what goes wrong.',
        fileName: 'Repairs.cs',
        code: code(`
using System;

class Repairs
{
    static int Repair(int hull, int amount)
    {
        int repaired = hull + amount;
        if (repaired > 100)
        {
            repaired = 100;
        }
        return repaired;
    }

    static void Main()
    {
        int hull = 60;
        Repair(hull, 30);
        Console.WriteLine($"Hull after repairs: {hull}");
    }
}
`),
        answerKey:
          'Repair works out the new value (90) and returns it, but Main calls Repair without using what it returns, so the result is thrown away and hull in Main stays 60. The call should store the result: hull = Repair(hull, 30);',
        markingCriteria:
          'Must identify the call to Repair in Main and explain that its return value is ignored, so hull never changes; should suggest assigning the result back to hull.',
        bugLine: 18,
        bugLineContains: 'Repair(hull, 30);',
      },
    ],
  },
  { key: 'switch-station', seededQuestId: 4, prerequisites: ['method-moons'], briefing: briefing('switch-station') },
  {
    key: 'alert-levels',
    title: 'Alert Levels',
    concept: 'Enums',
    difficulty: 'easy',
    isSideQuest: true,
    storyText:
      'Someone typed "Read" instead of "Red" into the alert system and the whole ship stayed on green. Learn how enums give a fixed set of named options, so a typo can never become an alert level.',
    xpReward: 75,
    prerequisites: ['switch-station'],
    briefing: briefing('alert-levels'),
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read Bridge.cs. Explain what AlertLevel is, and what each of the four outputs is and why.',
        fileName: 'Bridge.cs',
        code: code(`
using System;

enum AlertLevel
{
    Green,
    Yellow,
    Red
}

class Bridge
{
    static void Main()
    {
        AlertLevel alert = AlertLevel.Yellow;

        Console.WriteLine(alert);
        Console.WriteLine((int)alert);

        alert = AlertLevel.Red;
        if (alert == AlertLevel.Red)
        {
            Console.WriteLine("All hands to battle stations");
        }

        AlertLevel fromCode = (AlertLevel)0;
        Console.WriteLine(fromCode);
    }
}
`),
        answerKey:
          'AlertLevel is an enum: a type with a fixed set of named values, Green, Yellow and Red. Printing alert prints the name, Yellow. Behind each name is a number starting at 0, so casting Yellow to int prints 1. alert is then set to Red, so the comparison is true and "All hands to battle stations" is printed. Casting 0 back to AlertLevel gives the first value, so the last line prints Green.',
        markingCriteria:
          'Must explain that an enum is a fixed set of named values; must give the four outputs (Yellow, 1, the battle stations message, Green); must explain that the values are numbered from 0, which is why Yellow is 1 and 0 is Green.',
      },
      {
        type: 'read_and_explain',
        instructions:
          'Read Helm.cs. Explain what FuelPerMinute returns for each engine mode, what the two lines print, and why an enum is safer here than passing the mode as a string.',
        fileName: 'Helm.cs',
        code: code(`
using System;

enum Engine { Off, Idle, Cruise, Boost }

class Helm
{
    static int FuelPerMinute(Engine mode)
    {
        switch (mode)
        {
            case Engine.Off:
                return 0;
            case Engine.Idle:
                return 1;
            case Engine.Cruise:
                return 5;
            default:
                return 12;
        }
    }

    static void Main()
    {
        Console.WriteLine(FuelPerMinute(Engine.Cruise));
        Console.WriteLine(FuelPerMinute(Engine.Boost));
    }
}
`),
        answerKey:
          'The switch picks the case matching the mode: Off returns 0, Idle 1, Cruise 5, and anything else, which here is only Boost, falls to default and returns 12. So it prints 5 and then 12. Because the parameter is an Engine, a caller can only pass one of the four named modes; with a string, a typo such as "Crusie" would compile and quietly fall through to the default.',
        markingCriteria:
          'Must give the outputs 5 and 12 and explain that Boost reaches the default case; must explain that an enum limits the value to the named options, so a typo is caught by the compiler instead of silently picking the wrong branch.',
      },
      {
        type: 'bug_hunt',
        instructions:
          'Only officers and the captain may open the armoury, but a crew member just walked in. Find the line with the bug and explain what goes wrong.',
        fileName: 'Airlock.cs',
        code: code(`
using System;

enum Clearance
{
    Visitor = 1,
    Crew = 2,
    Officer = 3,
    Captain = 4
}

class Airlock
{
    static void Main()
    {
        Clearance badge = Clearance.Crew;

        // Only officers and the captain may open the armoury
        if (badge >= Clearance.Crew)
        {
            Console.WriteLine("Armoury unlocked");
        }
        else
        {
            Console.WriteLine("Access denied");
        }
    }
}
`),
        answerKey:
          'Enum values can be compared by the numbers behind them, and the check uses badge >= Clearance.Crew. Crew is 2, so any badge of Crew or higher passes, which lets crew members in. It should be badge >= Clearance.Officer, so only Officer (3) and Captain (4) pass.',
        markingCriteria:
          'Must identify the armoury condition and explain that comparing against Crew lets Crew (and above) through; should suggest comparing against Officer instead.',
        bugLine: 18,
        bugLineContains: 'if (badge >= Clearance.Crew)',
      },
    ],
  },
];
