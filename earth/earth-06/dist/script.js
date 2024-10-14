const unitRadian = 180.0 / Math.PI;
const unitDegree = Math.PI / 180.0;
// https://www.jasondavies.com/maps/rotate/
const [width, height] = [350, 350];
const svg = d3
  .select("#foo")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .attr("style", "border: 1px solid black");
const g = svg.append("g");
const projection = d3
  .geoOrthographic()
  // .clipAngle(90)
  .precision(0.1)
  .translate([width * 0.5, height * 0.5]);
projection.scale(width * 0.45);
projection.rotate([0, 0, 0]);
const path = d3.geoPath().projection(projection);
g.append("path")
  .datum({ type: "Sphere" })
  .attr("class", "sphere")
  .attr("d", path);
g.append("path")
  .datum(d3.geoGraticule())
  .attr("class", "graticule")
  .attr("d", path);
let prePt_;
let beginMarker_;
let endMarker_;
svg.call(
  d3
    .zoom()
    .on("start", (ev) => {
      const pt = d3.pointer(ev, svg.node());
      const invertVal = projection.invert(pt);
      prePt_ = orthogonalOf(invertVal);
      out(0, "prePt:" + stringify(prePt_));
      out(1, "rotate:" + stringify(projection.rotate()));
      beginMarker_ && beginMarker_.remove();
      if (endMarker_) {
        endMarker_.remove();
        endMarker_ = null;
      }
      beginMarker_ = mark(invertVal[0], invertVal[1]);
    })
    .on("zoom", (ev) => {
      const pointer = d3.pointer(ev, svg.node());
      let invertVal = projection.invert(pointer);

      const pt = orthogonalOf(invertVal);
      const matAxis = pt2Matrix(prePt_, pt);
      const matRotate = rotate2Matrix(projection.rotate());
      const rotate = applyRotate(matRotate, matAxis);

      //out(2, "pt:" + stringify(pt));
      //out(4, "axis:" + stringify(unitAxis));
      //out(5, "angle:" + stringify(angle));
      // out(6, "eulerAxis:" + stringify(degreeEularAxis));
      // out(7, "rotate:" + stringify(rotate));
      projection.rotate(rotate);
      if (endMarker_) {
        endMarker_.remove();
        endMarker_ = null;
      }
      endMarker_ = mark(invertVal[0], invertVal[1]);

      console.log(
        stringify2(prePt_),
        ",",
        // stringify2(pt),
        // ",",
        // stringify2(angle),
        // ",",
        // stringify2(axis),
        // "=",
        // stringify2(degreeEularAxis)
        stringify2(rotate)
      );
    })
    .on("end", () => {})
);
function mark(x, y) {
  return g
    .append("path")
    .datum({ type: "Point", coordinates: [x, y] })
    .attr("class", "pointer")
    .attr("d", path);
}
setInterval(() => {
  g.selectAll("path").attr("d", path);
}, 40);
function toRadian(val) {
  return val && val.map((it) => it * unitDegree);
}
function toDegree(val) {
  return val && val.map((it) => it * unitRadian);
}

function rotate2Matrix(r) {
  const c2 = Math.cos((r[2] || 0) * unitDegree);
  const s2 = Math.sin((r[2] || 0) * unitDegree);
  const c1 = Math.cos((r[1] || 0) * unitDegree);
  const s1 = Math.sin((r[1] || 0) * unitDegree);
  const c0 = Math.cos((r[0] || 0) * unitDegree);
  const s0 = Math.sin((r[0] || 0) * unitDegree);
  return [
    [c1 * c0, c1 * s0, -s1],
    [s2 * s1 * c0 - c2 * s0, s0 * s1 * s2 + c0 * c2, s2 * c1],
    [c0 * s1 * c2 + s0 * s2, c2 * s1 * s0 - s2 * c0, c2 * c1]
  ];
}

// 극좌표계 -> 직각좌표계
function orthogonalOf(pt) {
  const l = Math.cos(pt[1] * unitDegree);
  return [
    l * Math.cos(pt[0] * unitDegree),
    -l * Math.sin(pt[0] * unitDegree),
    Math.sin(pt[1] * unitDegree)
  ];
  // console.log("> polar2orthogonal:", pt, "->", ret);
  // return ret;
}

function pt2Matrix(l, r) {
  const [x, y, z] = toUnit(cross(l, r));
  const angle = Math.acos(dot(l, r));
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const t = 1 - c;

  return [
    [c + x * x * t, x * y * t - z * s, x * z * t + y * s],
    [x * y * t + z * s, c + y * y * t, y * z * t - x * s],
    [x * z * t - y * s, y * z * t + x * s, c + z * z * t]
  ];
}

// function convMat2Euler(mat) {
//   const q = Math.asin(-mat[2][0]);
//   if (-Math.PI / 2 < q && q < Math.PI / 2) {
//     return [
//       Math.atan2(mat[1][0], mat[0][0]),
//       q,
//       Math.atan2(mat[2][1], mat[2][2]),
//     ];
//   } else {
//     const r = Math.atan2(mat[1][2] + mat[0][1], mat[0][2] - mat[1][1]);
//     return [
//       r,
//       q,
//       r - Math.atan2(mat[1][2] - mat[0][1], mat[0][2] + mat[1][1]),
//     ];
//   }
// }

function applyRotate(l, r) {
  const res = mmul(l, r);

  return [
    -Math.atan2(res[1][0], res[0][0]) * unitRadian,
    -Math.asin(-res[2][0]) * unitRadian,
    Math.atan2(res[2][1], res[2][2]) * unitRadian
  ];
}

// 내적: (스칼라)
function dot(l, r) {
  let ret = 0;
  for (let i = 0; i < l.length; ++i) {
    ret += l[i] * r[i];
  }
  return ret;
}
// 외적: 직교한 방향(오른손)으로 크기(벡터간격) -> 벡터
function cross(l, r) {
  return [
    l[1] * r[2] - l[2] * r[1],
    l[2] * r[0] - l[0] * r[2],
    l[0] * r[1] - l[1] * r[0]
  ];
}
function toUnit(v) {
  const l = Math.sqrt(dot(v, v));
  return v.map((it) => it / l);
}
// l은 1 * n 행렬곱
function mmulCol(l, r) {
  return l.map((v, i) => r[0].reduce((p, c, j) => p + l[j] * r[j][i], 0));
}
function mmul(l, r) {
  return Array.isArray(l[0]) ? l.map((it) => mmulCol(it, r)) : mmulCol(l, r);
}
function stringify(obj) {
  return JSON.stringify(obj, (key, val) =>
    "number" === typeof val ? +val.toFixed(3) : val
  );
}
function stringify2(obj) {
  return Array.isArray(obj)
    ? obj.map((it) => it.toFixed(3)).join(",")
    : JSON.stringify(obj, (key, val) =>
        "number" === typeof val ? +val.toFixed(3) : val
      );
}

const logItems = document.getElementsByClassName("log_item");
function out(idx, val) {
  const logItem = logItems[idx];
  if (logItem) {
    logItem.innerText = val;
  }
}