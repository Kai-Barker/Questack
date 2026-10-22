const beacon = new EventTarget();

function launchRescue(event) {
  console.log(`Rescue team launching for ${event.detail.ship}`);
}

beacon.addEventListener("distress", launchRescue);
beacon.addEventListener("distress", (event) => {
  console.log(`Log: ${event.detail.ship} in distress`);
});

console.log("Beacon armed");
beacon.dispatchEvent(new CustomEvent("distress", { detail: { ship: "Osprey" } }));
console.log("Signal handled");
