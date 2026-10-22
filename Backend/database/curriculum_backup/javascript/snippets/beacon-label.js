class Beacon {
  constructor(label, frequency) {
    label = label;
    this.frequency = frequency;
  }
}

const beacon = new Beacon("Rescue", 121);
console.log(`Beacon '${beacon.label}' on ${beacon.frequency} MHz`);
