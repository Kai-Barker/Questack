function readScale(reading) {
  const weight = Number(reading);
  if (Number.isNaN(weight)) {
    throw new Error("Scale reading is not a number");
  }
  return weight;
}

let weight = 0;
try {
  weight = readScale("heavy");
} catch (error) {
}

console.log(`Cargo weight: ${weight} tonnes`);
