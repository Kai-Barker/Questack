class Weapon {
  damage() {
    return 0;
  }

  fire() {
    console.log(`Hits for ${this.damage()}`);
  }
}

class Laser extends Weapon {
  damage() { return 30; }
}

class Railgun extends Weapon {
  charge = 3;
}

new Laser().fire();
new Railgun().fire();
