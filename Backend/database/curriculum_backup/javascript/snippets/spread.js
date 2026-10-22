const base = { speed: 5, shields: 50 };
const upgraded = { ...base, shields: 80, cloak: true };

const morning = ["Ari", "Bo"];
const evening = ["Cy"];
const allCrew = [...morning, ...evening, "Dee"];

function totalFuel(...tanks) {
  return tanks.reduce((sum, t) => sum + t, 0);
}

console.log(upgraded);
console.log(base.shields);
console.log(allCrew);
console.log(totalFuel(10, 20, 30));
