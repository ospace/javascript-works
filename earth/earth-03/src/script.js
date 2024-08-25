/*
	MIT License
	Copyright (c) 2022 ospace(ospace114@empal.com)
*/

const unitRadian = 180.0 / Math.PI;
const unitDegree = Math.PI / 180.0;
const [width, height] = [300, 300];
const svg = d3
  .select("#earth3")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .attr("style", "border: 1px solid black");
const g = svg.append("g");
const projection = d3
  .geoOrthographic()
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
svg.call(
  d3
    .zoom()
    .on("start", (ev) => {
      const pointer = d3.pointer(ev, svg.node());
      let invertVal = projection.invert(pointer);
      prePt_ = orthogonalOf(invertVal);
    })
    .on("zoom", (ev) => {
      const pointer = d3.pointer(ev, svg.node());
      const invertVal = projection.invert(pointer);
      const pt = orthogonalOf(invertVal);
      const matAxis = pt2Matrix(prePt_, pt);
      const matRotate = rotate2Matrix(projection.rotate());
      const rotate = applyRotate(matRotate, matAxis);

      projection.rotate(rotate);
    })
);

setInterval(() => {
  g.selectAll("path").attr("d", path);
}, 40);

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

function orthogonalOf(pt) {
  const l = Math.cos(pt[1] * unitDegree);
  return [
    l * Math.cos(pt[0] * unitDegree),
    -l * Math.sin(pt[0] * unitDegree),
    Math.sin(pt[1] * unitDegree)
  ];
}

function pt2Matrix(l, r) {
  const axis = cross(l, r);
  const len = Math.sqrt(dot(axis, axis));
  const [x, y, z] = axis.map((it) => it / len);
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

function applyRotate(l, r) {
  const res = mmul(l, r);

  return [
    -Math.atan2(res[1][0], res[0][0]) * unitRadian,
    -Math.asin(-res[2][0]) * unitRadian,
    Math.atan2(res[2][1], res[2][2]) * unitRadian
  ];
}

function dot(l, r) {
  let ret = 0;
  for (let i = 0; i < l.length; ++i) {
    ret += l[i] * r[i];
  }
  return ret;
}

function cross(l, r) {
  return [
    l[1] * r[2] - l[2] * r[1],
    l[2] * r[0] - l[0] * r[2],
    l[0] * r[1] - l[1] * r[0]
  ];
}

function mmulCol(l, r) {
  return l.map((v, i) => r[0].reduce((p, c, j) => p + l[j] * r[j][i], 0));
}

function mmul(l, r) {
  return Array.isArray(l[0]) ? l.map((it) => mmulCol(it, r)) : mmulCol(l, r);
}
