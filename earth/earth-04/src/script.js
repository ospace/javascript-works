// https://www.lucypark.kr/blog/2015/06/24/seoul-matzip-mapping/
const [width, height] = [400, 300];
const svg = d3
  .select("#foo")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .attr("style", "border: 1px solid black");

const g = svg.append("g");

// const projection = d3.geo
//   .mercator()
//   .center([100, 100])
//   .scale(100000)
//   .translate([width * 0.5, height * 0.5]);
const projection = d3
  .geoNaturalEarth1()
  // .geoMercator()
  // .center([127, 36])
  // .scale(2500)
  //.scale(width / 1.3 / Math.PI)
  .translate([width * 0.5, height * 0.5]);

function fitScale(path, projection, width, height) {
  var bounds = path.bounds({ type: "Sphere" });
  var hScale = (bounds[1][0] - bounds[0][0]) / projection.scale();
  var vScale = (bounds[1][1] - bounds[0][1]) / projection.scale();
  return Math.min(width / hScale, height / vScale) * 0.9;
}

const path = d3.geoPath().projection(projection);
projection.scale(fitScale(path, projection, width, height));

g.append("path")
  .attr("class", "sphere")
  .attr("d", path({ type: "Sphere" }));

svg.call(
  d3.zoom().on("zoom", ({ transform }) => {
    g.attr("transform", transform);
  })
);
// const path = d3.geo.path().projection(projection);
// const path = d3.geoPath(projection);

// const map = svg.append("g").attr("id", "map");
//const map = svg.append("g").attr("class", "map");
//const places = svg.append("g").attr("id", "places");

// const urlData = "skorea-municipalities-2018-topo.json";
// const urlData =
//   "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json";
const urlData = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json";
// const urlData = "countries-50m.json";
// const urlData = "https://unpkg.com/world-atlas@2.0.2/countries-50m.json";
// const urlData = 'https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson';
// d3.json("seoul_municipalities_topo_simple.json", (data) => {
console.log("starting...");
d3.json(urlData).then((data) => {
  console.log("> data:", data);
  const countries = topojson.feature(data, data.objects.countries);
  // const features = topojson.feature(
  //   data,
  //   data.objects.skorea_municipalities_2018_geo
  //   // data.features
  //   // data.objects.seoul_municipalities_geo
  // ).features;
  // const features = data.objects.countries;
  // const features = topojson.feature(
  //   data,
  //   data.objects.countries
  // ).features;
  console.log("> features:", countries);
  g.selectAll("path")
    .data(countries.features)
    .enter()
    .append("path")
    .attr("class", "country")
    .attr("d", path)
    .append("title")
    .text((d) => d.properties.name);
  // .attr("fill", "#69b3a2")
  // .attr("stroke", "black");
});
//svg.append("path").attr("d", d3.geoPath());
