# First contact: how a C# program is built

Every C# program, from a two-line test to a full game, follows the same basic shape. Learn to recognise that shape and you'll always know where to start reading.

## The smallest complete program

```csharp
using System;

class Beacon
{
    static void Main()
    {
        Console.WriteLine("Beacon online");
    }
}
```

Here's what each part does:

| Part | What it's for |
| --- | --- |
| `using System;` | Lets you use built-in tools such as `Console` without typing `System.Console` every time |
| `class Beacon` | A container that holds your code. Every piece of C# lives inside a class |
| `static void Main()` | The **entry point**: the program starts running here, every time |
| `Console.WriteLine(...)` | Prints a message to the screen |

## Statements, semicolons and braces

A **statement** is a single instruction, such as "print this". In C#, every statement ends with a **semicolon** `;`. Think of it as the full stop at the end of a sentence.

**Curly braces** `{ }` group statements into a **block**. The class has a block, and so does `Main`. Each `{` needs a matching `}`, and indenting the code inside makes it easy to see what belongs where.

Inside `Main`, statements run **from top to bottom, one at a time**:

```csharp
Console.WriteLine("Engines warming up");
Console.WriteLine("Engines ready");
```

This always prints "Engines warming up" first.

## Printing: `WriteLine` vs `Write`

| Method | What it does |
| --- | --- |
| `Console.WriteLine("Hi")` | Prints the text, then **moves to a new line** |
| `Console.Write("Hi")` | Prints the text and **stays on the same line** |
| `Console.WriteLine()` | Prints nothing, so you get an **empty line** |

```csharp
Console.Write("Speed: ");
Console.WriteLine("full");
```

This prints `Speed: full` on one line, because `Write` doesn't end the line.

## Comments

**Comments** are notes for humans, and C# ignores them completely:

```csharp
// A single-line comment runs to the end of the line

/* A block comment
   can span several lines */
```

Programmers also "comment out" a line to switch it off for a while without deleting it.

> **Pilot's tip:** C# is **case-sensitive**. `Console` works, but `console` doesn't, and `WriteLine` isn't the same as `writeline`.

---

### Before you move on

- [ ] I know the program starts in `Main`
- [ ] I know a `;` ends a statement and `{ }` group a block
- [ ] I know the difference between `Write` and `WriteLine`
- [ ] I know comments are ignored when the program runs
