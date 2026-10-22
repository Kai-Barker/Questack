function parseCoordinate(text) {
  const value = Number(text);
  if (Number.isNaN(value)) {
    throw new Error(`'${text}' isn't a coordinate`);
  }
  return value;
}

for (const input of ["42", "4x2", "-7"]) {
  try {
    console.log(`Plotting course to ${parseCoordinate(input)}`);
  } catch (error) {
    console.log(`Rejected: ${error.message}`);
  } finally {
    console.log("Input checked");
  }
}
