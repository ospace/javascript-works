/*
	MIT License
	Copyright (c) 2022 ospace(ospace114@empal.com)
*/

const tilesSize = 50;
const MAX_AGE = 100;

const width = canvas1.width;
const height = canvas1.height;
const tilesX = width / tilesSize;
const tilesY = height / tilesSize;
const ctx2 = new PixelCanvas(canvas2);
ctx2.drawUV((u, v) => {
  return [noise(tilesX * u, tilesY * v) * 255, 0, 90, 100];
});

const ctx = canvas1.getContext("2d");
ctx.lineWidth = 1;
ctx.fillStyle = "rgba(0, 0, 0, 0.97)";
const colorStyles = [];
for (let i = 85; i <= 255; i += 10) {
  colorStyles.push(`rgb(${i},${i},${i})`);
}

let particles = new Array(3000);
for (let i = 0; i < particles.length; ++i) {
  particles[i] = {
    x: randomRange(0, width),
    y: randomRange(0, height),
    angle: Math.random(),
    age: Math.floor(Math.random() * MAX_AGE)
  };
}
const buckets = colorStyles.map((it) => []);

function render() {
  const begin = performance.now();
  buckets.forEach((it) => (it.length = 0));
  particles.forEach((it) => {
    if (isOver(it.x, it.y) || 0 > it.age) {
      it.x = randomRange(0, width);
      it.y = randomRange(0, height);
      it.angle = Math.random();
      it.age = MAX_AGE;
    }
    const res = field(it.x, it.y);
    it.x1 = res[0];
    it.y1 = res[1];
    buckets[Math.floor(colorStyles.length * res[2])].push(it);
  });
  draw();
  const runtime = performance.now() - begin;
  setTimeout(render, Math.max(40 - runtime, 0));
}
render();
// ref: https://github.com/cambecc/earth
function draw() {
  let prev = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "destination-in";
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = prev;
  for (let i = 0; i < buckets.length; ++i) {
    const particles = buckets[i];
    ctx.beginPath();
    ctx.strokeStyle = colorStyles[i];
    for (let j = 0; j < particles.length; ++j) {
      let particle = particles[j];
      ctx.moveTo(particle.x, particle.y);
      ctx.lineTo(particle.x1, particle.y1);
      particle.x = particle.x1;
      particle.y = particle.y1;
      --particle.age;
    }
    ctx.stroke();
  }
}
function rotateX(q, l) {
  return Math.cos(q) * l;
}
function rotateY(q, l) {
  return Math.sin(q) * l;
}
function field(x, y) {
  const m = noise((tilesX * x) / width, (tilesY * y) / height);
  const v = m * 5;
  const q = m * Math.PI * 2;
  return [x + Math.cos(q) * v, y + Math.sin(q) * v, m];
}
function isOver(x, y) {
  return 0 > x || x > width || 0 > y || y > height;
}

// https://thebookofshaders.com/13/
function noise(x, y) {
  let ix = Math.floor(x);
  let fx = x - ix;
  let iy = Math.floor(y);
  let fy = y - iy;
  const a = random(ix * 2.3 + iy * 6.7);
  const b = random((ix + 1) * 2.3 + iy * 6.7);
  const c = random(ix * 2.3 + (iy + 1) * 6.7);
  const d = random((ix + 1) * 2.3 + (iy + 1) * 6.7);
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  return mix(a, b, fx) + mix((c - a) * fy, (d - b) * fy, fx);
}
function random(val) {
  const ret = (Math.sin(val * 12.345) * 4321.987) % 1;
  return 0 > ret ? 1 + ret : ret;
}
function randomRange(minVal, maxVal) {
  return minVal + Math.floor(Math.random() * (maxVal - minVal + 1));
}
function mix(l, r, f) {
  return l * (1 - f) + r * f;
}