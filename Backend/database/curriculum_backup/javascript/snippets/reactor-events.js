class Reactor extends EventTarget {
  temperature = 0;

  heat(amount) {
    this.temperature += amount;
    if (this.temperature > 100) {
      this.dispatchEvent(new CustomEvent("overheat", { detail: this.temperature }));
    }
  }
}

const reactor = new Reactor();
const alarm = (event) => console.log(`ALARM: reactor at ${event.detail}`);

reactor.heat(120);
reactor.addEventListener("overheat", alarm);
reactor.heat(10);
reactor.removeEventListener("overheat", alarm);
reactor.heat(10);
console.log(`Final temperature: ${reactor.temperature}`);
