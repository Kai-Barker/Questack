const distances = [120, 9, 45, 1000, 3];

// Closest first
distances.sort();

console.log(`Closest: ${distances[0]}`);
console.log(`Furthest: ${distances[distances.length - 1]}`);
