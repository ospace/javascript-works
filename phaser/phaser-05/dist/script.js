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
  this.load.setBaseURL("//labs.phaser.io");

  this.load.spritesheet("invader", "assets/tests/invaders/invader1.png", {
    frameWidth: 32,
    frameHeight: 32
  });
  this.load.spritesheet("boom", "assets/sprites/explosion.png", {
    frameWidth: 64,
    frameHeight: 64,
    endFrame: 23
  });
}

function create() {
  this.add
    .text(200, 22, "Click the invaders to destroy them", {
      color: "#00ff00"
    })
    .setOrigin(0.5, 0);

  [
    {
      key: "move",
      frames: "invader",
      frameRate: 4,
      repeat: -1
    },
    {
      key: "explode",
      frames: "boom",
      hideOnComplete: true
    }
  ].forEach((it) => this.anims.create(it));

  var colors = [
    0xef658c,
    0xff9a52,
    0xffdf00,
    0x31ef8c,
    0x21dfff,
    0x31aade,
    0x5275de,
    0x9c55ad,
    0xbd208c
  ];

  //  Create a load of random sprites
  for (var i = 0; i < 128; i++) {
    var x = Phaser.Math.Between(50, 450);
    var y = Phaser.Math.Between(50, 250);

    var invader = this.add.sprite(x, y, "invader");

    invader.play("move");
    invader.setTint(Phaser.Utils.Array.GetRandom(colors));
    invader.setInteractive();

    invader.once("pointerdown", function () {
      this.clearTint();
      // Sprite will have visible = false
      // set when the animation finishes repeating
      // because of 'hideOnComplete' property
      this.play("explode");
    });
  }
}

function update() {}