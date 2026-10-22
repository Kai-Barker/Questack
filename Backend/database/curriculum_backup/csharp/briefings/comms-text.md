# Strings: working with text

A `string` is a sequence of characters: a name, a message, a whole log entry. Most programs spend a lot of time building text and picking it apart.

## Building text

There are two common ways to build a message from pieces.

**Concatenation** joins pieces with `+`:

```csharp
string planet = "Ares";
int moons = 2;
string line = planet + " has " + moons + " moons";
```

**Interpolation** puts a `$` in front of the string and writes the values inside `{ }`:

```csharp
string line = $"{planet} has {moons} moons";
```

Both give `Ares has 2 moons`. Interpolation is usually easier to read, especially with lots of values. Without the `$`, though, the braces are just ordinary characters.

## Special characters

Some characters can't be typed directly into a string, so they're written with a backslash (an **escape sequence**):

| Escape | Means |
| --- | --- |
| `\n` | New line |
| `\t` | Tab |
| `\"` | A double quote inside the string |
| `\\` | A single backslash |

```csharp
Console.WriteLine("Captain:\t\"Engage!\"");
```

This prints `Captain:` followed by a tab, then `"Engage!"` with its quotes.

## Looking inside a string

Every character has a position, called an **index**, and **counting starts at 0**:

```text
 text:   W  A  R  P
 index:  0  1  2  3
```

| You write | You get (for `"warp drive"`) |
| --- | --- |
| `.Length` | `10`: every character, spaces included |
| `[0]` | `'w'`: the character at index 0 |
| `.ToUpper()` | `"WARP DRIVE"` |
| `.ToLower()` | `"warp drive"` |
| `.Contains("drive")` | `true` |
| `.Substring(5, 3)` | `"dri"`: 3 characters starting at index 5 |
| `.Replace("warp", "jump")` | `"jump drive"` |

> **Pilot's tip:** strings never change in place. `name.ToUpper()` gives you a **new** string and leaves `name` as it was. To keep the result, store it: `name = name.ToUpper();`

---

### Before you move on

- [ ] I can build a message with `+` and with `$"..."` interpolation
- [ ] I know what `\n` and `\t` do
- [ ] I know string positions start at 0
- [ ] I can use `Length`, `ToUpper`, `Contains` and `Substring`
