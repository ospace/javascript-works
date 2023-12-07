const CTX = foo.getContext("2d");
const WIDTH = 600;
const HEIGHT = 400;

window.onload = animate;

let g_last = Date.now();
function animate() {
  let now = Date.now();
  const dt = (now - g_last) / 1000.0;
  draw(dt);
  g_last = now;
  requestAnimationFrame(animate);
}

const Empty = Object.freeze(Object.create(null));

let circle = clone(Empty, {
  x: 200,
  y: 200,
  r: 80,
  props: { lineWIdth: 0.5, fillStyle: "#dc94fc" }
});

circle.draw = function (ctx, x = 0, y = 0) {
  ctx.beginPath();
  ctx.arc(this.x + x, this.y + y, this.r * this.s, 0, 2 * Math.PI);
  Object.assign(ctx, this.props);
  ctx.fill();
  ctx.stroke();
};

circle.rotate = function (angle) {
  let [x, y] = o.rotate(angle, this.x, this.y);
  this.x = x;
  this.y = y;
};

let sphere = clone(circle, { z: 0, f: 300 });
sphere.draw = function (ctx, x = 0, y = 0) {
  let r = this.r * this.s;
  let [r1, r2] = [r * 0.2, r * 0.4];
  let grd = ctx.createRadialGradient(
    this.x + x - r2,
    this.y + y - r2,
    r1,
    this.x + x - r1,
    this.y + y - r1,
    r + r1
  );
  grd.addColorStop(0, "#e5dbea");
  grd.addColorStop(0.2, "#dc94fc");
  grd.addColorStop(0.9, "#582272");
  grd.addColorStop(0.98, "#7c349c");
  grd.addColorStop(1, "#8c34b4");
  this.props.fillStyle = grd;

  circle.draw.call(this, ctx, x, y);
};

sphere.draw3D = function (ctx, x = 0, y = 0) {
  if (this.z < -this.f) return;

  this.s = this.f / (this.f + this.z);
  this.draw(ctx, x, y);
};

sphere.rotateX = function (angle) {
  let [y, z] = o.rotate(angle, this.y, this.z);
  this.y = y;
  this.z = z;
};

sphere.rotateY = function (angle) {
  let [x, z] = o.rotate(angle, this.x, this.z);
  this.x = x;
  this.z = z;
};

sphere.rotateZ = function (angle) {
  this.rotate(angle);
};

const COLOR_TEXT = "#dc94fc";
const COLOR_HOVER = "#e5dbea";
let text = clone(sphere, {
  text: "TAG",
  x: 300,
  y: 200,
  s: 1.0,
  size: 20,
  alpha: 1.0,
  props: {
    fillStyle: "black"
  }
});

text.draw = function (ctx, x = 0, y = 0) {
  Object.assign(ctx, this.props);

  ctx.save();
  ctx.globalAlpha = this.alpha;
  ctx.fillStyle = "rgba(0, 0, 0, .1)";
  for (let i = -2; i < 3; ++i) {
    for (let j = -2; j < 3; ++j) {
      ctx.fillText(this.text, this.x + x + i, this.y + y + j);
    }
  }
  ctx.restore();

  ctx.fillText(this.text, this.x + x, this.y + y);
};

text.draw3D = function (ctx, x = 0, y = 0) {
  if (this.z < -this.f) return;

  this.s = this.f / (this.f + this.z);
  this.alpha = this.s * 0.5;
  this.props.font = `bold ${this.size * this.s}px Verdana`;
  this.draw(ctx, x, y);
};

text.isHit = function (ctx, x, y) {
  if (this.size >> 1 < Math.abs(y - this.y)) return false;
  let measure = ctx.measureText(this.text);
  if ((measure.width - 4) >> 1 < Math.abs(x - this.x)) return false;

  return true;
};

function clear(ctx, width, heigth) {
  ctx.clearRect(0, 0, width, heigth);
}

function clone(obj, attrs) {
  let ret = Object.create(obj);
  Object.assign(ret, attrs);

  return ret;
}

let [center, vx, vy] = [[WIDTH * 0.5, HEIGHT * 0.5], 0, 0];

let g_pointer = {
  pressed: null,
  first: [0, 0],
  last: [0, 0]
};
foo.addEventListener("mousedown", ({ offsetX, offsetY }) => {
  g_pointer.pressed = Date.now();
  g_pointer.first[0] = offsetX;
  g_pointer.first[1] = offsetY;
  g_pointer.last[0] = offsetX;
  g_pointer.last[1] = offsetY;
  vx = 0;
  vy = 0;
});

foo.addEventListener("mousemove", ({ offsetX, offsetY }) => {
  if (g_pointer.pressed) {
    let dx = offsetX - g_pointer.last[0];
    let dy = offsetY - g_pointer.last[1];

    g_data.forEach((it) => {
      it.rotateX(dy / 100);
      it.rotateY(dx / 100);
    });
  }

  g_pointer.last[0] = offsetX;
  g_pointer.last[1] = offsetY;
});

foo.addEventListener("mouseup", (_) => {
  let dx = g_pointer.last[0] - g_pointer.first[0];
  let dy = g_pointer.last[1] - g_pointer.first[1];
  let dt = (Date.now() - g_pointer.pressed) / 1000.0;

  vx = (dy / dt) * 0.01;
  vy = (dx / dt) * 0.01;

  g_pointer.pressed = null;
});

let g_data = [...Array(20).keys()].map((it) => {
  let x = o.randomInt(300) - 150;
  let y = o.randomInt(200) - 100;
  let z = o.randomInt(200) - 100;
  return clone(text, {
    text: `TAG${it}`,
    x,
    y,
    z,
    props: {
      textAlign: "center",
      textBaseline: "middle",
      fillStyle: COLOR_TEXT
    }
  });
});

let hoverObject = null;
function draw(dt) {
  clear(CTX, WIDTH, HEIGHT);

  vx = vx * 0.98;
  vy = vy * 0.98;
  g_data.forEach((it) => {
    it.rotateX(vx * dt);
    it.rotateY(vy * dt);
  });
  g_data.sort((l, r) => r.z - l.z);

  let x = g_pointer.last[0] - center[0];
  let y = g_pointer.last[1] - center[1];
  if (hoverObject && !hoverObject.isHit(CTX, x, y)) {
    hoverObject.props.fillStyle = COLOR_TEXT;
    hoverObject = null;
  }

  for (let i = g_data.length - 1; 0 <= i; --i) {
    let it = g_data[i];
    if (it.isHit(CTX, x, y)) {
      if (hoverObject) {
        if (hoverObject.z < it.z) continue;
        hoverObject.props.fillStyle = COLOR_TEXT;
      }

      it.props.fillStyle = COLOR_HOVER;
      hoverObject = it;
      break;
    }
  }

  g_data.forEach((it) => it.draw3D(CTX, center[0], center[1]));
}
