const crewByShip = new Map();
crewByShip.set("Kestrel", 6);
crewByShip.set("Osprey", 4);
crewByShip.set("Kestrel", 7);

console.log(crewByShip.size);
console.log(crewByShip.get("Kestrel"));
console.log(crewByShip.has("Falcon"));
console.log(crewByShip.get("Falcon"));

for (const [ship, crew] of crewByShip) {
  console.log(`${ship}: ${crew}`);
}
