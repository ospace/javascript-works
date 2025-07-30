/* 
  # spot light
  
  스포트 조명은 점 조명과 비슷하지만 다른 점은 스포트 조명은 방향과 범위가 있다. 선택된 방향direction으로 일정 범위limit 이내로 빛이 진행한다.
  조명 direction과 모든 빛 방향으로 내적(cos값)을 구할 수 있다. 이 값은 -1~+1 범위를 가지며 dot space 라고하자.
    radian -> dot space ==>  -1 ~ +1

  direction과 일치하는 빛방향은 1이되고, 빛 방향이 90도가 되는 경우는 0이 된다. 이를 가지고 일정 범위 안에 있는 빛 방향만 선택적으로 제한할 수 있다. 임계값limit을 정하고 dot space에서 임계값보다 큰 빛만 선택하면 된다.
  다른 의미로 limit에 해당하는 면에서 빛 방향 벡터를 계산해서 면의 방향과 비교한다고 보면 된다.
    float dotFromDirection = dot(surfaceToLight, -u_lightDirection);
    if (dotFromDirection >= u_lightLimit) {
      // 조명이 닫는 범위
    }

  여기서 surfaceToLight은 표면에서 빛으로 향하는 벡터이고 u_lightDirection은 빛의 방향이다. 앞에 -는 빛으로 향햐는 방향으로 변경해서 표면과 같은 방향으로 내적하기 위해서이다.
  셰이더에서 조건문은 어울리지 않는다. 조건문을 제거해보자. GLSL함수 중에 step 함수를 사용하면 된다. 이 함수는 두 매개변수가 있는데 두번째 매개변수가 크거나 같으면 1이고 아니면 0으로 리턴한다.
    float dotFromDirection = dot(surfaceToLight, -u_lightDirection);
    float inLight = step(u_limit, dotFromDirection);
    float light = inLight * dot(normal, surfaceLight);
    float specular = inLight * pow(dot(normal, halfVector), u_shininess);

  step()에 의해 dotFromDirection이 더 크면 inLight에 빛 영역인 1이 저장되고 아닌면 결과값 0이 저장된다.
  스포트 조명의 경계가 너무 선명하다. 조금 흐릿하게 변경해보자. inLight에 1과 0이 아닌 경계에서 부드럽게 변하는 기능이 필요하다. 이때 사용할 수 있는 GLSL함수가 step()이다. 값에 크기에 따라서 0과 1사이 값이 부드럽게 변한다. 이를 위해 u_limit 대신에 u_innerLimit와 u_outerLimit을 사용한다.
  u_innerLimit은 조명이 어두어지기 시작하는 부분이고 u_outer_limit은 조명이 닫지 않는 부분이다. 
    float limitRange = u_innerLimit - u_outerLimit;
    float inLight = clamp((dotFromDirection - u_outerLimit) / limitRange, 0.0, 1.0);

  주의할 부분은 u_innerLimit와 u_outerLimit가 같은 값이 되면 limitRange가 0이 되어 나누어서 문제가 있다. 이를 방지하기 위한 코드가 필요하다.
  smoothstep()을 사용하면 상한과 하한 값을 지정하고 그 사이 값을 보간하는 함수이다. 이를 사용하면 좀더 단순하게 처리할 수 있다.
    float inLight = smoothstep(u_outerLimit, u_innerLimit, dotFromDirection);

  step()은 선형보간이고 smoothstep()은 에르미트 보간법을 사용하는 차이가 있다. 주의할 점은 u_innerLimit가 u_outterLimit보다 더 크면 예측하지 못한 결과가 나올 수 있기에 이를 방지하기 위한 코드가 필요하다.

  Ref:
    https://webglfundamentals.org/webgl/lessons/ko/webgl-3d-lighting-spot.html
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

const gui = new dat.GUI();
// gui.close();
//////////////////////////////// Functions ///////////////////////////////
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

///////////////////////////////// WebGL //////////////////////////////////
(function main() {
  const gl = c.getContext("webgl");
  const WIDTH = gl.canvas.width;
  const HEIGHT = gl.canvas.height;
  const DEPTH = HEIGHT;

  const fragment = document.querySelector('script[type="x-shader/x-fragment"]');
  const vertex = document.querySelector('script[type="x-shader/x-vertex"]');

  // 프로그램으로 두 셰이더 연결
  const program = createProgram(gl, vertex.text, fragment.text);

  gl.enable(gl.CULL_FACE); // 3D!! 앞뒷면그리지 않고 앞면(반시계방향)만 그림
  gl.enable(gl.DEPTH_TEST); // 3D!! 깊이감 고려해서 그림
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height); // clip space 영역 설정

  // 프로그램 활성화
  gl.useProgram(program);

  // attribute: position
  let positionBuf = defineAttribute(gl, program, "a_position", 3); // in 3D,

  // attribute: color
  // normalize 활성화 및 정수형 타입 (256값 사용) - normalize로 0~1사이 범위로 변환됨
  // prettier-ignore
  let colorBuf = defineAttribute(gl, program, "a_color", 3, gl.UNSIGNED_BYTE, true);

  // attribute: normal

  // 법선 속성 활성화
  let normalLoc = gl.getAttribLocation(program, "a_normal");
  let normalBuf = defineAttribute(gl, program, "a_normal", 3);

  /*
    uniform은 정점 셰이더에 직접 데이터를 전달되며 전역 변수 처럼 사용된다.
    유니폼은 개별 프로그램 별로 직접 설정된다.
   */
  let settings = {
    cameraAngle: 10,
    lightLimit: 4,
    lightRotationX: 3,
    lightRotationY: 1,
    shininess: 1.0,
    innerLimit: 4,
    outerLimit: 6,
    fov: 30,
    translationX: 0,
    translationY: 0,
    translationZ: 0,
    scalingX: 1,
    scalingY: 1,
    scalingZ: 1,
    rotationX: 20,
    rotationY: 0,
    rotationZ: 0
  };

  // uniform: pointLight
  // prettier-ignore
  let pointLightLoc = gl.getUniformLocation(program, "u_pointLight");
  // gl.uniform3fv(pointLightLoc, [40, 60, 120]);

  // uniform: shininess
  let shininessLoc = gl.getUniformLocation(program, "u_shininess");

  // uniform: lightColor
  let lightColorLoc = gl.getUniformLocation(program, "u_lightColor");
  gl.uniform3fv(lightColorLoc, normalize([0.6, 0.6, 1]));

  // uniform: specularColor
  let specularColorLoc = gl.getUniformLocation(program, "u_specularColor");
  gl.uniform3fv(specularColorLoc, normalize([1, 0.6, 0.6]));

  // uniform: lightDirection!!
  let lightDirectionLoc = gl.getUniformLocation(program, "u_lightDirection");
  gl.uniform3fv(lightDirectionLoc, [0, 0, 0]);

  // uniform: lightLimit!!
  // let lightLimitLoc = gl.getUniformLocation(program, "u_lightLimit");

  // uniform: innerLimit!!
  let innerLimitLoc = gl.getUniformLocation(program, "u_innerLimit");

  // uniform: outterLimit!!
  let outerLimitLoc = gl.getUniformLocation(program, "u_outerLimit");

  // uniform: world
  // prettier-ignore
  let worldLoc = gl.getUniformLocation(program, "u_world");
  gl.uniformMatrix4fv(worldLoc, false, m4.identity());

  // uniform: viewWorld
  let viewWorldLoc = gl.getUniformLocation(program, "u_viewWorld");

  // uniform: matrix
  let matrixLoc = gl.getUniformLocation(program, "u_matrix");
  let range = 1000;

  // 설정 UI
  gui.add(settings, "cameraAngle", -360, 360, 0.01).onChange(render);
  gui.add(settings, "lightLimit", 0, 180, 0.1).onChange(render);
  gui.add(settings, "lightRotationX", 0, 90, 0.01).onChange(render);
  gui.add(settings, "lightRotationY", 0, 90, 0.01).onChange(render);
  gui.add(settings, "shininess", 0, 10, 0.1).onChange(render);
  gui.add(settings, "innerLimit", 0, 180, 0.1).onChange(render);
  gui.add(settings, "outerLimit", 0, 180, 0.1).onChange(render);
  gui.add(settings, "fov", 0, 180, 0.1).onChange(render);
  gui.add(settings, "translationX", -WIDTH, WIDTH).onChange(render);
  gui.add(settings, "translationY", -HEIGHT, HEIGHT).onChange(render);
  gui.add(settings, "translationZ", -DEPTH, 0).onChange(render);
  gui.add(settings, "rotationX", -360, 360, 0.1).onChange(render);
  gui.add(settings, "rotationY", -360, 360, 0.1).onChange(render);
  gui.add(settings, "rotationZ", -360, 360, 0.1).onChange(render);

  let cntTriangle = 36;

  // 색상 버퍼
  let colorData = [];
  // 사각형은 2개 삼각형으로 구성
  let gray = 200;
  for (let i = 0, n = cntTriangle / 2; i < n; ++i, gray += 10) {
    let [r, g, b] = [gray, gray, gray];
    // 삼각형 3 정점에 색상 동일하게 지정
    for (let j = 0; j < 6; ++j) {
      colorData.push(r, g, b);
    }
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuf);
  // 데이터형에 맞게 Uint8Array로 변경,
  gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(colorData), gl.STATIC_DRAW);

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuf);
  setBox(gl, -100, -100, -100, 200, 200, 200);

  // 각 면에 대한 법선 벡터 정의
  // front: [0,0,1], back: [0,0,-1], left:[-1,0,0], right:[1,0,0], up:[0,1,0], down:[0,-1,0]
  // prettier-ignore
  let normals = [
    // front
      0,0,1,
      0,0,1,
      0,0,1,
      0,0,1,
      0,0,1,
      0,0,1,
    // back 
      0,0,-1,
      0,0,-1,
      0,0,-1,
      0,0,-1,
      0,0,-1,
      0,0,-1,
    // left
      -1,0,0,
      -1,0,0,
      -1,0,0,
      -1,0,0,
      -1,0,0,
      -1,0,0,
    // right
      1,0,0,
      1,0,0,
      1,0,0,
      1,0,0,
      1,0,0,
      1,0,0,
    // top
      0,1,0,
      0,1,0,
      0,1,0,
      0,1,0,
      0,1,0,
      0,1,0,
    // bottom
      0,-1,0,
      0,-1,0,
      0,-1,0,
      0,-1,0,
      0,-1,0,
      0,-1,0,
  ];

  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

  function render() {
    onResize();

    // shininess of specular
    gl.uniform1f(shininessLoc, settings.shininess);

    // 원근 투영: 클립공간변환+원근감+시야갹
    let aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    let zNear = 1;
    let zFar = 2000;
    let m = m4.perspective(settings.fov * RADIAN_IN_DEG, aspect, zNear, zFar);

    // 카메라
    /* 카메라 위치와 각 축의 축
    
    벡터 정보
      Xx Xy Xz 0  << x축 벡터
      Yx Yy Yz 0  << y축 벡터
      Zx Zy Zz 0  << z축 벡터
      Tx Ty Tz 1  << 카메라 위치
     */
    let numFs = 5;
    let cameraMat = m4.yRotation(settings.cameraAngle * RADIAN_IN_DEG);
    cameraMat = m4.translate(cameraMat, 0, 0, range * 1.5);
    // 역행렬
    let viewMat = m4.inverse(cameraMat);
    m = m4.multiply(m, viewMat);

    // 이동/회전/스케일: sequence is important!
    // prettier-ignore
    let worldMat = m4.translation(settings.translationX, settings.translationY, settings.translationZ);
    worldMat = m4.xRotate(worldMat, settings.rotationX * RADIAN_IN_DEG);
    worldMat = m4.yRotate(worldMat, settings.rotationY * RADIAN_IN_DEG);
    worldMat = m4.zRotate(worldMat, settings.rotationZ * RADIAN_IN_DEG);
    // prettier-ignore
    worldMat = m4.scale(worldMat, settings.scalingX, settings.scalingY, settings.scalingZ);

    m = m4.multiply(m, worldMat);

    worldMat = m4.inverse(worldMat);
    worldMat = m4.transpose(worldMat);

    gl.uniformMatrix4fv(worldLoc, false, worldMat);
    gl.uniform3f(viewWorldLoc, cameraMat[12], cameraMat[13], cameraMat[14]);

    // 조명 방향 적용!!
    let lightMat = cameraMat;
    // prettier-ignore
    lightMat = m4.multiply(m4.xRotation(settings.lightRotationX * RADIAN_IN_DEG), lightMat);
    // prettier-ignore
    lightMat = m4.multiply(m4.yRotation(settings.lightRotationY * RADIAN_IN_DEG), lightMat);
    gl.uniform3f(pointLightLoc, lightMat[12], lightMat[13], lightMat[14]);

    // gl.uniform1f(lightLimitLoc, Math.cos(settings.lightLimit * RADIAN_IN_DEG));
    gl.uniform1f(innerLimitLoc, Math.cos(settings.innerLimit * RADIAN_IN_DEG));
    gl.uniform1f(outerLimitLoc, Math.cos(settings.outerLimit * RADIAN_IN_DEG));

    // 카메라 방향을 조명 방향으로 설정위해 -z축 방향 설정!!
    // prettier-ignore
    gl.uniform3f(lightDirectionLoc, -cameraMat[8], -cameraMat[9], -cameraMat[10]);

    // 화면 투명하기 삭제
    gl.clearColor(0, 0, 0, 0);
    // 색 및 깊이 버퍼 지움
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // in 3D,

    // 화면 출력
    arrangeArray(1, range, function (x, y, z) {
      let arrayMat = m4.translate(m, x, y, z);
      gl.uniformMatrix4fv(matrixLoc, false, arrayMat);
      gl.drawArrays(gl.TRIANGLES, 0, cntTriangle);
    });
  }

  render();
})();
