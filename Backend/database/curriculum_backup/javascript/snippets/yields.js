const yields = [18, 52, 30];
let total = 0;
let best = yields[0];

for (const amount of yields) {
  total += amount;
  if (amount > best) {
    best = amount;
  }
}

yields.pop();
console.log(`Total: ${total}`);
console.log(`Best: ${best}`);
console.log(yields);
