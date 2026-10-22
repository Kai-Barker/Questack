class Craft {
  constructor() {
    console.log("Frame assembled");
  }
}

class Fighter extends Craft {
  constructor() {
    super();
    console.log("Weapons fitted");
  }
}

class Interceptor extends Fighter {
  constructor() {
    super();
    console.log("Afterburners installed");
  }
}

const jet = new Interceptor();
console.log(jet instanceof Craft);
