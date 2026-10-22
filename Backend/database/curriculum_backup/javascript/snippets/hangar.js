const hangar = new EventTarget();
let welcomed = 0;

hangar.addEventListener("landed", (event) => {
  welcomed++;
  console.log(`Welcome home, ${event.detail}`);
});

hangar.dispatchEvent(new CustomEvent("landed", { detail: "Kestrel" }));

// Stop greeting ships during the night shift
hangar.removeEventListener("landed", (event) => {
  welcomed++;
  console.log(`Welcome home, ${event.detail}`);
});

hangar.dispatchEvent(new CustomEvent("landed", { detail: "Osprey" }));
console.log(`Ships welcomed: ${welcomed}`);
