const [width, height] = [400, 300];
const svg = d3
  .select("#earth")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

const g = svg.append("g");

const projection = d3
  .geoEquirectangular()
  .translate([width * 0.5, height * 0.5]);

const path = d3.geoPath().projection(projection);

var bounds = path.bounds({ type: "Sphere" });
var hScale = (bounds[1][0] - bounds[0][0]) / projection.scale();
var vScale = (bounds[1][1] - bounds[0][1]) / projection.scale();
var scale = Math.min(width / hScale, height / vScale) * 1;

projection.scale(scale);

g.append("path")
  .attr("class", "sphere")
  .attr("d", path({ type: "Sphere" }));

svg.call(
  d3.zoom().on("zoom", ({ transform }) => {
    g.attr("transform", transform);
  })
);

const urlData = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json";
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
