const unitRadian = 180.0 / Math.PI;
const unitDegree = Math.PI / 180.0;
const [width, height] = [350, 350];
const svg = d3
  .select("#earth")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .attr("style", "border: 1px solid black");
const g = svg.append("g");
const projection = d3
  .geoEisenlohr()
  .precision(0.1)
  .translate([width * 0.5, height * 0.5]);
projection.scale(width * 0.15);
projection.rotate([0, 0, 0]);
const path = d3.geoPath().projection(projection);
const globe = { type: "Sphere" };
g.append("path")
  .datum(globe)
  .attr("style", "fill:none;stroke:black;stroke-width:1px;")
  .attr("d", path);
const g2 = g.append("g");
g2.append("path")
  .datum(d3.geoGraticule())
  .attr("style", "stroke:lightgray;stroke-width:0.5px;fill:none;")
  .attr("d", path);

let preRotate_;
let prePt_;

svg.call(
  d3
    .zoom()
    .on("start", (ev) => {
      const pt = d3.pointer(ev, svg.node());
      const invertVal = projection.invert(pt);
      prePt_ = polar2orthogonal(invertVal);
      preRotate_ = euler2Quaternion(projection.rotate());
    })
    .on("zoom", (ev) => {
      const pointer = d3.pointer(ev, svg.node());
      const invertVal = projection.invert(pointer);
      const pt = polar2orthogonal(invertVal);
      const angle = quaternionBetween(prePt_, pt);
      const rotate = multiplyQuaternion(preRotate_, angle);
      const res = quaternion2Euler(rotate);
      projection.rotate(res);
      preRotate_ = rotate;
    })
);

setInterval(() => {
  g.selectAll("path").attr("d", path);
}, 40);

function euler2Quaternion(euler) {
  const radians = euler.map((it) => 0.5 * (it || 0) * unitDegree);
  const sin = radians.map(Math.sin);
  const cos = radians.map(Math.cos);
  return [
    cos[0] * cos[1] * cos[2] + sin[0] * sin[1] * sin[2],
    sin[0] * cos[1] * cos[2] - cos[0] * sin[1] * sin[2],
    cos[0] * sin[1] * cos[2] + sin[0] * cos[1] * sin[2],
    cos[0] * cos[1] * sin[2] - sin[0] * sin[1] * cos[2]
  ];
}

function quaternion2Euler(quat) {
  return [
    Math.atan2(
      2 * (quat[0] * quat[1] + quat[2] * quat[3]),
      1 - 2 * (quat[1] * quat[1] + quat[2] * quat[2])
    ) * unitRadian,
    Math.asin(
      Math.max(-1, Math.min(1, 2 * (quat[0] * quat[2] - quat[3] * quat[1])))
    ) * unitRadian,
    Math.atan2(
      2 * (quat[0] * quat[3] + quat[1] * quat[2]),
      1 - 2 * (quat[2] * quat[2] + quat[3] * quat[3])
    ) * unitRadian
  ];
}

function polar2orthogonal(pt) {
  const l = Math.cos(pt[1] * unitDegree);
  return [
    l * Math.cos(pt[0] * unitDegree),
    l * Math.sin(pt[0] * unitDegree),
    Math.sin(pt[1] * unitDegree)
  ];
}

function quaternionBetween(l, r) {
  if (!l || !r) return;
  const axis = cross(l, r);
  const len = Math.sqrt(dot(axis, axis));
  const angle = 0.5 * Math.acos(dot(l, r));
  const res = Math.sin(angle) / len;
  return len && [Math.cos(angle), axis[2] * res, -axis[1] * res, axis[0] * res];
}

function multiplyQuaternion(l, r) {
  return [
    l[0] * r[0] - l[1] * r[1] - l[2] * r[2] - l[3] * r[3],
    l[0] * r[1] + l[1] * r[0] + l[2] * r[3] - l[3] * r[2],
    l[0] * r[2] - l[1] * r[3] + l[2] * r[0] + l[3] * r[1],
    l[0] * r[3] + l[1] * r[2] - l[2] * r[1] + l[3] * r[0]
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