# Enums: a fixed set of named options

Some values can only ever be one of a few options: a direction, a ship class, a difficulty. You *could* store them as strings, but then `"nroth"` is a perfectly valid string that the compiler won't catch. An **enum** defines the exact list of options, and anything else simply won't compile.

## Declaring and using an enum

```csharp
enum Heading
{
    North,
    East,
    South,
    West
}

Heading course = Heading.East;

if (course == Heading.East)
{
    Console.WriteLine("Sun ahead");
}

Console.WriteLine(course);   // prints the name: East
```

You always write the enum's name before the option (`Heading.East`). If you mistype it, the code won't compile.

## The numbers behind the names

Each option is really a number underneath. By default they're numbered **from 0**, in order:

| Option | Number |
| --- | --- |
| `Heading.North` | 0 |
| `Heading.East` | 1 |
| `Heading.South` | 2 |
| `Heading.West` | 3 |

You can **cast** between an enum and its number:

```csharp
int code = (int)Heading.South;      // 2
Heading back = (Heading)3;          // Heading.West
```

You can also choose the numbers yourself, which is useful when the options have an order:

```csharp
enum Threat
{
    Low = 1,
    Medium = 5,
    Severe = 10
}
```

Because there are numbers behind them, enum values can be compared with `<`, `>`, `<=` and `>=`: `Threat.Severe > Threat.Medium` is `true`.

## Enums and switch

Enums and `switch` work well together, because there's a known, fixed list of cases:

```csharp
static string Arrow(Heading h)
{
    switch (h)
    {
        case Heading.North: return "↑";
        case Heading.South: return "↓";
        default: return "→";
    }
}
```

> **Pilot's tip:** when a comparison uses `>=` or `<=` on an enum, check exactly which options it lets through, and which it doesn't.

---

### Before you move on

- [ ] I can declare an enum and use one of its options
- [ ] I know the options are numbered from 0 unless I set the numbers myself
- [ ] I can cast between an enum and its number
- [ ] I know why an enum is safer than a string for a fixed set of options
