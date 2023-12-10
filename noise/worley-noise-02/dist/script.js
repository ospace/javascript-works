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

const PTS = [
  [0.1, 0.2],
  [0.7, 0.3],
  [0.2, 0.7],
  [0.8, 0.7],
  [0.5, 0.5]
];

canvas1.addEventListener("mousemove", ({ offsetX, offsetY }) => {
  PTS[PTS.length - 1][0] = offsetX / width;
  PTS[PTS.length - 1][1] = offsetY / height;
  test1();
});

const pixels = new PixelCanvas(canvas1);
function test1() {
  pixels.draw((x, y) => {
    const res = noise(PTS, x / width, y / height);
    return Math.abs(Math.sin(res * 100)) * 150 + 100;
  });
}

function noise(pts, x, y) {
  let min = 0.4,
    pt = null;
  for (let k = 0; k < pts.length; ++k) {
    let d = distance(pts[k][0], pts[k][1], x, y);
    min = Math.min(min, d);
  }
  return min;
}

function distance(x0, y0, x1, y1) {
  let dx = x1 - x0;
  let dy = y1 - y0;
  return Math.sqrt(dx * dx + dy * dy);
}