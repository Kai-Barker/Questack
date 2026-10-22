const fleet = {
  kestrel: { engine: { power: 80 } },
  osprey: { engine: null },
};

console.log(fleet.kestrel.engine.power);
console.log(fleet.osprey.engine?.power);
console.log(fleet.heron?.engine?.power);
console.log(fleet.heron?.engine?.power ?? "no data");

try {
  console.log(fleet.osprey.engine.power);
} catch (error) {
  console.log(`Crash avoided: ${error.name}`);
}
