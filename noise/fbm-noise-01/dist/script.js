/*
	MIT License
	Copyright (c) 2022 ospace(ospace114@empal.com)
*/

const width = canvas1.width;
const height = canvas1.height;

window.onload = () => {
  test1();
};

const pixels = new PixelCanvas(canvas1, { frame: true });

const panel = document.querySelector(".wrapper");
function newPixelCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.style = "border: 1px solid black";
  canvas.width = width || 100;
  canvas.height = height || 100;
  panel.appendChild(canvas);

  return new PixelCanvas(canvas);
}

function test1() {
  const t = performance.now() / 10000;
  //console.time("test1");
  pixels.drawUV((u, v) => {
    x = u * 3;
    y = v * 3;
    // x = (x / width) * 2;
    // y = (y / height) * 2;
    // let q = fbm(x, y);
    // // let y0 = fbm(x + 1, y + 1);

    // let x1 = fbm(x - q + t * 0.12, y + q + t * 0.12);
    // let y1 = fbm(x + q + t * 0.1, y + q - t * 0.1);
    // // let x1 = fbm(x + x0 + t * 0.12 + 15, y + y0 + t * 0.12 + 19);
    // // let y1 = fbm(x + x0 + t * 0.1 + 9, y + y0 + t * 0.1 + 3);

    // let f = fbm(x + x1, y + y1);

    // return evalF(f) * 256;
    let q = fbm(x, y);
    let x1 = fbm(x - q - t, y + q + t);
    let y1 = fbm(x + q + 0.6 + t, y - q + 0.8 - t);
    let ret = fbm(x + x1, y + y1);
    return evalF(ret) * 256;
  });
  //console.timeEnd("test1");
  requestAnimationFrame(test1);
}

// 기본 노이즈
// * x + x0은 x축 좌측이동,  y + y0은 y축 하측이동
(function () {
  let pxCanvas = newPixelCanvas(width, height);
  pxCanvas.draw(function (x, y) {
    x = (x / pxCanvas.width) * 2;
    y = (y / pxCanvas.height) * 2;
    let ret = fbm(x, y);
    return evalF(ret) * 256;
  });
})();

// 기본 노이즈의 결과에 대한 노이즈
// // * 노이즈로 범위가 낮아져서 더 세밀한 영역에서 값을 가져옴
// (function () {
//   let pxCanvas = newPixelCanvas();
//   pxCanvas.draw(function (x, y) {
//     x = (x / pxCanvas.width) * 2;
//     y = (y / pxCanvas.height) * 2;
//     let x0 = fbm(x, y);
//     //let y0 = fbm(x, y);
//     let ret = fbm(x0, x0);
//     return evalF(ret) * 256;
//   });
// })();

// 기본노이즈에 결과 더해서 노이즈
// * 밝은 부분이 더 많이 x축, y축 이동(좌상)
// (function () {
//   let pxCanvas = newPixelCanvas();
//   pxCanvas.draw(function (x, y) {
//     x = (x / pxCanvas.width) * 2;
//     y = (y / pxCanvas.height) * 2;
//     let x0 = fbm(x, y);
//     let y0 = fbm(x, y);
//     let ret = fbm(x + x0, y + y0);
//     return evalF(ret) * 256;
//   });
// })();

// 기본 노이즈 결과에 노이즈 더한 결과의 노이즈
// * 노이즈로 범위가 낮아져서 더 세밀한 영역에서 값을 가져옴
// (function () {
// let pxCanvas = newPixelCanvas();
//   pxCanvas.draw(function (x, y) {
//     x = (x / pxCanvas.width) * 2;
//     y = (y / pxCanvas.height) * 2;
//     let x0 = fbm(x, y);
//     //let y0 = fbm(x, y);
//     let x1 = fbm(x + x0, y + x0);
//     //let y1 = fbm(x + x0, y + y0);
//     let ret = fbm(x1, x1);
//     return evalF(ret) * 256;
//   });
// })();

// // 기본노이즈에 결과 더해서 노이즈 결과에 노이즈를 더함
// * 밝은 부분이 더 많이 x축, y축 추가 이동(좌상)
// (function () {
//   let pxCanvas = newPixelCanvas();
//   pxCanvas.draw(function (x, y) {
//     x = (x / pxCanvas.width) * 2;
//     y = (y / pxCanvas.height) * 2;
//     let x0 = fbm(x, y);
//     let y0 = fbm(x, y);
//     let x1 = fbm(x + x0, y + y0);
//     let y1 = fbm(x + x0, y + y0);
//     let ret = fbm(x + x1, y + y1);
//     return evalF(ret) * 256;
//   });
// })();

// (function () {
//   let pxCanvas = newPixelCanvas();
//   pxCanvas.draw(function (x, y) {
//     x = (x / pxCanvas.width) * 2;
//     y = (y / pxCanvas.height) * 2;
//     let q = fbm(x, y);
//     let x1 = fbm(x - q, y + q);
//     let y1 = fbm(x + q + 0.6, y - q + 0.8);
//     let ret = fbm(x + x1, y + y1);
//     return evalF(ret) * 256;
//   });
// })();

function evalF(f) {
  return f * f * f + 0.6 * f * f + 0.5 * f;
}

// function test1() {
//   pixels.draw((x, y) => {
//     return octaves((x / width) * 3, (y / width) * 3) * 256;
//   });
// }

function fbm(x, y) {
  let v = 0.0;
  let a = 0.5;

  for (let i = 0; i < 8; ++i) {
    v += a * noise(x, y);
    //const rotX = cos1 * x - sin1 * y + 1;
    //const rotY = cos1 * x + sin1 * y + 1;
    //x = rotX * 2.0;
    // y = rotY * 2.0;
    x *= 2;
    y *= 2;
    a *= 0.5;
  }

  return v;
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
function dot(l, r) {
  return l[0] * r[0] + l[1] * r[1];
}
function lerp(l, r, f) {
  return l + f * (r - l);
}
function smoothstep(t) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}