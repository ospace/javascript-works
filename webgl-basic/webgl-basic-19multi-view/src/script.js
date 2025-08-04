/* 
  # multi view
  
  viewport를 사용한 다중 화면 처리이다. viewport 영역만 랜더링 된다.
    gl.viewport(clientWidth, 0, clientWidth, clientHeight);
  
  만약 clear()에 의해서 화면을 초기화할 경우 분할된 영역만 초기되는게 아니라 전체가 초기화된다.
    gl.clearColor(0, 0, 0, 0); // 투명으로 초기화
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
  이를 해결할 방볍이 scissor()를 사용하면 지정된 범위만 초기화된다.
  scissor을 사용하기 위해서는 SCISSORE_TEST를 활성화해야 한다.
    gl.enable(gl.SCISSOR_TEST); // scissor 활성화
    gl.scissor(clientWidth, 0, clientWidth, clientHeight);
    
    
  다른 응용법으로 화면을 채우는 canvas을 만들고 div을 canvas위에 뛰운다.
  해당 div의 영역을 조회해서 현재 화면에서 보이는지 확인한다.
    const rc = elem.getBoundingClientRect();
    if (rc.bottom < 0 || rc.top  > gl.canvas.clientHeight ||
          rc.right  < 0 || rc.left > gl.canvas.clientWidth) {
       // canvas 영역에서 벗어나기에 그릴 필요 없음
    }
    
  표시 가능한 영역이라면 viewport()활용해서 해당 영역에서 랜더링을 진행한다.
    const left = rc.left;
    const right = gl.canvas.clientHeight-rc.bottom;
    const width  = rect.right - rect.left;
    const height = rect.bottom - rect.top;
    gl.viewport(left, right, width, height);
    gl.scissor(left, bottom, width, height);
    // 랜더링
    
  화면이 스크롤될 경우 두가지 방식으로 처리할 수 있다.
    - 캔버스를 고정하고 화면 스크롤에 맞춰서 그리는 영역을 스크롤 방향으로 움직인다.
      이 경우 화면 가장 자리에 새로 그려지는 경우 그려질 때까지 화면이 이전위치에 고정되었다.
    - 캔버스 자체를 같이 스크롤한다.
      이 경우 화면이 그대로 따라가지면 화면에서 가려진 부분이 나타날때 랜더링될 때까지 비어있다.
      gl.canvas.style.transform = `translateX(${window.scrollX}px) translateY(${window.scrollY}px)`;
    
  Ref:
    https://webglfundamentals.org/webgl/lessons/ko/webgl-multiple-views.html
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

const imgSrc =
  "https://images.unsplash.com/photo-1612144431180-2d672779556c?crop=entropy&cs=srgb&fm=jpg&ixid=MnwzMjM4NDZ8MHwxfHJhbmRvbXx8fHx8fHx8fDE2ODI3ODU3OTk&ixlib=rb-4.0.3&q=85&w=400";

// const mapImage =
//   "https://upload.wikimedia.org/wikipedia/commons/e/ea/Cube_map.svg";
// const mapInfo = [182, 168, 145, 145, 639, 481];

// const mapImage =
//   "https://upload.wikimedia.org/wikipedia/commons/b/b4/Skybox_example.png";
// const mapInfo = [128, 128, 128, 128, 512, 384];

//////////////////////////////// Functions ///////////////////////////////
// apply checker bodard to texture!!
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
function defineTexture(gl, program, name, unitNo = 0) {
  let maxUnit = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
  if (unitNo > maxUnit) {
    throw new Error(
      `unitNo($unitNo) is over than MAX_TEXTURE_IMAGE_UNITS(${maxUnit})`
    );
  }

  // 유니폼에 유닛 설정
  let loc = gl.getUniformLocation(program, name);
  if (0 > loc) {
    throw new Error(`${name} texture is not found!`);
  }

  gl.uniform1i(loc, unitNo); // 유닛 설정

  return createTexture(gl, unitNo);
}

function createTexture(gl, unitNo = 0) {
  // 텍스처 생성 및 유닛 설정
  let texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + unitNo); // 바인딩할 유닛
  gl.bindTexture(gl.TEXTURE_2D, texture); // 텍스처 유닛에 바인딩

  // 이미지 랜더링 설정
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
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

  let faces = [2, 0, 3, 0, 1, 3];

  let positions = faces.reduce((prev, it) => prev.concat(vertices[it]), []);

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
  let vertices = [
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
  let faces = [
    0, 1, 2, 1, 3, 2, // front
    6, 7, 4, 7, 5, 4, // back
    4, 5, 0, 5, 1, 0, // left
    2, 3, 6, 3, 7, 6, // right
    4, 0, 6, 0, 2, 6, // top
    1, 5, 3, 5, 7, 3, // bottom
  ];

  let positions = faces.reduce((prev, it) => prev.concat(vertices[it]), []);

  return { positions };
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
    return [
      d * t0, d * t1, d * t2, d * t3,
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
  const WIDTH = gl.canvas.width;
  const HEIGHT = gl.canvas.height;
  const DEPTH = 2000;

  const fragment = document.querySelector('script[type="x-shader/x-fragment"]');
  const vertex = document.querySelector('script[type="x-shader/x-vertex"]');

  // 프로그램으로 두 셰이더 연결
  const program = createProgram(gl, vertex.text, fragment.text);

  gl.enable(gl.CULL_FACE); // 3D!! 앞뒷면그리지 않고 앞면(반시계방향)만 그림
  gl.enable(gl.DEPTH_TEST); // 3D!! 깊이감 고려해서 그림
  gl.enable(gl.SCISSOR_TEST); // diviced by area!!

  // 프로그램 활성화
  gl.useProgram(program);

  let settings = {
    cameraAngle: -10,
    cameraX: 0,
    cameraY: 200,
    fov: 20,
    textureX: -0.4,
    textureY: 0.4,
    textureZ: 0.4,
    targetX: 0,
    targetY: 0,
    targetZ: 0,
    textureScaleX: 50,
    textureScaleY: 50,
    translationX: 0,
    translationY: -40,
    translationZ: 0,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0
  };

  // attribute: position
  let positionBuf = defineAttribute(gl, program, "a_position", 3); // in 3D,

  // attribute: texcoord
  let texcoordBuf = defineAttribute(gl, program, "a_texcoord", 2);

  // 텍스처 좌표!!
  let normalTexcoord = new Array(6)
    .fill()
    .reduce((acc, _) => acc.concat([0, 0, 0, 1, 1, 0, 0, 1, 1, 1, 1, 0]), []);
  gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(normalTexcoord),
    gl.STATIC_DRAW
  );

  /*
    uniform은 정점 셰이더에 직접 데이터를 전달되며 전역 변수 처럼 사용된다.
    유니폼은 개별 프로그램 별로 직접 설정된다.
   */

  // uniform: projection!!
  let projectionLoc = gl.getUniformLocation(program, "u_projection");

  // uniform: view!!
  let viewLoc = gl.getUniformLocation(program, "u_view");

  // uniform: world!!
  let worldLoc = gl.getUniformLocation(program, "u_world");

  // uniform: world
  let colorMultLoc = gl.getUniformLocation(program, "u_colorMult");

  // uniform: image
  let imageTex = defineTexture(gl, program, "u_texture");
  applyCheckerTexture(gl, 4, 4); // checker boarder texture

  // 설정 UI
  const gui = new dat.GUI();
  gui.remember(settings);
  gui.close();
  function getPreset() {
    return {
      preset: "Default",
      closed: false,
      remembered: {
        Default: {},
        Preset1: {}
      }
    };
  }
  gui.add(settings, "cameraAngle", -360, 360, 0.01);
  gui.add(settings, "cameraX", -WIDTH, WIDTH);
  gui.add(settings, "cameraY", -HEIGHT, HEIGHT);
  gui.add(settings, "fov", 0, 180, 0.1);
  gui.add(settings, "textureX", -10, 10, 0.01);
  gui.add(settings, "textureY", -10, 10, 0.01);
  gui.add(settings, "textureZ", -10, 10, 0.01);
  gui.add(settings, "targetX", -1, 1, 0.01);
  gui.add(settings, "targetY", -1, 1, 0.01);
  gui.add(settings, "targetZ", -1, 1, 0.01);
  gui.add(settings, "textureScaleX", 0, 100, 0.01);
  gui.add(settings, "textureScaleY", 0, 100, 0.01);
  gui.add(settings, "translationX", -WIDTH, WIDTH);
  gui.add(settings, "translationY", -HEIGHT, HEIGHT);
  gui.add(settings, "translationZ", -DEPTH, DEPTH);
  gui.add(settings, "rotationX", -360, 360, 0.1);
  gui.add(settings, "rotationY", -360, 360, 0.1);
  gui.add(settings, "rotationZ", -360, 360, 0.1);

  let box = createBox(80, 80, 80);
  box.positions = new Float32Array(box.positions);
  box.color = [1, 0.5, 0.5, 1];
  box.world = m4.translation(0, 60, 0);

  let plane = createPlane(500, 500);
  plane.positions = new Float32Array(plane.positions);
  plane.color = [0.5, 0.5, 1, 1];
  plane.world = m4.translation(0, 0, 0);

  const drawingObjects = [box, plane];

  // 화면 그려주는 함수!!
  function drawScene(projectionMat, cameraMat) {
    let viewMat = m4.inverse(cameraMat);

    // 월드 이동/회전: sequence is important!
    // prettier-ignore
    let worldMat = m4.translation(settings.translationX, settings.translationY, settings.translationZ);
    worldMat = m4.xRotate(worldMat, settings.rotationX * RADIAN_IN_DEG);
    worldMat = m4.yRotate(worldMat, settings.rotationY * RADIAN_IN_DEG);
    worldMat = m4.zRotate(worldMat, settings.rotationZ * RADIAN_IN_DEG);

    gl.uniformMatrix4fv(projectionLoc, false, projectionMat);
    gl.uniformMatrix4fv(viewLoc, false, viewMat);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    drawingObjects.forEach((it) => {
      let objWorldMat = m4.multiply(worldMat, it.world);
      gl.uniformMatrix4fv(worldLoc, false, objWorldMat);
      gl.uniform4fv(colorMultLoc, it.color);

      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuf);
      gl.bufferData(gl.ARRAY_BUFFER, it.positions, gl.STATIC_DRAW);

      let cntTriangle = it.positions.length / 3;
      gl.drawArrays(gl.TRIANGLES, 0, cntTriangle);
    });
  }

  const range = 500;
  const target = [0, 0, 0];
  const up = [0, 1, 0];
  (function render() {
    onResize();

    const clientWidth = gl.canvas.clientWidth / 2;
    const clientHeight = gl.canvas.clientHeight;

    // Projection
    const aspect = clientWidth / clientHeight;
    let m = m4.perspective(settings.fov * RADIAN_IN_DEG, aspect, 1, 2000);

    // 카메라 이동/회전
    let cameraMat = m4.yRotation(settings.cameraAngle * RADIAN_IN_DEG);
    // prettier-ignore
    cameraMat = m4.translate(cameraMat, settings.cameraX, settings.cameraY, range * 1.5);
    // prettier-ignore
    cameraMat = m4.lookAt([cameraMat[12], cameraMat[13], cameraMat[14]], target, up);

    // 화면 출력
    // !!
    gl.viewport(0, 0, clientWidth, clientHeight);
    gl.scissor(0, 0, clientWidth, clientHeight);
    gl.clearColor(0, 0, 0, 0); // 투명으로 초기화
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    drawScene(m, cameraMat);

    m = m4.orthographic(
      -clientWidth,
      +clientWidth,
      -clientHeight,
      clientHeight,
      -20,
      2000
    );

    cameraMat = m4.lookAt([0, 1000, 0], [0, 0, 0], [0, 0, 1]);

    // !!
    gl.scissor(clientWidth, 0, clientWidth, clientHeight);
    gl.viewport(clientWidth, 0, clientWidth, clientHeight);
    gl.clearColor(0.5, 0.5, 0.5, 1); // blue으로 초기화
    drawScene(m, cameraMat);

    requestAnimationFrame(render);
  })();
})();
