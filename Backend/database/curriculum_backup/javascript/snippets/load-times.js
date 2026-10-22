class Cargo {
  loadTime() { return 10; }
}

class Fragile extends Cargo {
  loadTime() { return 25; }
}

const alienPod = { loadTime() { return 40; } };

function totalLoadTime(items) {
  return items.reduce((sum, item) => sum + item.loadTime(), 0);
}

console.log(totalLoadTime([new Cargo(), new Fragile(), alienPod]));
console.log(alienPod instanceof Cargo);
