# Lists: collections that grow

An array has a fixed size, but a supply manifest doesn't: crates are loaded and used up all the time. A `List<T>` works like an array that **grows and shrinks** as you add and remove items.

## Creating a list

```csharp
using System.Collections.Generic;   // where List lives

List<string> passengers = new List<string>();          // empty
List<int> codes = new List<int> { 101, 202, 303 };     // starts with items
```

The type in the angle brackets, `<string>` or `<int>`, says what the list holds. `T` is just a placeholder for "some type". A `List<int>` can only ever hold ints.

## The everyday tools

| You write | What it does |
| --- | --- |
| `list.Add(x)` | Puts `x` on the **end** |
| `list.Remove(x)` | Removes the first `x` it finds. **Later items move up one place** |
| `list.RemoveAt(i)` | Removes the item at index `i` |
| `list.Insert(i, x)` | Puts `x` at index `i` and pushes the rest along |
| `list.Count` | How many items there are (arrays use `Length`, lists use `Count`) |
| `list[i]` | The item at index `i`, starting from 0, just like an array |
| `list.Contains(x)` | `true` if `x` is in the list |
| `list.Clear()` | Empties the list |

```csharp
List<string> queue = new List<string> { "Ari", "Bo", "Cy" };
queue.Remove("Bo");
// queue is now Ari, Cy, so queue[1] is "Cy"
```

## Arrays or lists?

| | Array | List |
| --- | --- | --- |
| Size | Fixed when created | Grows and shrinks |
| Count | `.Length` | `.Count` |
| Best for | A known, fixed number of items | Collections that change |

## Looping over a list

`for` and `foreach` work exactly as they do with arrays. There's one important rule:

> **Don't add to or remove from a list while a `foreach` is looping over that same list.** C# throws an exception, because the loop would lose its place.

If you need to remove items as you go, loop **backwards** with a `for` loop, or build a **new** list containing the items you want to keep.

## Joining items into text

`string.Join` puts every item together with a separator between them:

```csharp
List<string> ports = new List<string> { "Ares", "Vesta" };
Console.WriteLine(string.Join(" -> ", ports));   // Ares -> Vesta
```

---

### Before you move on

- [ ] I can create a `List<T>` and say what `T` means
- [ ] I can use `Add`, `Remove`, `Count`, `Contains` and `[index]`
- [ ] I know later items move up when one is removed
- [ ] I know not to change a list inside a `foreach` over that same list
