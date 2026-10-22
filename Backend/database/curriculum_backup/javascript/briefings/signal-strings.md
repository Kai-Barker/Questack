# Strings: working with text

A **string** is text. You can write one with double quotes, single quotes, or **backticks**, and backticks unlock a much nicer way to build messages.

## Template literals

A string in **backticks** is a *template literal*. Anything inside `${ }` is worked out and dropped into the text:

```js
const planet = "Ares";
const moons = 2;

const joined = planet + " has " + moons + " moons";     // concatenation
const template = `${planet} has ${moons} moons`;        // template literal
const later = `In a year: ${moons + 1} moons`;          // any expression works
```

`joined` and `template` both hold `Ares has 2 moons`. `${ }` placeholders **only work inside backticks**: in normal quotes they're just characters.

## Special characters

| Escape | Means |
| --- | --- |
| `\n` | New line |
| `\t` | Tab |
| `\"` or `\'` | A quote inside a string |
| `\\` | A backslash |

## Looking inside a string

Every character has an **index** (position), counting **from 0**:

```text
 text:   W  A  R  P
 index:  0  1  2  3
```

| You write | You get (for `"warp drive"`) |
| --- | --- |
| `.length` | `10`: spaces count too |
| `[0]` | `"w"` |
| `.toUpperCase()` | `"WARP DRIVE"` |
| `.includes("drive")` | `true` |
| `.slice(0, 4)` | `"warp"`: from index 0 **up to but not including** 4 |
| `.split(" ")` | `["warp", "drive"]`: cut at each space into an array |
| `.replace("warp", "jump")` | `"jump drive"` |
| `.trim()` | removes spaces from both ends |

```js
const words = ["engage", "warp"];
console.log(words.join(" "));   // "engage warp": join is split in reverse
```

## Strings never change

String methods always give you a **new** string. The original is untouched:

```js
let name = "vega";
name.toUpperCase();          // makes "VEGA"... and throws it away
name = name.toUpperCase();   // keep it by storing it
```

> **Pilot's tip:** if you see `${...}` printed literally, check that the string uses backticks.

---

### Before you move on

- [ ] I can build a message with a template literal and `${ }`
- [ ] I know what `\n` and `\t` do
- [ ] I know string indexes start at 0, and that `slice` stops before its end index
- [ ] I can use `length`, `includes`, `split` and `join`
