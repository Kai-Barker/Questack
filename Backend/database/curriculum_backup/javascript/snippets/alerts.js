const Alert = Object.freeze({
  GREEN: "green",
  YELLOW: "yellow",
  RED: "red",
});

let level = Alert.YELLOW;
console.log(level);

level = Alert.RED;
if (level === Alert.RED) {
  console.log("All hands to battle stations");
}

console.log(Object.isFrozen(Alert));
console.log(Object.keys(Alert));
