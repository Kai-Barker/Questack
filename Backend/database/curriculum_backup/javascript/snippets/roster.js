const crew = [
  { name: "Ari", rank: 3 },
  { name: "Bo", rank: 1 },
  { name: "Cy", rank: 4 },
];

const officers = crew
  .filter((member) => member.rank >= 3)
  .map((member) => member.name);

const byRank = [...crew].sort((a, b) => b.rank - a.rank).map((m) => m.name);

crew.forEach((member) => console.log(`${member.name} reporting`));
console.log(officers);
console.log(byRank);
