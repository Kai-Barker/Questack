function scanSector(sector, onScanned) {
  const contacts = { Alpha: 2, Beta: 0, Gamma: 5 };
  onScanned(sector, contacts[sector]);
}

function report(sector, count) {
  console.log(`${sector}: ${count} contacts`);
}

const busy = [];
const recordIfBusy = (sector, count) => {
  if (count > 1) busy.push(sector);
};

scanSector("Alpha", report);
scanSector("Gamma", report);
for (const s of ["Alpha", "Beta", "Gamma"]) scanSector(s, recordIfBusy);
console.log(busy);
