class Fighter {
  static built = 0;

  constructor(callsign) {
    this.callsign = callsign;
    Fighter.built++;
  }

  static motto() {
    return "Fly true";
  }
}

const a = new Fighter("Red 1");
const b = new Fighter("Red 2");
new Fighter("Gold 5");

console.log(Fighter.built);
console.log(b.callsign);
console.log(Fighter.motto());
console.log(a.built);
