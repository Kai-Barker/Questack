const pings = ["alpha", "beta", "alpha", "gamma", "alpha"];

const counts = new Map();
for (const ping of pings) {
  counts.set(ping, (counts.get(ping) ?? 0) + 1);
}

const unique = new Set(pings);

console.log(counts.get("alpha"));
console.log(unique.size);
console.log(unique.has("delta"));
console.log([...unique]);
