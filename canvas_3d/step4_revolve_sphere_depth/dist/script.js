const CTX = foo.getContext("2d");
const WIDTH = 600;
const HEIGHT = 400;

window.onload = animate;

let last = Date.now();
function animate() {
  let now = Date.now();
  const dt = (now - last) / 1000.0;
  draw(dt);
  last = now;
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
  let [x, y] = rotate(angle, this.x, this.y);
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
  let [y, z] = rotate(angle, this.y, this.z);
  this.y = y;
  this.z = z;
};

sphere.rotateY = function (angle) {
  let [x, z] = rotate(angle, this.x, this.z);
  this.x = x;
  this.z = z;
};

sphere.rotateZ = function (angle) {
  this.rotate(angle);
};

function clear(ctx, width, heigth) {
  ctx.clearRect(0, 0, width, heigth);
}

function clone(obj, attrs) {
  let ret = Object.create(obj);
  Object.assign(ret, attrs);

  return ret;
}

function rotate(angle, x, y) {
  let s = Math.sin(angle);
  let c = Math.cos(angle);

  return [x * c - y * s, x * s + y * c];
}

let [center, v] = [[WIDTH * 0.5, HEIGHT * 0.5], (2 * Math.PI) / 6];

Object.assign(sphere, { x: 0, y: 0, r: 20 });

const range = [...Array(5).keys()];
let g_data = range.map((it) => {
  let angle = (2 * Math.PI * it) / range.length;
  let x = 150 * Math.cos(angle);
  let z = 150 * Math.sin(angle);
  return clone(sphere, { x, z });
});

const VIEW_Z = 0.3;
function draw(dt) {
  clear(CTX, WIDTH, HEIGHT);

  g_data.sort((l, r) => r.z - l.z);
  g_data.forEach((it) => {
    it.rotateY(v * dt);
    let y = it.y - it.z * VIEW_Z;
    it.draw3D(CTX, center[0], center[1] + y);
  });
}