const alert = "yellow";
let shields = 0;

switch (alert) {
  case "red":
    shields = 100;
    break;
  case "yellow":
    shields = 50;
  case "green":
    shields = 10;
    break;
}

console.log(`Shields at ${shields}%`);
