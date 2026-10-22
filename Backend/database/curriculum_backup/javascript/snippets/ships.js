class Ship {
  name = "unnamed";
  fuel = 0;

  jump(cost) {
    this.fuel -= cost;
    console.log(`${this.name} jumped. Fuel left: ${this.fuel}`);
  }
}

const scout = new Ship();
scout.name = "Swift";
scout.fuel = 30;

const hauler = new Ship();
hauler.name = "Mule";
hauler.fuel = 100;

scout.jump(10);
hauler.jump(25);
scout.jump(10);
console.log(new Ship().name);
