const crates = 17;
const extra = 4;
const pods = 3;

// Share all the crates evenly between the pods: should be 7 each
const perPod = crates + extra / pods;

console.log("Crates per pod: " + perPod);
