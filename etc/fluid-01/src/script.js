// ref: https://www.youtube.com/watch?v=iKAVRgIrUOU

window.onload = () => {
  //console.log('loaded!!!');
  //o.enableConsole();
};

const ctxBg = background.getContext("2d", { willReadFrequently: true });
const ctxFg = foreground.getContext("2d");
const WIDTH = background.offsetWidth;
const HEIGHT = background.offsetHeight;

let pointer = [0, 0];
let selected = [];
let isDrag = false;

function onAction1() {}

function onAction3() {}

function onAction4() {}

function onAction5() {}

function onAction2() {}

function onAction6() {}

function onAction7() {}

function onAction8() {}
/* i,j+1
			  +----+
			  i,j|    |i+1,j
				+----+
				  i,j

			1. Modify velocity values(e.g. add gravity)
			   장애물 제외하고 세로속도 중력 영향 적용
			2. Make the fluid incompressible(projection)
			   비압축 작용 계산
			3. Move the velocity field(advection)

			1. Update Velocity
			    for all i,j
			      v_i,j <- v_i,j + dt * g (g: -9.81m/s, dt: 1/30s)
			2. Divergence(d): 시간 스텝당 전체 유량(셀에 속도합, +1 위치 나가는 유량 방향)
			    d <- u_i + 1,j - u_i,j + v_i,j+1 - v_i,j
				 초과 또는 부족 유입량 계산(장애물 고려)
			      압력 계산(rho: density, h: grid spacing, dt: time step)
				    for all i,j
					    p_i,j <- 0
						for n iterations
							for all i,j
								p_i,j <- p_i,j + d/s * rho * h / dt
					overrelaxation로 반복에 의해 연립방정식 계산
					1<o<2사이로 여기서는 1.9을 곱하면 계산하면 더 급격하게 수렴
			3. Advection
			   Smoke: 단순히 각 셀에 밀도 값 저장(속도처럼 간주)
			*/
var data = {
  sizeGrid: 20,
  density: 1000, // kg/m^3, water
  gravity: 9.81 // m/s^2
};

// scale: pixels by a meter
data.init = function (width, height, scale = 1.0) {
  this.width = Math.ceil(width / this.sizeGrid);
  this.height = Math.ceil(height / this.sizeGrid);
  // this.scale = 1 / scale;
  this.meterGrid = this.sizeGrid / scale;
  const cntGrids = this.width * this.height;
  this.p = new Float32Array(cntGrids);
  this.s = new Float32Array(cntGrids);
  this.u = new Float32Array(cntGrids);
  this.v = new Float32Array(cntGrids);

  this.s.fill(0.0);
  for (let i = 1; i < this.width - 1; ++i) {
    for (let j = 1; j < this.height - 1; ++j) {
      this.s[i + j * this.width] = 1.0;
    }
  }
};

data.getPressureAt = function (x, y) {
  return this.p[this.getIndex(x, y)];
};

data.getIndex = function (x, y) {
  return (
    Math.floor(x / this.sizeGrid) + Math.floor(y / this.sizeGrid) * this.width
  );
};

// 중력
data.step1_gravity = function (dt) {
  const n = this.v.length - this.width;
  const val = this.gravity * dt;
  // console.log(`gravity: ${val} ${dt}`);
  // console.log(`step1_gravity: dt[${dt}] val[${val}]`);
  for (let i = this.width; i < n; ++i) {
    if (!this.s[i] || !this.s[i - this.width]) continue;
    this.v[i] += val;
  }
};

// 비압축성
data.step2_incompress = function (dt, overrelaxation = 1.0) {
  const w = this.width;
  const h = this.height;
  const cp = (this.density * this.meterGrid) / dt;

  for (let i = 1; i < h; ++i) {
    let idx = (h - i - 1) * w + 1;
    for (let j = 1; j < w; ++j, ++idx) {
      if (!this.s[idx]) continue;

      // [x0, x1, y0, y1]
      const localS = [
        this.s[idx - 1],
        this.s[idx + 1],
        this.s[idx - w],
        this.s[idx + w]
      ];
      const sumS = localS[0] + localS[1] + localS[2] + localS[3];
      if (!sumS) continue;

      const div = this.u[idx + 1] - this.u[idx] + this.v[idx + w] - this.v[idx];
      const vel = (-div / sumS) * overrelaxation;
      this.p[idx] += cp * vel;

      this.u[idx] -= localS[0] * vel;
      this.u[idx + 1] += localS[1] * vel;
      this.v[idx] -= localS[2] * vel;
      this.v[idx + w] += localS[3] * vel;
    }
  }
};

data.step2_incompress2 = function (dt, overrelaxation = 1.0) {
  const w = this.width;
  const h = this.height;
  const cp = (this.density * this.meterGrid) / dt;

  for (let i = 1; i < h; ++i) {
    const beginIdx = i * w;
    for (let j = 1; j < w; ++j) {
      const idx = beginIdx + j;
      if (!this.s[idx]) continue;

      const localS = [
        this.s[idx - 1],
        this.s[idx + 1],
        this.s[idx - w],
        this.s[idx + w]
      ];
      // const sumS = localS.reduce((pre, it) => pre + it, 0);
      const sumS = localS[0] + localS[1] + localS[2] + localS[3];
      if (!sumS) continue;

      /*
							div > 0이면 나가는 속도가 크기 때문에 이를 맞추기 위해 들어오는 속도가 필요하다.
							즉, 평균값으로 들어오는 속도에 추가하고 나가는 속도에 빼줘야 균형을 맞출 수 있다.
							vec 계산에서 음수로 바뀌기 때문에 들어올때 빼주고 나가는 속도에 더해줘야 한다.
						*/
      const div = this.u[idx + 1] - this.u[idx] + this.v[idx + w] - this.v[idx];
      const vel = (-div / sumS) * overrelaxation;
      this.p[idx] += cp * vel;

      // density * gravity * height = 위치에너지

      // console.log(
      // 	`(${this.density}*${this.meterGrid.toFixed(3)} / ${dt.toFixed(3)} * (-${div.toFixed(
      // 		3,
      // 	)} /  ${sumS})*${overrelaxation} = ${this.p[idx].toFixed(2)}`,
      // );

      // if (1 === j) {
      // 	const u = [this.u[idx].toFixed(2), this.u[idx + 1].toFixed(2)];
      // 	const v = [this.v[idx].toFixed(2), this.v[idx + w].toFixed(2)];
      // console.log(
      // 	`[${idx}] vel[${vel.toFixed(3)}] p[${this.p[idx].toFixed(2)}] u[${u}] v[${v}] div[${div.toFixed(
      // 		3,
      // 	)}] localS[${localS}]`,
      // );
      // }

      this.u[idx] -= localS[0] * vel;
      this.u[idx + 1] += localS[1] * vel;
      this.v[idx] -= localS[2] * vel;
      this.v[idx + w] += localS[3] * vel;
    }
  }
};

data.step3_advection = function (dt) {
  const w = this.width;
  const h = this.height;
  const meterGrid = this.meterGrid;
  const meterGrid2 = meterGrid / 2;
  let newV = new Float32Array(this.v.length);
  let newU = new Float32Array(this.u.length);
  newV.set(this.v);
  newU.set(this.u);

  for (let i = 1; i < h; ++i) {
    const beginIdx = i * w;
    const x = i * meterGrid;
    for (let j = 1; j < w; ++j) {
      const idx = beginIdx + j;
      // console.log(`[${idx}] (${i},${j}) s[${this.s[idx]}] s-1[${this.s[idx - 1]}] s-w[${this.s[idx - w]}]`);
      if (!this.s[idx]) continue;
      const y = j * meterGrid;
      const x0 = x + meterGrid2;
      const y0 = y + meterGrid2;
      //if (!this.s[idx - 1]) {
      {
        const u = this.u[idx];
        const v =
          (this.v[idx - 1] +
            this.v[idx] +
            this.v[idx + w] +
            this.v[idx + w - 1]) /
          4;
        const x1 = x - dt * u;
        const y1 = y0 - dt * v;
        newU[idx] = this.getU(x1, y1);
        // console.log(
        // 	`(${x.toFixed(3)},${y0.toFixed(3)})->(${x1.toFixed(3)},${y1.toFixed(3)})=${newU[idx].toFixed(3)}`,
        // );
      }

      //if (!this.s[idx - w]) {
      {
        const u =
          (this.u[idx - 1] +
            this.u[idx] +
            this.u[idx + w] +
            this.u[idx + w - 1]) /
          4;
        const v = this.v[idx];
        const x1 = x0 - dt * u;
        const y1 = y - dt * v;
        newV[idx] = this.getV(x1, y1);
        // console.log(
        // 	`(${x0.toFixed(3)},${y.toFixed(3)})->(${x1.toFixed(3)},${y1.toFixed(3)})=${newV[idx].toFixed(3)}`,
        // );
      }

      // 유체의 유동으로 이전 위치의 속성이 현재 위치로 변경되어
      // 현재위치에 해당 속성이 이동됨. 즉, 이전 속성이 현재 저장
      // 1. 현재 위치와 속도를 획득
      // 2. 이전 위치를 계산
      // 3. 이전 위치의 속도를 획득해서 현재 위치에 저장
    }
  }
  this.u.set(newU);
  this.v.set(newV);
};

data.getU = function (x, y) {
  x = x / this.meterGrid;
  y = y / this.meterGrid;

  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  // const w = this.width;
  // const idx = ix + iy * w;

  // const v0 = lerp(this.u[idx], this.u[idx + 1], fx);
  // const v1 = lerp(this.u[idx + w], this.u[idx + w + 1], fx);
  const v0 = lerp(this.uAt(ix, iy), this.uAt(ix + 1, iy), fx);
  const v1 = lerp(this.uAt(ix, iy + 1), this.uAt(ix + 1, iy + 1), fx);
  // console.log(`[${idx}] (${x},${y}) v0[${v0}] v1[${v1}] fx[${fx}] fy[${fy}]`);
  return lerp(v0, v1, fy);
};

data.getV = function (x, y) {
  x = x / this.meterGrid;
  y = y / this.meterGrid;

  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  // const w = this.width;
  // const idx = ix + iy * w;

  // const v0 = lerp(this.v[idx], this.v[idx + 1], fx);
  // const v1 = lerp(this.v[idx + w], this.v[idx + w + 1], fx);
  const v0 = lerp(this.vAt(ix, iy), this.vAt(ix + 1, iy), fx);
  const v1 = lerp(this.vAt(ix, iy + 1), this.vAt(ix + 1, iy + 1), fx);
  // console.log(`[${idx}] (${x},${y}) v0[${v0}] v1[${v1}] fx[${fx}] fy[${fy}]`);
  return lerp(v0, v1, fy);
};

data.uAt = function (i, j) {
  i = bound(i, 1, this.width - 1);
  j = bound(j, 1, this.height - 1);

  return this.u[this.width * j + i];
};

data.vAt = function (i, j) {
  i = bound(i, 1, this.width - 1);
  j = bound(j, 1, this.height - 1);

  return this.v[this.width * j + i];
};

data.init(WIDTH, HEIGHT, HEIGHT);
const pixels = new PixelCanvas(background);

// data.p[10] = 1.0;
// data.p[13] = 1.0;

// for (let i = 0; i < data.height - 1; ++i) {
// 	data.u[i * data.width + 1] = 1.0;
// }

data.info = function () {
  for (let i = 0; i < this.width; ++i) {
    for (let j = 0; j < this.height; ++j) {
      const idx = i + j * this.width;
      const p = this.p[idx];
      const u = this.u[idx];
      const v = this.v[idx];
      const s = this.s[idx];
      drawText(
        ctxFg,
        i * this.sizeGrid,
        j * this.sizeGrid,
        `${idx}(${i},${j})`
      );
      drawText(
        ctxFg,
        i * this.sizeGrid,
        j * this.sizeGrid + 9,
        `p ${p && p.toFixed(0)}`
      );
      drawText(
        ctxFg,
        i * this.sizeGrid,
        j * this.sizeGrid + 18,
        `u ${u && u.toFixed(3)}`
      );
      if (35 < this.sizeGrid) {
        drawText(
          ctxFg,
          i * this.sizeGrid,
          j * this.sizeGrid + 27,
          `v ${v && v.toFixed(3)}`
        );
        if (44 < this.sizeGrid) {
          drawText(
            ctxFg,
            i * this.sizeGrid,
            j * this.sizeGrid + 36,
            `s ${s && s.toFixed(3)}`
          );
        }
      }
    }
  }
};

foreground.addEventListener("mousemove", (ev) => {
  pointer = [ev.offsetX, ev.offsetY];
  if (isDrag) {
    selected[1] = pointer;
  }
  refreshForeground();
});
foreground.addEventListener("mousedown", (ev) => {
  const pt = [ev.offsetX, ev.offsetY];
  if (!isDrag) selected = [];
  selected[0] = pt;
  isDrag = true;
});
foreground.addEventListener("mouseup", (ev) => {
  const pt = [ev.offsetX, ev.offsetY];
  selected[1] = pt;
  isDrag = false;
});

function refreshForeground() {
  clear(ctxFg);
  if (selected[0] && selected[1]) {
    // ctxFore.fillStyle = 'rgba(0, 128, 0, 0.5)';
    // const x0 = Math.min(selected[0][0], selected[1][0]);
    // const x1 = Math.max(selected[0][0], selected[1][0]);
    // ctxFore.fillRect(x0, 0, x1 - x0, foreground.offsetHeight);
  }

  const idx = data.getIndex(pointer[0], pointer[1]);
  const p = data.p[idx];
  const v = data.v[idx];
  const u = data.u[idx];
  const s = data.s[idx];
  const toFixed = (v) => (v ? v.toFixed(2) : v);
  drawText(
    ctxFg,
    1,
    1,
    `[${idx}] pressure:${toFixed(p)} v:${toFixed(v)} u:${toFixed(u)} s:${s}`
  );
}

function refreshBackground() {
  clear(ctxBg);

  //var imgData = ctxBg.getImageData(0, 0, WIDTH, HEIGHT);
  let minVal = data.p[0];
  let maxVal = data.p[0];
  for (let i = 1, n = data.p.length; i < n; ++i) {
    const it = data.p[i];
    if (minVal > it) {
      minVal = it;
    } else if (maxVal < it) {
      maxVal = it;
    }
  }
  pixels.draw(function (x, y) {
    const p = data.getPressureAt(x, y);
    return mappingColor(p, minVal, maxVal);
  });
}

function clear(ctx) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
}

// 0~1 => blue -> green -> red 스팩트럼 매핑
function mappingColor(val, minVal, maxVal) {
  val = Math.min(Math.max(val, minVal), maxVal - 0.0001);
  var d = maxVal - minVal;
  val = d == 0.0 ? 0.5 : (val - minVal) / d;
  var m = 0.25;
  var num = Math.floor(val / m);
  var s = (val - num * m) / m;
  var r, g, b;

  switch (num) {
    case 0:
      r = 0.0;
      g = s;
      b = 1.0;
      break;
    case 1:
      r = 0.0;
      g = 1.0;
      b = 1.0 - s;
      break;
    case 2:
      r = s;
      g = 1.0;
      b = 0.0;
      break;
    case 3:
      r = 1.0;
      g = 1.0 - s;
      b = 0.0;
      break;
  }

  return [255 * r, 255 * g, 255 * b, 255];
}

function drawBar(ctx, i, v) {
  ctx.beginPath();
  ctx.moveTo(i + 0.5, 0);
  ctx.lineTo(i + 0.5, v);
  ctx.stroke();
}

function drawLine(data, diffX) {
  diffX = diffX || 1;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  data && data.forEach((v, i) => ctx.lineTo(i * diffX, v));
  ctx.stroke();
}

function drawText(ctx, x, y, str) {
  y += 9;
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, .2)";
  ctx.font = "9px Verdana";
  for (let i = -2; i <= 2; ++i) {
    for (let j = -2; j <= 2; ++j) {
      ctx.fillText(str, x + i, y + j);
    }
  }
  ctx.fillStyle = "rgba(255, 255, 255, .75)";
  ctx.fillText(str, x, y);
  ctx.restore();
}

function range(begin, end, step) {
  step = step || 1;
  const n = (end - begin) / step;
  let ret = new Array(n);
  for (let i = 0; i < n; ++i) {
    ret[i] = step * i;
  }
  return ret;
}

function nearestPowerOf2(n) {
  return 1 << (31 - Math.clz32(n));
}

function lerp(l, r, f) {
  return l + f * (r - l);
}

function mix(l, r, f) {
  return l * (1 - f) + r * f;
}

function bound(val, min, max) {
  if (val <= min) return min;
  if (val >= max) return max;
  return val;
}

let runtime = performance.now();
function renderImpl() {
  let called = performance.now();
  const dt = (called - runtime) / 1000.0;
  runtime = called;
  data.p.fill(0.0);
  data.step1_gravity(dt);
  // const n = data.height * 2;
  const n = 40;
  for (let i = 0; i < n; ++i) {
    //console.groupCollapsed(`iterate: ${i}`);
    data.step2_incompress2(dt, 1.0);
    //console.groupEnd();
  }
  data.step3_advection(dt);
  refreshBackground();
  // requestAnimationFrame(renderImpl);
}

function render() {
  runtime = performance.now();
  requestAnimationFrame(renderImpl);
}
render();
