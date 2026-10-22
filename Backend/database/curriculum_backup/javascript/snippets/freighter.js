class Vessel {
  constructor(name) {
    this.name = name;
    this.hull = 100;
  }

  report() {
    return `${this.name}: hull ${this.hull}`;
  }
}

class Freighter extends Vessel {
  constructor(name, cargoSpace) {
    super(name);
    this.cargoSpace = cargoSpace;
    this.hull = 150;
  }
}

const mule = new Freighter("Mule", 400);
console.log(mule.report());
console.log(mule.cargoSpace);
console.log(mule instanceof Freighter, mule instanceof Vessel);
