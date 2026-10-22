const Refuelable = (Base) =>
  class extends Base {
    refuel(amount) {
      this.fuel = (this.fuel ?? 0) + amount;
      return `${this.name} fuel: ${this.fuel}`;
    }
  };

class Vessel {
  constructor(name) {
    this.name = name;
  }
}

class Tanker extends Refuelable(Vessel) {}
class Station {}

const tanker = new Tanker("Big Gulp");
console.log(tanker.refuel(40));
console.log(tanker.refuel(10));
console.log(tanker instanceof Vessel);
console.log("refuel" in new Station());
