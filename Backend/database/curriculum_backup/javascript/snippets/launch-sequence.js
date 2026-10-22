const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function launchSequence() {
  console.log("Fuelling");
  await wait(200);
  console.log("Fuelled");
  await wait(100);
  console.log("Liftoff!");
  return "In orbit";
}

console.log("Sequence requested");
launchSequence().then((status) => console.log(status));
console.log("Mission control standing by");
