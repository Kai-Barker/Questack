# Dictionaries: look it up by name

To find one ship in a list, you have to check the items one at a time. A `Dictionary<TKey, TValue>` stores **pairs**, a **key** and its **value**, and finds any value **instantly** from its key, like looking a word up in an index.

## Creating a dictionary

```csharp
using System.Collections.Generic;

Dictionary<string, double> gravity = new Dictionary<string, double>
{
    { "Earth", 9.8 },
    { "Mars", 3.7 }
};
```

`<string, double>` means the keys are strings (planet names) and the values are doubles (their gravity). **Each key can appear only once.**

## Reading and writing

| You write | What it does |
| --- | --- |
| `dict[key] = value` | **Adds** the pair if the key is new, **replaces** the value if it already exists |
| `dict[key]` | Reads the value for that key. 💥 Throws `KeyNotFoundException` if the key isn't there |
| `dict.Add(key, value)` | Adds a new pair. 💥 Throws if the key already exists |
| `dict.ContainsKey(key)` | `true` if the key exists |
| `dict.Remove(key)` | Removes that pair |
| `dict.Count` | How many pairs there are |

```csharp
gravity["Moon"] = 1.6;      // added
gravity["Mars"] = 3.72;     // replaced
Console.WriteLine(gravity["Earth"]);   // 9.8
```

## Safe lookups with `TryGetValue`

When a key might be missing, ask **first**:

```csharp
if (gravity.TryGetValue("Pluto", out double g))
{
    Console.WriteLine($"Gravity: {g}");
}
else
{
    Console.WriteLine("Not in the registry");
}
```

`TryGetValue` returns `true` or `false`, and when it finds the key it puts the value in the `out` variable.

## Looping over a dictionary

Each item is a `KeyValuePair`, with a `.Key` and a `.Value`:

```csharp
foreach (KeyValuePair<string, double> pair in gravity)
{
    Console.WriteLine($"{pair.Key}: {pair.Value}");
}
```

## A classic use: counting

```csharp
Dictionary<string, int> sightings = new Dictionary<string, int>();
// for each sighting...
if (sightings.ContainsKey(name)) sightings[name]++;
else sightings[name] = 1;
```

> **Pilot's tip:** `dict[key]` assumes the key is definitely there. If you aren't sure, use `TryGetValue` or `ContainsKey`.

---

### Before you move on

- [ ] I know a dictionary maps unique keys to values
- [ ] I know `dict[key] = value` adds or replaces
- [ ] I know reading a missing key with `[ ]` throws, and how `TryGetValue` avoids that
- [ ] I can loop over the pairs using `.Key` and `.Value`
