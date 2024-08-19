const data = range(30).map((_) => Math.random());

(function () {
  const { ctx, offsetWidth, offsetHeight } = getContext(0);
  const gap = offsetWidth / data.length;
  const height = offsetHeight - 10;

  data.forEach((v, i) =>
    drawRoundedBarV(ctx, gap * i, data[i] * height, gap, true)
  );
})();

(function () {
  const { ctx, offsetWidth, offsetHeight } = getContext(1);
  const gap = offsetWidth / data.length;
  const height = offsetHeight - 10;

  ctx.translate(0, offsetHeight);

  data.forEach((v, i) =>
    drawRoundedBarV(ctx, gap * i, data[i] * height, gap, false)
  );
})();

(function () {
  const { ctx, offsetWidth, offsetHeight } = getContext(2);
  const gap = offsetWidth / data.length;
  const height = offsetHeight - 10;

  ctx.translate(0, offsetHeight);
  ctx.lineWidth = 1;
  ctx.strokeStyle = "gray";
  ctx.fillStyle = "lightgray";

  data.forEach((v, i) => {
    drawRoundedBarV(ctx, gap * i, -data[i] * height, gap, true);
    ctx.fill();
  });
})();

(function () {
  const { ctx, offsetWidth, offsetHeight } = getContext(3);
  const gap = offsetWidth / data.length;
  const height = (offsetHeight - 10) / 2;

  ctx.translate(0, offsetHeight / 2);

  data.forEach((v, i) =>
    drawRoundedBarV(ctx, gap * i, data[i] * height, gap, i % 2)
  );
})();

function drawRoundedBarV(ctx, x, y, diameter, isDown) {
  y = isDown ? y : -y;
  const radius = diameter / 2;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, y);
  ctx.arc(x + radius, y, radius, Math.PI, 0, isDown);
  ctx.lineTo(x + diameter, 0);
  ctx.stroke();
}

function getContext(id) {
  const el = document.getElementById("canvas" + id);
  return {
    ctx: el.getContext("2d"),
    offsetWidth: el.offsetWidth,
    offsetHeight: el.offsetHeight
  };
}

function range(count) {
  return Array.apply(null, Array(count));
}