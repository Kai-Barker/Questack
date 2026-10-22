const double = (n) => n * 2;
const greet = (name, rank = "Cadet") => `${rank} ${name}, report!`;
const describe = (ship) => {
  const label = ship.toUpperCase();
  return `Ship ${label} ready`;
};

console.log(double(21));
console.log(greet("Ari"));
console.log(greet("Ari", "Commander"));
console.log(describe("kestrel"));
