const fuel = [80, 15, 60, 5, 45];

const low = fuel.filter((f) => f < 20);
const doubled = fuel.map((f) => f * 2);
const firstBig = fuel.find((f) => f > 50);
const total = fuel.reduce((sum, f) => sum + f, 0);

console.log(low);
console.log(doubled);
console.log(firstBig);
console.log(total);
console.log(fuel);
