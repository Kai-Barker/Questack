# Enum-style constants: a fixed set of named options

Some values can only ever be one of a few options: a heading, a ship class, an alert level. Typing them as plain strings everywhere (`"in-flight"`, `"docked"`) is risky, because a typo is still a valid string, and nothing warns you.

Many languages have an **enum** for this. JavaScript doesn't have an `enum` keyword, so the common pattern is a **frozen object of named constants**.

## Making the constants

```js
const Heading = Object.freeze({
  NORTH: "north",
  EAST: "east",
  SOUTH: "south",
  WEST: "west",
});

let course = Heading.EAST;

if (course === Heading.EAST) {
  console.log("Sun ahead");
}
```

- Code uses `Heading.EAST` instead of typing `"east"`. If you mistype a **name** (`Heading.EEST`), you get `undefined`, which is easy to spot, rather than a silently wrong string.
- The names are written in CAPITALS by convention, to show they're constants.
- Your editor can suggest the options as you type.

## `Object.freeze`

`Object.freeze` locks an object: its values can't be changed, and nothing can be added or removed.

```js
console.log(Object.isFrozen(Heading));   // true
// Heading.NORTH = "up";   // ignored, or a TypeError in strict mode (modules and classes)
```

## Ordered options

When the order matters, use numbers as the values. Then the constants can be compared:

```js
const Threat = Object.freeze({ LOW: 1, MEDIUM: 5, SEVERE: 10 });

if (threat >= Threat.MEDIUM) {
  console.log("Raise shields");
}
```

## Constants and switch

A fixed set of options and a `switch` go well together:

```js
function arrow(heading) {
  switch (heading) {
    case Heading.NORTH:
      return "↑";
    case Heading.SOUTH:
      return "↓";
    default:
      return "→";
  }
}
```

`Object.keys(Heading)` gives the names, `["NORTH", "EAST", "SOUTH", "WEST"]`, which is handy for building a menu of options.

> **Pilot's tip:** once you have named constants, **always** compare with them. One hand-typed string is all it takes for a typo to slip back in.

---

### Before you move on

- [ ] I know why named constants are safer than repeated strings
- [ ] I can make a frozen constants object and use its values
- [ ] I know what `Object.freeze` stops
- [ ] I can use numeric constants for ordered options
