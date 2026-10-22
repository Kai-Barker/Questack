class Sensor {
  constructor(name) {
    if (new.target === Sensor) {
      throw new Error("Sensor is abstract: build a specific sensor");
    }
    this.name = name;
  }

  read() {
    throw new Error(`${this.constructor.name} must implement read()`);
  }

  report() {
    console.log(`${this.name}: ${this.read()}`);
  }
}

class Thermometer extends Sensor {
  constructor() { super("Temperature"); }
  read() { return -40.5; }
}

class Geiger extends Sensor {
  constructor() { super("Radiation"); }
  read() { return 0.3; }
}

for (const sensor of [new Thermometer(), new Geiger()]) sensor.report();

try {
  new Sensor("Generic");
} catch (error) {
  console.log(error.message);
}
