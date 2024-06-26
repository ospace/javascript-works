const config = {
  type: Phaser.AUTO,
  width: 500,
  height: 300,
  pixelArt: true,
  physics: {
    default: "arcade"
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
  this.load.image("tiles", "assets/tilemaps/tiles/catastrophi_tiles_16.png");
  this.load.tilemapCSV("map", "assets/tilemaps/csv/catastrophi_level2.csv");
  this.load.spritesheet("player", "assets/sprites/spaceman.png", {
    frameWidth: 16,
    frameHeight: 16
  });
}

let map, player, cursors, text, textTime;
let count = 110;

function create() {
  map = this.make.tilemap({ key: "map", tileWidth: 16, tileHeight: 16 });
  let tileset = map.addTilesetImage("tiles");
  let layer = map.createLayer(0, tileset, 0, 0);

  // 특정 key에서는 player 스프라이트의 start 위치과 end 위치 사이 프레임이미지 사용.
  function createKey(key, start, end) {
    this.anims.create({
      key,
      frames: this.anims.generateFrameNumbers("player", { start, end }),
      frameRate: 10,
      repeat: -1
    });
  }

  // 애니메이션 키 설정
  createKey.call(this, "left", 8, 9);
  createKey.call(this, "right", 1, 2);
  createKey.call(this, "up", 11, 13);
  createKey.call(this, "down", 4, 6);

  // player 스프라이트 로딩
  player = this.physics.add.sprite(250, 150, "player", 1);
  // 카메라 설정
  this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
  this.cameras.main.startFollow(player);

  cursors = this.input.keyboard.createCursorKeys();

  this.data.set("lifes", 3);
  this.data.set("level", 5);
  this.data.set("score", 0);

  text = this.add.text(10, 10, "", {
    font: "12px Courier",
    fill: "#00ff00"
  });

  textTime = this.add
    .text(config.width - 10, 10, "", {
      font: "36px Courier",
      fill: "#00ff00",
      align: "right"
    })
    .setOrigin(1, 0)
    .setScrollFactor(0);

  updateText.call(this);
}

function update(time, delta) {
  updatePlayer();
  updateMap();
  [cursors.left, cursors.right, cursors.up, cursors.down].forEach((it) => {
    if (it.isDown) {
      this.data.set("score", this.data.get("score") + 1);
    }
  });
  updateText.call(this);
  count -= delta / 1000;
}

function updateMap() {
  // 플레이어 위치에 따른 맵 원점 추출
  var origin = map.getTileAtWorldXY(player.x, player.y);

  // 모든 타일에 대해서
  origin &&
    map.forEachTile(function (tile) {
      // 타일 위치와 맵 원점 위치 거리 계산
      var dist = Phaser.Math.Distance.Chebyshev(
        origin.x,
        origin.y,
        tile.x,
        tile.y
      );

      // 거리에 따라 타일 알파값 설정
      tile.setAlpha(1 - 0.1 * dist);
    });
}
function updateText() {
  text.setText([
    "Level: " + this.data.get("level"),
    "Lifes: " + this.data.get("lifes"),
    "Score: " + this.data.get("score")
  ]);
  textTime.setText([Math.max(0, Math.floor(count))]);
}

function updatePlayer() {
  // 이동 정지
  player.body.setVelocity(0);

  // 왼쪽, 오른쪽 이동
  if (cursors.left.isDown) {
    player.body.setVelocityX(-100);
  } else if (cursors.right.isDown) {
    player.body.setVelocityX(100);
  }

  // 위, 아래 이동
  if (cursors.up.isDown) {
    player.body.setVelocityY(-100);
  } else if (cursors.down.isDown) {
    player.body.setVelocityY(100);
  }

  // 키 방향에 따른 스프라이트 모양 변화
  if (cursors.left.isDown) {
    player.anims.play("left", true);
  } else if (cursors.right.isDown) {
    player.anims.play("right", true);
  } else if (cursors.up.isDown) {
    player.anims.play("up", true);
  } else if (cursors.down.isDown) {
    player.anims.play("down", true);
  } else {
    player.anims.stop();
  }
}
