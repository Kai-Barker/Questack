class FuelTank {
  #level = 0;

  get level() {
    return this.#level;
  }

  set level(value) {
    this.#level = Math.min(100, Math.max(0, value));
  }
}

const tank = new FuelTank();
tank.level = 70;
console.log(tank.level);
tank.level = 250;
console.log(tank.level);
tank.level = -30;
console.log(tank.level);
console.log(Object.keys(tank));
