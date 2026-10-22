const ship = { name: "Osprey", crew: ["Ari", "Bo"] };

const shallow = { ...ship };
const deep = structuredClone(ship);

shallow.crew.push("Cy");
deep.crew.push("Dee");

console.log(ship.crew);
console.log(shallow.crew === ship.crew);
console.log(deep.crew);
console.log({ x: 1 } === { x: 1 });
