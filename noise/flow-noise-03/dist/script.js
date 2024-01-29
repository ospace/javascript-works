/*
	MIT License
	Copyright (c) 2022 ospace(ospace114@empal.com)
*/

const ctx = canvas1.getContext("2d");
const width = canvas1.width;
const height = canvas1.height;
const x0 = width / 2;
const y0 = height / 2;
const MAX_AGE = 200;

ctx.lineWidth = 1;
//ctx.fillStyle = "rgba(0, 0, 0, 0.97)";
ctx.fillStyle = "rgba(0, 0, 0, 0.1)";

const colorStyles = [];
for (let i = 85; i <= 255; i += 10) {
  colorStyles.push(`rgb(${i},${i},${i})`);
}

let particles = new Array(10000);
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
    buckets[Math.floor(colorStyles.length * it.angle)].push(it);
  });
  draw();
  const runtime = performance.now() - begin;
  setTimeout(render, 40 - runtime);
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

function field(x, y) {
  const m = noise((2 * x) / width, (2 * y) / height);
  const v = m * 3;
  const q = m * Math.PI * 2;
  return [x + Math.cos(q) * v, y + Math.sin(q) * v];
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

function mix(l, r, f) {
  return l * (1 - f) + r * f;
}

function randomRange(minVal, maxVal) {
  return minVal + Math.floor(Math.random() * (maxVal - minVal + 1));
}