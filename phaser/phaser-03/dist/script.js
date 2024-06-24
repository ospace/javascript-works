const config = {
  type: Phaser.AUTO,
  width: 500,
  height: 300,
  backgroundColor: "#2d2d2d",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 200 }
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  }
};

var game = new Phaser.Game(config);

function preload() {
  this.move = 0;

  this.load.setBaseURL("//labs.phaser.io");

  this.load.atlas(
    "atlas",
    "assets/tests/fruit/veg.png",
    "assets/tests/fruit/veg.json"
  );
}

function create() {
  this.groupA = this.add.group();
  this.groupB = this.add.group();
  for (var i = 0; i < 1000; i++) {
    this.groupA.create(
      100 + Math.random() * 300,
      100 + Math.random() * 200,
      "atlas",
      "veg0" + Math.floor(1 + Math.random() * 9)
    );
  }

  for (var i = 0; i < 1000; i++) {
    this.groupB.create(
      100 + Math.random() * 300,
      100 + Math.random() * 200,
      "atlas",
      "veg0" + Math.floor(1 + Math.random() * 9)
    );
  }
}

function update() {
  Phaser.Actions.IncX(this.groupA.getChildren(), Math.cos(this.move));
  Phaser.Actions.IncY(this.groupA.getChildren(), Math.sin(this.move));
  Phaser.Actions.Rotate(this.groupA.getChildren(), -0.01);

  Phaser.Actions.IncX(this.groupB.getChildren(), -Math.cos(this.move));
  Phaser.Actions.IncY(this.groupB.getChildren(), -Math.sin(this.move));
  Phaser.Actions.Rotate(this.groupB.getChildren(), 0.01);

  this.move += 0.01;
}