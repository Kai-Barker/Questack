# Switch: choosing between many options

When you're comparing **one value** against a list of possibilities, a long `if` / `else if` chain gets hard to read. A `switch` lays the choices out in a table.

## The switch statement

```csharp
string planetType = "gas";

switch (planetType)
{
    case "rocky":
        Console.WriteLine("Prepare landing gear");
        break;
    case "gas":
    case "ice":
        Console.WriteLine("Stay in orbit");
        break;
    default:
        Console.WriteLine("Unknown world: scan first");
        break;
}
```

| Piece | Meaning |
| --- | --- |
| `switch (planetType)` | The value being checked |
| `case "rocky":` | Runs if the value equals `"rocky"` |
| Stacked cases | `case "gas":` followed directly by `case "ice":` means **either** value runs the same block |
| `break;` | Ends the case. C# requires one (or a `return`) so a case can't fall into the next by accident |
| `default:` | Runs when nothing else matched, like a final `else` |

## Returning from a case

Inside a method, a case can `return` straight away. A `return` leaves the method, so it doesn't need a `break`:

```csharp
static int DockingFee(string size)
{
    switch (size)
    {
        case "small": return 10;
        case "large": return 50;
        default: return 25;
    }
}
```

## Switch expressions: the short form

When every case simply **produces a value**, a switch expression is shorter:

```csharp
static string Greeting(string faction) => faction switch
{
    "allied" => "Welcome, friend",
    "neutral" => "State your business",
    _ => "Raise shields",
};
```

- `=>` in each arm means "this case gives this value"
- `_` (the **discard**) is the catch-all, just like `default`
- `=>` after the method's brackets is a shortcut for a method whose body is a single expression. It's the same as writing `{ return ...; }`

> **Pilot's tip:** when a switch gives the wrong result, read each case's **value** carefully. The structure is usually fine, and the mistake is in what one case does.

---

### Before you move on

- [ ] I know how `case`, `break` and `default` work
- [ ] I know stacked cases share one block
- [ ] I can read a switch expression, including the `_` catch-all
- [ ] I know `=> expression` is a short way to write a one-line method
