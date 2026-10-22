let telemetry = "no data";

function fetchTelemetry(callback) {
  setTimeout(() => {
    callback("Hull 92%, shields 80%");
  }, 500);
}

fetchTelemetry((data) => {
  telemetry = data;
});

console.log(`Telemetry: ${telemetry}`);
