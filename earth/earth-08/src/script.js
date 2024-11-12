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
projection.rotate([0, 90, 0]);
const path = d3.geoPath().projection(projection);
// projection.scale(fitScale(path, projection, width, height));
const globe = { type: "Sphere" };
g.append("path").attr("class", "sphere").attr("d", path(globe));
const g2 = g.append("g");
g2.append("path")
  .datum(d3.geoGraticule())
  .attr("class", "graticule")
  .attr("d", path);
let isDrag = false;
let pointer = null;
let preRotate_;
let prePt_;
let beginPointer;
let endPointer;
const toFixed2 = (key, val) =>
  "number" === typeof val ? +val.toFixed(3) : val;
const z = d3
  .zoom()
  .on("start", (ev) => {
    //preRotate_ = euler2Quaternion(projection.rotate());
    const pt = d3.pointer(ev, svg.node());
    const invertVal = projection.invert(pt);
    prePt_ = polar2orthogonal(toRadian(invertVal));
    preRotate_ = euler2Quaternion(projection.rotate());
    // out(0, "preRotate:" + stringify(preRotate_));
    // out(1, "prePt:" + stringify(prePt_));
    if (endPointer) {
      endPointer.remove();
      endPointer = null;
    }
    beginPointer && beginPointer.remove();
    beginPointer = mark(invertVal[0], invertVal[1]);
  })
  .on("zoom", (ev) => {
    const pointer = d3.pointer(ev, svg.node());
    let invertVal = projection.invert(pointer);
    const pt = polar2orthogonal(toRadian(invertVal));
    // out(3, "pt:" + stringify(pt));
    const angle = quaternionBetween(prePt_, pt);
    // out(2, "angle:" + stringify(angle));
    const rotate = multiplyQuaternion(preRotate_, angle);
    // out(4, "rotate:" + stringify(rotate));
    const res = quaternion2Euler(rotate);
    // out(5, "res:" + stringify(res));
    res[2] = -res[2];
    let res2 = toDegree(res);
    console.log(
      stringify(preRotate_),
      stringify(angle),
      ":",
      stringify(rotate),
      stringify(res2)
    );
    res2[0] = -res2[0];
    projection.rotate(res2);
    if (endPointer) {
      endPointer.remove();
      endPointer = null;
    }
    endPointer = mark(invertVal[0], invertVal[1]);
    preRotate_ = rotate;
    //prePt_ = pt;
  })
  .on("end", () => {
    // console.group("zoomend");
    // console.log("");
    // console.groupEnd();
    // svg.call(d3.zoom().on("zoom", null));
    // projection.rotate(rotate_);
    pointer_ = null;
    // if (pathPointer) {
    //   pathPointer.remove();
    //   pathPointer = null;
    // }
  });
svg.call(z);
svg.call(
  d3.drag().on("drag", (ev) => {
    console.log("> drag:", ev);
    let rotate = projection.rotate();
    // projection.rotate(rotate);
    //g.selectAll(".country").attr("d", path);
  })
);
// setInterval(() => {
//   g.selectAll(".country").attr("d", path);
// }, 30);
// const urlData =
//   "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
// const urlData = "earth-topo.json";
console.log("starting...");
function mark(x, y) {
  return g
    .append("path")
    .attr("class", "pointer")
    .datum({ type: "Point", coordinates: [x, y] })
    .attr("d", path);
}
setInterval(() => {
  g.selectAll("path").attr("d", path);
  g.selectAll(".sphere").attr("d", path(globe));
}, 40);
function euler2Quaternion(euler) {
  const radians = euler.map((it) => 0.5 * (it || 0) * unitDegree);
  const sin = radians.map(Math.sin);
  const cos = radians.map(Math.cos);
  return [
    cos[0] * cos[1] * cos[2] + sin[0] * sin[1] * sin[2],
    -(sin[0] * cos[1] * cos[2] - cos[0] * sin[1] * sin[2]),
    cos[0] * sin[1] * cos[2] + sin[0] * cos[1] * sin[2],
    -(cos[0] * cos[1] * sin[2] - sin[0] * sin[1] * cos[2])
  ];
}
// 직각좌표계 -> 구좌표계
// [theta, phi]
function sphericalOf(pt) {
  return [
    //Math.sqrt(pt[0] * pt[0] + pt[1] * pt[1] + pt[2] * pt[2]),
    Math.atan2(pt[2], Math.sqrt(pt[0] * pt[0] + pt[1] * pt[1])),
    Math.atan2(pt[0], pt[1])
  ];
}
function quaternion2Euler(quat) {
  return [
    Math.atan2(
      2 * (quat[0] * quat[1] + quat[2] * quat[3]),
      1 - 2 * (quat[1] * quat[1] + quat[2] * quat[2])
    ),
    Math.asin(
      Math.max(-1, Math.min(1, 2 * (quat[0] * quat[2] - quat[3] * quat[1])))
    ),
    Math.atan2(
      2 * (quat[0] * quat[3] + quat[1] * quat[2]),
      1 - 2 * (quat[2] * quat[2] + quat[3] * quat[3])
    )
  ];
}
function toRadian(val) {
  return val && val.map((it) => it * unitDegree);
}
function toDegree(val) {
  return val && val.map((it) => it * unitRadian);
}
// 극좌표계 -> 직각좌표계
function polar2orthogonal(pt) {
  const l = Math.cos(pt[1]);
  return [l * Math.cos(pt[0]), -l * Math.sin(pt[0]), Math.sin(pt[1])];
  // return [l * Math.cos(pt[0]), l * Math.sin(pt[0]), Math.sin(pt[1])];
}
// 극좌표계 -> 직각좌표계
// function orthogonal1Of(pt) {
//   const l = Math.sin(pt[0]);
//   return [l * Math.cos(pt[1]), l * Math.sin(pt[1]), Math.cos(pt[0])];
// }
// 오일러 좌표계 -> 직각좌표계
function eular2orthogonal(v) {
  return [Math.cos(v[1]), Math.sin(v[0]), Math.sin(v[2])];
}
function rotateX(rad) {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return [
    [1, 0, 0],
    [0, c, -s],
    [0, s, c]
  ];
}
function rotateY(rad) {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return [
    [c, 0, s],
    [0, 1, 0],
    [-s, 0, c]
  ];
}
function rotateZ(rad) {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return [
    [c, -s, 0],
    [s, c, 0],
    [0, 0, 1]
  ];
}
// ref: https://m.blog.naver.com/droneaje/221999534231
// rotate 3-2-1
function rotateEular321(eular) {
  const c0 = Math.cos(eular[0]);
  const s0 = Math.sin(eular[0]);
  const c1 = Math.cos(eular[1]);
  const s1 = Math.sin(eular[1]);
  const c2 = Math.cos(eular[2]);
  const s2 = Math.sin(eular[2]);
  return [
    [c1 * c2, c1 * s2, -s1],
    [s0 * s1 * c2 - c0 * s2, s2 * s1 * s0 + c2 * c0, s0 * c1],
    [c2 * s1 * c0 + s2 * s0, c0 * s1 * s2 - s0 * c2, c0 * c1]
  ];
}
function rotateEular123(eular) {
  const c0 = Math.cos(eular[0]);
  const s0 = Math.sin(eular[0]);
  const c1 = Math.cos(eular[1]);
  const s1 = Math.sin(eular[1]);
  const c2 = Math.cos(eular[2]);
  const s2 = Math.sin(eular[2]);
  return [
    [c1 * c2, -c1 * s2, s1],
    [s0 * s1 * c2 + c0 * s2, -s0 * s1 * s2 + c0 * c2, -s0 * c1],
    [-c0 * s1 * c2 + s0 * s2, c0 * s1 * s2 + s0 * c2, c0 * c1]
  ];
}
function rotateEular321_1(eular) {
  const c0 = Math.cos(eular[0]);
  const s0 = Math.sin(eular[0]);
  const c1 = Math.cos(eular[1]);
  const s1 = Math.sin(eular[1]);
  const c2 = Math.cos(eular[2]);
  const s2 = Math.sin(eular[2]);
  return [
    [c0 * c1, c0 * s1 * s2 - s0 * c2, c0 * s1 * c2 + s0 * s2],
    [s0 * c1, s0 * s1 * s2 + c0 * c2, s0 * s1 * c2 - c0 * s2],
    [-s1, c2 * s2, c1 * c2]
  ];
}
// l은 1 * n 행렬곱
function mmulCol(l, r) {
  return l.map((v, i) => r[0].reduce((p, c, j) => p + l[j] * r[j][i], 0));
}
function mmul(l, r) {
  return Array.isArray(l[0]) ? l.map((it) => mmulCol(it, r)) : mmulCol(l, r);
}
// ref: https://namu.wiki/w/%EC%97%AD%ED%96%89%EB%A0%AC
function inverseMatrix3(m) {
  const k =
    m[0][0] * m[1][1] * m[2][2] -
    m[0][0] * m[1][2] * m[2][1] -
    m[0][1] * m[1][0] * m[2][2] +
    m[0][1] * m[1][2] * m[2][0] +
    m[0][2] * m[1][0] * m[2][1] -
    m[0][2] * m[1][1] * m[2][0];
  return [
    [
      (m[1][1] * m[2][2] - m[1][2] * m[2][1]) / k,
      (m[0][2] * m[2][1] - m[0][1] * m[2][2]) / k,
      (m[0][1] * m[1][2] - m[0][2] * m[1][1]) / k
    ],
    [
      (m[1][2] * m[2][1] - m[1][0] * m[2][2]) / k,
      (m[0][0] * m[2][2] - m[0][2] * m[2][0]) / k,
      (m[0][2] * m[1][0] - m[0][0] * m[1][2]) / k
    ],
    [
      (m[1][0] * m[2][1] - m[1][1] * m[2][0]) / k,
      (m[0][1] * m[2][0] - m[0][0] * m[2][1]) / k,
      (m[0][0] * m[1][1] - m[0][1] * m[1][0]) / k
    ]
  ];
}
// 두좌표의 각도 변화를 단위 쿼터니언으로 변환
function quaternionBetween(l, r) {
  if (!l || !r) return;
  const axis = cross(l, r);
  const len = Math.sqrt(dot(axis, axis));
  const angle = 0.5 * Math.acos(dot(l, r));
  const res = Math.sin(angle) / len;
  return len && [Math.cos(angle), axis[2] * res, -axis[1] * res, axis[0] * res];
}
function conv2Polar(pt) {
  const r = Math.sqrt(dot(pt, pt));
  return [Math.atan2(pt[1], pt[0]), Math.acos(pt[2] / r), r];
}
function angleOfPolar(polar) {
  polar = toRadian(polar);
  const pt = polar2orthogonal(polar);
  // const l = Math.cos(polar[1]);
  // const x = l * Math.sin(polar[0]);
  // const y = l * Math.cos(polar[0]);
  // const z = Math.sin(polar[1]);
  //return [Math.atan2(x, y), Math.atan2(x, z), Math.atan2(y, z)];
  return angleOfPt(pt);
}
function angleOfPt(pt) {
  return [
    Math.atan2(pt[1], pt[0]),
    Math.atan2(pt[2], pt[0]),
    Math.atan2(pt[1], pt[2])
  ];
}
function multiplyQuaternion(l, r) {
  return [
    l[0] * r[0] - l[1] * r[1] - l[2] * r[2] - l[3] * r[3],
    l[0] * r[1] + l[1] * r[0] + l[2] * r[3] - l[3] * r[2],
    l[0] * r[2] - l[1] * r[3] + l[2] * r[0] + l[3] * r[1],
    l[0] * r[3] + l[1] * r[2] - l[2] * r[1] + l[3] * r[0]
  ];
}
// 극좌표계 -> 직각좌표계
// function polar2orthogonal(pt) {
//   const l = Math.cos(pt[1]);
//   return [l * Math.cos(pt[0]), l * Math.sin(pt[0]), Math.sin(pt[1])];
// }
// 끼인각 x, y 좌표 각도?
function rotateOf(origin, pt1, pt2) {
  const q =
    Math.atan2(pt1[1] - origin[1], pt1[0] - origin[0]) -
    Math.atan2(pt2[1] - origin[1], pt2[0] - origin[0]);
  return [Math.cos(q * 0.5), 0, 0, Math.sin(q * 0.5)]; // 왜 4개?
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
// 외적은 돌림힘, 각운동량 계산에 사용
// 외적 사용해서 두점(a, b)의 각을 알 수 있음.
// q = asin( | a X b | / (|a| |b|) )
// 3점(BAC)의 끼인각(내적 사용)
// A * B = |A|*|B| * cos q
// 이므로,
// cos q = A * B / (|A|*|B|)
// B와 C를 A 기준으로 이동
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
