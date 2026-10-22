class Ship {
  constructor(name, crew) {
    this.name = name;
    this.crew = crew;
    this.fuel = 100;
    console.log(`${this.name} built with ${this.crew} crew`);
  }
}

const kestrel = new Ship("Kestrel", 6);
const osprey = new Ship("Osprey", 3);
osprey.fuel -= 40;

console.log(`${kestrel.name} fuel: ${kestrel.fuel}`);
console.log(`${osprey.name} fuel: ${osprey.fuel}`);
