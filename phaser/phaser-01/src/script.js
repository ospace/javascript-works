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

  this.load.image("sky", "/assets/skies/space3.png");
  this.load.image("logo", "/assets/sprites/phaser3-logo.png");
  this.load.image("red", "/assets/particles/red.png");
}

function create() {
  this.add.image(200, 200, "sky");

  var particles = this.add.particles("red");

  var emitter = particles.createEmitter({
    speed: 50,
    scale: { start: 1, end: 0 },
    blendMode: "ADD"
  });

  var logo = this.physics.add.image(100, 50, "logo");

  logo.setVelocity(100, 200);
  logo.setBounce(1, 1);
  logo.setCollideWorldBounds(true);

  emitter.startFollow(logo);
}
