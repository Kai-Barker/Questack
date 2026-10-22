class Turret {
  ammo = 10;

  fire() {
    ammo--;
  }
}

const left = new Turret();
left.fire();
console.log(`Ammo left: ${left.ammo}`);
