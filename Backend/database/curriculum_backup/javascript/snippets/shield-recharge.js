class Shield {
  #strength = 0;

  get strength() {
    return this.#strength;
  }

  set strength(value) {
    if (value >= 0 && value <= 100) this.#strength = value;
  }

  recharge() {
    this.#strength += 40;
  }
}

const shield = new Shield();
shield.strength = 90;
shield.recharge();
console.log(`Shield: ${shield.strength}%`);
