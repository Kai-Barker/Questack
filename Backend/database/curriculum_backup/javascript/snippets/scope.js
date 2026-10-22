let fuel = 20;

function topUp(amount) {
  let fuel = amount + 50;
  console.log(`Inside topUp: ${fuel}`);
}

function refuel(amount) {
  return amount + 50;
}

topUp(fuel);
console.log(`After topUp: ${fuel}`);

fuel = refuel(fuel);
console.log(`After refuel: ${fuel}`);

if (fuel > 50) {
  const status = "full";
  console.log(status);
}
