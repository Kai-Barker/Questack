const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function readFuelGauge() {
  await wait(100);
  return 72;
}

async function preflight() {
  const fuel = readFuelGauge();
  if (fuel > 50) {
    console.log("Fuel OK, cleared for launch");
  } else {
    console.log(`Fuel too low: ${fuel}`);
  }
}

preflight();
