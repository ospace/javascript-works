/*
	MIT License
	Copyright (c) 2022 ospace(ospace114@empal.com)
*/

const [width, height] = [300, 300];

const svg = d3
  .select("#earth2")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .attr("style", "border: 1px solid black");
const g = svg.append("g");
const projection = d3
  .geoOrthographic()
  .precision(0.1)
  .translate([width * 0.5, height * 0.5]);

const path = d3.geoPath().projection(projection);
projection.scale(width * 0.45);
const globe = {
  type: "Sphere"
};
g.append("path").attr("class", "sphere").attr("d", path(globe));

let prePointer;
let orgScale = projection.scale();
let orgRotate;
svg.call(
  d3
    .zoom()
    .on("start", (ev) => {
      prePointer = d3.pointer(ev, svg.node());
      orgRotate = projection.rotate();
    })
    .on("zoom", (ev) => {
      const { transform } = ev;
      const pointer = d3.pointer(ev, svg.node());
      let dx = pointer[0] - prePointer[0];
      let dy = pointer[1] - prePointer[1];

      let rotate = [orgRotate[0] + dx / 3, orgRotate[1] - dy / 3, 0];
      projection.rotate(rotate).scale(transform.k * orgScale);
    })
);

const urlData =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
d3.json(urlData).then((data) => {
  const countries = topojson.feature(data, data.objects.countries);
  g.selectAll("path")
    .data(countries.features)
    .enter()
    .append("path")
    .attr("class", "country")
    .attr("d", path)
    .append("title")
    .text((d) => d.properties.name);
});

setInterval(() => {
  g.selectAll("path").attr("d", path);
  g.selectAll(".sphere").attr("d", path(globe));
}, 40);