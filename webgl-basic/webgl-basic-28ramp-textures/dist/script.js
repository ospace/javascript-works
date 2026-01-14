/* 
  # ramp textures
  
  방향성 조명에서 내적값으로 빛과 면의 법선 백터로 밝기를 계산해서 적용했다.
  빛의 밝기 값을 가지고 텍스처에서 값을 추출해서 사용하는 방식이다. 내적값인 -1~+1 범위이므로 텍스처에서 사용할 0~1 범위로 매핑한다.
    float u = light * 0.5 + 0.5;
    
  이 값으로 텍스처에서 색을 추출해서 gl_FragColor에 밝기에 적용한다.
    vec2 uv = vec2(u, 0.5);
    vec4 rampColor = texture2D(u_ramp, uv);
    gl_FragColor = u_color;
    gl_FragColor *= rampColor;
  
  이 때에 사용할 텍스처를 다음 처럼 정의한다. 밝기 정보만 있으면 되기에 gl.LUMINANCE를 사용했다.
    let unitNo = 1;
    createTexture(gl, unitNo);
    let data = new Uint8Array([80, 255]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, data.length, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, data);
  
  위처럼 하면 카툰 렌더링처럼 된다. TEXTURE_MIN_FILTER와 TEXTURE_MAG_FILTER가 NEAREST되어 있기 때문이다. LINEAR로 바꾸면 부드럽게 바뀐다.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    
  LINEAR 방식으로 부드러워지기 때문에 기존 방식과는 조금 차이가 있다. 텍스처에서 가운데 보간되는 부분만 추출하면 기존 빛에 의한 방식과 동일하게 된다.
  이때 텍스처의 크기 정보가 필요하다. 이를 이용해 UV 크기를 조정하여 텍스처 너비보다 1만큼 작은 0~1사이에 매핑된다. 다음에 0.5를 추가하고 정규화하면 된다. 
  uv 값이 0~1 범위로 가운데만 가져와야 한다. 예를 들어 텍스처 크기가 2인 경우 가운데 0.5 기준 양쪽으로 나눠진다. 왼쪽에 절반(0.25)에서 오른쪽 절반(0.75) 까지 선택한다.
  그런데 텍스처 크기가 2개 이상에 될 수 있기 때문에 가운데 범위가 데이터 크기에 따라서 가변적이다. 이를 계산해보자.
  먼저 uv 범위 0~1을 텍스처 크기에서 1을 뺀 만큼 늘린다. 텍스처 크기가 2인 경우는 0~1가 된고 텍스처 크기가 3인 경우는 0~2가 된다.
  1를 뺀이유는 양쪽 절반을 제외하고 가운데를 취해야하기 때문이다. 양쪽에서 0.5씩 빼주기에 결국 1이 제거된다.
  최종적으로 매핑되는 영역의 값이 size-1 이된다. 수식으로 표현하면 다음과 같다.
    uv * (size - 1)

  uv의 값이 매핑할 양쪽 빼준 범위에 마지막으로 빼준 영역 0.5을 더해주면 양쪽에 매핑할 범위인 가운데 들어가게 된다.
    uv * (size - 1) + 0.5

  size 범위를 다시 0~1 범위로 축소하기 위해 size을 나눠주면 된다.
    (uv * (size -1) + 0.5) / size

  부드러운 랜더링을 할 경우 가운데 그라데이션 영역만 추출한다. 만약 카툰 렌더링을 할 경우 전체 범위를 모두 사용하는게 좋다.
  u_linearAdjust을 두고 부드러운 렌더링이면 1로 사용하고 카툰 랜더링이면 0으로 사용해서 텍스처 범위를 선택한다.
    vec2 texelRange = uv * (u_rampSize - u_linearAdjust);
    vec2 rampUV = (texelRange + 0.5 * u_linearAdjust) / u_rampSize;
    vec4 rampColor = texture2D(u_ramp, rampUV);
    
  2개의 색상과 임계값을 설정하여 2색 툰 셰이딩 셰이더를 만들 수 있다.
    color1, color2, threshold
    => color = mix(color1, colo2, step(cosAngle, threshold))
    
  좀더 유연한 렌더링 방식을 선택할 수 있게 되었다.
    
  Ref:
    https://webglfundamentals.org/webgl/lessons/ko/webgl-ramp-textures.html
    https://webglfundamentals.org/webgl/lessons/resources/webgl-state-diagram.html
    
  GLSL spec: https://www.khronos.org/files/opengles_shading_language.pdf
  Linear algebra: https://www.youtube.com/watch?v=kjBOesZCoqc&list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab
*/
///////////////////////////// enviroments ///////////////////////////////
const RADIAN_IN_DEG = Math.PI / 180;

function onResize() {
  const { clientWidth, clientHeight } = document.body;
  if (c.width == clientWidth && c.height == clientHeight) return false;

  c.width = clientWidth;
  c.height = clientHeight;

  return true;
}

// onResize();
// addEventListener("resize", onResize);

//////////////////////////////// Functions ///////////////////////////////

function toStr(a, fixed = 1) {
  return (
    "[" +
    a
      .map((it) =>
        Array.isArray(it)
          ? toStr(it, fixed)
          : undefined != it
          ? it.toFixed(fixed)
          : "-"
      )
      .join() +
    "]"
  );
}

function infoOfWebgl(gl) {
  const [minSize, maxSize] = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE);

  console.group("MAX Point size");
  console.log(`minSize: ${minSize}`);
  console.log(`maxSize: ${maxSize}`);
  console.groupEnd();

  // prettier-ignore
  const webgl_1 = [
    [gl.MAX_VERTEX_ATTRIBS, "최대 속성 개수"],
    [gl.MAX_VERTEX_UNIFORM_VECTORS, "정점 셰이더 최대 vec4 유니폼 개수"],
    [gl.MAX_VARYING_VECTORS, "최대 베링 개수"],
    [gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS, "최대 존재하는 텍스처 유닛 개수"],
    [gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS, "정점 셰이더 최대 텍스처 유닛 개수"],
    [gl.MAX_TEXTURE_IMAGE_UNITS, "프래그먼트 셰이더 최대 텍스처 유닛 개수"],
    [gl.MAX_FRAGMENT_UNIFORM_VECTORS, "프래그먼트 셰이더 최대 vec4 유니폼 개수"],
    [gl.MAX_CUBE_MAP_TEXTURE_SIZE, "큐브맵 최대 크기"],
    [gl.MAX_RENDERBUFFER_SIZE, "렌더 버퍼 최대 크기"],
    [gl.MAX_VIEWPORT_DIMS, "뷰포트 최대 크기"]
  ];

  console.group("WebGL1");
  webgl_1.forEach(([type, desc]) => {
    const val = gl.getParameter(type);
    console.log(`${desc}: ${val}`);
  });
  console.groupEnd();

  // prettier-ignore
  const webgl_2 = [
    [gl.MAX_3D_TEXTURE_SIZE, "3D 텍스처 최대 크기"],
    [gl.MAX_DRAW_BUFFERS, "최대 색상 어태치먼트 개수"],
    [gl.MAX_ARRAY_TEXTURE_LAYERS, "2D 텍스처 배열 최대 레이어"],
    [gl.MAX_TRANSFORM_FEEDBACK_SEPARATE_ATTRIBS, "변환 피드백을 사용할 때 별도 버퍼로 출력 최대 베링 개수"],
    [gl.MAX_TRANSFORM_FEEDBACK_INTERLEAVED_COMPONENTS, "모든 걸 단일 버퍼로 보낼 때 최대 베링 개수"],
    [gl.MAX_COMBINED_UNIFORM_BLOCKS, "종합적으로 사용할 수 있는 최대 유니폼 블록 개수"],
    [gl.MAX_VERTEX_UNIFORM_BLOCKS, "정점 셰이더 최대 유니폼 블록 개수"],
    [gl.MAX_FRAGMENT_UNIFORM_BLOCKS, "프래그먼트 셰이더 최대 유니폼 블록 개수"]
  ];

  console.group("WebGL2");
  webgl_2.forEach(([type, desc]) => {
    const val = gl.getParameter(type);
    console.log(`${desc}: ${val}`);
  });
  console.groupEnd();
}

function createSphere(radius, divide = 5) {
  const halfPi = Math.PI * 0.5;
  const aRadian = Math.PI / divide;
  const n = divide * 2;
  const uDELTA = 1.0 / divide;
  const vDELTA = 1.0 / n;

  let vertices = [];
  let uvcoords = [];
  for (let i = 0; i < divide + 1; ++i) {
    const q = i * aRadian - halfPi; // 위도 각도 계산
    const xy = Math.cos(q);
    const z = Math.sin(q);
    const v = uDELTA * i;
    for (let j = 0; j < n; ++j) {
      const p = j * aRadian;
      vertices.push([xy * Math.sin(p), z, xy * Math.cos(p)]);
      const u = vDELTA * j;
      uvcoords.push([u, v]);
    }
    vertices.push(vertices[vertices.length - n]);
    uvcoords.push([vDELTA * n, v]);
  }

  let indices = [];
  for (let i = 0; i < divide; ++i) {
    const around = i * (n + 1);
    for (let j = 0; j < n; ++j) {
      const p0 = around + j;
      const p1 = around + j + 1;
      const p2 = around + n + j + 1;
      const p3 = around + n + j + 2;
      indices.push(p0, p2, p1, p1, p2, p3);
    }
  }

  let a_position = new Float32Array(indices.length * 3);
  let a_normal = new Float32Array(indices.length * 3);
  let a_texcoord = new Float32Array(indices.length * 2);
  indices.forEach((idx, i) => {
    let v = vertices[idx];
    a_position[i * 3 + 0] = radius * v[0];
    a_position[i * 3 + 1] = radius * v[1];
    a_position[i * 3 + 2] = radius * v[2];
    a_normal[i * 3 + 0] = v[0];
    a_normal[i * 3 + 1] = v[1];
    a_normal[i * 3 + 2] = v[2];
    let c = uvcoords[idx];
    a_texcoord[i * 2 + 0] = c[0];
    a_texcoord[i * 2 + 1] = c[1];
  });

  let nVertices = a_position.length / 3;

  return { a_position, a_normal, a_texcoord, nVertices };
}

const ctx2D = document.createElement("canvas").getContext("2d");

function createTextCanvas(text, width, height) {
  ctx2D.save();

  ctx2D.canvas.width = width;
  ctx2D.canvas.height = height;
  ctx2D.font = `${height * 0.9}px sans-serif`;
  ctx2D.textAlign = "center";
  ctx2D.textBaseline = "middle";
  ctx2D.fillStyle = "black";
  ctx2D.clearRect(0, 0, width, height);
  ctx2D.fillText(text, width / 2, height / 2);

  ctx2D.restore();

  return ctx2D.canvas;
}

function createCubeMapSample(gl, width, height) {
  const CUBE_MAP = [
    [gl.TEXTURE_CUBE_MAP_POSITIVE_X, "+X", "#F00", "#0FF"],
    [gl.TEXTURE_CUBE_MAP_NEGATIVE_X, "-X", "#FF0", "#00F"],
    [gl.TEXTURE_CUBE_MAP_POSITIVE_Y, "+Y", "#0F0", "#F0F"],
    [gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, "-Y", "#0FF", "#F00"],
    [gl.TEXTURE_CUBE_MAP_POSITIVE_Z, "+Z", "#00F", "#FF0"],
    [gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, "-Z", "#0FF", "#0F0"]
  ];

  // const ctx = document.createElement("canvas").getContext("2d");
  ctx2D.save();
  ctx2D.canvas.width = width;
  ctx2D.canvas.height = height;
  ctx2D.font = `${width * 0.7}px sans-serif`;
  ctx2D.textAlign = "center";
  ctx2D.textBaseline = "middle";

  let texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

  CUBE_MAP.forEach((it, i) => {
    ctx2D.fillStyle = it[2];
    ctx2D.fillRect(0, 0, width, height);
    ctx2D.fillStyle = it[3];
    ctx2D.fillText(it[1], width / 2, height / 2);
    gl.texImage2D(it[0], 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, ctx.canvas);
  });

  gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
  // prettier-ignore
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

  ctx2D.restore();

  return texture;
}

function checkFramebuffer(gl) {
  let status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    throw new Error("Framebuffer is not complete!");
  }
}

function createCubeLine(size = 1) {
  const l = size * 0.5;
  // prettier-ignore
  const vertices = [
    [-l, -l, -l], // 0
    [ l, -l, -l], // 1
    [-l,  l, -l], // 2
    [ l,  l, -l], // 3
    [-l, -l,  l], // 4
    [ l, -l,  l], // 5
    [-l,  l,  l], // 6
    [ l,  l,  l]  // 7
  ];

  // prettier-ignore
  const lines = [
    0, 1, 1, 3, 3, 2, 2, 0,
    4, 5, 5, 7, 7, 6, 6, 4,
    0, 4, 1, 5, 3, 7, 2, 6,
  ];

  let positions = lines.reduce((prev, it) => prev.concat(vertices[it]), []);

  return { positions };
}

// 이미지 전체가 한면을 채우는 텍스처 좌표을 사각형 면 개수(nFaces)에 맞게 적용한다.
function applyNormalTexCoord(gl, nFaces = 6) {
  let normalTexcoord = createNormalTexCoord(6);

  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(normalTexcoord),
    gl.STATIC_DRAW
  );
}

function createNormalTexCoord(nFaces = 6) {
  return new Float32Array(
    new Array(nFaces)
      .fill()
      .reduce((acc, _) => acc.concat([0, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1]), [])
  );
}

// apply checker bodard to texture
// prettier-ignore
function applyCheckerTexture(gl, width = 8, height = 8, tile0 = 0xff, tile1 = 0xcc) {
  let checkerData = [];
  for (let i = 0; i < height; ++i) {
    for (let j = 0; j < width; ++j) {
      checkerData.push((i + j) & 1 ? tile1 : tile0);
    }
  }

  gl.texImage2D(
    gl.TEXTURE_2D,
    0, // mip level
    gl.LUMINANCE, // internal format
    width,
    height,
    0, // border
    gl.LUMINANCE, // format
    gl.UNSIGNED_BYTE, // type
    new Uint8Array(checkerData) // data
  );

  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
}

/*
  가운데 매핑 정보(+z) 기준으로 큐브 매핑 좌표 생성
      +--+
      |+y|
   +--+--+--+--+
   |-x|+z|+x|-z|
   +--+--+--+--+
      |-y|
      +--+
 */
function createCubeMapping(z_x, z_y, z_w, z_h, img_width, img_height) {
  function face_map(i, j) {
    // prettier-ignore
    return [
      (z_x + z_w * i) / img_width, (z_y + z_h * j) / img_height,
      (z_x + z_w * i) / img_width, (z_y + z_h * (j + 1)) / img_height,
      (z_x + z_w * (i + 1)) / img_width, (z_y + z_h * j) / img_height,
      (z_x + z_w * i) / img_width, (z_y + z_h * (j + 1)) / img_height,
      (z_x + z_w * (i + 1)) / img_width, (z_y + z_h * (j + 1)) / img_height,
      (z_x + z_w * (i + 1)) / img_width, (z_y + z_h * j) / img_height
    ];
  }

  // prettier-ignore
  const map_info = [[0, 0], [2, 0], [-1, 0], [1, 0], [0,-1], [0, 1]];

  return map_info.reduce((pre, it) => pre.concat(face_map.apply(null, it)), []);
}

function loadImages(srcs, callback) {
  let countdown = srcs.length;

  let imgs = srcs.map((it) =>
    loadImage(it, function () {
      if (0 == --countdown) callback(imgs);
    })
  );

  return imgs;
}

function loadImage(src, callback) {
  var img = new Image();
  if (new URL(src, window.location.href).origin !== window.location.origin) {
    img.crossOrigin = "";
  }
  // img.crossOrigin = "Anonymous";
  // img.crossOrigin = "";
  img.onload = callback;
  img.onerror = function (msg, url, no) {
    console.error("image:", src);
  };
  // img.src = src;

  // fetch(src, { mode: "no-cors" })
  fetch(src)
    .then((res) => res.blob())
    .then((blob) => (img.src = URL.createObjectURL(blob)))
    .catch((e) => console.error(`loadImage(): ${e.message}`));

  return img;
}

/* 텍스처 생성
  사용예)
  defineTexture(gl, program, "u_image");
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
*/
// function defineTexture(gl, program, name, defaultUnitNo = 0) {
//   let maxUnit = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
//   if (defaultUnitNo > maxUnit) {
//     throw new Error(
//       `unitNo($unitNo) is over than MAX_TEXTURE_IMAGE_UNITS(${maxUnit})`
//     );
//   }

//   // 유니폼에 유닛 설정
//   let loc = gl.getUniformLocation(program, name);
//   if (0 > loc || null === loc || undefined === loc) {
//     throw new Error(`${name} texture is not found!`);
//   }

//   gl.uniform1i(loc, defaultUnitNo); // 유닛 설정

//   // return createTexture(gl, unitNo);
//   return loc;
// }

function createTexture(gl, unitNo = -1) {
  let maxUnit = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
  if (0 <= unitNo && maxUnit - 1 < unitNo) {
    throw new Error(
      `unitNo($unitNo) is over than MAX_TEXTURE_IMAGE_UNITS(${maxUnit})`
    );
  }

  // 텍스처 생성 및 유닛 설정
  let texture = gl.createTexture();
  if (0 <= unitNo) {
    gl.activeTexture(gl.TEXTURE0 + unitNo); // 바인딩할 유닛
  }
  gl.bindTexture(gl.TEXTURE_2D, texture); // 텍스처 유닛에 바인딩

  // 이미지 랜더링 설정
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  return texture;
}

// count x count 배열 배치 좌표 생성
function arrangeArray(count, range, callbackXYZ) {
  const gap = range / count;
  const firstPt = ~~((-range + gap) * 0.5);

  for (let i = 0; i < count; ++i) {
    let x = firstPt + gap * i;
    for (let j = 0; j < count; ++j) {
      let z = firstPt + gap * j;
      callbackXYZ(x, 0, z);
    }
  }
}

// 벡터 정규화
function normalize(v) {
  var length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  // 0으로 나뉘지 않도록 하기
  if (length > 0.00001) {
    return [v[0] / length, v[1] / length, v[2] / length];
  } else {
    return [0, 0, 0];
  }
}

// 벡터 뺄셈
function subtractVectors(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

// 벡터곱
function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];
}

function createPlane(width, height) {
  const w = width * 0.5;
  const h = height * 0.5;
  /*
        2 ---- 3
      /      / 
     0 ---- 1   
   */
  let vertices = [
    [-w, 0, +h], // 0
    [+w, 0, +h], // 1
    [-w, 0, -h], // 2
    [+w, 0, -h] // 3
  ];

  let indices = [2, 0, 3, 0, 1, 3];

  let a_position = new Float32Array(
    indices.reduce((prev, it) => prev.concat(vertices[it]), [])
  );

  return { a_position };
}

// 박스 생성 함수
function createBox(width, height, depth) {
  const w = width * 0.5;
  const h = height * 0.5;
  const d = depth * 0.5;
  /* vetices positions
        4 ---- 6
      / |    / |
     0 ---- 2  |
     |  5 --|- 7
     | /    | /
     1 ---- 3     
  */
  const vertices = [
    [-w, +h, +d], // 0
    [-w, -h, +d], // 1
    [+w, +h, +d], // 2
    [+w, -h, +d], // 3
    [-w, +h, -d], // 4
    [-w, -h, -d], // 5
    [+w, +h, -d], // 6
    [+w, -h, -d] // 7
  ];

  // prettier-ignore
  const indices = [
    0, 1, 2, 2, 1, 3, // front
    6, 7, 4, 4, 7, 5, // back
    4, 5, 0, 0, 5, 1, // left
    2, 3, 6, 6, 3, 7, // right
    4, 0, 6, 6, 0, 2, // top
    1, 5, 3, 3, 5, 7, // bottom
  ];

  const faceNormals = [
    [+0, +0, +1], // front
    [+0, +0, -1], // back
    [-1, +0, +0], // left
    [+1, +0, +0], // right
    [+0, +1, +0], // top
    [+0, -1, +0] // bottom
  ];

  let a_position = new Float32Array(
    indices.reduce((agg, it) => agg.concat(vertices[it]), [])
  );
  // prettier-ignore
  let a_normal = new Float32Array(faceNormals.reduce((agg, it) => agg.concat(Array(6).fill(it).flat()), []));

  return { a_position, a_normal };
}

function setBox(gl, x, y, z, w, h, d) {
  let box = createBox(w, h, d);
  let a_position = [];
  for (let i = 0; i < box.positions.length; i += 3) {
    a_positions.push(box.a_position[i] + x + w * 0.5);
    a_positions.push(box.a_position[i + 1] + y + h * 0.5);
    a_positions.push(box.a_position[i + 2] + z + d * 0.5);
  }

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(a_positions), gl.STATIC_DRAW); // 데이터 저장

  return a_positions.length / 3;
}

// 사각형 생성 함수
function setRectangle(gl, x, y, width, height) {
  let rect = createRectangle(width - x, height - y);
  for (let i = 0; i < rect.a_positions.length; i += 3) {
    rect.a_position[i] += x;
    rect.a_position[i + 1] += y;
  }

  gl.bufferData(gl.ARRAY_BUFFER, rect.a_position, gl.STATIC_DRAW); // 데이터 저장
}

// create a rectangle
function createRectangle(width = 1, height = 1) {
  const w = width / 2;
  const h = height / 2;
  /* vetices positions
     0 ---- 2
     |      |
     |      |
     1 ---- 3     
  */
  const vertices = [
    [-w, +h], // 0
    [-w, -h], // 1
    [+w, +h], // 2
    [+w, -h] // 3
  ];

  const indices = [0, 1, 2, 1, 3, 2];
  let a_position = new Float32Array(
    indices.reduce((agg, it) => agg.concat(vertices[it]), [])
  );

  return { a_position, nVertices: a_position.length / 2 };
}

// 속성 정의
// - name: attribute 이름
// - size: 반복 개수
// - type: 데이터 형 (기본:gl.FLOAT)
// - normalized: 데이터 정규화(기본:false)
// prettier-ignore
function defineAttribute(gl, program, name, size, type = gl.FLOAT, normalized = false ) {
  let loc = gl.getAttribLocation(program, name); // 속성 위치 정보
  if (0 > loc) {
    throw new Error(name + " attribute is not found!");
  }
  
  // 버퍼 생성하고 ARRYA_BUFFER에 바인딩
  let buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  // vertex array에서 해당 attribute 활성화
  gl.enableVertexAttribArray(loc);
  // vertex array에 속성 설정
  gl.vertexAttribPointer(loc, size, type, normalized, 0, 0); // 데이터 속성

  return buf;
}

// prettier-ignore
function defineAttribute2(gl, program, name, size, type = gl.FLOAT, normalized = false ) {
  let loc = gl.getAttribLocation(program.program, name); // 속성 위치 정보
  if (0 > loc) {
    throw new Error(name + " attribute is not found!");
  }
    
  // 버퍼 생성하고 ARRYA_BUFFER에 바인딩
  let buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  // vertex array에서 해당 attribute 활성화
  gl.enableVertexAttribArray(loc);
  // vertex array에 속성 설정
  gl.vertexAttribPointer(loc, size, type, normalized, 0, 0); // 데이터 속성

  return {
    buffer: [gl.ARRAY_BUFFER, buffer],
    pointer: [loc, size, type, normalized, 0, 0],
    bindBuffer: gl.bindBuffer.bind(gl, gl.ARRAY_BUFFER, buffer),
    vertexAttribPointer: gl.vertexAttribPointer.bind(gl, loc, size, type, normalized, 0, 0)
  };
}

// 정점과 프레그먼트 소스로 프로그램 관리할 객체를 생성
// 객체에는 program, attributes 속성이 있다.
function createProgram2(gl, vSource, fSource) {
  // 두 셰이셔 생성
  const vShader = createShader(gl, gl.VERTEX_SHADER, vSource);
  const fShader = createShader(gl, gl.FRAGMENT_SHADER, fSource);

  // 프로그램으로 두 셰이더 연결
  let program = createProgram(gl, vShader, fShader);

  return { program };
}

function createShader(gl, type, source) {
  let ret = gl.createShader(type);
  gl.shaderSource(ret, source);
  gl.compileShader(ret);
  let res = gl.getShaderParameter(ret, gl.COMPILE_STATUS);
  if (!res) {
    //if (!gl.getProgramParameter(ret, gl.COMPILE_STATUS)) {
    // 에러확인 성능 향상
    let err = gl.getShaderInfoLog(ret); // 동기호출로 성능 문제
    gl.deleteShader(ret);
    console.error(type === gl.VERTEX_SHADER ? "vertex" : "fragment", err);
    throw new Error(err);
  }
  return ret;
}

// 두 셰이더 소스입력 받아서 program 생성
function createProgram(gl, vertexSource, fragmentSource) {
  const vShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

  // 프로그램으로 두 셰이더 연결
  return createProgramWithShader(gl, vShader, fShader);
}

function createProgramWithShader(gl, vertexShader, fragmentShader) {
  let program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    let err = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(err);
  }

  gl.detachShader(program, vertexShader);
  gl.deleteShader(vertexShader);
  gl.detachShader(program, fragmentShader);
  gl.deleteShader(fragmentShader);

  return program;
}

// let MatType = Float32Array;
const m4 = {
  transformVector: function (m, v, dst) {
    dst = dst || [];
    for (var i = 0; i < 4; ++i) {
      dst[i] = 0.0;
      for (var j = 0; j < 4; ++j) {
        dst[i] += v[j] * m[j * 4 + i];
      }
    }
    return dst;
  },
  /**
   * Computes a 4-by-4 perspective transformation matrix given the angular height
   * of the frustum, the aspect ratio, and the near and far clipping planes.  The
   * arguments define a frustum extending in the negative z direction.  The given
   * angle is the vertical angle of the frustum, and the horizontal angle is
   * determined to produce the given aspect ratio.  The arguments near and far are
   * the distances to the near and far clipping planes.  Note that near and far
   * are not z coordinates, but rather they are distances along the negative
   * z-axis.  The matrix generated sends the viewing frustum to the unit box.
   * We assume a unit box extending from -1 to 1 in the x and y dimensions and
   * from -1 to 1 in the z dimension.
   * @param {number} fieldOfViewInRadians field of view in y axis.
   * @param {number} aspect aspect of viewport (width / height)
   * @param {number} near near Z clipping plane
   * @param {number} far far Z clipping plane
   * @param {Matrix4} [dst] optional matrix to store result
   * @return {Matrix4} dst or a new matrix if none provided
   * @memberOf module:webgl-3d-math
   */
  frustum: function (left, right, bottom, top, near, far, dst) {
    // dst = dst || new MatType(16);
    dst = dst || [];

    var dx = right - left;
    var dy = top - bottom;
    var dz = far - near;

    dst[0] = (2 * near) / dx;
    dst[1] = 0;
    dst[2] = 0;
    dst[3] = 0;
    dst[4] = 0;
    dst[5] = (2 * near) / dy;
    dst[6] = 0;
    dst[7] = 0;
    dst[8] = (left + right) / dx;
    dst[9] = (top + bottom) / dy;
    dst[10] = -(far + near) / dz;
    dst[11] = -1;
    dst[12] = 0;
    dst[13] = 0;
    dst[14] = (-2 * near * far) / dz;
    dst[15] = 0;

    return dst;
  },
  lookAt: function (cameraPosition, target, up) {
    var zAxis = normalize(subtractVectors(cameraPosition, target));
    var xAxis = normalize(cross(up, zAxis));
    var yAxis = normalize(cross(zAxis, xAxis));
    // prettier-ignore
    return [
       xAxis[0], xAxis[1], xAxis[2], 0,
       yAxis[0], yAxis[1], yAxis[2], 0,
       zAxis[0], zAxis[1], zAxis[2], 0,
       cameraPosition[0],
       cameraPosition[1],
       cameraPosition[2],
       1,
    ];
  },
  perspective: function (fieldOfViewInRadians, aspect, near, far) {
    var f = Math.tan((Math.PI - fieldOfViewInRadians) * 0.5);
    var rangeInv = 1.0 / (near - far);
    // prettier-ignore
    return [
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (near + far) * rangeInv, -1,
      0, 0, near * far * rangeInv * 2, 0
    ];
  },
  orthographic: function (left, right, bottom, top, near, far) {
    // prettier-ignore
    return [
      2 / (right - left), 0, 0, 0,
      0, 2 / (top - bottom), 0, 0,
      0, 0, 2 / (near - far), 0,
 
      (left + right) / (left - right),
      (bottom + top) / (bottom - top),
      (near + far) / (near - far),
      1,
    ];
  },
  projection: function (w, h, d) {
    // 참고: 이 행렬은 Y축을 뒤집기 때문에 0이 상단입니다.
    // 2 is length of clip space
    return [2 / w, 0, 0, 0, 0, -2 / h, 0, 0, 0, 0, 2 / d, 0, -1, 1, 0, 1];
  },
  identity: function () {
    return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  },
  translation: function (tx, ty, tz) {
    return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, tx, ty, tz, 1];
  },
  xRotation: function (angleInRadians) {
    var c = Math.cos(angleInRadians);
    var s = Math.sin(angleInRadians);

    return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1];
  },
  yRotation: function (angleInRadians) {
    var c = Math.cos(angleInRadians);
    var s = Math.sin(angleInRadians);

    return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1];
  },
  zRotation: function (angleInRadians) {
    var c = Math.cos(angleInRadians);
    var s = Math.sin(angleInRadians);

    return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  },
  scaling: function (sx, sy, sz) {
    return [sx, 0, 0, 0, 0, sy, 0, 0, 0, 0, sz, 0, 0, 0, 0, 1];
  },
  translate: function (m, tx, ty, tz) {
    return m4.multiply(m, m4.translation(tx, ty, tz));
  },
  xRotate: function (m, angleInRadians) {
    return m4.multiply(m, m4.xRotation(angleInRadians));
  },
  yRotate: function (m, angleInRadians) {
    return m4.multiply(m, m4.yRotation(angleInRadians));
  },
  zRotate: function (m, angleInRadians) {
    return m4.multiply(m, m4.zRotation(angleInRadians));
  },
  scale: function (m, sx, sy, sz) {
    return m4.multiply(m, m4.scaling(sx, sy, sz));
  },
  multiply: function (a, b) {
    var b00 = b[0 * 4 + 0];
    var b01 = b[0 * 4 + 1];
    var b02 = b[0 * 4 + 2];
    var b03 = b[0 * 4 + 3];
    var b10 = b[1 * 4 + 0];
    var b11 = b[1 * 4 + 1];
    var b12 = b[1 * 4 + 2];
    var b13 = b[1 * 4 + 3];
    var b20 = b[2 * 4 + 0];
    var b21 = b[2 * 4 + 1];
    var b22 = b[2 * 4 + 2];
    var b23 = b[2 * 4 + 3];
    var b30 = b[3 * 4 + 0];
    var b31 = b[3 * 4 + 1];
    var b32 = b[3 * 4 + 2];
    var b33 = b[3 * 4 + 3];
    var a00 = a[0 * 4 + 0];
    var a01 = a[0 * 4 + 1];
    var a02 = a[0 * 4 + 2];
    var a03 = a[0 * 4 + 3];
    var a10 = a[1 * 4 + 0];
    var a11 = a[1 * 4 + 1];
    var a12 = a[1 * 4 + 2];
    var a13 = a[1 * 4 + 3];
    var a20 = a[2 * 4 + 0];
    var a21 = a[2 * 4 + 1];
    var a22 = a[2 * 4 + 2];
    var a23 = a[2 * 4 + 3];
    var a30 = a[3 * 4 + 0];
    var a31 = a[3 * 4 + 1];
    var a32 = a[3 * 4 + 2];
    var a33 = a[3 * 4 + 3];

    return [
      b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30,
      b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31,
      b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32,
      b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33,
      b10 * a00 + b11 * a10 + b12 * a20 + b13 * a30,
      b10 * a01 + b11 * a11 + b12 * a21 + b13 * a31,
      b10 * a02 + b11 * a12 + b12 * a22 + b13 * a32,
      b10 * a03 + b11 * a13 + b12 * a23 + b13 * a33,
      b20 * a00 + b21 * a10 + b22 * a20 + b23 * a30,
      b20 * a01 + b21 * a11 + b22 * a21 + b23 * a31,
      b20 * a02 + b21 * a12 + b22 * a22 + b23 * a32,
      b20 * a03 + b21 * a13 + b22 * a23 + b23 * a33,
      b30 * a00 + b31 * a10 + b32 * a20 + b33 * a30,
      b30 * a01 + b31 * a11 + b32 * a21 + b33 * a31,
      b30 * a02 + b31 * a12 + b32 * a22 + b33 * a32,
      b30 * a03 + b31 * a13 + b32 * a23 + b33 * a33
    ];
  },
  inverse: function (m) {
    var m00 = m[0 * 4 + 0];
    var m01 = m[0 * 4 + 1];
    var m02 = m[0 * 4 + 2];
    var m03 = m[0 * 4 + 3];
    var m10 = m[1 * 4 + 0];
    var m11 = m[1 * 4 + 1];
    var m12 = m[1 * 4 + 2];
    var m13 = m[1 * 4 + 3];
    var m20 = m[2 * 4 + 0];
    var m21 = m[2 * 4 + 1];
    var m22 = m[2 * 4 + 2];
    var m23 = m[2 * 4 + 3];
    var m30 = m[3 * 4 + 0];
    var m31 = m[3 * 4 + 1];
    var m32 = m[3 * 4 + 2];
    var m33 = m[3 * 4 + 3];
    var tmp_0 = m22 * m33;
    var tmp_1 = m32 * m23;
    var tmp_2 = m12 * m33;
    var tmp_3 = m32 * m13;
    var tmp_4 = m12 * m23;
    var tmp_5 = m22 * m13;
    var tmp_6 = m02 * m33;
    var tmp_7 = m32 * m03;
    var tmp_8 = m02 * m23;
    var tmp_9 = m22 * m03;
    var tmp_10 = m02 * m13;
    var tmp_11 = m12 * m03;
    var tmp_12 = m20 * m31;
    var tmp_13 = m30 * m21;
    var tmp_14 = m10 * m31;
    var tmp_15 = m30 * m11;
    var tmp_16 = m10 * m21;
    var tmp_17 = m20 * m11;
    var tmp_18 = m00 * m31;
    var tmp_19 = m30 * m01;
    var tmp_20 = m00 * m21;
    var tmp_21 = m20 * m01;
    var tmp_22 = m00 * m11;
    var tmp_23 = m10 * m01;

    // prettier-ignore
    var t0 = tmp_0 * m11 + tmp_3 * m21 + tmp_4 * m31 -
      (tmp_1 * m11 + tmp_2 * m21 + tmp_5 * m31);
    // prettier-ignore
    var t1 = tmp_1 * m01 + tmp_6 * m21 + tmp_9 * m31 -
      (tmp_0 * m01 + tmp_7 * m21 + tmp_8 * m31);
    // prettier-ignore
    var t2 = tmp_2 * m01 + tmp_7 * m11 + tmp_10 * m31 -
      (tmp_3 * m01 + tmp_6 * m11 + tmp_11 * m31);
    // prettier-ignore
    var t3 = tmp_5 * m01 + tmp_8 * m11 + tmp_11 * m21 -
      (tmp_4 * m01 + tmp_9 * m11 + tmp_10 * m21);

    var d = 1.0 / (m00 * t0 + m10 * t1 + m20 * t2 + m30 * t3);

    // prettier-ignore
    return [ d * t0, d * t1, d * t2, d * t3,
      d * (tmp_1 * m10 + tmp_2 * m20 + tmp_5 * m30 -
          (tmp_0 * m10 + tmp_3 * m20 + tmp_4 * m30)),
      d * (tmp_0 * m00 + tmp_7 * m20 + tmp_8 * m30 -
          (tmp_1 * m00 + tmp_6 * m20 + tmp_9 * m30)),
      d * (tmp_3 * m00 + tmp_6 * m10 + tmp_11 * m30 -
          (tmp_2 * m00 + tmp_7 * m10 + tmp_10 * m30)),
      d * (tmp_4 * m00 + tmp_9 * m10 + tmp_10 * m20 -
          (tmp_5 * m00 + tmp_8 * m10 + tmp_11 * m20)),
      d * (tmp_12 * m13 + tmp_15 * m23 + tmp_16 * m33 -
          (tmp_13 * m13 + tmp_14 * m23 + tmp_17 * m33)),
      d * (tmp_13 * m03 + tmp_18 * m23 + tmp_21 * m33 -
          (tmp_12 * m03 + tmp_19 * m23 + tmp_20 * m33)),
      d * (tmp_14 * m03 + tmp_19 * m13 + tmp_22 * m33 -
          (tmp_15 * m03 + tmp_18 * m13 + tmp_23 * m33)),
      d * (tmp_17 * m03 + tmp_20 * m13 + tmp_23 * m23 -
          (tmp_16 * m03 + tmp_21 * m13 + tmp_22 * m23)),
      d * (tmp_14 * m22 + tmp_17 * m32 + tmp_13 * m12 -
          (tmp_16 * m32 + tmp_12 * m12 + tmp_15 * m22)),
      d * (tmp_20 * m32 + tmp_12 * m02 + tmp_19 * m22 -
          (tmp_18 * m22 + tmp_21 * m32 + tmp_13 * m02)),
      d * (tmp_18 * m12 + tmp_23 * m32 + tmp_15 * m02 -
          (tmp_22 * m32 + tmp_14 * m02 + tmp_19 * m12)),
      d * (tmp_22 * m22 + tmp_16 * m02 + tmp_21 * m12 -
          (tmp_20 * m12 + tmp_23 * m22 + tmp_17 * m02))
    ];
  },
  transpose: function (m) {
    // prettier-ignore
    return [
      m[0], m[4], m[8], m[12],
      m[1], m[5], m[9], m[13],
      m[2], m[6], m[10], m[14],
      m[3], m[7], m[11], m[15],
    ];
  }
};

function isPowerOf2(value) {
  return (value & (value - 1)) === 0;
}

///////////////////////////////// WebGL //////////////////////////////////
(function main() {
  const gl = c.getContext("webgl");
  infoOfWebgl(gl);

  // WEBGL_depth_texture 확인
  const ext = gl.getExtension("WEBGL_depth_texture");
  if (!ext) {
    throw new Error("WEBGL_depth_texture not supported!");
  }

  let mouseX = 0;
  let mouseY = 0;
  gl.canvas.addEventListener("mousemove", ({ clientX, clientY }) => {
    const { left, top } = gl.canvas.getBoundingClientRect();
    mouseX = clientX - left;
    mouseY = clientY - top;
  });

  gl.enable(gl.CULL_FACE); // 3D, 앞뒷면그리지 않고 앞면(반시계방향chrome://flags/)만 그림
  gl.enable(gl.DEPTH_TEST); // 3D, 깊이감 고려해서 그림
  // gl.enable(gl.SCISSOR_TEST); // diviced by area
  // gl.enable(gl.BLEND); //!!
  // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); //!!
  // 문제는 Canvas 2D API가 미리 곱한 알파 값만 나타낸다는 겁니다. 캔버스의 컨텐츠를 텍스처에 업로드할 때 WebGL은 값을 미리 곱하지 않으려고 하지만 미리 곱한 알파는 손실되었기 때문에 이를 완벽히 수행할 수 없습니다.
  // gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true); // 미리 곱하지 말라고 WebGL에 지시해봅시다.!!
  // 이는 미리 곱한 알파 값을 gl.texImage2D와 gl.texSubImage2D에 제공하라고 WebGL에 지시합니다. gl.texImage2D에 전달된 데이터가 이미 Canvas 2D 데이터처럼 미리 곱해졌다면 WebGL은 그냥 전달만 합니다.

  const target = [0, 0, 0];
  const up = [0, 1, 0];
  const WIDTH = gl.canvas.width;
  const HEIGHT = gl.canvas.height;
  const DEPTH = 2000;
  const RANGE = 30;

  let _cnt = 0;

  let settings = {
    cameraAngle: 5, // 35
    cameraX: 0,
    cameraY: -10,
    cameraZ: RANGE,
    fov: 60,
    cameraNear: 10,
    cameraFar: 1000,
    lightX: -0.7,
    lightY: 0.9,
    lightZ: -0.7,
    // useRampTexture: true,
    ramp: "normal",
    translationX: 0,
    translationY: 0,
    translationZ: 0,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0
  };

  const smoothSolid = new Array(256).fill(255);
  for (let i = 0; i < 128; ++i) {
    smoothSolid[i] = 64 + i;
  }

  // prettier-ignore
  const ramps = {
    "dark-white": {
      color: [0.2, 1, 0.2, 1],
      format: gl.LUMINANCE,
      filter: false,
      data: [80, 255]
    },
    "dark-white-skewed": {
      color: [0.2, 1, 0.2, 1],
      format: gl.LUMINANCE,
      filter: false,
      data: [80, 80, 80, 255, 255]
    },
    normal: {
      color: [0.2, 1, 0.2, 1],
      format: gl.LUMINANCE,
      filter: true,
      data: [0, 255]
    },
    "3-step": {
      color: [0.2, 1, 0.2, 1],
      format: gl.LUMINANCE,
      filter: false,
      data: [80, 160, 255]
    },
    "4-step": {
      color: [0.2, 1, 0.2, 1],
      format: gl.LUMINANCE,
      filter: false,
      data: [80, 140, 200, 255]
    },
    "4-step skewed": {
      color: [0.2, 1, 0.2, 1],
      format: gl.LUMINANCE,
      filter: false,
      data: [80, 80, 80, 80, 140, 200, 255]
    },
    "black-white-black": {
      color: [0.2, 1, 0.2, 1],
      format: gl.LUMINANCE,
      filter: false,
      data: [80, 255, 80]
    },
    stripes: {
      color: [0.2, 1, 0.2, 1],
      format: gl.LUMINANCE,
      filter: false,
      data: [
        80, 255, 80, 255, 80, 255, 80, 255, 80, 255, 80, 255, 80, 255, 80, 255,
        80, 255, 80, 255, 80, 255, 80, 255, 80, 255, 80, 255, 80, 255, 80, 255
      ]
    },
    stripe: {
      color: [0.2, 1, 0.2, 1],
      format: gl.LUMINANCE,
      filter: false,
      data: [
        80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 0, 0,
        255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255
      ]
    },
    "smooth-solid": {
      color: [0.2, 1, 0.2, 1],
      format: gl.LUMINANCE,
      filter: false,
      data: smoothSolid
    },
    rgb: {
      color: [1, 1, 1, 1],
      format: gl.RGB,
      filter: true,
      data: [255, 0, 0, 0, 255, 0, 0, 0, 255]
    }
  };

  let elementsForFormat = {};
  elementsForFormat[gl.LUMINANCE] = 1;
  elementsForFormat[gl.RGB] = 3;

  for (let v of Object.values(ramps)) {
    const { format, filter, data } = v;
    let tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    const width = data.length / elementsForFormat[format];
    // prettier-ignore
    gl.texImage2D(gl.TEXTURE_2D, 0, format, width, 1, 0, format, gl.UNSIGNED_BYTE, new Uint8Array(data));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    // prettier-ignore
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter ? gl.LINEAR : gl.NEAREST); // 제일 작은 밉보다 작은 크기
    // prettier-ignore
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter ? gl.LINEAR : gl.NEAREST); // 제일 큰 밉보다 큰 크기
    v.texture = tex;
    v.size = [width, 1];
  }

  function applyRamp(program, name) {
    let { texture, color, size, filter } = ramps[name];
    gl.uniform4fv(program.u_color, color);
    gl.activeTexture(gl.TEXTURE0 + 1);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform2fv(program.u_rampSize, size);
    gl.uniform1f(program.u_linearAdjust, filter ? 1 : 0);

    gl.activeTexture(gl.TEXTURE0);
  }

  // 설정 UI
  const gui = new dat.GUI();
  gui.remember(settings);
  gui.close();

  gui.add(settings, "cameraAngle", -360, 360, 0.01);
  gui.add(settings, "cameraX", -WIDTH, WIDTH, 0.01);
  gui.add(settings, "cameraY", -HEIGHT, HEIGHT, 0.01);
  gui.add(settings, "cameraZ", 0, DEPTH, 0.01);
  gui.add(settings, "fov", 0, 180, 0.1);
  gui.add(settings, "lightX", -1, 1, 0.001);
  gui.add(settings, "lightY", -1, 1, 0.001);
  gui.add(settings, "lightZ", -1, 1, 0.001);
  // gui.add(settings, "useRampTexture");

  // normal 프로그램 생성!!
  let normal_program = {
    program: createProgram(gl, normal_vshader.text, normal_fshader.text)
  };

  {
    let program = normal_program;
    gl.useProgram(program.program);

    Object.assign(program, {
      // attributes
      a_position: defineAttribute2(gl, program, "a_position", 3),
      a_normal: defineAttribute2(gl, program, "a_normal", 3),
      // uniforms
      u_projection: gl.getUniformLocation(program.program, "u_projection"),
      u_world: gl.getUniformLocation(program.program, "u_world"),
      u_view: gl.getUniformLocation(program.program, "u_view"),
      // prettier-ignore
      u_reverseLightDir: gl.getUniformLocation(program.program, "u_reverseLightDir"),
      u_color: gl.getUniformLocation(program.program, "u_color"),
      u_ramp: gl.getUniformLocation(program.program, "u_ramp"),
      u_rampSize: gl.getUniformLocation(program.program, "u_rampSize"),
      u_linearAdjust: gl.getUniformLocation(program.program, "u_linearAdjust")
      // prettier-ignore
      // u_useRampTexture: gl.getUniformLocation(program.program, "u_useRampTexture")
    });

    // initialization

    let unitNo = 1;
    //     createTexture(gl, unitNo);

    // let data = new Uint8Array([80, 255]);
    // // prettier-ignore
    // gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, data.length, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, data);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    //     gl.uniform2fv(program.u_rampSize, [2, 1]);

    applyRamp(program, settings.ramp);

    gui.add(settings, "ramp", Object.keys(ramps)).onChange(() => {
      applyRamp(program, settings.ramp);
    });

    // applyCheckerTexture(gl, 8, 8);
    gl.uniform1i(program.u_ramp, unitNo);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  let sphere = createSphere(8, 10);
  // sphere.u_color = [0.5, 0.5, 1, 1];
  // sphere.u_world = m4.translation(0, 0, 0);

  // 그려질 객체 배열
  const drawingObjects = [];

  let _id = 1;
  arrangeArray(1, RANGE, function (x, y, z) {
    let obj = Object.assign({}, sphere);
    obj.id = _id;
    obj.u_world = m4.translation(x, y, z);

    drawingObjects.push(obj);

    ++_id;
  });

  function applyAttribute(program, obj, attrName) {
    if (!program[attrName] || !obj[attrName]) return;

    program[attrName].bindBuffer();
    gl.bufferData(gl.ARRAY_BUFFER, obj[attrName], gl.STATIC_DRAW);
    program[attrName].vertexAttribPointer();
  }

  // 객체 화면으로 출력
  function drawObject(program, obj, worldMat) {
    // 객체의 world 행렬과 곱해서 최종 월드 행렬 적용
    if (program.u_world) {
      let objWorldMat = worldMat
        ? m4.multiply(worldMat, obj.u_world)
        : obj.u_world;
      gl.uniformMatrix4fv(program.u_world, false, objWorldMat);
    }

    if (program.u_id && obj.u_id) {
      gl.uniform4fv(program.u_id, obj.u_id);
    }

    if (obj.u_color && program.u_color) {
      gl.uniform4fv(program.u_color, obj.u_color);
    }

    applyAttribute(program, obj, "a_texcoord");
    applyAttribute(program, obj, "a_normal");
    applyAttribute(program, obj, "a_position");

    // 화면 출력
    let cnt = obj.nVertices ? obj.nVertices : obj.a_position.length / 3;
    gl.drawArrays(obj.type || gl.TRIANGLES, 0, cnt);
  }

  // 화면 그려주는 함수
  function drawScene(program, projectionMat, cameraMat, worldMat) {
    // 프로그램 활성화
    gl.useProgram(program.program);

    let viewMat = m4.inverse(cameraMat);
    gl.uniformMatrix4fv(program.u_view, false, viewMat);

    gl.uniformMatrix4fv(program.u_projection, false, projectionMat);

    if (program.u_viewWorld) {
      gl.uniform3fv(program.u_viewWorld, cameraMat.slice(12, 15));
    }

    if (program.u_reverseLightDir) {
      gl.uniform3fv(
        program.u_reverseLightDir,
        normalize([settings.lightX, settings.lightY, settings.lightZ])
      );
    }

    if (program.u_useRampTexture) {
      gl.uniform1i(program.u_useRampTexture, settings.useRampTexture);
    }
    // 각 객체별로 화면 출력
    drawingObjects.forEach((it) => {
      drawObject(program, it, worldMat);
    });
  }

  let then = 0;
  gl.clearColor(0, 0, 0, 1);
  (function render(t) {
    onResize();

    if (t && false) {
      let dt = t - then;
      then = t;
      dt *= 0.01;
      settings.rotationY += -0.7 * dt;
      settings.rotationX += -0.4 * dt;
    }

    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;

    let m1 = m4.perspective(
      settings.fov * RADIAN_IN_DEG,
      aspect,
      settings.cameraNear,
      settings.cameraFar
    );

    let cameraMat = m4.yRotation(settings.cameraAngle * RADIAN_IN_DEG);
    // prettier-ignore
    cameraMat = m4.translate(cameraMat, settings.cameraX, settings.cameraY, settings.cameraZ);
    cameraMat = m4.lookAt(cameraMat.slice(12, 15), target, up);

    let worldMat = m4.translation(
      settings.translationX,
      settings.translationY,
      settings.translationZ
    );
    worldMat = m4.xRotate(worldMat, settings.rotationX * RADIAN_IN_DEG);
    worldMat = m4.yRotate(worldMat, settings.rotationY * RADIAN_IN_DEG);
    worldMat = m4.zRotate(worldMat, settings.rotationZ * RADIAN_IN_DEG);

    gl.disable(gl.BLEND); //!!
    gl.depthMask(true); //!!
    {
      // gl.viewport(0, 0, gl.canvas.clientWidth, gl.canvas.clientHeight);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      drawScene(normal_program, m1, cameraMat, worldMat);
    }

    requestAnimationFrame(render);
  })();
})();