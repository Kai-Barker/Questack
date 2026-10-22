class Station {
  constructor(name, docks) {
    this.name = name;
    this.docks = docks;
  }
}

class Outpost extends Station {
  constructor(name, shielded) {
    this.shielded = shielded;
    super(name, 2);
  }
}

const theta = new Outpost("Theta", true);
console.log(`${theta.name} has ${theta.docks} docks`);
