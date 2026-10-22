const toKilometres = (lightSeconds) => {
  lightSeconds * 299792;
};

const distance = toKilometres(2);
console.log(`Distance: ${distance} km`);
