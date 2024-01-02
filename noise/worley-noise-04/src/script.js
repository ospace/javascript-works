/*
	MIT License
	Copyright (c) 2022 ospace(ospace114@empal.com)
*/

window.onload = test1;

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
    return res * 20000;
  });
  requestAnimationFrame(test1);
}

function noise(pts, x, y, t) {
  let min1 = 5;
  let pt1 = null;
  let min2 = 5;
  let pt2 = null;

  for (let i = 0; i < pts.length; ++i) {
    const row = pts[i];
    for (let j = 0; j < row.length; ++j) {
      const x0 = 0.5 + 0.5 * Math.sin(t + row[j][0]) + j - x;
      const y0 = 0.5 + 0.5 * Math.sin(t + row[j][1]) + i - y;
      let d = dot(x0, y0, x0, y0);

      if (d < min1) {
        min2 = min1;
        pt2 = pt1;
        min1 = d;
        pt1 = [x0, y0];
      } else if (d < min2) {
        min2 = d;
        pt2 = [x0, y0];
      }
    }
  }

  let x1 = 0.5 * (pt1[0] + pt2[0]);
  let y1 = 0.5 * (pt1[1] + pt2[1]);

  let x2 = pt2[0] - pt1[0];
  let y2 = pt2[1] - pt1[1];
  let d2 = Math.sqrt(x2 * x2 + y2 * y2);

  min1 = 3.8;
  min1 = Math.min(min1, dot(x1, y1, x2 / d2, y2 / d2));

  return min1;
}

function dot(x0, y0, x1, y1) {
  return x0 * x1 + y0 * y1;
}
