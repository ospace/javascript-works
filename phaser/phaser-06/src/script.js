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

  this.load.image("map", "assets/tests/camera/earthbound-scarab.png");
}

function create() {
  this.cameras.main.setBounds(0, 0, 1024, 2048);
  this.add.image(0, 0, "map").setOrigin(0);
  this.cameras.main.setZoom(1);
  this.cameras.main.centerOn(0, 0);
  this.text = this.add
    .text(100, 100)
    .setText("Click to move")
    .setScrollFactor(0);
  this.text.setShadow(1, 1, "#000000", 2);
  this.pos = 0;
  this.positions = [
    {
      alpha: 0.5,
      pan: [767, 1096, 2000, "Power2"],
      zoomTo: [4, 3000]
    },
    {
      alpha: 1,
      pan: [703, 1621, 2000, "Elastic"],
      zoomTo: [2, 3000],
      shake: [1000, 0.005]
    },
    {
      alpha: 0.2,
      pan: [256, 623, 2000, "Sine.easeInOut"],
      zoomTo: [1, 3000]
    },
    {
      alpha: 0.9,
      pan: [166, 304, 2000]
    },
    {
      alpha: 0.1,
      pan: [624, 158, 2000],
      zoomTo: [0.5, 3000]
    },
    {
      alpha: 0.6,
      pan: [680, 330, 2000]
    },
    {
      alpha: 1,
      pan: [748, 488, 2000]
    },
    {
      pan: [1003, 1719, 2000],
      shake: [1000, 0.005],
      fade: [2000]
    }
  ];

  // foo 스프라이트 움직임과 같이 카메라 움직임
  // this.cameras.main.startFollow(foo);

  this.input.on(
    "pointerdown",
    function () {
      const cam = this.cameras.main;
      const p = this.positions[this.pos++];
      if (p.alpha) cam.alpha = p.alpha;
      if (p.pan) cam.pan.apply(cam, p.pan);
      if (p.zoomTo) cam.zoomTo.apply(cam, p.zoomTo);
      if (p.shake) cam.shake.apply(cam, p.shake);
      // if (p.fade) cam.fade.apply(cam, p.fade);
      if (this.pos === this.positions.length) this.pos = 0;
    },
    this
  );
}

function update() {
  const cam = this.cameras.main;
  const p = this.positions[this.pos - 1];
  if (p) {
    if (p.shake) cam.shake.apply(cam, p.shake);
    // if (p.fade) {
    //   if (cam.fadeEffect.alpha >= 1) {
    //     cam.fadeEffect.alpha = 0;
    //     cam.fade.apply(cam, p.fade);
    //   }
    // }
  }

  this.text.setText([
    "Click to move",
    "x: " + cam.scrollX.toFixed(2),
    "y: " + cam.scrollY.toFixed(2)
  ]);
}
