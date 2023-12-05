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

circle.draw = function (ctx) {
  ctx.beginPath();
  ctx.arc(this.x, this.y, this.r, 0, 2 * Math.PI);
  Object.assign(ctx, this.props);
  ctx.fill();
  ctx.stroke();
};

let sphere = clone(circle, { x: 400 });
sphere.draw = function (ctx) {
  let [r1, r2] = [this.r * 0.2, this.r * 0.4];
  let grd = ctx.createRadialGradient(
    this.x - r2,
    this.y - r2,
    r1,
    this.x - r1,
    this.y - r1,
    this.r + r1
  );
  grd.addColorStop(0, "#e5dbea");
  grd.addColorStop(0.2, "#dc94fc");
  grd.addColorStop(0.9, "#582272");
  grd.addColorStop(0.98, "#7c349c");
  grd.addColorStop(1, "#8c34b4");
  this.props.fillStyle = grd;

  circle.draw.call(this, ctx);
};

let [angle, v] = [0, (2 * Math.PI) / 6];

function draw(dt) {
  clearFoo();

  angle += v * dt;
  CTX.save();
  CTX.translate(WIDTH * 0.5, HEIGHT * 0.5);
  CTX.rotate(angle);
  Object.assign(sphere, { x: 100, y: 0, r: 30 }).draw(CTX);

  CTX.translate(100, 0);
  CTX.rotate(angle);
  Object.assign(sphere, { x: 50, y: 0, r: 10 }).draw(CTX);
  CTX.restore();
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
