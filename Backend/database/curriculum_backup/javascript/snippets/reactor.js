class Reactor {
  output = 50;

  boost() {
    this.output += 25;
  }
}

class Engineer {
  constructor(name, reactor) {
    this.name = name;
    this.reactor = reactor;
  }

  handleAlarm() {
    this.reactor.boost();
    console.log(`${this.name} boosted the reactor to ${this.reactor.output}`);
  }
}

const core = new Reactor();
const ada = new Engineer("Ada", core);
const bo = new Engineer("Bo", core);

ada.handleAlarm();
bo.handleAlarm();
console.log(`Core output: ${core.output}`);
