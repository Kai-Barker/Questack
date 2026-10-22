const Status = Object.freeze({ DOCKED: "docked", IN_FLIGHT: "in-flight" });

const shuttleStatus = Status.IN_FLIGHT;

if (shuttleStatus === "in flight") {
  console.log("Osprey is on its way");
} else {
  console.log("Osprey is still docked");
}
