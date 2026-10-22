class Crate {
  contents = "";
  weight = 0;

  isHeavy() {
    return this.weight > 50;
  }
}

const ore = new Crate();
ore.contents = "ore";
ore.weight = 80;

const seeds = new Crate();
seeds.contents = "seeds";
seeds.weight = 5;

for (const crate of [ore, seeds]) {
  const how = crate.isHeavy() ? "use the loader" : "carry by hand";
  console.log(`${crate.contents}: ${how}`);
}
console.log(ore instanceof Crate);
console.log(typeof Crate);
