const codes = new Map();
codes.set("Kestrel", "K-117");
codes.set("Osprey", "O-204");

const visitor = "Osprey";
const code = codes[visitor];

console.log(`${visitor} cleared with code ${code}`);
