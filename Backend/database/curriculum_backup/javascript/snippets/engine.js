const Engine = Object.freeze({ OFF: 0, IDLE: 1, CRUISE: 2, BOOST: 3 });

function fuelPerMinute(mode) {
  switch (mode) {
    case Engine.OFF:
      return 0;
    case Engine.IDLE:
      return 1;
    case Engine.CRUISE:
      return 5;
    default:
      return 12;
  }
}

console.log(fuelPerMinute(Engine.CRUISE));
console.log(fuelPerMinute(Engine.BOOST));
console.log(Engine.CRUISE < Engine.BOOST);
