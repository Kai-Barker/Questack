const ship = { name: "Kestrel", crew: 6, cargo: { fuel: 40 } };
const [first, second, ...rest] = ["Ari", "Bo", "Cy", "Dee"];

const { name, crew: crewCount, cargo: { fuel }, captain = "unassigned" } = ship;

console.log(name, crewCount, fuel, captain);
console.log(first, second);
console.log(rest);
