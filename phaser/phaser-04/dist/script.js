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

  this.load.spritesheet("mummy", "assets/animations/mummy37x45.png", {
    frameWidth: 37,
    frameHeight: 45
  });

  this.load.path = "assets/animations/";
  this.load.image("cat1", "cat1.png");
  this.load.image("cat2", "cat2.png");
  this.load.image("cat3", "cat3.png");
  this.load.image("cat4", "cat4.png");
}

function create() {
  // this.frameView = this.add.graphics({
  //   fillStyle: { color: 0xff00ff },
  //   x: 32,
  //   y: 32,
  // });
  //this.add.image(32, 32, 'mummy', '__BASE').setOrigin(0);

  const config = {
    key: "walk",
    frames: this.anims.generateFrameNumbers("mummy"),
    frameRate: 8,
    yoyo: false,
    repeat: -1
  };

  this.anim = this.anims.create(config);
  this.sprite = this.add.sprite(300, 200, "mummy").setScale(2);
  this.sprite.anims.load("walk");
  a = this.sprite.anims;
  this.progress = this.add.text(20, 200, "Progress: 0.0%", {
    color: "#00ff00"
  });
  this.input.keyboard.on(
    "keydown-SPACE",
    function (event) {
      if (this.sprite.anims.isPlaying) {
        this.sprite.anims.pause();
      } else if (this.sprite.anims.isPaused) {
        this.sprite.anims.resume();
      } else {
        this.sprite.anims.play("walk");
      }
    },
    this
  );

  // cat
  this.anims.create({
    key: "snooze",
    frames: [
      { key: "cat1" },
      { key: "cat2" },
      { key: "cat3" },
      { key: "cat4", duration: 50 }
    ],
    frameRate: 8,
    repeat: -1
  });

  this.add.sprite(250, 50, "cat1").setScale(0.3).play("snooze");
}

function update() {
  //this.frameView.clear();
  //this.frameView.fillRect(this.sprite.frame.cutX, 0, 37, 45);

  const debug = [
    "SPACE to start animation",
    "",
    "Progress: " + (this.sprite.anims.getProgress() * 100).toFixed(1) + "%",
    "Accumulator: " + this.sprite.anims.accumulator,
    "NextTick: " + this.sprite.anims.nextTick
  ];
  this.progress.setText(debug);
}