let a = 10;
let b = a;
b = 99;

const original = { name: "Kestrel" };
const alias = original;
alias.name = "Renamed";

const copy = { ...original };
copy.name = "Copy";

console.log(a);
console.log(original.name);
console.log(copy.name);
console.log(alias === original);
console.log(copy === original);
