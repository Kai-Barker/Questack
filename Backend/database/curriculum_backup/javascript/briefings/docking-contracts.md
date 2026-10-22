# Interfaces the JavaScript way: contracts and mixins

Inheritance groups classes into families: a Fighter **is a** Ship. Some abilities cut across families, though. A shuttle, a cargo pod and an alien probe can all **dock**, but they share nothing else. In languages such as C#, an **interface** describes an ability like that. JavaScript has no `interface` keyword, so it uses two ideas instead.

## 1. Contracts by duck typing

In JavaScript, the "contract" is simply: **does the object have the method?** Code checks for the ability, not the family:

```js
const canTrack = (thing) => typeof thing.ping === "function";

class Buoy {
  ping() { return "Buoy: beep"; }
}

const comet = { ping() { return "Comet: reflected signal"; } };
const rock = { name: "Rock-7" };

for (const thing of [new Buoy(), comet, rock]) {
  console.log(canTrack(thing) ? thing.ping() : "Can't track that");
}
```

A `Buoy` object and a plain object both meet the contract; the rock doesn't. Note that the check is `typeof thing.ping === "function"`, and that **using** the ability means calling it: `thing.ping()`, with brackets. Without the brackets, `thing.ping` is the method itself, not its result.

## 2. Mixins: adding abilities to any class

A class can only `extends` **one** parent. A **mixin** is a function that takes a class and returns a new class that extends it with extra abilities, so you can add an ability to unrelated families:

```js
const Trackable = (Base) =>
  class extends Base {
    ping() {
      return `${this.name}: signal strong`;
    }
  };

class Ship {
  constructor(name) {
    this.name = name;
  }
}

class Freighter extends Trackable(Ship) {}

const mule = new Freighter("Mule");
mule.ping();               // "Mule: signal strong"
mule instanceof Ship;      // true: still a Ship
```

```mermaid
flowchart LR
    A["Ship"] -->|"Trackable(Ship)"| B["Ship + ping()"]
    B -->|"extends"| C["Freighter"]
```

You can stack several mixins: `class Tanker extends Refuelable(Trackable(Ship)) {}`.

## Checking for a property: `in`

`"ping" in mule` is `true` if `mule` has a `ping` property anywhere: on itself, or inherited from its class or a mixin.

| Interface idea | JavaScript version |
| --- | --- |
| "Implements an interface" | Has the right methods (duck typing) |
| Interface-typed parameter | Check for the ability, then use it |
| Share an ability across families | A mixin |

---

### Before you move on

- [ ] I know JavaScript checks for abilities (duck typing) instead of using interfaces
- [ ] I can check for a method with `typeof x.method === "function"`, then call it
- [ ] I can read a mixin, and know it adds abilities while keeping the class's parent
- [ ] I know what `in` checks
