class Shuttle {
  dock() { return "Shuttle docked"; }
  launch() { return "Shuttle launched"; }
}

function prepare(craft) {
  if (typeof craft.launch === "function") {
    return craft.launch;
  }
  return "This craft can't be launched";
}

console.log(prepare(new Shuttle()));
