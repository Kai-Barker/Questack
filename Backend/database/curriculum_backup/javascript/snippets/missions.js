class Mission {
  get reward() {
    throw new Error(`${this.constructor.name} must set a reward`);
  }

  brief() {
    return this.reward >= 500 ? "High-value mission" : "Routine mission";
  }
}

class Escort extends Mission {
  get reward() { return 300; }
}

class Rescue extends Mission {
  get reward() { return 750; }
}

class Survey extends Mission {}

console.log(new Escort().brief());
console.log(new Rescue().brief());
try {
  console.log(new Survey().brief());
} catch (error) {
  console.log(error.message);
}
