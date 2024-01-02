/*
	MIT License
	Copyright (c) 2022 ospace(ospace114@empal.com)
*/

window.onload = () => {
  test1();
};

const ctxCanvas1 = canvas1.getContext("2d");
const width = canvas1.width;
const height = canvas1.height;
const d = 3;

const PTS = [];
for (let i = 0; i < d; ++i) {
  let row = [];
  for (let j = 0; j < d; ++j) {
    row.push([Math.random() * 6.2831, Math.random() * 6.2831]);
  }
  PTS.push(row);
}

const pixels = new PixelCanvas(canvas1);
let frame = 0;
function test1() {
  const t = performance.now() / 800;
  pixels.draw((x, y) => {
    const res = noise(PTS, (x / width) * d, (y / height) * d, t);
    return res * 250;
  });
  requestAnimationFrame(test1);
}

function noise(pts, x, y, t) {
  let min = 3.4;
  for (let i = 0; i < pts.length; ++i) {
    const row = pts[i];
    for (let j = 0; j < row.length; ++j) {
      const x0 = 0.5 + 0.5 * Math.sin(t + row[j][0]);
      const y0 = 0.5 + 0.5 * Math.sin(t + row[j][1]);
      let d = distance(x0 + j, y0 + i, x, y);
      min = Math.min(min, d);
    }
  }
  return min;
}

function distance(x0, y0, x1, y1) {
  let dx = x1 - x0;
  let dy = y1 - y0;
  return Math.sqrt(dx * dx + dy * dy);
}