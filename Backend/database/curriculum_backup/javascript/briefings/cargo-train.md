# Arrays: lists of values

An **array** holds many values in order, under one name. In JavaScript, arrays **grow and shrink** whenever you need them to: there's no fixed size.

## Creating and reading

```js
const crew = ["Ari", "Bo", "Cy"];
const empty = [];

console.log(crew[0]);              // "Ari": the first item is at index 0
console.log(crew.length);          // 3
console.log(crew[crew.length - 1]); // "Cy": the last item
console.log(crew[5]);              // undefined: nothing there (no crash)
```

```text
 crew:    "Ari"   "Bo"   "Cy"
 index:     0       1      2       length: 3
```

Reading a position that doesn't exist **doesn't crash** in JavaScript: it quietly gives `undefined`, which can hide bugs.

## Adding and removing

| Method | What it does | Gives back |
| --- | --- | --- |
| `push(x)` | Adds to the **end** | the new length |
| `pop()` | Removes from the **end** | the removed item |
| `unshift(x)` | Adds to the **start** | the new length |
| `shift()` | Removes from the **start** | the removed item |
| `includes(x)` | Is `x` in the array? | `true` or `false` |
| `indexOf(x)` | Where is `x`? | its index, or `-1` if it's not there |

```js
const pods = ["water", "oxygen"];
pods.push("fuel");        // ["water", "oxygen", "fuel"]
const gone = pods.shift(); // gone is "water"; pods is ["oxygen", "fuel"]
```

You can also replace an item directly: `pods[0] = "rations";`

## Visiting every item

```js
for (const pod of pods) {
  console.log(pod);              // each value
}

for (let i = 0; i < pods.length; i++) {
  console.log(i, pods[i]);       // when you need the index too
}
```

## Running totals

A common pattern: set up a variable **before** the loop, then update it for every item.

```js
const hits = [12, 40, 7];
let total = 0;
let worst = hits[0];

for (const hit of hits) {
  total += hit;
  if (hit > worst) worst = hit;
}
// total is 59, worst is 40
```

> **Pilot's tip:** the last item is at `length - 1`. Seeing `undefined` where you expected a value usually means an index is one too far.

---

### Before you move on

- [ ] I know indexes start at 0 and the last item is `length - 1`
- [ ] I know a missing index gives `undefined` rather than crashing
- [ ] I can use `push`, `pop`, `shift`, `includes` and `indexOf`
- [ ] I can loop over an array with `for...of`, and keep a running total
