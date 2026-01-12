/* 
  # environment maps
  
  환경맵은 큐브맵을 사용해서 야외 장면을 표현하는 방법 중에 하나이다.
  큐브맵은 좌표는 3차원으로 사용한다. 텍스처를 생성하고 바인드할 때는 gl.TEXTURE_CUBE_MAP를 사용해한다.
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
  
  그리고, 6면에 대해 각각 이미지를 할당해야한다.
    gl.texImage2D(target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    
  target은 각 6면에 대응하는 값으로 아래와 같다.
    gl.TEXTURE_CUBE_MAP_POSITIVE_X
    gl.TEXTURE_CUBE_MAP_NEGATIVE_X
    gl.TEXTURE_CUBE_MAP_POSITIVE_Y
    gl.TEXTURE_CUBE_MAP_NEGATIVE_Y
    gl.TEXTURE_CUBE_MAP_POSITIVE_Z
    gl.TEXTURE_CUBE_MAP_NEGATIVE_Z
  
  환경맵에 큐브맵을 사용하려는 이유는 3차원 벡터를 사용해서 텍스처 색상을 가져올 수 있기 때문이다.
  면을 볼때 특정 각도로 보는 경우 반사되어서 보이는 텍스처 색상을 정보를 찾기 위한 목적이다.
  이때 반사공식을 사용해 반사되는 텍스처 픽셀을 찾는다. 반사 공식은 다음과 같다.
    reflection = viewToSurface - 2 * dot(normal, viewToSurface) * normal
    
  먼저 표면 법선 벡터와 시점에서 표면 벡터와 내적을 한다. 이는 표면과 시점 간에 내적값(cos값)을 알 수 있다.
  내적값은 시점에서 표면 벡터가 법선벡터 방향으로의 길이이며 이는 직각 삼각형이 만들이 진다.
  이값을 2배로 해서 표면 법선 벡터에 곱해진 벡터와 시점에서 표면 벡터를 끼인각으로 하는 이등변 삼각형이 만들어진다.
  즉, 맞으면 빗변이 반사각에 해당되고 빗변에 해당하는 벡터는 시점에서 표면 벡터에 방금 곱해서 구한 벡터을 빼면 구할 수 있다.
  
  마지막으로 큐브맵으로 배경만 표시하면 된다. 이때에는 별도 셰이더를 생성해서 작업해줘야 한다.
  이때에는 clip space을 채우는 평면을 만들고 해당 평면에서 카메라가 보이는 방향에 있는 텍스처 픽셀 정보를 획득한다.
  
  화면에서 보이는 시점 각도를 계산해야 한다. 그렇게 하기 위해 원근 투영 행렬과 뷰 행렬을 이용해서 곱해서 역행렬을 구한다.
      let cameraPos = [Math.cos(t * 0.0001), 0, Math.sin(t * 0.0001)];
      let cameraMat = m4.lookAt(cameraPos, target, up);
      let viewMat = m4.inverse(cameraMat);
      let viewProjectionInverseMat = m4.inverse(m4.multiply(perspective, viewMat));
    
  이 역행렬과 정점을 곱하면 해당 저점에서 텍스터 과점에서 시점 벡터를 구할 수 있다. 이를 큐뷰맵에 적용해서 텍스처 픽셀 정보를 찾는다.
      vec4 t = u_viewProjectionInverse * v_position;
      gl_FragColor = textureCube(u_skybox, normalize(t.xyz / t.w));
      
  마지막으로 반사되는 큐브와 배경을 합치면 된다. 두 쌍의 셰이드를 사용해서 먼저 큐브를 표시하고 배경을 표시하면 된다.
  gl.depthFunc()을 사용해서 배경과 합칠때 깊이 비교를 조정을 한다. LESS가 기본값으로 가까운 곳을 먼저 표시된다.
    GL_ALWAYS	depth test가 항상 통과
    GL_NEVER	depth test가 절대 통과되지 않음
    GL_LESS	fragment의 깊이 값이 저장된 깊이 값보다 작을 경우 통과
    GL_EQUAL	fragment의 깊이 값이 저장된 깊이 값과 동일한 경우 통과
    GL_LEQUAL	fragment의 깊이 값이 저장된 깂이 값과 동일하거나 작을 경우 통과
    GL_GREATER	fragment의 깊이 값이 저장된 깊이 값보다 클 경우 통과
    GL_NOTEQUAL	fragment의 깊이 값이 저장된 깊이 값과 동일하지 않을 경우 통과
    GL_GEQUAL	fragment의 깊이 값이 저장된 깊이 값과 동일하거나 클 경우 통과
  
  Note:
    텍스처에서 unit이 0이 디폴트인 경우가 많으므로 0 아닌 경우는 작업이 끝나고 0으로 변경해준다.
      gl.activeTexture(gl.TEXTURE0 + unitNo); // 바인딩할 유닛
      gl.bindTexture(gl.TEXTURE_2D, texture); // 텍스처 유닛에 바인딩
      // ...
      gl.activeTexture(gl.TEXTURE0);
  
  Ref:
    https://webglfundamentals.org/webgl/lessons/ko/webgl-environment-maps.html
    https://webglfundamentals.org/webgl/lessons/resources/webgl-state-diagram.html
    
  GLSL spec: https://www.khronos.org/files/opengles_shading_language.pdf
  Linear algebra: https://www.youtube.com/watch?v=kjBOesZCoqc&list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab
*/
///////////////////////////// enviroments ///////////////////////////////
const RADIAN_IN_DEG = Math.PI / 180;

function onResize() {
  c.width = document.body.clientWidth;
  c.height = document.body.clientHeight;
}

onResize();
// addEventListener("resize", onResize);

//////////////////////////////// Functions ///////////////////////////////
function createCubeMapSample(gl, width, height) {
  const CUBE_MAP = [
    [gl.TEXTURE_CUBE_MAP_POSITIVE_X, "+X", "#F00", "#0FF"],
    [gl.TEXTURE_CUBE_MAP_NEGATIVE_X, "-X", "#FF0", "#00F"],
    [gl.TEXTURE_CUBE_MAP_POSITIVE_Y, "+Y", "#0F0", "#F0F"],
    [gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, "-Y", "#0FF", "#F00"],
    [gl.TEXTURE_CUBE_MAP_POSITIVE_Z, "+Z", "#00F", "#FF0"],
    [gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, "-Z", "#0FF", "#0F0"]
  ];

  const ctx = document.createElement("canvas").getContext("2d");
  ctx.canvas.width = width;
  ctx.canvas.height = height;
  ctx.font = `${width * 0.7}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  let texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

  CUBE_MAP.forEach((it, i) => {
    ctx.fillStyle = it[2];
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = it[3];
    ctx.fillText(it[1], width / 2, height / 2);
    gl.texImage2D(it[0], 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, ctx.canvas);
  });

  gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
  // prettier-ignore
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

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
  let normalTexcoord = new Array(nFaces)
    .fill()
    .reduce((acc, _) => acc.concat([0, 0, 0, 1, 1, 0, 0, 1, 1, 1, 1, 0]), []);

  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(normalTexcoord),
    gl.STATIC_DRAW
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
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
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

  let positions = indices.reduce((prev, it) => prev.concat(vertices[it]), []);

  return { positions };
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
    0, 1, 2, 1, 3, 2, // front
    6, 7, 4, 7, 5, 4, // back
    4, 5, 0, 5, 1, 0, // left
    2, 3, 6, 3, 7, 6, // right
    4, 0, 6, 0, 2, 6, // top
    1, 5, 3, 5, 7, 3, // bottom
  ];

  const faceNormals = [
    [+0, +0, +1], // front
    [+0, +0, -1], // back
    [-1, +0, +0], // left
    [+1, +0, +0], // right
    [+0, +1, +0], // top
    [+0, -1, +0] // bottom
  ];

  let positions = indices.reduce((agg, it) => agg.concat(vertices[it]), []);
  // prettier-ignore
  let normals = faceNormals.reduce((agg, it) => agg.concat(Array(6).fill(it).flat()), []);

  return { positions, normals };
}

function setBox(gl, x, y, z, w, h, d) {
  let box = createBox(w, h, d);
  let positions = [];
  for (let i = 0; i < box.positions.length; i += 3) {
    positions.push(box.positions[i] + x + w * 0.5);
    positions.push(box.positions[i + 1] + y + h * 0.5);
    positions.push(box.positions[i + 2] + z + d * 0.5);
  }

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW); // 데이터 저장

  return positions.length / 3;
}

// 사각형 생성 함수
function setRectangle(gl, x, y, width, height) {
  let rect = createRectangle(x, y, width, height);

  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(rec.positions),
    gl.STATIC_DRAW
  ); // 데이터 저장
}

// create a rectangle
function createRectangle(x, y, width, height) {
  let [x1, y1, x2, y2] = [x, y, x + width, y + height];
  let positions = [x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2];

  return { positions };
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

const m4 = {
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
  const target = [0, 0, 0];
  const up = [0, 1, 0];

  const gl = c.getContext("webgl");

  // WEBGL_depth_texture 확인
  const ext = gl.getExtension("WEBGL_depth_texture");
  if (!ext) {
    throw new Error("WEBGL_depth_texture not supported!");
  }

  gl.enable(gl.CULL_FACE); // 3D, 앞뒷면그리지 않고 앞면(반시계방향chrome://flags/)만 그림
  gl.enable(gl.DEPTH_TEST); // 3D, 깊이감 고려해서 그림
  gl.enable(gl.SCISSOR_TEST); // diviced by area

  // normal 프로그램 생성!!
  let normal_program = {
    program: createProgram(gl, normal_vshader.text, normal_fshader.text)
  };

  // sky 프로그램 생성!!
  let sky_program = {
    program: createProgram(gl, sky_vshader.text, sky_fshader.text)
  };

  const WIDTH = gl.canvas.width;
  const HEIGHT = gl.canvas.height;
  const DEPTH = 2000;
  const depthTextureSize = 512;

  let settings = {
    cameraAngle: 35,
    cameraX: 0,
    cameraY: 10,
    cameraZ: 15,
    fov: 30,
    cameraNear: 5,
    cameraFar: 200,
    lightFov: 50,
    lightX: 3.5,
    lightY: 6,
    lightZ: 1,
    shininess: 160,
    projectWidth: 20,
    projectHeight: 20,
    translationX: 0,
    translationY: 0,
    translationZ: 0,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0
  };

  const [texWidth, texHeight] = [512, 512];

  // 큐브맵 생성!!
  let texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

  const images = [
    [
      gl.TEXTURE_CUBE_MAP_POSITIVE_X,
      "https://webglfundamentals.org/webgl/resources/images/computer-history-museum/pos-x.jpg"
    ],
    [
      gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
      "https://webglfundamentals.org/webgl/resources/images/computer-history-museum/neg-x.jpg"
    ],
    [
      gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
      "https://webglfundamentals.org/webgl/resources/images/computer-history-museum/pos-y.jpg"
    ],
    [
      gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
      "https://webglfundamentals.org/webgl/resources/images/computer-history-museum/neg-y.jpg"
    ],
    [
      gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
      "https://webglfundamentals.org/webgl/resources/images/computer-history-museum/pos-z.jpg"
    ],
    [
      gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
      "https://webglfundamentals.org/webgl/resources/images/computer-history-museum/neg-z.jpg"
    ]
  ];
  images.forEach((it) => {
    const [target, strUrl] = it;
    // initialize empty 512x512 image in six faces.
    // prettier-ignore
    gl.texImage2D(target, 0, gl.RGBA, texWidth, texHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    let img = loadImage(strUrl, () => {
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
      gl.texImage2D(target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
    });
  });
  gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
  // prettier-ignore
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

  /*
    normal_program
  */
  {
    let program = normal_program;
    gl.useProgram(program.program);
    // attributes
    Object.assign(program, {
      a_position: defineAttribute2(gl, program, "a_position", 3),
      a_normal: defineAttribute2(gl, program, "a_normal", 3)
    });
    // uniforms
    Object.assign(program, {
      u_projection: gl.getUniformLocation(program.program, "u_projection"),
      u_world: gl.getUniformLocation(program.program, "u_world"),
      u_view: gl.getUniformLocation(program.program, "u_view"),
      u_texture: gl.getUniformLocation(program.program, "u_texture"),
      u_viewWorld: gl.getUniformLocation(program.program, "u_viewWorld")
    });

    // if (program.u_texture) {
    //   gl.uniform1i(program.u_texture, 0);
    // }
  }

  /*
    sky_program
  */
  {
    let program = sky_program;
    gl.useProgram(program.program);
    // attributes
    Object.assign(program, {
      a_position: defineAttribute2(gl, program, "a_position", 3)
    });
    // uniforms
    Object.assign(program, {
      u_skybox: gl.getUniformLocation(program.program, "u_skybox"),
      u_viewProjectionInverse: gl.getUniformLocation(
        program.program,
        "u_viewProjectionInverse"
      )
    });

    // if (program.u_skybox) {
    //   gl.uniform1i(program.u_skybox, 0);
    // }
  }

  // 설정 UI
  const gui = new dat.GUI();
  gui.remember(settings);
  gui.close();

  gui.add(settings, "cameraAngle", -360, 360, 0.01);
  gui.add(settings, "cameraX", -50, 50, 0.01);
  gui.add(settings, "cameraY", -50, 50, 0.01);
  gui.add(settings, "cameraZ", -50, 50, 0.01);
  gui.add(settings, "fov", 0, 180, 0.1);
  gui.add(settings, "cameraNear", 0, 2000);
  gui.add(settings, "cameraFar", 0, 2000);
  gui.add(settings, "lightFov", 0, 180, 0.1);
  gui.add(settings, "lightX", -10, 10, 0.01);
  gui.add(settings, "lightY", -10, 10, 0.01);
  gui.add(settings, "lightZ", -10, 10, 0.01);
  gui.add(settings, "projectWidth", -WIDTH, WIDTH, 0.1);
  gui.add(settings, "projectHeight", -HEIGHT, HEIGHT, 0.1);

  let cube = createBox(5, 5, 5);
  cube.positions = new Float32Array(cube.positions);
  cube.normals = new Float32Array(cube.normals);
  cube.colorMult = [1, 0.5, 0.5, 1];
  cube.color = [1, 0, 0, 1];
  cube.world = m4.translation(0, 0, 0);
  cube.type = gl.TRIANGLES;

  // 그려질 객체 배열
  const drawingObjects = [cube];

  let skybox = {};
  // prettier-ignore
  skybox.positions = new Float32Array([-1,-1,0,1,1,0,-1,1,0,1,1,0,-1,-1,0,1,-1,0]);
  skybox.type = gl.TRIANGLES;

  let clip = createBox(2, 2, 2);
  clip.positions = new Float32Array(clip.positions);
  clip.normals = null;
  clip.type = gl.TRIANGLES;

  // 객체 화면으로 출력
  function drawObject(program, obj, worldMat) {
    // 객체의 world 행렬과 곱해서 최종 월드 행렬 적용
    if (program.u_world) {
      let objWorldMat = worldMat ? m4.multiply(worldMat, obj.world) : obj.world;
      gl.uniformMatrix4fv(program.u_world, false, objWorldMat);
    }

    if (obj.normals && program.a_normal) {
      program.a_normal.bindBuffer();
      gl.bufferData(gl.ARRAY_BUFFER, obj.normals, gl.STATIC_DRAW);
      program.a_normal.vertexAttribPointer();
    }

    program.a_position.bindBuffer();
    gl.bufferData(gl.ARRAY_BUFFER, obj.positions, gl.STATIC_DRAW);
    program.a_position.vertexAttribPointer();

    // 화면 출력
    let cnt = obj.positions.length / 3;
    gl.drawArrays(obj.type, 0, cnt);
  }

  // 화면 그려주는 함수
  function drawScene(program, projectionMat, cameraMat, textureMat, lightMat) {
    // 프로그램 활성화
    gl.useProgram(program.program);

    let viewMat = m4.inverse(cameraMat);
    gl.uniformMatrix4fv(program.u_view, false, viewMat);

    // 월드 이동/회전: sequence is important!
    // prettier-ignore
    let worldMat = m4.translation(settings.translationX, settings.translationY, settings.translationZ);
    worldMat = m4.xRotate(worldMat, settings.rotationX * RADIAN_IN_DEG);
    worldMat = m4.yRotate(worldMat, settings.rotationY * RADIAN_IN_DEG);
    worldMat = m4.zRotate(worldMat, settings.rotationZ * RADIAN_IN_DEG);

    gl.uniformMatrix4fv(program.u_projection, false, projectionMat);

    if (program.u_viewWorld) {
      gl.uniform3fv(program.u_viewWorld, cameraMat.slice(12, 15));
    }
    // 각 객체별로 화면 출력
    drawingObjects.forEach((it) => {
      drawObject(program, it, worldMat);
    });
  }

  gl.clearColor(1, 1, 1, 1);

  let then = 0;
  (function render(t) {
    if (t) {
      let dt = t - then;
      then = t;
      dt *= 0.01;
      settings.rotationY += -0.7 * dt;
      settings.rotationX += -0.4 * dt;
    }

    onResize();

    const clientWidth = gl.canvas.clientWidth;
    const clientHeight = gl.canvas.clientHeight;

    const aspect = clientWidth / clientHeight;
    let m = m4.perspective(
      settings.fov * RADIAN_IN_DEG,
      aspect,
      settings.cameraNear,
      settings.cameraFar
    );

    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);

    {
      // 카메라 이동/회전
      let cameraMat = m4.yRotation(settings.cameraAngle * RADIAN_IN_DEG);
      // prettier-ignore
      cameraMat = m4.translate(cameraMat, settings.cameraX, settings.cameraY, settings.cameraZ);
      cameraMat = m4.lookAt(cameraMat.slice(12, 15), target, up);

      // 화면 분할 처리
      gl.viewport(0, 0, clientWidth, clientHeight);
      gl.scissor(0, 0, clientWidth, clientHeight);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      // 화면 출력
      gl.depthFunc(gl.LESS); // 기본 깊이 검사!!
      drawScene(normal_program, m, cameraMat);
    }
    {
      gl.useProgram(sky_program.program);

      // 원근 매핑에서 시점에서 역행렬 계산!!
      // let cameraPos = m4
      //   .yRotation((settings.cameraAngle + t * 0.0001) * RADIAN_IN_DEG)
      //   .slice(12, 15);
      let cameraPos = [Math.cos(t * 0.0001), 0, Math.sin(t * 0.0001)];
      let cameraMat = m4.lookAt(cameraPos, target, up);
      let viewMat = m4.inverse(cameraMat);
      let viewProjectionInverseMat = m4.inverse(m4.multiply(m, viewMat));
      gl.uniformMatrix4fv(
        sky_program.u_viewProjectionInverse,
        false,
        viewProjectionInverseMat
      );

      // 화면 출력
      // 큐브가 1.0에서도 배경과 깊이 테스트에서 통과시킴!!
      gl.depthFunc(gl.LEQUAL);

      drawObject(sky_program, skybox);
    }

    requestAnimationFrame(render);
  })();
})();
