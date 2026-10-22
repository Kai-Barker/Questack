const callsign = "Vega";
const crew = 4;

const joined = "Pilot " + callsign + " with " + crew + " crew";
const templated = `Pilot ${callsign} with ${crew} crew`;

console.log(joined);
console.log(templated);
console.log(`Crew next shift: ${crew + 2}`);
console.log("Status:\tready\nOver and out");
