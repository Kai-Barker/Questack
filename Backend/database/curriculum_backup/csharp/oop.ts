import { code, briefingFrom } from '../text.js';
import type { CurriculumQuest } from '../types.js';

// C# part 3: object-oriented programming. Classes and objects, constructors,
// then the four pillars (encapsulation, inheritance, polymorphism,
// abstraction) and interfaces, with static members and value vs reference
// types as side quests.

const briefing = briefingFrom(import.meta.url);

export const oop: CurriculumQuest[] = [
  {
    key: 'blueprint-bay',
    title: 'Blueprint Bay',
    concept: 'Classes and objects',
    difficulty: 'medium',
    isSideQuest: false,
    storyText:
      'The shipyard needs to build a whole fleet, and every ship is a pile of loose variables. Learn how a class bundles data and behaviour into one blueprint, and how to build as many ships from it as you need.',
    xpReward: 150,
    prerequisites: ['supply-lists'],
    briefing: briefing('blueprint-bay'),
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read Program.cs. Explain the difference between the Ship class and the scout and hauler objects, and what the three Jump calls print.',
        fileName: 'Program.cs',
        code: code(`
using System;

class Ship
{
    public string Name;
    public int Fuel;

    public void Jump(int cost)
    {
        Fuel -= cost;
        Console.WriteLine($"{Name} jumped. Fuel left: {Fuel}");
    }
}

class Program
{
    static void Main()
    {
        Ship scout = new Ship();
        scout.Name = "Swift";
        scout.Fuel = 30;

        Ship hauler = new Ship();
        hauler.Name = "Mule";
        hauler.Fuel = 100;

        scout.Jump(10);
        hauler.Jump(25);
        scout.Jump(10);
    }
}
`),
        answerKey:
          'Ship is the class: a blueprint saying every ship has a Name, some Fuel and a Jump method. new Ship() builds an object from it, and scout and hauler are two separate objects, each with its own Name and Fuel. Jump changes the Fuel of the object it is called on. It prints "Swift jumped. Fuel left: 20", "Mule jumped. Fuel left: 75", then "Swift jumped. Fuel left: 10" because the scout’s fuel carries on from 20.',
        markingCriteria:
          'Must explain that the class is the blueprint and each new creates a separate object with its own fields; must explain that Jump changes only the object it is called on; must give the three outputs (Swift 20, Mule 75, Swift 10).',
      },
      {
        type: 'read_and_explain',
        instructions:
          'Read Program.cs. Explain what the curly braces after new Crate do, what IsHeavy works out for each crate, and what is printed.',
        fileName: 'Program.cs',
        code: code(`
using System;
using System.Collections.Generic;

class Crate
{
    public string Contents;
    public int Weight;

    public bool IsHeavy()
    {
        return Weight > 50;
    }
}

class Program
{
    static void Main()
    {
        List<Crate> hold = new List<Crate>();
        hold.Add(new Crate { Contents = "ore", Weight = 80 });
        hold.Add(new Crate { Contents = "seeds", Weight = 5 });

        foreach (Crate crate in hold)
        {
            if (crate.IsHeavy())
            {
                Console.WriteLine($"{crate.Contents}: use the loader");
            }
            else
            {
                Console.WriteLine($"{crate.Contents}: carry by hand");
            }
        }
    }
}
`),
        answerKey:
          'new Crate { Contents = "ore", Weight = 80 } creates a crate and sets its fields in one step (an object initialiser). The list holds two Crate objects. IsHeavy uses the Weight of whichever crate it is called on: 80 > 50 is true for the ore, 5 > 50 is false for the seeds. It prints "ore: use the loader" then "seeds: carry by hand".',
        markingCriteria:
          'Must explain that the braces set the new object’s fields as it is created; must explain that IsHeavy checks the weight of the crate it is called on; must give the outputs "ore: use the loader" and "seeds: carry by hand".',
      },
      {
        type: 'bug_hunt',
        instructions:
          'The left turret was meant to fire twice, leaving it with 8 shots and the right turret untouched at 10. Instead both read 9. Find the line with the bug and explain what goes wrong.',
        fileName: 'Program.cs',
        code: code(`
using System;

class Turret
{
    public string Name;
    public int Ammo;

    public void Fire()
    {
        Ammo--;
    }
}

class Program
{
    static void Main()
    {
        Turret left = new Turret();
        left.Name = "Left turret";
        left.Ammo = 10;

        Turret right = new Turret();
        right.Name = "Right turret";
        right.Ammo = 10;

        // The left turret fires twice
        left.Fire();
        right.Fire();

        Console.WriteLine($"{left.Name}: {left.Ammo}");
        Console.WriteLine($"{right.Name}: {right.Ammo}");
    }
}
`),
        answerKey:
          'Each Turret object has its own Ammo, and Fire only changes the object it is called on. The second shot is called on right instead of left, so each turret fires once and both end on 9. It should be left.Fire() again, leaving left on 8 and right on 10.',
        markingCriteria:
          'Must identify the second Fire call and explain that it is called on the wrong object (right instead of left), and that each object keeps its own Ammo; should say it should call left.Fire().',
        bugLine: 28,
        bugLineContains: 'right.Fire();',
      },
    ],
  },
  {
    key: 'shipyard-assembly',
    title: 'Shipyard Assembly',
    concept: 'Constructors',
    difficulty: 'medium',
    isSideQuest: false,
    storyText:
      'Half-built ships keep rolling off the line with no name and no crew because someone forgot to fill them in. Learn how constructors make sure every object is set up properly the moment it’s created.',
    xpReward: 150,
    prerequisites: ['blueprint-bay'],
    briefing: briefing('shipyard-assembly'),
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read Program.cs. Explain when the Ship constructor runs, what it sets up, and everything the program prints, in order.',
        fileName: 'Program.cs',
        code: code(`
using System;

class Ship
{
    public string Name;
    public int Crew;
    public int Fuel;

    public Ship(string name, int crew)
    {
        Name = name;
        Crew = crew;
        Fuel = 100;
        Console.WriteLine($"{Name} built with {Crew} crew");
    }
}

class Program
{
    static void Main()
    {
        Ship kestrel = new Ship("Kestrel", 6);
        Ship osprey = new Ship("Osprey", 3);
        osprey.Fuel -= 40;

        Console.WriteLine($"{kestrel.Name} fuel: {kestrel.Fuel}");
        Console.WriteLine($"{osprey.Name} fuel: {osprey.Fuel}");
    }
}
`),
        answerKey:
          'The constructor has the same name as the class and runs automatically each time new Ship(...) is used. It copies the name and crew it is given into the fields, starts every ship with 100 fuel, and prints a message. So it prints "Kestrel built with 6 crew" and "Osprey built with 3 crew" as the ships are created. Only the Osprey then burns 40 fuel, so it prints "Kestrel fuel: 100" and "Osprey fuel: 60".',
        markingCriteria:
          'Must explain that the constructor runs automatically on each new and sets up the fields from its arguments (with Fuel starting at 100); must give the four outputs in order: the two "built" messages, then Kestrel fuel 100 and Osprey fuel 60.',
      },
      {
        type: 'read_and_explain',
        instructions:
          'Read Program.cs. There are three Probe constructors. Explain what : this(...) does, which constructors run for a, b and c, and what is printed.',
        fileName: 'Program.cs',
        code: code(`
using System;

class Probe
{
    public string Target;
    public int Range;

    public Probe(string target, int range)
    {
        this.Target = target;
        this.Range = range;
    }

    public Probe(string target) : this(target, 500)
    {
    }

    public Probe() : this("deep space")
    {
    }
}

class Program
{
    static void Main()
    {
        Probe a = new Probe("Titan", 120);
        Probe b = new Probe("Europa");
        Probe c = new Probe();

        Console.WriteLine($"{a.Target} {a.Range}");
        Console.WriteLine($"{b.Target} {b.Range}");
        Console.WriteLine($"{c.Target} {c.Range}");
    }
}
`),
        answerKey:
          'The constructors are overloaded, and C# picks one by the arguments. : this(...) makes a constructor call another constructor of the same class first, so the setting-up code is only written once. a uses the two-argument constructor directly: Titan 120. b uses the one-argument constructor, which passes Europa and 500 on to the full one: Europa 500. c uses the empty constructor, which passes "deep space" to the one-argument constructor, which adds 500: deep space 500.',
        markingCriteria:
          'Must explain that : this(...) chains to another constructor so the set-up code lives in one place; must trace which constructors run for each probe; must give the outputs "Titan 120", "Europa 500" and "deep space 500".',
      },
      {
        type: 'bug_hunt',
        instructions:
          'The rescue beacon should report itself as \'Rescue\' on 121 MHz, but its label comes out empty. Find the line with the bug and explain what goes wrong.',
        fileName: 'Program.cs',
        code: code(`
using System;

class Beacon
{
    public string label;
    public int frequency;

    public Beacon(string label, int frequency)
    {
        label = label;
        this.frequency = frequency;
    }
}

class Program
{
    static void Main()
    {
        Beacon beacon = new Beacon("Rescue", 121);
        Console.WriteLine($"Beacon '{beacon.label}' on {beacon.frequency} MHz");
    }
}
`),
        answerKey:
          'The parameter has the same name as the field, so inside the constructor label means the parameter. label = label copies the parameter onto itself and the field is never set, so it stays empty (null). It needs this.label = label, as the frequency line already does, so the value goes into the object’s field.',
        markingCriteria:
          'Must identify the label assignment in the constructor and explain that the parameter hides the field, so the field is never set; should suggest this.label = label.',
        bugLine: 10,
        bugLineContains: 'label = label;',
      },
    ],
  },
  {
    key: 'sealed-hatches',
    title: 'Sealed Hatches',
    concept: 'Encapsulation',
    difficulty: 'medium',
    isSideQuest: false,
    storyText:
      'Anyone aboard can reach into the ship’s systems and set the reactor to any number they like, and last week someone set it to minus four hundred. Learn the first pillar of OOP: seal the data inside the object and only let it change through doors you control.',
    xpReward: 175,
    prerequisites: ['shipyard-assembly'],
    briefing: briefing('sealed-hatches'),
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read Program.cs. Explain why level is private, what the Level property’s get and set do, and what the three lines print.',
        fileName: 'Program.cs',
        code: code(`
using System;

class FuelTank
{
    private int level;

    public int Level
    {
        get { return level; }
        set
        {
            if (value < 0) level = 0;
            else if (value > 100) level = 100;
            else level = value;
        }
    }
}

class Program
{
    static void Main()
    {
        FuelTank tank = new FuelTank();
        tank.Level = 70;
        Console.WriteLine(tank.Level);
        tank.Level = 250;
        Console.WriteLine(tank.Level);
        tank.Level = -30;
        Console.WriteLine(tank.Level);
    }
}
`),
        answerKey:
          'level is private, so code outside FuelTank cannot touch it directly; the only way in is the public Level property. get hands back the current level. set runs whenever something is assigned to Level, with the new number in value, and keeps it between 0 and 100. So 70 is stored as is and prints 70, 250 is capped and prints 100, and -30 is raised to 0 and prints 0.',
        markingCriteria:
          'Must explain that the private field can only be reached through the public property, that get returns it and set receives the new number as value; must give the outputs 70, 100 and 0, explaining the clamping.',
      },
      {
        type: 'read_and_explain',
        instructions:
          'Read Program.cs. Explain what { get; } and { get; private set; } allow, how Deposit and Withdraw protect Credits, and what the three lines print.',
        fileName: 'Program.cs',
        code: code(`
using System;

class Vault
{
    public string Owner { get; }
    public int Credits { get; private set; }

    public Vault(string owner)
    {
        Owner = owner;
    }

    public void Deposit(int amount)
    {
        if (amount > 0) Credits += amount;
    }

    public bool Withdraw(int amount)
    {
        if (amount > Credits) return false;
        Credits -= amount;
        return true;
    }
}

class Program
{
    static void Main()
    {
        Vault vault = new Vault("Vega");
        vault.Deposit(200);
        vault.Deposit(-50);
        Console.WriteLine(vault.Withdraw(500));
        Console.WriteLine(vault.Withdraw(80));
        Console.WriteLine($"{vault.Owner}: {vault.Credits}");
    }
}
`),
        answerKey:
          'Owner { get; } can be read by anyone but only set in the constructor, so the owner can never change. Credits { get; private set; } can be read by anyone but only changed by Vault’s own methods. Deposit ignores amounts that are not positive, so the -50 does nothing and Credits is 200. Withdraw(500) asks for more than there is, so it refuses and prints False. Withdraw(80) succeeds and prints True, leaving 120. The last line prints "Vega: 120".',
        markingCriteria:
          'Must explain that get-only properties are read-only after construction and private set means only the class can change the value; must explain that Deposit rejects the negative amount and Withdraw refuses to overdraw; must give the outputs False, True and "Vega: 120".',
      },
      {
        type: 'bug_hunt',
        instructions:
          'A shield should never go above 100%, but after a recharge the display reads 130%. Find the line with the bug and explain what goes wrong.',
        fileName: 'Program.cs',
        code: code(`
using System;

class Shield
{
    private int strength;

    public int Strength
    {
        get { return strength; }
        set
        {
            if (value >= 0 && value <= 100)
            {
                strength = value;
            }
        }
    }

    public void Recharge()
    {
        strength += 40;
    }
}

class Program
{
    static void Main()
    {
        Shield shield = new Shield();
        shield.Strength = 90;
        shield.Recharge();
        Console.WriteLine($"Shield: {shield.Strength}%");
    }
}
`),
        answerKey:
          'The Strength property only accepts values from 0 to 100, but Recharge changes the private field strength directly, skipping that check. 90 + 40 is stored as 130. Recharge should go through the property (Strength += 40, which the setter would reject) or cap the result at 100, so the rule is enforced everywhere.',
        markingCriteria:
          'Must identify the change inside Recharge and explain that it writes the private field directly and so bypasses the property’s 0 to 100 check; should suggest going through the property or capping at 100.',
        bugLine: 21,
        bugLineContains: 'strength += 40;',
      },
    ],
  },
  {
    key: 'fleet-registry',
    title: 'Fleet Registry',
    concept: 'Static members',
    difficulty: 'medium',
    isSideQuest: true,
    storyText:
      'Fleet Command wants to know how many fighters have rolled off the line, but every fighter only knows about itself. Learn the difference between what belongs to each object and what belongs to the whole class.',
    xpReward: 120,
    prerequisites: ['shipyard-assembly'],
    briefing: briefing('fleet-registry'),
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read Program.cs. Explain the difference between Built and Callsign, how Built reaches 3, and what the three lines print.',
        fileName: 'Program.cs',
        code: code(`
using System;

class Fighter
{
    public static int Built = 0;
    public string Callsign;

    public Fighter(string callsign)
    {
        Callsign = callsign;
        Built++;
    }

    public static string Motto()
    {
        return "Fly true";
    }
}

class Program
{
    static void Main()
    {
        Fighter a = new Fighter("Red 1");
        Fighter b = new Fighter("Red 2");
        Fighter c = new Fighter("Gold 5");

        Console.WriteLine(Fighter.Built);
        Console.WriteLine(b.Callsign);
        Console.WriteLine(Fighter.Motto());
    }
}
`),
        answerKey:
          'Callsign is an instance field: every Fighter object has its own. Built is static: there is only one, shared by the whole class. Each constructor call adds one to that shared count, so after three fighters it is 3. Static members are used through the class name, so it prints 3, then b’s own callsign "Red 2", then "Fly true" from the static Motto method, which is called without any object.',
        markingCriteria:
          'Must explain that static members belong to the class (one shared copy) while instance fields belong to each object; must explain that every constructor call increments the shared count; must give the outputs 3, "Red 2" and "Fly true".',
      },
      {
        type: 'read_and_explain',
        instructions:
          'Read Program.cs. Explain what a static class is, how NavMath and Math are used without creating objects, and what the three lines print.',
        fileName: 'Program.cs',
        code: code(`
using System;

static class NavMath
{
    public const double LightSpeed = 299792.458;

    public static double TravelSeconds(double km)
    {
        return km / LightSpeed;
    }
}

class Program
{
    static void Main()
    {
        double seconds = NavMath.TravelSeconds(599584.916);
        Console.WriteLine(seconds);
        Console.WriteLine(Math.Max(12, 30));
        Console.WriteLine(Math.Round(2.6));
    }
}
`),
        answerKey:
          'A static class only holds static members and can never be created with new; it is a toolbox of shared values and methods used through the class name. NavMath.TravelSeconds divides the distance by the speed of light: 599584.916 is exactly twice LightSpeed, so it prints 2. Math is a built-in static class that works the same way: Math.Max(12, 30) prints the larger value, 30, and Math.Round(2.6) prints 3.',
        markingCriteria:
          'Must explain that a static class cannot be instantiated and its members are used through the class name; must give the outputs 2, 30 and 3, and say Math is a static class used the same way.',
      },
      {
        type: 'bug_hunt',
        instructions:
          'Vega has flown two missions and Orion one, but the log credits both pilots with 3 missions. Find the line with the bug and explain what goes wrong.',
        fileName: 'Program.cs',
        code: code(`
using System;

class Pilot
{
    public string Name;
    public static int Missions;

    public Pilot(string name)
    {
        Name = name;
    }

    public void CompleteMission()
    {
        Missions++;
    }
}

class Program
{
    static void Main()
    {
        Pilot vega = new Pilot("Vega");
        Pilot orion = new Pilot("Orion");

        vega.CompleteMission();
        vega.CompleteMission();
        orion.CompleteMission();

        Console.WriteLine($"{vega.Name}: {Pilot.Missions} missions");
        Console.WriteLine($"{orion.Name}: {Pilot.Missions} missions");
    }
}
`),
        answerKey:
          'Missions is static, so there is a single count shared by every pilot. All three CompleteMission calls add to that one number, which reaches 3, and both lines print it. Missions should be an instance field (without static), so each pilot keeps their own count, and the log should read vega.Missions and orion.Missions.',
        markingCriteria:
          'Must identify the Missions field and explain that static makes one count shared by all pilots; should suggest making it an instance field so each pilot has their own.',
        bugLine: 6,
        bugLineContains: 'public static int Missions;',
      },
    ],
  },
  {
    key: 'twin-ships',
    title: 'Twin Ships',
    concept: 'Value and reference types',
    difficulty: 'hard',
    isSideQuest: true,
    storyText:
      'Engineers renamed a ship in the simulator and the real ship’s name changed too, yet changing a copy of its coordinates did nothing at all. Learn why some variables hold their own copy and others point at a shared object.',
    xpReward: 150,
    prerequisites: ['sealed-hatches'],
    briefing: briefing('twin-ships'),
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read Program.cs. Coordinates is a struct and Ship is a class. Explain what the two lines print, and why changing copy and alias have such different effects.',
        fileName: 'Program.cs',
        code: code(`
using System;

struct Coordinates
{
    public int X;
    public int Y;
}

class Ship
{
    public string Name;
}

class Program
{
    static void Main()
    {
        Coordinates home = new Coordinates { X = 1, Y = 2 };
        Coordinates copy = home;
        copy.X = 50;

        Ship original = new Ship { Name = "Kestrel" };
        Ship alias = original;
        alias.Name = "Renamed";

        Console.WriteLine(home.X);
        Console.WriteLine(original.Name);
    }
}
`),
        answerKey:
          'A struct is a value type: copy = home copies the whole value, so copy is a separate Coordinates and changing it leaves home alone. home.X still prints 1. A class is a reference type: alias = original copies only the reference, so both variables point at the same Ship object. Renaming it through alias renames the one ship, so original.Name prints Renamed.',
        markingCriteria:
          'Must explain that assigning a struct copies the value (two independent copies) while assigning a class copies the reference (both variables point at one object); must give the outputs 1 and Renamed.',
      },
      {
        type: 'read_and_explain',
        instructions:
          'Read Program.cs. Explain why the first AddWeight call has no lasting effect but the second does, and what the three lines print.',
        fileName: 'Program.cs',
        code: code(`
using System;

class Cargo
{
    public int Weight;
}

class Program
{
    static void AddWeight(int weight)
    {
        weight += 10;
    }

    static void AddWeight(Cargo cargo)
    {
        cargo.Weight += 10;
    }

    static void Main()
    {
        int loose = 5;
        Cargo crate = new Cargo { Weight = 5 };

        AddWeight(loose);
        AddWeight(crate);
        Console.WriteLine(loose);
        Console.WriteLine(crate.Weight);

        Cargo missing = null;
        Console.WriteLine(missing == null);
    }
}
`),
        answerKey:
          'int is a value type, so the first AddWeight gets a copy of loose and only changes the copy; loose is still 5. Cargo is a class, so the second AddWeight gets a copy of the reference, which still points at the same crate object, and changes that object: its Weight becomes 15. missing is a reference that points at no object at all (null), so missing == null prints True. It prints 5, 15 and True.',
        markingCriteria:
          'Must explain that passing an int passes a copy while passing an object passes a reference to the same object, so only the crate changes; must explain that null means no object; must give the outputs 5, 15 and True.',
      },
      {
        type: 'bug_hunt',
        instructions:
          'Reading the Heron’s engine power should print 80, but the program crashes with a NullReferenceException. Find the line where the problem starts and explain what goes wrong.',
        fileName: 'Program.cs',
        code: code(`
using System;

class Engine
{
    public int Power = 80;
}

class Ship
{
    public string Name;
    public Engine Engine;

    public Ship(string name)
    {
        Name = name;
        Engine engine = new Engine();
    }
}

class Program
{
    static void Main()
    {
        Ship ship = new Ship("Heron");
        Console.WriteLine($"{ship.Name} engine power: {ship.Engine.Power}");
    }
}
`),
        answerKey:
          'The constructor creates an Engine but stores it in a new local variable called engine, which disappears when the constructor ends. The ship’s Engine field is never set, so it stays null, and reading ship.Engine.Power tries to use an object that does not exist, which throws a NullReferenceException. It should assign the field: Engine = new Engine(); (or the field could be created where it is declared, public Engine Engine = new Engine();).',
        markingCriteria:
          'Must identify the engine line in the constructor and explain that it creates a local variable instead of setting the Engine field, which stays null; must connect that to the NullReferenceException; should suggest a fix that gives the field an Engine (assigning it in the constructor, or creating it where the field is declared).',
        bugLine: 16,
        bugLineContains: 'Engine engine = new Engine();',
        // Creating the engine where the field is declared fixes it there
        altBugLines: [11],
      },
    ],
  },
  {
    key: 'ship-lineage',
    title: 'Ship Lineage',
    concept: 'Inheritance',
    difficulty: 'hard',
    isSideQuest: false,
    storyText:
      'Freighters, fighters and frigates all copy the same hull code, and every bug fix has to be made three times. Learn the second pillar of OOP: build specialised ships on top of one shared base.',
    xpReward: 200,
    prerequisites: ['sealed-hatches'],
    briefing: briefing('ship-lineage'),
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read Program.cs. Explain what Freighter gets from Vessel, what : base(name) and protected do, and what the two lines print.',
        fileName: 'Program.cs',
        code: code(`
using System;

class Vessel
{
    public string Name;
    protected int hull = 100;

    public Vessel(string name)
    {
        Name = name;
    }

    public void Report()
    {
        Console.WriteLine($"{Name}: hull {hull}");
    }
}

class Freighter : Vessel
{
    public int CargoSpace;

    public Freighter(string name, int cargoSpace) : base(name)
    {
        CargoSpace = cargoSpace;
        hull = 150;
    }
}

class Program
{
    static void Main()
    {
        Freighter mule = new Freighter("Mule", 400);
        mule.Report();
        Console.WriteLine(mule.CargoSpace);
    }
}
`),
        answerKey:
          'Freighter : Vessel means a Freighter is a Vessel: it inherits Name, hull and Report, and adds its own CargoSpace. : base(name) runs Vessel’s constructor first, which sets the Name. hull is protected, so it is hidden from outside code but can be used by classes that inherit from Vessel, which is why Freighter can set it to 150. mule.Report() is Vessel’s inherited method, using the freighter’s values, so it prints "Mule: hull 150", then 400.',
        markingCriteria:
          'Must explain that Freighter inherits Vessel’s members (Name, hull, Report) and adds CargoSpace; must explain that base(name) passes the name to Vessel’s constructor and that protected lets derived classes use hull; must give the outputs "Mule: hull 150" and 400.',
      },
      {
        type: 'read_and_explain',
        instructions:
          'Read Program.cs. Explain the order the three constructor messages appear in, and why the last line prints True.',
        fileName: 'Program.cs',
        code: code(`
using System;

class Craft
{
    public Craft()
    {
        Console.WriteLine("Frame assembled");
    }
}

class Fighter : Craft
{
    public Fighter()
    {
        Console.WriteLine("Weapons fitted");
    }
}

class Interceptor : Fighter
{
    public Interceptor()
    {
        Console.WriteLine("Afterburners installed");
    }
}

class Program
{
    static void Main()
    {
        Interceptor jet = new Interceptor();
        Craft asCraft = jet;
        Console.WriteLine(asCraft is Fighter);
    }
}
`),
        answerKey:
          'Creating an Interceptor runs the constructors from the base downwards: each constructor first runs its base class’s constructor. So it prints "Frame assembled" (Craft), then "Weapons fitted" (Fighter), then "Afterburners installed" (Interceptor). An Interceptor is a Fighter, which is a Craft, so it can be stored in a Craft variable. The object itself is still an Interceptor, so asCraft is Fighter is true and it prints True.',
        markingCriteria:
          'Must explain that base constructors run first, giving the order Frame assembled, Weapons fitted, Afterburners installed; must explain the "is-a" chain, so the object can be held as a Craft and is still a Fighter, printing True.',
      },
      {
        type: 'bug_hunt',
        instructions:
          'The new outpost should report "Theta has 2 docks", but every outpost reports itself as "Outpost". Find the line with the bug and explain what goes wrong.',
        fileName: 'Program.cs',
        code: code(`
using System;

class Station
{
    public string Name;
    public int Docks;

    public Station(string name, int docks)
    {
        Name = name;
        Docks = docks;
    }
}

class Outpost : Station
{
    public bool Shielded;

    public Outpost(string name, bool shielded) : base("Outpost", 2)
    {
        Shielded = shielded;
    }
}

class Program
{
    static void Main()
    {
        Outpost theta = new Outpost("Theta", true);
        Console.WriteLine($"{theta.Name} has {theta.Docks} docks");
    }
}
`),
        answerKey:
          'The Outpost constructor passes the fixed text "Outpost" to the base constructor instead of the name it was given, so Station sets Name to "Outpost" for every outpost and the name parameter is never used. It should pass the parameter on: : base(name, 2).',
        markingCriteria:
          'Must identify the Outpost constructor’s base call and explain that it passes the text "Outpost" instead of the name parameter, so the given name is ignored; should suggest base(name, 2).',
        bugLine: 19,
        bugLineContains: ': base("Outpost", 2)',
      },
    ],
  },
  {
    key: 'many-hulls',
    title: 'Many Hulls',
    concept: 'Polymorphism',
    difficulty: 'hard',
    isSideQuest: false,
    storyText:
      'The fleet commander wants to give one order, "attack", and have every ship respond in its own way. Learn the third pillar of OOP: one call, many behaviours, decided by the object that receives it.',
    xpReward: 200,
    prerequisites: ['ship-lineage'],
    briefing: briefing('many-hulls'),
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read Program.cs. Explain what virtual and override do, why the same ship.Attack() call prints three different things, and what base.Attack() adds.',
        fileName: 'Program.cs',
        code: code(`
using System;
using System.Collections.Generic;

class Ship
{
    public virtual string Attack()
    {
        return "fires a warning shot";
    }
}

class Fighter : Ship
{
    public override string Attack()
    {
        return "fires lasers";
    }
}

class Bomber : Ship
{
    public override string Attack()
    {
        return "drops payload, then " + base.Attack();
    }
}

class Program
{
    static void Main()
    {
        List<Ship> fleet = new List<Ship> { new Ship(), new Fighter(), new Bomber() };
        foreach (Ship ship in fleet)
        {
            Console.WriteLine(ship.Attack());
        }
    }
}
`),
        answerKey:
          'virtual marks Ship’s Attack as a method derived classes may replace, and override provides the replacement. Every item in the list is held as a Ship, but at run time C# calls the version belonging to the actual object. So it prints "fires a warning shot" for the plain Ship, "fires lasers" for the Fighter, and for the Bomber "drops payload, then fires a warning shot", because base.Attack() calls Ship’s original version and adds its result.',
        markingCriteria:
          'Must explain virtual (can be replaced) and override (the replacement), and that the version run depends on the actual object, not the Ship variable; must explain that base.Attack() reuses the original; must give the three outputs.',
      },
      {
        type: 'read_and_explain',
        instructions:
          'Read Program.cs. Explain how TotalLoadTime adds up the load times without knowing which kind of cargo each crate is, and what it prints.',
        fileName: 'Program.cs',
        code: code(`
using System;

class Cargo
{
    public virtual int LoadTime() { return 10; }
}

class Fragile : Cargo
{
    public override int LoadTime() { return 25; }
}

class Hazardous : Cargo
{
    public override int LoadTime() { return base.LoadTime() * 3; }
}

class Program
{
    static int TotalLoadTime(Cargo[] crates)
    {
        int total = 0;
        foreach (Cargo crate in crates)
        {
            total += crate.LoadTime();
        }
        return total;
    }

    static void Main()
    {
        Cargo[] hold = { new Cargo(), new Fragile(), new Hazardous(), new Fragile() };
        Console.WriteLine(TotalLoadTime(hold));
    }
}
`),
        answerKey:
          'TotalLoadTime only knows it has Cargo, but each crate.LoadTime() call runs the override for that crate’s actual type: plain cargo takes 10, fragile 25, and hazardous takes the base 10 times 3, which is 30. The total is 10 + 25 + 30 + 25, so it prints 90. A new kind of cargo could be added without changing TotalLoadTime at all.',
        markingCriteria:
          'Must explain that each LoadTime call runs the version for the crate’s real type even though the method only sees Cargo; must work out hazardous as 30 and give the total 90.',
      },
      {
        type: 'bug_hunt',
        instructions:
          'A repair drone stored as a Drone should report "Repairing hull", but it reports "Drone idle". Find the line with the bug and explain what goes wrong.',
        fileName: 'Program.cs',
        code: code(`
using System;

class Drone
{
    public virtual string Status()
    {
        return "Drone idle";
    }
}

class RepairDrone : Drone
{
    public new string Status()
    {
        return "Repairing hull";
    }
}

class Program
{
    static void Main()
    {
        Drone drone = new RepairDrone();
        Console.WriteLine(drone.Status());
    }
}
`),
        answerKey:
          'RepairDrone’s Status is marked new instead of override. new does not replace the virtual method; it hides it with a separate, unrelated method that is only used when the variable’s type is RepairDrone. drone is a Drone variable, so Drone’s own Status runs and prints "Drone idle". Using override makes the call run RepairDrone’s version whatever the variable type.',
        markingCriteria:
          'Must identify the Status declaration in RepairDrone and explain that new hides the method instead of overriding it, so calls through a Drone variable still run the base version; should suggest override.',
        bugLine: 13,
        bugLineContains: 'public new string Status()',
      },
    ],
  },
  {
    key: 'blueprint-prime',
    title: 'Blueprint Prime',
    concept: 'Abstraction',
    difficulty: 'hard',
    isSideQuest: false,
    storyText:
      'Someone built a "generic sensor" straight from the base blueprint and bolted it to the hull. It measures nothing. Learn the fourth pillar of OOP: define what every sensor must do without pretending to know how.',
    xpReward: 200,
    prerequisites: ['many-hulls'],
    briefing: briefing('blueprint-prime'),
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read Program.cs. Explain what abstract means on the class and on Read, how Report can use Read without knowing how it works, and what is printed.',
        fileName: 'Program.cs',
        code: code(`
using System;

abstract class Sensor
{
    public string Name;

    public Sensor(string name)
    {
        Name = name;
    }

    public abstract double Read();

    public void Report()
    {
        Console.WriteLine($"{Name}: {Read()}");
    }
}

class Thermometer : Sensor
{
    public Thermometer() : base("Temperature") { }
    public override double Read() { return -40.5; }
}

class Geiger : Sensor
{
    public Geiger() : base("Radiation") { }
    public override double Read() { return 0.3; }
}

class Program
{
    static void Main()
    {
        Sensor[] sensors = { new Thermometer(), new Geiger() };
        foreach (Sensor sensor in sensors) sensor.Report();
    }
}
`),
        answerKey:
          'An abstract class is an unfinished blueprint: you cannot create a Sensor itself, only classes that inherit from it. Read is abstract, so it has no body and every derived class must override it. Report is a normal method written once in Sensor; it calls Read, trusting each sensor to supply its own version. It prints "Temperature: -40.5" then "Radiation: 0.3".',
        markingCriteria:
          'Must explain that an abstract class cannot be created directly and that an abstract method has no body and must be overridden; must explain that Report relies on each subclass’s Read; must give the outputs "Temperature: -40.5" and "Radiation: 0.3".',
      },
      {
        type: 'read_and_explain',
        instructions:
          'Read Program.cs. Explain what the abstract Reward property requires, how Brief uses it, what is printed, and what would happen if the commented-out line were put back.',
        fileName: 'Program.cs',
        code: code(`
using System;

abstract class Mission
{
    public abstract int Reward { get; }

    public string Brief()
    {
        if (Reward >= 500) return "High-value mission";
        return "Routine mission";
    }
}

class Escort : Mission
{
    public override int Reward => 300;
}

class Rescue : Mission
{
    public override int Reward => 750;
}

class Program
{
    static void Main()
    {
        Mission first = new Escort();
        Mission second = new Rescue();
        Console.WriteLine($"{first.Brief()} ({first.Reward})");
        Console.WriteLine($"{second.Brief()} ({second.Reward})");
        // Mission third = new Mission();
    }
}
`),
        answerKey:
          'Every kind of Mission must say what its Reward is, because the property is abstract; Escort and Rescue each override it with a fixed value (=> returns the value). Brief, written once in Mission, uses whichever Reward the actual object has. It prints "Routine mission (300)" and "High-value mission (750)". Putting the commented line back would not compile, because an abstract class cannot be created with new.',
        markingCriteria:
          'Must explain that each subclass must provide Reward and that Brief uses the actual object’s value; must give both outputs; must say that new Mission() would be a compile error because Mission is abstract.',
      },
      {
        type: 'bug_hunt',
        instructions:
          'Every weapon is supposed to define its own damage. The railgun fires for 0 because nobody gave it any, and nothing warned the engineers. Find the line that let this slip through and explain how abstraction would have caught it.',
        fileName: 'Program.cs',
        code: code(`
using System;

abstract class Weapon
{
    public virtual int Damage()
    {
        return 0;
    }

    public void Fire()
    {
        Console.WriteLine($"Hits for {Damage()}");
    }
}

class Laser : Weapon
{
    public override int Damage() { return 30; }
}

class Railgun : Weapon
{
    public int Charge = 3;
}

class Program
{
    static void Main()
    {
        new Laser().Fire();
        new Railgun().Fire();
    }
}
`),
        answerKey:
          'Damage is virtual with a default body that returns 0, so a weapon that forgets to override it still compiles and quietly uses 0. That is what happened to Railgun. If Damage were declared abstract (public abstract int Damage(); with no body), the compiler would refuse to build Railgun until it provided its own Damage, so the mistake could never reach the ship.',
        markingCriteria:
          'Must identify the Damage declaration in Weapon and explain that its default return of 0 lets a subclass skip overriding it without any warning; must explain that making it abstract forces every weapon to implement it, caught at compile time.',
        bugLine: 5,
        bugLineContains: 'public virtual int Damage()',
      },
    ],
  },
  {
    key: 'docking-protocols',
    title: 'Docking Protocols',
    concept: 'Interfaces',
    difficulty: 'hard',
    isSideQuest: false,
    storyText:
      'Shuttles, tankers and alien probes all want to dock, and they share nothing except that they can dock. Learn how interfaces describe what an object can do, whatever family it comes from.',
    xpReward: 200,
    prerequisites: ['blueprint-prime'],
    briefing: briefing('docking-protocols'),
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read Program.cs. Explain what it means for Shuttle to implement both interfaces, what each call prints, and why dockable.Refuel(40) would not compile.',
        fileName: 'Program.cs',
        code: code(`
using System;

interface IDockable
{
    string DockingCode { get; }
    void Dock(string station);
}

interface IRefuelable
{
    void Refuel(int amount);
}

class Shuttle : IDockable, IRefuelable
{
    public string DockingCode => "SH-12";
    public int Fuel = 10;

    public void Dock(string station)
    {
        Console.WriteLine($"Shuttle docking at {station} with code {DockingCode}");
    }

    public void Refuel(int amount)
    {
        Fuel += amount;
        Console.WriteLine($"Fuel now {Fuel}");
    }
}

class Program
{
    static void Main()
    {
        Shuttle shuttle = new Shuttle();
        IDockable dockable = shuttle;
        IRefuelable tanker = shuttle;

        dockable.Dock("Theta");
        tanker.Refuel(40);
    }
}
`),
        answerKey:
          'An interface is a contract listing members without code. By writing : IDockable, IRefuelable, Shuttle promises to provide everything both list, and it does. The same shuttle can then be held through either interface: dockable.Dock("Theta") prints "Shuttle docking at Theta with code SH-12" and tanker.Refuel(40) prints "Fuel now 50". dockable.Refuel(40) would not compile because a variable of type IDockable only exposes what IDockable promises, which does not include Refuel.',
        markingCriteria:
          'Must explain that implementing an interface is a promise to provide its members, and that a class can implement several; must give both outputs; must explain that an IDockable variable only allows IDockable members, so Refuel is not available through it.',
      },
      {
        type: 'read_and_explain',
        instructions:
          'Read Program.cs. Explain how Log can accept an Asteroid and a Derelict when they share no base class, what is printed, and what would happen if the commented-out line were put back.',
        fileName: 'Program.cs',
        code: code(`
using System;

interface IScannable
{
    string Scan();
}

class Asteroid : IScannable
{
    public string Scan() { return "Iron-rich asteroid"; }
}

class Derelict : IScannable
{
    public string Scan() { return "Abandoned freighter, no life signs"; }
}

class Planet
{
    public string Name = "Kepler-9b";
}

class Program
{
    static void Log(IScannable target)
    {
        Console.WriteLine($"Scan result: {target.Scan()}");
    }

    static void Main()
    {
        Log(new Asteroid());
        Log(new Derelict());
        // Log(new Planet());
    }
}
`),
        answerKey:
          'Log asks for an IScannable, so it accepts any object whose class implements that interface, however unrelated the classes are otherwise. Asteroid and Derelict both implement it, so it prints "Scan result: Iron-rich asteroid" and "Scan result: Abandoned freighter, no life signs". Planet does not implement IScannable, so passing it to Log would be a compile error.',
        markingCriteria:
          'Must explain that Log accepts anything implementing IScannable, regardless of class family; must give the two outputs; must say that passing a Planet would not compile because it does not implement the interface.',
      },
      {
        type: 'bug_hunt',
        instructions:
          'The shuttle has a perfectly good Launch method, yet the hangar reports "This craft can\'t be launched". Find the line with the bug and explain what goes wrong.',
        fileName: 'Program.cs',
        code: code(`
using System;

interface IDockable
{
    void Dock();
}

interface ILaunchable
{
    void Launch();
}

class Shuttle : IDockable
{
    public void Dock() { Console.WriteLine("Shuttle docked"); }
    public void Launch() { Console.WriteLine("Shuttle launched"); }
}

class Program
{
    static void Prepare(object craft)
    {
        if (craft is ILaunchable launcher)
        {
            launcher.Launch();
        }
        else
        {
            Console.WriteLine("This craft can't be launched");
        }
    }

    static void Main()
    {
        Prepare(new Shuttle());
    }
}
`),
        answerKey:
          'Shuttle only declares that it implements IDockable. Having a method called Launch is not enough: C# only treats a class as ILaunchable if it says so in its declaration. So craft is ILaunchable is false and the else branch runs. The class should be declared as class Shuttle : IDockable, ILaunchable.',
        markingCriteria:
          'Must identify the Shuttle class declaration and explain that it does not list ILaunchable, so the is check fails even though a Launch method exists; should suggest adding ILaunchable to the declaration.',
        bugLine: 13,
        bugLineContains: 'class Shuttle : IDockable',
      },
    ],
  },
];
