class Ship {
  attack() {
    return "fires a warning shot";
  }
}

class Fighter extends Ship {
  attack() {
    return "fires lasers";
  }
}

class Bomber extends Ship {
  attack() {
    return `drops payload, then ${super.attack()}`;
  }
}

for (const ship of [new Ship(), new Fighter(), new Bomber()]) {
  console.log(ship.attack());
}
