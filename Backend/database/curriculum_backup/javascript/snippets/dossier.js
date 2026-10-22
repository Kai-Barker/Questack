const pilot = {
  callsign: "Vega",
  rank: "Pilot",
  missions: 12,
  "home port": "Ares Base",
  describe() {
    return `${this.rank} ${this.callsign}, ${this.missions} missions`;
  },
};

pilot.missions += 1;
pilot.ship = "Kestrel";

console.log(pilot.callsign);
console.log(pilot["home port"]);
console.log(pilot.describe());
console.log(pilot.ship);
console.log(pilot.medals);
