const shipClass = "tanker";
let bay;

switch (shipClass) {
  case "fighter":
    bay = "Hangar A";
    break;
  case "freighter":
  case "tanker":
    bay = "Cargo Bay 3";
    break;
  default:
    bay = "Holding pattern";
}

console.log(`Assigned to: ${bay}`);
