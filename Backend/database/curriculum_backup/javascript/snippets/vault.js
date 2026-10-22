class Vault {
  #credits = 0;

  constructor(owner) {
    this.owner = owner;
  }

  get credits() {
    return this.#credits;
  }

  deposit(amount) {
    if (amount > 0) this.#credits += amount;
  }

  withdraw(amount) {
    if (amount > this.#credits) return false;
    this.#credits -= amount;
    return true;
  }
}

const vault = new Vault("Vega");
vault.deposit(200);
vault.deposit(-50);
try {
  vault.credits = 9999;
} catch (error) {
  console.log("Credits only change through deposit and withdraw");
}
console.log(vault.withdraw(500));
console.log(vault.withdraw(80));
console.log(`${vault.owner}: ${vault.credits}`);
