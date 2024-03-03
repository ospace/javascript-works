const config = {
  type: Phaser.AUTO,
  width: 500,
  height: 300,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 200 }
    }
  },
  scene: {
    preload: preload,
    create: create
  }
};

var game = new Phaser.Game(config);

function preload() {
  this.load.setBaseURL("//labs.phaser.io");

  this.load.spritesheet("diamonds", "assets/sprites/diamonds32x24x5.png", {
    frameWidth: 32,
    frameHeight: 24
  });
}

function create() {
  const group = this.add.group({
    key: "diamonds",
    frame: [0, 1, 2, 3, 4],
    frameQuantity: 20
  });
  Phaser.Actions.GridAlign(group.getChildren(), {
    width: 10,
    height: 10,
    cellWidth: 32,
    cellHeight: 32,
    x: 100,
    y: 100
  });
}