/*
	MIT License
	Copyright (c) 2022 ospace(ospace114@empal.com)
*/

//https://www.youtube.com/watch?v=sZBfLgfsvSk

const pxCanvas = new PixelCanvas(canvas1, { frame: true });

(function () {
  const particles = new Array(1000);
  for (let i = 0; i < particles.length; ++i) {
    particles[i] = [randomRange(0, 300), randomRange(0, 300)];
  }
  // const pxCanvas = newPixelCanvas(300, 300, { frame: true });
  pxCanvas.ctx.fillStyle = "white";
  (function f() {
    pxCanvas.background(0, 0.02);
    for (let i = 0; i < particles.length; ++i) {
      const p = particles[i];
      pxCanvas.point(p[0], p[1], 256);
      let n = noise((p[0] / pxCanvas.width) * 5, (p[1] / pxCanvas.height) * 5);
      n = n * Math.PI * 2;
      p[0] += Math.cos(n);
      p[1] += Math.sin(n);
      if (pxCanvas.isOver(p[0], p[1])) {
        p[0] = randomRange(0, 300);
        p[1] = randomRange(0, 300);
      }
    }
    pxCanvas.draw();
    requestAnimationFrame(f);
  })();
})();

(function () {
  const particles = new Array(5000);
  for (let i = 0; i < particles.length; ++i) {
    particles[i] = [randomRange(0, 300), randomRange(0, 300)];
  }
  // console.log("> particles:", JSON.stringify(particles));
  /* const pxCanvas = newPixelCanvas(300, 300, { frame: true });
        pxCanvas.ctx.fillStyle = "white";
        const f = () => {
          pxCanvas.drawUV((u, v) => {
            let n = noise(u * 5, v * 5);
            return n * 256;
          });
        };
        f(); */
})();

// function newPixelCanvas(width, height, opts) {
//   const canvas = document.createElement("canvas");
//   canvas.style = "border: 1px solid black;";
//   canvas.width = width || 200;
//   canvas.height = height || 200;
//   document.body.appendChild(canvas);

//   return new PixelCanvas(canvas, opts);
// }

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