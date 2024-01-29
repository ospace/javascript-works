/*
	MIT License
	Copyright (c) 2022 ospace(ospace114@empal.com)
*/

const ctx = canvas1.getContext("2d");
const width = canvas1.width;
const height = canvas1.height;
const MAX_AGE = 100;

const x0 = width / 2;
const y0 = height / 2;
function rotate(pt, q) {
  return [
    Math.cos(q) * (pt[0] - x0) - Math.sin(q) * (pt[1] - y0) + x0,
    Math.sin(q) * (pt[0] - x0) + Math.cos(q) * (pt[1] - y0) + y0
  ];
}

ctx.lineWidth = 1;
ctx.fillStyle = "rgba(0, 0, 0, 0.97)";

const colorStyles = [];
for (let i = 85; i <= 255; i += 10) {
  colorStyles.push(`rgb(${i},${i},${i})`);
}

let particles = new Array(100);
for (let i = 0; i < particles.length; ++i) {
  particles[i] = {
    x: randomRange(0, width),
    y: randomRange(0, height),
    angle: Math.random(),
    age: Math.floor(Math.random() * MAX_AGE)
  };
}

const buckets = colorStyles.map((it) => []);

(function render() {
  const begin = performance.now();
  buckets.forEach((it) => (it.length = 0));
  particles.forEach((it) => {
    if (0 >= --it.age) {
      it.x = randomRange(0, width);
      it.y = randomRange(0, height);
      it.age = MAX_AGE;
    }
    const res = rotate([it.x, it.y], it.angle * 0.1);
    it.x1 = res[0];
    it.y1 = res[1];
    buckets[Math.floor(colorStyles.length * it.angle)].push(it);
  });
  draw();
  const runtime = performance.now() - begin;

  setTimeout(render, 40 - runtime);
})();

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
    }
    ctx.stroke();
  }
}

function randomRange(minVal, maxVal) {
  return minVal + Math.floor(Math.random() * (maxVal - minVal + 1));
}