class Radio {
  send(message) {
    console.log(`[Radio] ${message}`);
  }
}

class Navigator {
  nextWaypoint() {
    return "Waypoint Delta";
  }
}

class Captain {
  #radio = new Radio();
  #navigator = new Navigator();

  plotCourse() {
    const waypoint = this.#navigator.nextWaypoint();
    this.#radio.send(`Setting course for ${waypoint}`);
  }
}

new Captain().plotCourse();
