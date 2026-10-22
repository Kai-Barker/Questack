const crates = ["fuel", "rations", "medkits"];

crates.push("ore");
console.log(crates.length);
console.log(crates[0]);
console.log(crates[crates.length - 1]);

const first = crates.shift();
console.log(first);
console.log(crates);
console.log(crates.includes("fuel"));
console.log(crates.indexOf("medkits"));
