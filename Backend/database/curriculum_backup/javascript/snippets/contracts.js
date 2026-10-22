const canDock = (craft) => typeof craft.dock === "function";

class Shuttle {
  dock(station) {
    return `Shuttle docking at ${station}`;
  }
}

const probe = {
  dock(station) {
    return `Probe latching onto ${station}`;
  },
};

const asteroid = { name: "Rock-42" };

for (const thing of [new Shuttle(), probe, asteroid]) {
  console.log(canDock(thing) ? thing.dock("Theta") : `${thing.name} can't dock`);
}
