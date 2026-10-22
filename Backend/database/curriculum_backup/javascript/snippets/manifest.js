const cargo = { fuel: 40, rations: 25, medkits: 10 };

console.log(Object.keys(cargo));
console.log(Object.values(cargo));

let total = 0;
for (const [item, amount] of Object.entries(cargo)) {
  console.log(`${item}: ${amount}`);
  total += amount;
}

const key = "fuel";
console.log(cargo[key]);
console.log(cargo.key);
console.log(`Total: ${total}`);
