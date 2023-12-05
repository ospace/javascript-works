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
  ctx.arc(this.x + x, this.y + y, this.r, 0, 2 * Math.PI);
  Object.assign(ctx, this.props);
  ctx.fill();
  ctx.stroke();
};

circle.rotate = function (angle) {
  let s = Math.sin(angle);
  let c = Math.cos(angle);

  let x = this.x * c - this.y * s;
  let y = this.x * s + this.y * c;

  this.x = x;
  this.y = y;
};

let sphere = clone(circle, { x: 400 });
sphere.draw = function (ctx, x = 0, y = 0) {
  let [r1, r2] = [this.r * 0.2, this.r * 0.4];
  let grd = ctx.createRadialGradient(
    this.x + x - r2,
    this.y + y - r2,
    r1,
    this.x + x - r1,
    this.y + y - r1,
    this.r + r1
  );
  grd.addColorStop(0, "#e5dbea");
  grd.addColorStop(0.2, "#dc94fc");
  grd.addColorStop(0.9, "#582272");
  grd.addColorStop(0.98, "#7c349c");
  grd.addColorStop(1, "#8c34b4");
  this.props.fillStyle = grd;

  circle.draw.call(this, ctx, x, y);
};

let [center, v] = [[WIDTH * 0.5, HEIGHT * 0.5], (2 * Math.PI) / 6];
Object.assign(sphere, { x: 100, y: 0, r: 30 });
let sphere1 = clone(sphere, { x: 50, y: 10, r: 10 });

function draw(dt) {
  clearFoo();

  sphere.rotate(v * dt);
  sphere.draw(CTX, center[0], center[1]);

  sphere1.rotate(v * dt);
  sphere1.draw(CTX, center[0] + sphere.x, center[1] + sphere.y);
}

function clearFoo() {
  clear(CTX, foo.width, foo.height);
}

function clear(ctx, width, heigth) {
  ctx.clearRect(0, 0, width, heigth);
}

function clone(obj, attrs) {
  let ret = Object.create(obj);
  Object.assign(ret, attrs);

  return ret;
}
