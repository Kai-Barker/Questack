async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} failed with ${response.status}`);
  return response.json();
}

async function briefing() {
  try {
    const [weather, traffic] = await Promise.all([
      getJson("https://ops.example/weather"),
      getJson("https://ops.example/traffic"),
    ]);
    console.log(`Weather: ${weather.status}, traffic: ${traffic.ships} ships`);
  } catch (error) {
    console.log(`Briefing unavailable: ${error.message}`);
  } finally {
    console.log("Briefing request finished");
  }
}

briefing();
