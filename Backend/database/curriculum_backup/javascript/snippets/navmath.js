class NavMath {
  static LIGHT_SPEED = 299792.458;

  static travelSeconds(km) {
    return km / NavMath.LIGHT_SPEED;
  }
}

console.log(NavMath.travelSeconds(599584.916));
console.log(Math.max(12, 30));
console.log(Math.round(2.5));
console.log(Math.floor(7.9));
