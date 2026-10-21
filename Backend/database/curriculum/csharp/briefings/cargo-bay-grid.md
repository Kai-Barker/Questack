# Arrays: many values, one name

Ten fuel readings in ten separate variables is hard to manage. An **array** stores a fixed number of values of the same type under one name, each in its own numbered slot.

## Creating an array

```csharp
// Fill it straight away
string[] crew = { "Ari", "Bo", "Cy" };

// Or make empty slots and fill them later
double[] readings = new double[4];   // four doubles, all starting at 0
readings[0] = 1.5;
```

`new double[4]` makes room for exactly **4** values. An array **can't grow or shrink** once it's created. Its empty slots start at the type's default: `0` for numbers, `false` for `bool` and `null` for `string`.

## Indexes start at 0

```text
 crew:    "Ari"   "Bo"   "Cy"
 index:     0       1      2
```

| Expression | Value |
| --- | --- |
| `crew.Length` | `3` |
| `crew[0]` | `"Ari"`: the **first** item |
| `crew[2]` | `"Cy"`: the **last** item, at `Length - 1` |
| `crew[3]` | 💥 `IndexOutOfRangeException`: there is no slot 3 |

You can replace an item by writing to its slot: `crew[1] = "Dee";`

## Visiting every item

A `for` loop gives you the index as you go:

```csharp
for (int i = 0; i < crew.Length; i++)
{
    Console.WriteLine($"{i}: {crew[i]}");
}
```

A `foreach` loop gives you **each item directly**, which is simpler when you don't need its position:

```csharp
foreach (string name in crew)
{
    Console.WriteLine($"Welcome aboard, {name}");
}
```

## A common pattern: running totals

Many array jobs work the same way: start a variable before the loop, then update it for every item.

```csharp
int[] damage = { 12, 40, 7 };
int total = 0;
int worst = damage[0];

foreach (int hit in damage)
{
    total += hit;
    if (hit > worst) worst = hit;
}
// total is 59, worst is 40
```

> **Pilot's tip:** "The last item is `Length - 1`" will save you from the most common array crash there is.

---

### Before you move on

- [ ] I can create an array with `{ ... }` or with `new type[size]`
- [ ] I know indexes run from 0 to `Length - 1`
- [ ] I know when to use `for` (I need the index) and when to use `foreach` (I just need each item)
- [ ] I can keep a running total or a "best so far" in a loop
