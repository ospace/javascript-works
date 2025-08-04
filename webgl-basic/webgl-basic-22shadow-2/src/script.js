/* 
  # shadow 2
  
  그림자자 텍스처로 투영매핑되어 있어서 부드럽지 않다. 그림자 처럼 보이지 않는다. 깊이값은 0(어두움)~1(밝음) 사이 값을 갖는데 이는 조명 절두체 내의 위치값에 해당한다. 깊이값을 가지고 픽셀과 비교해서 조명과 비교해서 깊이값이 더 가까우면 다른물체가 빛을 가지고 있는 것이고 값이값이 더 멀다면 픽셀이 빛을 가린다는 의미이다. 이 작업은 프레그먼트 셰이더에서 진행한다.
  주의할 점은 깊이값이 양자화되어 있기에 그대로 쓰면 새도우 애크니 패턴이 발생한다. 이는 픽셀은 카메라 기준에서 깊이값이고 깊이텍스처에 깊이값은 조명 기준의 깊이값을 비교함으로써 약간씩 값들이 차이가 발생하기 때문이다. 이는 바이어스를 더해서 한쪽으로 기준을 맞춰주면 해결된다.
  
  여기에 스팟 조명까지 추가면 하면 완성도가 높아진다.
    
  Ref:
    https://webglfundamentals.org/webgl/lessons/ko/webgl-shadows.html
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
function once(fn) {
  var called = false;
  return function () {
    if (called) return;
    called = true;
    fn.apply(fn, arguments);
  };
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
  img.onload = callback;
  img.onerror = function (msg, url, no) {
    console.error("image:", src);
  };

  // fetch(src, { method: "GET", mode: "no-cors" })
  fetch(src)
    .then((res) => res.blob())
    .then((blob) => (img.src = URL.createObjectURL(blob)));

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
  let [x1, y1, x2, y2] = [x, y, x + width, y + height];
  let positions = [x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2];

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW); // 데이터 저장
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

    var t0 =
      tmp_0 * m11 +
      tmp_3 * m21 +
      tmp_4 * m31 -
      (tmp_1 * m11 + tmp_2 * m21 + tmp_5 * m31);
    var t1 =
      tmp_1 * m01 +
      tmp_6 * m21 +
      tmp_9 * m31 -
      (tmp_0 * m01 + tmp_7 * m21 + tmp_8 * m31);
    var t2 =
      tmp_2 * m01 +
      tmp_7 * m11 +
      tmp_10 * m31 -
      (tmp_3 * m01 + tmp_6 * m11 + tmp_11 * m31);
    var t3 =
      tmp_5 * m01 +
      tmp_8 * m11 +
      tmp_11 * m21 -
      (tmp_4 * m01 + tmp_9 * m11 + tmp_10 * m21);

    var d = 1.0 / (m00 * t0 + m10 * t1 + m20 * t2 + m30 * t3);

    return [
      d * t0,
      d * t1,
      d * t2,
      d * t3,
      d *
        (tmp_1 * m10 +
          tmp_2 * m20 +
          tmp_5 * m30 -
          (tmp_0 * m10 + tmp_3 * m20 + tmp_4 * m30)),
      d *
        (tmp_0 * m00 +
          tmp_7 * m20 +
          tmp_8 * m30 -
          (tmp_1 * m00 + tmp_6 * m20 + tmp_9 * m30)),
      d *
        (tmp_3 * m00 +
          tmp_6 * m10 +
          tmp_11 * m30 -
          (tmp_2 * m00 + tmp_7 * m10 + tmp_10 * m30)),
      d *
        (tmp_4 * m00 +
          tmp_9 * m10 +
          tmp_10 * m20 -
          (tmp_5 * m00 + tmp_8 * m10 + tmp_11 * m20)),
      d *
        (tmp_12 * m13 +
          tmp_15 * m23 +
          tmp_16 * m33 -
          (tmp_13 * m13 + tmp_14 * m23 + tmp_17 * m33)),
      d *
        (tmp_13 * m03 +
          tmp_18 * m23 +
          tmp_21 * m33 -
          (tmp_12 * m03 + tmp_19 * m23 + tmp_20 * m33)),
      d *
        (tmp_14 * m03 +
          tmp_19 * m13 +
          tmp_22 * m33 -
          (tmp_15 * m03 + tmp_18 * m13 + tmp_23 * m33)),
      d *
        (tmp_17 * m03 +
          tmp_20 * m13 +
          tmp_23 * m23 -
          (tmp_16 * m03 + tmp_21 * m13 + tmp_22 * m23)),
      d *
        (tmp_14 * m22 +
          tmp_17 * m32 +
          tmp_13 * m12 -
          (tmp_16 * m32 + tmp_12 * m12 + tmp_15 * m22)),
      d *
        (tmp_20 * m32 +
          tmp_12 * m02 +
          tmp_19 * m22 -
          (tmp_18 * m22 + tmp_21 * m32 + tmp_13 * m02)),
      d *
        (tmp_18 * m12 +
          tmp_23 * m32 +
          tmp_15 * m02 -
          (tmp_22 * m32 + tmp_14 * m02 + tmp_19 * m12)),
      d *
        (tmp_22 * m22 +
          tmp_16 * m02 +
          tmp_21 * m12 -
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
  gl.clearColor(0, 0, 0, 1);

  // base 프로그램 생성!!
  let base_program = {
    program: createProgram(gl, base_vshader.text, base_fshader.text)
  };

  // normal 프로그램 생성!!
  let normal_program = {
    program: createProgram(gl, normal_vshader.text, normal_fshader.text)
  };

  // depth 프로그램 생성!!
  let depth_program = {
    program: createProgram(gl, depth_vshader.text, depth_fshader.text)
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
    translationY: -3,
    translationZ: 0,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0
  };

  /*
    normal_program
  */
  let depthFramebuffer = null;
  {
    let program = normal_program;
    gl.useProgram(program.program);
    // attributes
    Object.assign(program, {
      a_position: defineAttribute2(gl, program, "a_position", 3),
      a_texcoord: defineAttribute2(gl, program, "a_texcoord", 2),
      a_normal: defineAttribute2(gl, program, "a_normal", 3)
    });
    // uniforms
    Object.assign(program, {
      u_projection: gl.getUniformLocation(program.program, "u_projection"),
      u_world: gl.getUniformLocation(program.program, "u_world"),
      u_view: gl.getUniformLocation(program.program, "u_view"),
      u_colorMult: gl.getUniformLocation(program.program, "u_colorMult"),
      u_texture: gl.getUniformLocation(program.program, "u_texture"),
      u_textureMatrix: gl.getUniformLocation(
        program.program,
        "u_textureMatrix"
      ),
      u_projectedTexture: gl.getUniformLocation(
        program.program,
        "u_projectedTexture"
      ),
      u_pointLight: gl.getUniformLocation(program.program, "u_pointLight"),
      u_viewWorld: gl.getUniformLocation(program.program, "u_viewWorld"),
      u_lightDirection: gl.getUniformLocation(
        program.program,
        "u_lightDirection"
      ),
      // u_limit: gl.getUniformLocation(program.program, "u_limit"),
      u_innerLimit: gl.getUniformLocation(program.program, "u_innerLimit"),
      u_outerLimit: gl.getUniformLocation(program.program, "u_outerLimit"),
      u_shininess: gl.getUniformLocation(program.program, "u_shininess")
    });

    program.a_texcoord.bindBuffer();
    // gl.bindBuffer.apply(gl, normal_program.attributes.texcoord.buffer);
    applyNormalTexCoord(gl, 6);

    if (program.u_texture) {
      let textureUnitNo = 1;
      let textureTex = createTexture(gl, textureUnitNo);
      gl.uniform1i(program.u_texture, textureUnitNo);
      applyCheckerTexture(gl, 4, 4); // checker boarder texture
    }

    // 깊이 프레임버퍼 추가
    if (program.u_projectedTexture) {
      let projectedTextureUnitNo = 2;
      //    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([128, 128, 128, 255]));

      let depthTexture = createTexture(gl, projectedTextureUnitNo);
      gl.uniform1i(program.u_projectedTexture, projectedTextureUnitNo);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.DEPTH_COMPONENT,
        depthTextureSize,
        depthTextureSize,
        0,
        gl.DEPTH_COMPONENT,
        gl.UNSIGNED_INT,
        null
      );

      depthFramebuffer = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, depthFramebuffer);
      // prettier-ignore
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTexture, 0);

      // 사용하지 않은 색상 텍스처 추가!!
      let unusedTexture = createTexture(gl, -1);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        depthTextureSize,
        depthTextureSize,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null
      );

      // 프레임 버퍼에 첨부
      // prettier-ignore
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, unusedTexture, 0);

      checkFramebuffer(gl);

      gl.bindTexture(gl.TEXTURE_2D, depthTexture); //!!
    }
  }

  /*
    base_program
  */
  {
    let program = base_program;
    gl.useProgram(program.program);
    // attributes
    Object.assign(program, {
      a_position: defineAttribute2(gl, program, "a_position", 3)
    });
    // uniforms
    Object.assign(program, {
      u_projection: gl.getUniformLocation(program.program, "u_projection"),
      u_world: gl.getUniformLocation(program.program, "u_world"),
      u_view: gl.getUniformLocation(program.program, "u_view"),
      u_color: gl.getUniformLocation(program.program, "u_color")
    });
  }
  /*
    depth_program
  */
  {
    let program = depth_program;
    gl.useProgram(program.program);
    // attributes
    Object.assign(program, {
      a_position: defineAttribute2(gl, program, "a_position", 3)
    });
    // uniforms
    Object.assign(program, {
      u_projection: gl.getUniformLocation(program.program, "u_projection"),
      u_world: gl.getUniformLocation(program.program, "u_world"),
      u_view: gl.getUniformLocation(program.program, "u_view")
    });
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
  // gui.add(settings, "translationZ", -DEPTH, DEPTH);
  // gui.add(settings, "rotationX", -360, 360, 0.1);
  // gui.add(settings, "rotationY", -360, 360, 0.1);
  // gui.add(settings, "rotationZ", -360, 360, 0.1);

  let cube = createBox(3, 3, 3);
  cube.positions = new Float32Array(cube.positions);
  cube.normals = new Float32Array(cube.normals);
  cube.colorMult = [1, 0.5, 0.5, 1];
  cube.color = [1, 0, 0, 1];
  cube.world = m4.translation(0, 3, 0);
  cube.type = gl.TRIANGLES;

  // 조명 절두체
  let lightClipspace = createCubeLine(2);
  lightClipspace.positions = new Float32Array(lightClipspace.positions);
  lightClipspace.colorMult = [0, 0, 0, 1];
  lightClipspace.color = [1, 1, 1, 1];
  lightClipspace.world = m4.translation(0, 0, 0);
  lightClipspace.type = gl.LINES;

  // 바닥
  let plane = createBox(50, 0.2, 50);
  plane.positions = new Float32Array(plane.positions);
  plane.normals = new Float32Array(plane.normals);
  plane.colorMult = [0.5, 0.5, 1, 1];
  plane.color = [0, 0, 1, 1];
  plane.world = m4.translation(0, -0.1, 0);
  plane.type = gl.TRIANGLES;

  // 그려질 객체 배열
  const drawingObjects = [cube, plane];

  let _cnt = 0;
  // 객체 화면으로 출력
  function drawObject(program, obj, worldMat) {
    // 객체의 world 행렬과 곱해서 최종 월드 행렬 적용
    let objWorldMat = worldMat ? m4.multiply(worldMat, obj.world) : obj.world;

    gl.uniformMatrix4fv(program.u_world, false, objWorldMat);
    // 객체 색상 적용
    if (program.u_colorMult) {
      gl.uniform4fv(program.u_colorMult, obj.colorMult);
    }
    if (program.u_color) {
      gl.uniform4fv(program.u_color, obj.color);
    }

    if (obj.normals && program.a_normal) {
      program.a_normal.bindBuffer();
      gl.bufferData(gl.ARRAY_BUFFER, obj.normals, gl.STATIC_DRAW);
      program.a_normal.vertexAttribPointer();
    }

    // gl.bindBuffer.apply(gl, program.attributes.position.buffer);
    program.a_position.bindBuffer();
    gl.bufferData(gl.ARRAY_BUFFER, obj.positions, gl.STATIC_DRAW);

    // gl.vertexAttribPointer.apply(gl, program.attributes.position.pointer);
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

    if (textureMat && program.u_textureMatrix) {
      gl.uniformMatrix4fv(program.u_textureMatrix, false, textureMat);
    }

    if (program.u_viewWorld) {
      gl.uniform3fv(program.u_viewWorld, cameraMat.slice(12, 15));
    }

    if (lightMat && program.u_pointLight) {
      gl.uniform3fv(program.u_pointLight, lightMat.slice(12, 15));
    }

    if (lightMat && program.u_lightDirection) {
      gl.uniform3fv(
        program.u_lightDirection,
        lightMat.slice(8, 11).map((v) => -v)
      );
    }

    if (program.u_innerLimit) {
      let val = Math.cos((settings.lightFov - 10) * RADIAN_IN_DEG * 0.5);
      gl.uniform1f(program.u_innerLimit, val);
    }

    if (program.u_outerLimit) {
      let val = Math.cos(settings.lightFov * RADIAN_IN_DEG * 0.5);
      gl.uniform1f(program.u_outerLimit, val);
    }

    if (program.u_shininess) {
      gl.uniform1f(program.u_shininess, settings.shininess);
    }

    // 각 객체별로 화면 출력
    drawingObjects.forEach((it) => {
      drawObject(program, it, worldMat);
    });
  }

  (function render() {
    onResize();

    const clientWidth = gl.canvas.clientWidth;
    const clientHeight = gl.canvas.clientHeight;

    // 조명 월드 행렬
    let lightWorldMat = m4.lookAt(
      [settings.lightX, settings.lightY, settings.lightZ],
      target,
      up
    );

    // 조명 원근 행렬
    let lightProjectionMat = m4.perspective(
      settings.lightFov * RADIAN_IN_DEG,
      settings.projectWidth / settings.projectHeight,
      1,
      25
    );

    gl.bindFramebuffer(gl.FRAMEBUFFER, depthFramebuffer);
    // gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.viewport(0, 0, depthTextureSize, depthTextureSize);
    gl.scissor(0, 0, depthTextureSize, depthTextureSize);
    // gl.clearColor(0, 0, 0, 0); // 투명으로 초기화
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    drawScene(base_program, lightProjectionMat, lightWorldMat);

    // 좌측화면
    const aspect = clientWidth / clientHeight;
    let m = m4.perspective(
      settings.fov * RADIAN_IN_DEG,
      aspect,
      settings.cameraNear,
      settings.cameraFar
    );

    // 카메라 이동/회전
    let cameraMat = m4.yRotation(settings.cameraAngle * RADIAN_IN_DEG);
    // prettier-ignore
    cameraMat = m4.translate(cameraMat, settings.cameraX, settings.cameraY, settings.cameraZ);
    // prettier-ignore
    cameraMat = m4.lookAt([cameraMat[12], cameraMat[13], cameraMat[14]], target, up);

    lightClipspace.world = m4.multiply(
      lightWorldMat,
      m4.inverse(lightProjectionMat)
    );

    let textureMat = m4.identity();
    textureMat = m4.translate(textureMat, 0.5, 0.5, 0.5);
    textureMat = m4.scale(textureMat, 0.5, 0.5, 0.5);
    textureMat = m4.multiply(textureMat, lightProjectionMat);
    textureMat = m4.multiply(textureMat, m4.inverse(lightWorldMat));

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // 화면 분할 처리
    gl.viewport(0, 0, clientWidth, clientHeight);
    gl.scissor(0, 0, clientWidth, clientHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // 화면 출력
    drawScene(normal_program, m, cameraMat, textureMat, lightWorldMat);

    {
      // frustrum for light
      gl.useProgram(base_program.program);
      gl.uniformMatrix4fv(base_program.u_view, false, m4.inverse(cameraMat));
      gl.uniformMatrix4fv(base_program.u_projection, false, m);

      drawObject(base_program, lightClipspace);
    }
    {
      gl.viewport(10, clientHeight - 60, 50, 50);
      gl.scissor(10, clientHeight - 60, 50, 50);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      drawScene(base_program, lightProjectionMat, lightWorldMat);
    }

    requestAnimationFrame(render);
  })();
})();
