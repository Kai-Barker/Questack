class Scoreboard {
  kills = 0;
}

class Turret {
  constructor(board) {
    this.board = board;
  }

  hit() {
    this.board.kills++;
  }
}

const bridgeDisplay = new Scoreboard();
const port = new Turret(bridgeDisplay);
const starboard = new Turret(new Scoreboard());

port.hit();
starboard.hit();
starboard.hit();

console.log(`Bridge display: ${bridgeDisplay.kills} kills`);
