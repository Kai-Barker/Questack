function warmUpEngines(seconds) {
  return new Promise((resolve, reject) => {
    if (seconds < 0) {
      reject(new Error("Time can't run backwards"));
      return;
    }
    setTimeout(() => resolve(`Engines warm after ${seconds}s`), seconds * 100);
  });
}

console.log("Starting engines");

warmUpEngines(2)
  .then((message) => console.log(message))
  .catch((error) => console.log(`Failed: ${error.message}`));

warmUpEngines(-1)
  .then((message) => console.log(message))
  .catch((error) => console.log(`Failed: ${error.message}`));

console.log("Waiting...");
