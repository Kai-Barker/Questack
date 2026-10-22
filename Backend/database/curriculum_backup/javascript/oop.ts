import { briefingFrom, snippetFrom } from '../text.js';
import type { CurriculumQuest } from '../types.js';

// JavaScript part 3: object-oriented programming. Classes and constructors,
// the four pillars (encapsulation with #private fields, inheritance with
// extends, polymorphism, abstraction), static members, and JavaScript's take
// on interfaces: duck-typed contracts and mixins.

const briefing = briefingFrom(import.meta.url);
const snippet = snippetFrom(import.meta.url);

export const oop: CurriculumQuest[] = [
  {
    key: 'blueprint-forge',
    title: 'Blueprint Forge',
    concept: 'Classes and objects',
    difficulty: 'medium',
    isSideQuest: false,
    storyText:
      'The forge has to turn out a whole fleet, and building each ship as a one-off object is slow and error-prone. Learn how a class acts as a blueprint that new turns into as many ships as you need.',
    xpReward: 150,
    prerequisites: ['fleet-filters'],
    briefing: briefing('blueprint-forge'),
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read ships.js. Explain the difference between the Ship class and the scout and hauler objects, and what the four lines log.',
        fileName: 'ships.js',
        code: snippet('ships.js'),
        answerKey:
          'Ship is the class: a blueprint saying every ship has a name, some fuel and a jump method. new Ship() builds a new object from it, starting with the default field values ("unnamed", 0). scout and hauler are separate objects with their own name and fuel, and inside jump this is whichever ship it was called on. It logs "Swift jumped. Fuel left: 20", "Mule jumped. Fuel left: 75", "Swift jumped. Fuel left: 10" (the scout carries on from 20), and "unnamed" for a brand-new ship.',
        markingCriteria:
          'Must explain class (blueprint) versus objects made with new, each with its own fields, and that this in a method is the object it was called on; must give the four outputs.',
      },
      {
        type: 'read_and_explain',
        instructions:
          'Read crates.js. Explain what isHeavy works out for each crate, what the ? : does, and what the four lines log, including the last two.',
        fileName: 'crates.js',
        code: snippet('crates.js'),
        answerKey:
          'isHeavy checks the weight of the crate it is called on: 80 > 50 is true for the ore, 5 > 50 is false for the seeds. The ternary ? : picks the first text when the condition is true and the second when it is false, so it logs "ore: use the loader" and "seeds: carry by hand". ore instanceof Crate is true because ore was made from the Crate class. typeof Crate is "function": a class is a special kind of function underneath.',
        markingCriteria:
          'Must explain that isHeavy uses the weight of the crate it is called on and that the ternary chooses between two values; must give the outputs, including true for instanceof and "function" for typeof Crate.',
      },
      {
        type: 'bug_hunt',
        instructions:
          'Firing once should leave the turret with 9 shots, but the program crashes with "ReferenceError: ammo is not defined". Find the line with the bug and explain what goes wrong.',
        fileName: 'turret.js',
        code: snippet('turret.js'),
        answerKey:
          'Inside a method, a field has to be reached through this. ammo-- on its own looks for a variable called ammo, and there isn\'t one, so it throws a ReferenceError. It should be this.ammo--.',
        markingCriteria:
          'Must identify the line inside fire and explain that fields must be accessed with this, so plain ammo is an undefined variable; should suggest this.ammo--.',
        bugLine: 5,
        bugLineContains: 'ammo--;',
      },
    ],
  },
  {
    key: 'assembly-line',
    title: 'Assembly Line',
    concept: 'Constructors',
    difficulty: 'medium',
    isSideQuest: false,
    storyText:
      'Ships keep rolling off the assembly line half-finished: no name, no crew, no fuel. Learn how a constructor sets up every object completely the moment it\'s created.',
    xpReward: 150,
    prerequisites: ['blueprint-forge'],
    briefing: briefing('assembly-line'),
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read build.js. Explain when the constructor runs, what it sets up, and everything that is logged, in order.',
        fileName: 'build.js',
        code: snippet('build.js'),
        answerKey:
          'constructor runs automatically every time new Ship(...) is used, receiving the arguments. It stores the name and crew on the new object with this, starts every ship at 100 fuel and logs a message. So "Kestrel built with 6 crew" and "Osprey built with 3 crew" are logged as the ships are created. Only the Osprey then burns 40 fuel, so it logs "Kestrel fuel: 100" and "Osprey fuel: 60".',
        markingCriteria:
          'Must explain that the constructor runs on each new and sets up the object\'s properties with this (fuel starting at 100); must give the four outputs in order.',
      },
      {
        type: 'read_and_explain',
        instructions:
          'Read probes.js. Explain how the constructor\'s default values work, including what passing undefined does, and what the four lines log.',
        fileName: 'probes.js',
        code: snippet('probes.js'),
        answerKey:
          'The constructor parameters have defaults, used whenever an argument is missing or undefined. new Probe("Titan", 120) uses both values: "Titan 120". new Probe("Europa") leaves out range, so it is 500: "Europa 500". new Probe() uses both defaults: "deep space 500". Passing undefined counts as leaving it out, so new Probe(undefined, 50) gives "deep space 50".',
        markingCriteria:
          'Must explain that a default is used when an argument is missing or undefined; must give the four outputs: Titan 120, Europa 500, deep space 500, deep space 50.',
      },
      {
        type: 'bug_hunt',
        instructions:
          'The rescue beacon should report itself as \'Rescue\' on 121 MHz, but the label comes out as undefined. Find the line with the bug and explain what goes wrong.',
        fileName: 'beacon-label.js',
        code: snippet('beacon-label.js'),
        answerKey:
          'label = label just assigns the parameter to itself; it never puts anything on the object. Properties are created with this, so this.label is never set and reads as undefined. It should be this.label = label, as the frequency line already does.',
        markingCriteria:
          'Must identify the label assignment in the constructor and explain that without this the value is never stored on the object; should suggest this.label = label.',
        bugLine: 3,
        bugLineContains: 'label = label;',
      },
    ],
  },
  {
    key: 'sealed-vault',
    title: 'Sealed Vault',
    concept: 'Encapsulation',
    difficulty: 'medium',
    isSideQuest: false,
    storyText:
      'Any script aboard can reach into the vault and set the credits to whatever it likes. Learn the first pillar of OOP: seal the data inside the object and only let it change through doors you control.',
    xpReward: 175,
    prerequisites: ['assembly-line'],
    briefing: briefing('sealed-vault'),
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read tank.js. Explain what #level is, what the get and set level do, and what the four lines log.',
        fileName: 'tank.js',
        code: snippet('tank.js'),
        answerKey:
          '#level is a private field: only code inside the FuelTank class can read or change it. The get level and set level pair let outside code use tank.level like a normal property, but the setter runs code first, keeping the value between 0 and 100 with Math.min and Math.max. So 70 is stored as is, 250 is capped to 100 and -30 is raised to 0, logging 70, 100 and 0. Private fields don\'t show up as ordinary properties, so Object.keys(tank) logs an empty array.',
        markingCriteria:
          'Must explain that # makes the field private to the class, and that the getter and setter control access, with the setter clamping to 0–100; must give the outputs 70, 100, 0 and [].',
      },
      {
        type: 'read_and_explain',
        instructions:
          'Read vault.js. Explain how the class protects #credits, why setting vault.credits fails, and what the four lines log.',
        fileName: 'vault.js',
        code: snippet('vault.js'),
        answerKey:
          '#credits can only change through the class\'s own methods. deposit ignores amounts that aren\'t positive, so after 200 and -50 there are 200 credits. credits has a getter but no setter, so assigning to it throws an error (classes and modules run in strict mode), and the catch logs "Credits only change through deposit and withdraw". withdraw(500) asks for more than there is, so it returns false; withdraw(80) succeeds and returns true, leaving 120. The last line logs "Vega: 120".',
        markingCriteria:
          'Must explain that the private field can only change through deposit and withdraw (which reject a negative deposit and an overdraw), and that a getter with no setter can\'t be assigned; must give the four outputs in order.',
      },
      {
        type: 'bug_hunt',
        instructions:
          'Shields should never go above 100%, but after a recharge the display reads "Shield: 130%". Find the line with the bug and explain what goes wrong.',
        fileName: 'shield-recharge.js',
        code: snippet('shield-recharge.js'),
        answerKey:
          'The strength setter only accepts values from 0 to 100, but recharge changes the private field #strength directly, skipping that check, so 90 + 40 is stored as 130. recharge should go through the setter (this.strength += 40, which would be rejected) or cap the result at 100.',
        markingCriteria:
          'Must identify the change inside recharge and explain that it writes the private field directly, bypassing the setter\'s 0–100 rule; should suggest using the setter or capping at 100.',
        bugLine: 13,
        bugLineContains: 'this.#strength += 40;',
      },
    ],
  },
  {
    key: 'fleet-census',
    title: 'Fleet Census',
    concept: 'Static members',
    difficulty: 'medium',
    isSideQuest: true,
    storyText:
      'Fleet Command wants to know how many fighters have been built, but each fighter only knows about itself. Learn the difference between what belongs to each object and what belongs to the class itself.',
    xpReward: 120,
    prerequisites: ['assembly-line'],
    briefing: briefing('fleet-census'),
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read fighters.js. Explain the difference between built and callsign, and what the four lines log, including why a.built is undefined.',
        fileName: 'fighters.js',
        code: snippet('fighters.js'),
        answerKey:
          'callsign is set on each object, so every fighter has its own. built is static: it belongs to the Fighter class itself, so there is one shared count, reached as Fighter.built. Each constructor call adds one, so after three fighters it logs 3. b.callsign is "Red 2", and the static method is called on the class: Fighter.motto() logs "Fly true". Static members are not on the objects, so a.built is undefined.',
        markingCriteria:
          'Must explain that static members belong to the class (one shared copy, used through the class name) while callsign is per object; must give the outputs 3, Red 2, Fly true and undefined.',
      },
      {
        type: 'read_and_explain',
        instructions:
          'Read navmath.js. Explain how NavMath and Math are used without creating objects, and what the four lines log.',
        fileName: 'navmath.js',
        code: snippet('navmath.js'),
        answerKey:
          'NavMath only has static members, so it is used straight from the class name, like a toolbox; no object is ever made. travelSeconds divides the distance by the speed of light, and 599584.916 is exactly twice it, so it logs 2. Math is a built-in object of tools used the same way: Math.max(12, 30) gives 30, Math.round(2.5) rounds to the nearest whole number, 3, and Math.floor(7.9) rounds down to 7.',
        markingCriteria:
          'Must explain that static members are used through the class name without creating an object, and that Math works the same way; must give the outputs 2, 30, 3 and 7.',
      },
      {
        type: 'bug_hunt',
        instructions:
          'Vega has flown two missions and Orion one, but the log credits both pilots with 3. Find the line with the bug and explain what goes wrong.',
        fileName: 'pilots.js',
        code: snippet('pilots.js'),
        answerKey:
          'missions is static, so there is one count shared by every pilot, and every completeMission adds to that same number, which reaches 3. Each pilot needs their own count: missions should be an ordinary field (missions = 0), increased with this.missions++ and logged as vega.missions and orion.missions.',
        markingCriteria:
          'Must identify the static missions field (or the Pilot.missions increase) and explain that static makes one count shared by all pilots; should suggest a per-object field increased with this.',
        bugLine: 2,
        bugLineContains: 'static missions = 0;',
        altBugLines: [9],
      },
    ],
  },
  {
    key: 'bloodlines',
    title: 'Bloodlines',
    concept: 'Inheritance',
    difficulty: 'hard',
    isSideQuest: false,
    storyText:
      'Freighters, fighters and frigates all copy the same hull code, so every fix has to be made three times. Learn the second pillar of OOP: build specialised classes on top of one shared base.',
    xpReward: 200,
    prerequisites: ['sealed-vault'],
    briefing: briefing('bloodlines'),
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read freighter.js. Explain what Freighter gets from Vessel, what super(name) does, and what the three lines log.',
        fileName: 'freighter.js',
        code: snippet('freighter.js'),
        answerKey:
          'extends Vessel makes Freighter a Vessel: it inherits Vessel\'s report method and gets everything Vessel\'s constructor sets up. super(name) runs Vessel\'s constructor, which sets the name and a hull of 100; Freighter then adds cargoSpace and raises hull to 150. mule.report() runs the inherited method with the freighter\'s values, logging "Mule: hull 150", then 400. A freighter is both a Freighter and a Vessel, so the last line logs true true.',
        markingCriteria:
          'Must explain that extends inherits the parent\'s methods and that super(name) runs the parent constructor; must give the outputs "Mule: hull 150", 400 and true true.',
      },
      {
        type: 'read_and_explain',
        instructions:
          'Read assembly-order.js. Explain the order the three messages appear in, and why the last line logs true.',
        fileName: 'assembly-order.js',
        code: snippet('assembly-order.js'),
        answerKey:
          'Each constructor calls super() first, which runs its parent\'s constructor before carrying on. Creating an Interceptor therefore runs Craft\'s constructor, then Fighter\'s, then Interceptor\'s, logging "Frame assembled", "Weapons fitted", "Afterburners installed". An Interceptor is a Fighter, which is a Craft, so jet instanceof Craft is true.',
        markingCriteria:
          'Must explain that super() runs the parent constructor first, giving the order Frame assembled, Weapons fitted, Afterburners installed; must explain that instanceof is true for every ancestor.',
      },
      {
        type: 'bug_hunt',
        instructions:
          'Creating the Theta outpost should log "Theta has 2 docks", but it crashes with "ReferenceError: Must call super constructor in derived class before accessing \'this\'". Find the line with the bug and explain what goes wrong.',
        fileName: 'outpost.js',
        code: snippet('outpost.js'),
        answerKey:
          'In a class that extends another, the object isn\'t created until super() runs the parent constructor, so this can\'t be used before that. The constructor sets this.shielded first, then calls super. The two lines need swapping: super(name, 2) first, then this.shielded = shielded.',
        markingCriteria:
          'Must explain that this can\'t be used before super() in a derived class, and that the constructor uses this.shielded too early; should suggest calling super first.',
        bugLine: 10,
        bugLineContains: 'this.shielded = shielded;',
        altBugLines: [11],
      },
    ],
  },
  {
    key: 'shape-shifters',
    title: 'Shape Shifters',
    concept: 'Polymorphism',
    difficulty: 'hard',
    isSideQuest: false,
    storyText:
      'The fleet commander wants to give one order, "attack", and have every ship answer in its own way. Learn the third pillar of OOP: one call, many behaviours, decided by the object that receives it.',
    xpReward: 200,
    prerequisites: ['bloodlines'],
    briefing: briefing('shape-shifters'),
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read attacks.js. Explain why the same ship.attack() call logs three different things, and what super.attack() adds.',
        fileName: 'attacks.js',
        code: snippet('attacks.js'),
        answerKey:
          'Fighter and Bomber override attack by defining a method with the same name. When ship.attack() runs, JavaScript uses the version from the object\'s own class, so the loop logs "fires a warning shot" for the plain Ship, "fires lasers" for the Fighter, and for the Bomber "drops payload, then fires a warning shot", because super.attack() calls Ship\'s original version and adds its result.',
        markingCriteria:
          'Must explain that a subclass overrides a method by defining one with the same name, and that each object runs its own class\'s version; must explain super.attack(); must give the three outputs.',
      },
      {
        type: 'read_and_explain',
        instructions:
          'Read load-times.js. Explain how totalLoadTime adds up items it knows nothing about, including the alien pod, and what the two lines log.',
        fileName: 'load-times.js',
        code: snippet('load-times.js'),
        answerKey:
          'totalLoadTime only calls item.loadTime() on each item; whatever the item is, its own version runs. Plain cargo takes 10, fragile cargo overrides it with 25, and the alien pod isn\'t a Cargo at all, but it has a loadTime method, so it works too (duck typing: if it has the method, it can be used). The total is 10 + 25 + 40 = 75. alienPod instanceof Cargo is false, because it wasn\'t made from the class.',
        markingCriteria:
          'Must explain that each item\'s own loadTime runs, and that the alien pod works because it has the method even though it isn\'t a Cargo (duck typing); must give 75 and false.',
      },
      {
        type: 'bug_hunt',
        instructions:
          'A repair drone should report "Repairing hull", but it reports "Drone idle". Find the line with the bug and explain what goes wrong.',
        fileName: 'drone.js',
        code: snippet('drone.js'),
        answerKey:
          'The method in RepairDrone is spelled stauts instead of status. That doesn\'t override anything; it just adds a second, unrelated method. drone.status() therefore finds the parent\'s status and logs "Drone idle". Renaming it to status overrides the parent\'s version.',
        markingCriteria:
          'Must identify the misspelled method and explain that only a method with exactly the same name overrides the parent\'s, so the parent version runs; should suggest renaming it to status.',
        bugLine: 8,
        bugLineContains: 'stauts() {',
      },
    ],
  },
  {
    key: 'abstract-engines',
    title: 'Abstract Engines',
    concept: 'Abstraction',
    difficulty: 'hard',
    isSideQuest: false,
    storyText:
      'Someone built a "generic sensor" straight from the base class and bolted it to the hull. It measures nothing. Learn the fourth pillar of OOP: define what every sensor must do without pretending to know how.',
    xpReward: 200,
    prerequisites: ['shape-shifters'],
    briefing: briefing('abstract-engines'),
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read sensors.js. Explain what the new.target check and the throwing read() method are for, how report can use read, and what the three lines log.',
        fileName: 'sensors.js',
        code: snippet('sensors.js'),
        answerKey:
          'JavaScript has no abstract keyword, so Sensor enforces it itself. new.target is the class being constructed: if someone builds a Sensor directly it throws, so only specific sensors can exist. read() throws too, meaning "every subclass must replace me". report is written once in Sensor and calls this.read(), trusting each subclass to supply it. So it logs "Temperature: -40.5" and "Radiation: 0.3", then trying new Sensor("Generic") throws and the catch logs "Sensor is abstract: build a specific sensor".',
        markingCriteria:
          'Must explain that the new.target check stops the base class being created directly and the throwing read() forces subclasses to provide one; must explain that report relies on each subclass\'s read; must give the three outputs.',
      },
      {
        type: 'read_and_explain',
        instructions:
          'Read missions.js. Explain what the base reward getter requires, how brief uses it, and what the three lines log.',
        fileName: 'missions.js',
        code: snippet('missions.js'),
        answerKey:
          'Mission\'s reward getter throws, so every kind of mission must provide its own. Escort (300) and Rescue (750) override it; brief, written once in Mission, uses whichever reward the actual object has, giving "Routine mission" and "High-value mission". Survey forgot to provide a reward, so calling brief reaches the base getter, which throws, and the catch logs "Survey must set a reward" (this.constructor.name is the class\'s name).',
        markingCriteria:
          'Must explain that each subclass must supply reward and that brief uses the actual object\'s value; must explain that Survey falls back to the throwing getter; must give the three outputs.',
      },
      {
        type: 'bug_hunt',
        instructions:
          'Every weapon must define its own damage. The railgun fires for 0 because nobody gave it any, and nothing warned the engineers. Find the line that let this slip through and explain how abstraction would have caught it.',
        fileName: 'weapons.js',
        code: snippet('weapons.js'),
        answerKey:
          'Weapon gives damage a made-up default that returns 0, so a subclass that forgets to provide damage still works, silently, and Railgun hits for 0. If the base damage threw an error instead (for example throw new Error("Railgun must implement damage()")), the missing method would be reported the first time the railgun fired, instead of quietly doing nothing.',
        markingCriteria:
          'Must identify the base damage method and explain that its default of 0 lets a subclass skip providing damage without any warning; should suggest making it throw so a missing implementation is caught.',
        bugLine: 2,
        bugLineContains: 'damage() {',
        altBugLines: [3],
      },
    ],
  },
  {
    key: 'docking-contracts',
    title: 'Docking Contracts',
    concept: 'Interfaces and mixins',
    difficulty: 'hard',
    isSideQuest: false,
    storyText:
      'Shuttles, probes and alien craft all want to dock, and they share nothing except that they can dock. Learn how JavaScript treats an ability as a contract any object can meet, and how mixins hand abilities to unrelated classes.',
    xpReward: 200,
    prerequisites: ['abstract-engines'],
    briefing: briefing('docking-contracts'),
    challenges: [
      {
        type: 'read_and_explain',
        instructions:
          'Read contracts.js. Explain what canDock checks, why a plain object can dock as well as a Shuttle, and what the three lines log.',
        fileName: 'contracts.js',
        code: snippet('contracts.js'),
        answerKey:
          'JavaScript has no interface keyword; the "contract" is simply having the right method. canDock checks whether the thing has a dock function (duck typing). The Shuttle object has one from its class and the probe object has one written directly, so both can dock even though they share no class: "Shuttle docking at Theta" and "Probe latching onto Theta". The asteroid has no dock method, so it logs "Rock-42 can\'t dock".',
        markingCriteria:
          'Must explain that the contract is having the method (duck typing), checked with typeof === "function", so unrelated objects can meet it; must give the three outputs.',
      },
      {
        type: 'read_and_explain',
        instructions:
          'Read mixins.js. Explain what Refuelable(Vessel) produces, what Tanker ends up with, and what the four lines log.',
        fileName: 'mixins.js',
        code: snippet('mixins.js'),
        answerKey:
          'Refuelable is a mixin: a function that takes a class and returns a new class extending it with a refuel method. Tanker extends Refuelable(Vessel), so it gets Vessel\'s constructor (the name) plus refuel. Fuel starts missing, so ?? 0 treats it as 0: the first refuel logs "Big Gulp fuel: 40", the second "Big Gulp fuel: 50". A tanker is still a Vessel, so instanceof is true. Station never had the mixin applied, so "refuel" in new Station() is false.',
        markingCriteria:
          'Must explain that the mixin returns a class that adds refuel to whatever class it is given, so Tanker has both the name and refuel; must give the four outputs including true and false.',
      },
      {
        type: 'bug_hunt',
        instructions:
          'prepare should launch the shuttle and log "Shuttle launched", but the log shows "[Function: launch]". Find the line with the bug and explain what goes wrong.',
        fileName: 'launch-check.js',
        code: snippet('launch-check.js'),
        answerKey:
          'The capability check is right, but craft.launch without brackets is the method itself, not a call to it, so prepare returns the function and that is what gets logged. It needs calling: return craft.launch();',
        markingCriteria:
          'Must identify the return inside the check and explain that it returns the method instead of calling it; should suggest adding the brackets to call it.',
        bugLine: 8,
        bugLineContains: 'return craft.launch;',
      },
    ],
  },
];
