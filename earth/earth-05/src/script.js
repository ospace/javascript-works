// https://www.jasondavies.com/maps/rotate/
const [width, height] = [400, 400];
const svg = d3
  .select("#foo")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .attr("style", "border: 1px solid black");
//const g = svg.append("g");
const g = svg;
const projection = d3
  // .geoOrthographic()
  .geoMercator()
  // .clipAngle(90)
  .precision(0.001)
  .translate([width * 0.5, height * 0.5]);
function fitScale(path, projection, width, height) {
  var bounds = path.bounds({ type: "Sphere" });
  var hScale = (bounds[1][0] - bounds[0][0]) / projection.scale();
  var vScale = (bounds[1][1] - bounds[0][1]) / projection.scale();
  return Math.min(width / hScale, height / vScale) * 0.9;
}
const path = d3.geoPath().projection(projection);
// projection.scale(fitScale(path, projection, width, height));
// projection.scale(width * 0.45);
const globe = { type: "Sphere" };
g.append("path").attr("class", "sphere").attr("d", path(globe));
let isDrag = false;
let pointer = null;
// svg.on("mousedown", function ({ offsetX, offsetY }) {
//   console.log("> mousedown:");
//   isDrag = true;
//   pointer = [offsetX, offsetY];
// });
// svg.on("mousemove", function ({ offsetX, offsetY }) {
//   if (!isDrag) return;
//   const dx = offsetX - pointer[0] + rotate[0];
//   const dy = offsetY - pointer[1] + rotate[1];
//   console.log("> mousedown:", dx, dy);
//   projection.rotate([dx * 100, dy * 100, projection.rotate()[2]]);
//   pointer = [offsetX, offsetY];
// });
// svg.on("mouseup", function (ev) {
//   console.log("> mouseup:", ev);
//   isDrag = false;
// });
// d3.drag().on("drag", function (ev) {
//   console.log("> drag:", ev);
// });
function rotateXY(x, y) {
  let rotate = projection.rotate();
  rotate[0] += x;
  rotate[1] += y;
  projection.rotate(rotate);
  g.selectAll(".country").attr("d", path);
  //g.selectAll(".sphere").attr("d", path(globe));
}
let prePointer_;
let orgRotate_;
let rotate_ = projection.rotate();
let orgScale = projection.scale();
let scale_;
svg.call(
  d3
    .zoom()
    .on("start", (ev) => {
      prePointer_ = d3.pointer(ev);
      const { transform } = ev;
      // console.log("> zoomstart:", prePointer_, transform);
      // let rot_ = projection.rotate();
      transform_ = transform;
      orgRotate_ = projection.rotate();
    })
    .on("zoom", (ev) => {
      const pointer = d3.pointer(ev);
      const { transform } = ev;
      const inv = projection.invert(pointer);
      console.log("> zoom:", pointer, transform.k, inv);
      // svg.call(d3.zoom().on("zoom", function() {
      // }));
      //g.attr("transform", transform);
      // if (!transform_) {
      //   transform_ = transform;
      //   return;
      // }
      let dx = pointer[0] - prePointer_[0];
      let dy = pointer[1] - prePointer_[1];
      // rotate_[0] += dx * 0.2;
      // rotate_[1] -= dy * 0.2;
      rotate_[0] = orgRotate_[0] + dx * 0.2;
      rotate_[1] = orgRotate_[1] - dy * 0.2;
      // projection.scale(transform.k);
      scale_ = transform.k;
      projection.rotate(rotate_).scale(transform.k * orgScale);
      // g.selectAll(".country").attr("d", path);
      // console.log("> zoom:", transform);
      //rotateXY(dx * 0.5, -dy * 0.5);
      //transform_ = transform;
      //prePointer_ = pointer;
    })
    .on("end", () => {
      // console.log("> zoomend:");
      // svg.call(d3.zoom().on("zoom", null));
    })
);
svg.call(
  d3.drag().on("drag", (ev) => {
    // console.log("> drag:", ev);
    let rotate = projection.rotate();
    projection.rotate(rotate);
    //g.selectAll(".country").attr("d", path);
  })
);
// setInterval(() => {
//   g.selectAll(".country").attr("d", path);
// }, 30);
const urlData =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
// const urlData = "earth-topo.json";
// console.log("starting...");
d3.json(urlData).then((data) => {
  // console.log("> data:", data);
  const countries = topojson.feature(data, data.objects.countries);
  // console.log("> features:", countries);
  g.selectAll("path")
    .data(countries.features)
    .enter()
    .append("path")
    .attr("class", "country")
    .attr("d", path)
    .append("title")
    .text((d) => d.properties.name);
  // let t = Date.now();
  // setInterval(() => {
  //   // let rotate = projection.rotate();
  //   // console.log("> rotate:", rotate);
  //   // let angle = (Date.now() - t) * 0.01;
  //   // rotate[0] = angle;
  //   rotateXY(1, 0);
  // }, 30);
});
let lastRotate_ = projection.rotate();
let lastScale_ = scale_;
setInterval(() => {
  if (
    rotate_.every((val, idx) => val === lastRotate_[idx]) &&
    lastScale_ === scale_
  )
    return;
  g.selectAll(".country").attr("d", path);
  if (lastScale_ !== scale_) {
    g.selectAll(".sphere").attr("d", path(globe));
  }
  lastRotate_ = rotate_.slice();
  lastScale_ = scale_;
}, 40);
