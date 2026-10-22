import { code, briefingFrom } from '../text.js';
import type { CurriculumQuest } from '../types.js';

// C# part 4: script communication. How objects (and the scripts that hold
// them) talk to each other: shared references and composition, passing
// behaviour around with delegates, and events. LINQ is a side quest.

const briefing = briefingFrom(import.meta.url);

export const communication: CurriculumQuest[] = [
  {
    key: 'crew-comms',
    title: 'Crew Comms',
    concept: 'Object communication',
    difficulty: 'hard',
    isSideQuest: false,
    storyText:
      'The ship’s systems are all working, but none of them can talk to each other: the captain shouts orders into an empty room. Learn how objects hold references to one another and cooperate to get a job done.',
    xpReward: 200,
    prerequisites: ['docking-protocols'],
    briefing: briefing('crew-comms'),
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read Program.cs. Explain how each Engineer gets hold of the reactor, why both engineers affect the same reactor, and what the three lines print.',
        fileName: 'Program.cs',
        code: code(`
using System;

class Reactor
{
    public int Output = 50;

    public void Boost()
    {
        Output += 25;
    }
}

class Engineer
{
    private Reactor reactor;

    public Engineer(Reactor reactor)
    {
        this.reactor = reactor;
    }

    public void HandleAlarm()
    {
        reactor.Boost();
        Console.WriteLine($"Engineer boosted reactor to {reactor.Output}");
    }
}

class Program
{
    static void Main()
    {
        Reactor core = new Reactor();
        Engineer ada = new Engineer(core);
        Engineer bo = new Engineer(core);

        ada.HandleAlarm();
        bo.HandleAlarm();
        Console.WriteLine($"Core output: {core.Output}");
    }
}
`),
        answerKey:
          'Main creates one Reactor and passes it into each Engineer’s constructor, which keeps a reference to it in a private field. Both engineers therefore point at the same reactor object, and calling reactor.Boost() is how an engineer talks to it. ada’s alarm raises it from 50 to 75, bo’s raises the same reactor to 100, and core is that same object too. It prints "Engineer boosted reactor to 75", "Engineer boosted reactor to 100" and "Core output: 100".',
        markingCriteria:
          'Must explain that the reactor is passed into each constructor and stored as a reference, so both engineers (and core) refer to one object; must explain that the engineers communicate by calling the reactor’s method; must give the outputs 75, 100 and "Core output: 100".',
      },
      {
        type: 'read_and_explain',
        instructions:
          'Read Program.cs. Explain what Captain has, how PlotCourse gets the waypoint and sends the message, and what is printed.',
        fileName: 'Program.cs',
        code: code(`
using System;

class Radio
{
    public void Send(string message)
    {
        Console.WriteLine($"[Radio] {message}");
    }
}

class Navigator
{
    public string NextWaypoint()
    {
        return "Waypoint Delta";
    }
}

class Captain
{
    private Radio radio = new Radio();
    private Navigator navigator = new Navigator();

    public void PlotCourse()
    {
        string waypoint = navigator.NextWaypoint();
        radio.Send($"Setting course for {waypoint}");
    }
}

class Program
{
    static void Main()
    {
        Captain captain = new Captain();
        captain.PlotCourse();
    }
}
`),
        answerKey:
          'This is composition: a Captain has a Radio and a Navigator, created as private fields. PlotCourse asks the navigator for information (NextWaypoint returns "Waypoint Delta") and then tells the radio to send a message built from it. Main only talks to the captain and never needs to know about the radio or navigator. It prints "[Radio] Setting course for Waypoint Delta".',
        markingCriteria:
          'Must explain that Captain is made of (has-a) Radio and Navigator objects it keeps privately; must describe PlotCourse asking the navigator for the waypoint and passing a message to the radio; must give the output "[Radio] Setting course for Waypoint Delta".',
      },
      {
        type: 'bug_hunt',
        instructions:
          'Both turrets should report their hits to the bridge display, which should show 3 kills, but it shows 1. Find the line with the bug and explain what goes wrong.',
        fileName: 'Program.cs',
        code: code(`
using System;

class Scoreboard
{
    public int Kills;
}

class Turret
{
    private Scoreboard board;

    public Turret(Scoreboard board)
    {
        this.board = board;
    }

    public void Hit()
    {
        board.Kills++;
    }
}

class Program
{
    static void Main()
    {
        Scoreboard bridgeDisplay = new Scoreboard();
        Turret port = new Turret(bridgeDisplay);
        Turret starboard = new Turret(new Scoreboard());

        port.Hit();
        starboard.Hit();
        starboard.Hit();

        Console.WriteLine($"Bridge display: {bridgeDisplay.Kills} kills");
    }
}
`),
        answerKey:
          'The starboard turret is given a brand-new Scoreboard instead of the bridge display. Its two hits are counted on that separate object, which nothing ever shows, so the bridge display only gets the port turret’s one hit. Both turrets need a reference to the same object: new Turret(bridgeDisplay).',
        markingCriteria:
          'Must identify the starboard turret’s construction and explain that it is given a separate new Scoreboard, so its hits never reach the bridge display; should suggest passing bridgeDisplay so both share one scoreboard.',
        bugLine: 29,
        bugLineContains: 'Turret starboard = new Turret(new Scoreboard());',
      },
    ],
  },
  {
    key: 'relay-signals',
    title: 'Relay Signals',
    concept: 'Delegates and lambdas',
    difficulty: 'hard',
    isSideQuest: false,
    storyText:
      'Fleet Command wants to send ships not just data but instructions: "do this to every ship", "count the ones that match". Learn how C# stores a method in a variable and hands it to other code to run later.',
    xpReward: 225,
    prerequisites: ['crew-comms'],
    briefing: briefing('relay-signals'),
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read Program.cs. Explain what Func and Action variables hold, what each lambda (=>) does, and what the four lines print.',
        fileName: 'Program.cs',
        code: code(`
using System;

class Program
{
    static int Double(int x)
    {
        return x * 2;
    }

    static void Main()
    {
        Func<int, int> transform = Double;
        Console.WriteLine(transform(5));

        transform = x => x + 100;
        Console.WriteLine(transform(5));

        Action<string> announce = message => Console.WriteLine($"ALL SHIPS: {message}");
        announce("Hold position");

        Func<int, int, bool> inRange = (distance, limit) => distance <= limit;
        Console.WriteLine(inRange(40, 50));
    }
}
`),
        answerKey:
          'Func and Action variables hold a method rather than a value. Func<int, int> takes an int and returns an int; Action<string> takes a string and returns nothing; Func<int, int, bool> takes two ints and returns a bool. transform first holds the Double method, so transform(5) prints 10. It is then given a lambda, a short unnamed method: x => x + 100, so the same call now prints 105. announce prints "ALL SHIPS: Hold position", and inRange(40, 50) checks 40 <= 50 and prints True.',
        markingCriteria:
          'Must explain that Func and Action store methods (Func returns a value, Action does not, with the last Func type being the return type) and that a lambda is an unnamed method; must give the four outputs: 10, 105, "ALL SHIPS: Hold position", True.',
      },
      {
        type: 'read_and_explain',
        instructions:
          'Read Program.cs. Explain what ForEachShip and CountWhere each do with the method they are given, and what the three lines print.',
        fileName: 'Program.cs',
        code: code(`
using System;

class Program
{
    static void ForEachShip(string[] ships, Action<string> order)
    {
        foreach (string ship in ships)
        {
            order(ship);
        }
    }

    static int CountWhere(int[] values, Func<int, bool> test)
    {
        int count = 0;
        foreach (int value in values)
        {
            if (test(value)) count++;
        }
        return count;
    }

    static void Main()
    {
        string[] fleet = { "Kestrel", "Osprey" };
        ForEachShip(fleet, ship => Console.WriteLine($"{ship}: raise shields"));

        int[] fuel = { 80, 15, 60, 5 };
        Console.WriteLine(CountWhere(fuel, f => f < 20));
    }
}
`),
        answerKey:
          'Both methods take behaviour as a parameter, so the caller decides what happens. ForEachShip runs the order it was given once per ship; here that order prints a line, so it prints "Kestrel: raise shields" and "Osprey: raise shields". CountWhere runs the test on each value and counts the ones where it returns true; the test f => f < 20 is true for 15 and 5, so it prints 2.',
        markingCriteria:
          'Must explain that the methods receive a method (lambda) as a parameter and call it for each item, so the caller chooses the behaviour; must give the outputs: the two "raise shields" lines and 2.',
      },
      {
        type: 'bug_hunt',
        instructions:
          'The launch queue should launch drones 1, 2 and 3, but every launch says "Launching drone 4". Find the line with the bug and explain what goes wrong.',
        fileName: 'Program.cs',
        code: code(`
using System;
using System.Collections.Generic;

class Program
{
    static void Main()
    {
        List<Action> launches = new List<Action>();

        for (int i = 1; i <= 3; i++)
        {
            launches.Add(() => Console.WriteLine($"Launching drone {i}"));
        }

        foreach (Action launch in launches)
        {
            launch();
        }
    }
}
`),
        answerKey:
          'Each lambda captures the variable i itself, not the value it had when the lambda was created. All three lambdas share the same i, and they only run after the for loop has finished, when i has been pushed up to 4 (the value that ended the loop). So every launch prints 4. The fix is to copy i into a new variable inside the loop (for example int drone = i;) and use that in the lambda, so each lambda captures its own copy.',
        markingCriteria:
          'Must identify the lambda added inside the loop and explain that it captures the loop variable i itself, which is 4 by the time the lambdas run; should suggest copying i into a local variable inside the loop.',
        bugLine: 12,
        bugLineContains: 'launches.Add(() => Console.WriteLine($"Launching drone {i}"));',
      },
    ],
  },
  {
    key: 'distress-beacon',
    title: 'Distress Beacon',
    concept: 'Events',
    difficulty: 'hard',
    isSideQuest: false,
    storyText:
      'When a ship sends a distress call, the beacon has no idea who should respond, and it shouldn’t have to. Learn how events let an object announce that something happened, so any number of listeners can react without the sender knowing they exist.',
    xpReward: 250,
    prerequisites: ['relay-signals'],
    briefing: briefing('distress-beacon'),
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read Program.cs. Explain what the event is, how the rescue team and the logger subscribe to it, what ?.Invoke does, and what is printed.',
        fileName: 'Program.cs',
        code: code(`
using System;

class Beacon
{
    public event Action<string> DistressReceived;

    public void Receive(string ship)
    {
        Console.WriteLine($"Beacon picked up {ship}");
        DistressReceived?.Invoke(ship);
    }
}

class RescueTeam
{
    public void Launch(string ship)
    {
        Console.WriteLine($"Rescue team launching for {ship}");
    }
}

class Program
{
    static void Main()
    {
        Beacon beacon = new Beacon();
        RescueTeam team = new RescueTeam();

        beacon.DistressReceived += team.Launch;
        beacon.DistressReceived += ship => Console.WriteLine($"Log: {ship} in distress");

        beacon.Receive("Osprey");
    }
}
`),
        answerKey:
          'DistressReceived is an event: a list of methods the beacon will call when something happens, each taking a string. += subscribes a method to it: first the rescue team’s Launch method, then a lambda that logs. When Receive runs, it prints "Beacon picked up Osprey", then DistressReceived?.Invoke(ship) calls every subscriber in the order they subscribed (the ?. means it does nothing if nobody has subscribed). So it then prints "Rescue team launching for Osprey" and "Log: Osprey in distress". The Beacon never refers to RescueTeam: it only announces.',
        markingCriteria:
          'Must explain that += subscribes methods to the event and Invoke calls every subscriber, with ?. avoiding a crash when there are none; must point out the beacon does not know who is listening; must give the three outputs in order.',
      },
      {
        type: 'read_and_explain',
        instructions:
          'Read Program.cs. For each of the three Heat calls, explain whether the alarm sounds and why, and say what is printed.',
        fileName: 'Program.cs',
        code: code(`
using System;

class Reactor
{
    public event Action<int> Overheated;
    public int Temperature;

    public void Heat(int amount)
    {
        Temperature += amount;
        if (Temperature > 100)
        {
            Overheated?.Invoke(Temperature);
        }
    }
}

class Program
{
    static void Alarm(int t) { Console.WriteLine($"ALARM: reactor at {t}"); }

    static void Main()
    {
        Reactor reactor = new Reactor();
        reactor.Heat(120);

        reactor.Overheated += Alarm;
        reactor.Heat(10);

        reactor.Overheated -= Alarm;
        reactor.Heat(10);
        Console.WriteLine($"Final temperature: {reactor.Temperature}");
    }
}
`),
        answerKey:
          'The first Heat takes the reactor to 120, which is over 100, but nothing has subscribed yet, so ?.Invoke does nothing and no error happens. Alarm is then subscribed with +=, so the second Heat (to 130) raises the event and prints "ALARM: reactor at 130". -= unsubscribes Alarm, so the third Heat (to 140) raises the event with no listeners and prints nothing. Finally it prints "Final temperature: 140".',
        markingCriteria:
          'Must explain that the first overheat has no subscribers (so ?. silently does nothing), the second triggers Alarm after += subscribes it, and the third does nothing after -= unsubscribes it; must give the outputs "ALARM: reactor at 130" and "Final temperature: 140".',
      },
      {
        type: 'bug_hunt',
        instructions:
          'Two ships landed, so the crew should have welcomed 2 ships, but the Osprey is welcomed twice and the count says 3. Find the line with the bug and explain what goes wrong.',
        fileName: 'Program.cs',
        code: code(`
using System;

class Hangar
{
    public event Action<string> ShipLanded;

    public void Land(string ship)
    {
        ShipLanded?.Invoke(ship);
    }
}

class Crew
{
    public int Welcomed;

    public void Greet(string ship)
    {
        Welcomed++;
        Console.WriteLine($"Welcome home, {ship}");
    }
}

class Program
{
    static void Main()
    {
        Hangar hangar = new Hangar();
        Crew crew = new Crew();

        hangar.ShipLanded += crew.Greet;
        hangar.Land("Kestrel");
        // Make sure the crew greets the next ship too
        hangar.ShipLanded += crew.Greet;
        hangar.Land("Osprey");

        Console.WriteLine($"Ships welcomed: {crew.Welcomed}");
    }
}
`),
        answerKey:
          'A subscription stays in place until it is removed, so the crew was already going to greet every ship after the first +=. Subscribing crew.Greet a second time adds it to the event again, so the event now calls Greet twice for each landing. The Osprey is greeted twice and the count reaches 3. The second += should be removed.',
        markingCriteria:
          'Must identify the second subscription and explain that subscriptions persist, so adding the same handler again makes it run twice per event; should suggest removing the second +=.',
        bugLine: 34,
        bugLineContains: 'hangar.ShipLanded += crew.Greet;',
      },
    ],
  },
  {
    key: 'star-charts',
    title: 'Star Charts',
    concept: 'LINQ',
    difficulty: 'hard',
    isSideQuest: true,
    storyText:
      'The navigation archive holds thousands of charted worlds, and the cartographers are tired of writing a loop for every question. Learn how LINQ asks questions of a whole collection in a single line.',
    xpReward: 175,
    prerequisites: ['relay-signals'],
    briefing: briefing('star-charts'),
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read Program.cs. Explain what Where, OrderBy, Select, First and Count each do here, and what the four lines print.',
        fileName: 'Program.cs',
        code: code(`
using System;
using System.Collections.Generic;
using System.Linq;

class Program
{
    static void Main()
    {
        List<int> distances = new List<int> { 42, 7, 19, 88, 3 };

        List<int> nearby = distances.Where(d => d < 20).ToList();
        List<int> sorted = distances.OrderBy(d => d).ToList();
        List<int> inKm = distances.Select(d => d * 1000).ToList();

        Console.WriteLine(string.Join(", ", nearby));
        Console.WriteLine(string.Join(", ", sorted));
        Console.WriteLine(inKm.First());
        Console.WriteLine(distances.Count(d => d > 40));
    }
}
`),
        answerKey:
          'Where keeps only the items for which the lambda is true, so nearby is 7, 19, 3 (in their original order). OrderBy sorts by the value the lambda gives, smallest first: 3, 7, 19, 42, 88. Select transforms every item, so inKm holds each distance times 1000, and First takes the first of them: 42000. Count with a lambda counts the matching items: 42 and 88 are over 40, so it prints 2. ToList turns each result into a list, and distances itself is never changed.',
        markingCriteria:
          'Must explain Where (filters), OrderBy (sorts), Select (transforms each item), First (first item) and Count with a condition; must give the four outputs: "7, 19, 3", "3, 7, 19, 42, 88", 42000 and 2.',
      },
      {
        type: 'read_and_explain',
        instructions:
          'Read Program.cs. Explain step by step how the names query is built, and what the three lines print.',
        fileName: 'Program.cs',
        code: code(`
using System;
using System.Collections.Generic;
using System.Linq;

class Planet
{
    public string Name;
    public int Moons;
    public bool Habitable;
}

class Program
{
    static void Main()
    {
        List<Planet> chart = new List<Planet>
        {
            new Planet { Name = "Kepler-9b", Moons = 2, Habitable = true },
            new Planet { Name = "Ares", Moons = 0, Habitable = false },
            new Planet { Name = "Tethys", Moons = 5, Habitable = true }
        };

        var names = chart.Where(p => p.Habitable)
                         .OrderByDescending(p => p.Moons)
                         .Select(p => p.Name);

        Console.WriteLine(string.Join(", ", names));
        Console.WriteLine(chart.Sum(p => p.Moons));
        Console.WriteLine(chart.Any(p => p.Moons == 0));
    }
}
`),
        answerKey:
          'The query is a chain where each step works on the result of the one before. Where keeps the habitable planets (Kepler-9b and Tethys), OrderByDescending sorts them by moons, most first (Tethys with 5, then Kepler-9b with 2), and Select keeps just their names. var lets C# work out the type. The first line prints "Tethys, Kepler-9b". Sum adds up every planet’s moons: 2 + 0 + 5 = 7. Any checks whether at least one planet has no moons, and Ares does, so it prints True.',
        markingCriteria:
          'Must explain the chain: filter to habitable planets, sort by moons from most to fewest, then take the names; must give the outputs "Tethys, Kepler-9b", 7 and True, explaining Sum and Any.',
      },
      {
        type: 'bug_hunt',
        instructions:
          'Two ships are under 20 fuel, but the refuelling report says 4 ships need fuel. Find the line with the bug and explain what goes wrong.',
        fileName: 'Program.cs',
        code: code(`
using System;
using System.Collections.Generic;
using System.Linq;

class Program
{
    static void Main()
    {
        List<int> fuelLevels = new List<int> { 80, 15, 60, 5 };

        // Ships that need refuelling: under 20
        var needFuel = fuelLevels.Select(f => f < 20);

        Console.WriteLine($"Ships to refuel: {needFuel.Count()}");
    }
}
`),
        answerKey:
          'Select transforms every item instead of filtering, so needFuel holds four true/false values (false, true, false, true), one for each ship, and Count gives 4. To keep only the ships under 20 it should use Where: fuelLevels.Where(f => f < 20), which leaves 15 and 5, a count of 2.',
        markingCriteria:
          'Must identify the Select call and explain that Select maps every item to a true/false value rather than filtering, so all four are counted; should suggest Where instead.',
        bugLine: 12,
        bugLineContains: 'fuelLevels.Select(f => f < 20)',
      },
    ],
  },
];
