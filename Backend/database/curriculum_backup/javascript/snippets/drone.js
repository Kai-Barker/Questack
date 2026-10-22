class Drone {
  status() {
    return "Drone idle";
  }
}

class RepairDrone extends Drone {
  stauts() {
    return "Repairing hull";
  }
}

const drone = new RepairDrone();
console.log(drone.status());
