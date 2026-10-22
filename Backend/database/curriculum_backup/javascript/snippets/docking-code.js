async function loadDockingCode(ship) {
  const response = await fetch(`https://dock.example/codes/${ship}`);
  const data = await response.json();
  return data.code;
}

loadDockingCode("Heron")
  .then((code) => console.log(`Docking code: ${code}`))
  .catch((error) => console.log(`Could not load a code: ${error.message}`));
