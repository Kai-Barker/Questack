function withFullShields(ship) {
  const repaired = ship;
  repaired.shields = 100;
  return repaired;
}

const damaged = { name: "Heron", shields: 20 };
const simulated = withFullShields(damaged);

console.log(`Simulated repair: ${simulated.shields}`);
console.log(`Real ship: ${damaged.shields}`);
