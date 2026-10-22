class Probe {
  constructor(target = "deep space", range = 500) {
    this.target = target;
    this.range = range;
  }

  describe() {
    return `${this.target} ${this.range}`;
  }
}

console.log(new Probe("Titan", 120).describe());
console.log(new Probe("Europa").describe());
console.log(new Probe().describe());
console.log(new Probe(undefined, 50).describe());
