class Pilot {
  static missions = 0;

  constructor(name) {
    this.name = name;
  }

  completeMission() {
    Pilot.missions++;
  }
}

const vega = new Pilot("Vega");
const orion = new Pilot("Orion");
vega.completeMission();
vega.completeMission();
orion.completeMission();

console.log(`${vega.name}: ${Pilot.missions} missions`);
console.log(`${orion.name}: ${Pilot.missions} missions`);
