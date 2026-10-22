const ship = {
  name: "Heron",
  fuel: 80,
  report: () => {
    return `${this.name} has ${this.fuel} fuel`;
  },
};

console.log(ship.report());
