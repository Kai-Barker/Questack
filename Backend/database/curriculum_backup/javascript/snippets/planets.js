async function loadPlanet(name) {
  const response = await fetch(`https://charts.example/planets/${name}`);
  if (!response.ok) {
    throw new Error(`Chart server said ${response.status}`);
  }
  const planet = await response.json();
  return `${planet.name}: ${planet.moons} moons`;
}

loadPlanet("tethys")
  .then((summary) => console.log(summary))
  .catch((error) => console.log(`Lookup failed: ${error.message}`));
