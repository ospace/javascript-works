/*
  # orthographic
  
  앞에서 화면을 2차원 clip space로 투영하는 방법을 살펴보았다. 3차원으로 확장해보자. 행렬 계산이 3차원을 고려해야 한다.
  회전rotate 인 경우 행렬이다. 이 경우 xyz축을 x축, y축, z축 회전으로 나눠서 적용해야 한다.

  yRotation: function (angleInRadians) {
    return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1];
  },
  zRotation: function (angleInRadians) {
    return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  },
  x축에 대한 회전 행렬이다.
    |1, 0, 0, 0|
    |0, c, s, 0|
    |0,-s, c, 0|
    |0, 0, 0, 1|
    
  y축에 대한 회전 행렬이다.
    |c, 0,-s, 0|
    |0, 1, 0, 0|
    |s, 0, c, 0|
    |0, 0, 0, 1|
    
  z축에 대한 회전 행렬이다.
    | c, s, 0, 0|
    |-s, c, 0, 0|
    | 0, 0, 0, 0|
    | 0, 0, 0, 1|
    
  여기서 s = sin(angle), c = cos(angle)이다. 아래 처럼 회전 행렬이 계산된다.

  스케일scale인 경우 행렬이다.
    |sx, 0, 0, 0|
    | 0,sy, 0, 0|
    | 0, 0,sz, 0|
    | 0, 0, 0, 1|

  이동transpose인 경우 행렬이다.
    | 1, 0, 0, 0|
    | 0, 1, 0, 0|
    | 0, 0, 1, 0|
    |tx,ty,tz, 1|
    
  투영 행렬도 변경해줘야 한다.
    |2/width,        0,      0, 0|
    |      0,-2/height,      0, 0|
    |      0,-       0,2/depth, 0|
    |      -1,       1,      0, 1]
    
  Ref:
    https://webglfundamentals.org/webgl/lessons/ko/webgl-3d-orthographic.html
    https://webglfundamentals.org/webgl/lessons/resources/webgl-state-diagram.html
    
  GLSL spec: https://www.khronos.org/files/opengles_shading_language.pdf
  Linear algebra: https://www.youtube.com/watch?v=kjBOesZCoqc&list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab
 */
////////////////////////////////////////// enviroments /////////////////////////////////////////
function onResize() {
  c.width = document.body.clientWidth;
  c.height = document.body.clientHeight;
}
onResize();
addEventListener("resize", onResize);

const gui = new dat.GUI();

/////////////////////////////////////// Functions //////////////////////////////////////////////
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
    throw new Error(name + " attribute is not found!!");
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
  }
};

////////////////////////////////////////////////// WebGL ///////////////////////////////////////////////
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
  let positionBuf = defineAttribute(gl, program, "a_position", 3); // in 3D!!
  // attribute: color
  // normalize 활성화 및 정수형 타입 (256값 사용) - normalize로 0~1사이 범위로 변환됨
  let colorBuf = defineAttribute(
    gl,
    program,
    "a_color",
    3,
    gl.UNSIGNED_BYTE,
    true
  );

  /*
  uniform은 정점 셰이더에 직접 데이터를 전달되며 전역 변수 처럼 사용된다.
  유니폼은 개별 프로그램 별로 직접 설정된다.
*/
  let settings = {
    translationX: WIDTH * 0.5,
    translationY: HEIGHT * 0.5,
    translationZ: 0,
    scalingX: 1,
    scalingY: 1,
    scalingZ: 1,
    rotationX: 1.86,
    rotationY: 0,
    rotationZ: -0.45
  };

  // uniform: matrix
  var matrixLoc = gl.getUniformLocation(program, "u_matrix");
  // sequence is important!
  function applyMatrix() {
    // 프로젝션 함수: screen space -> clip space
    // let m = m4.projection(gl.canvas.width, gl.canvas.height, DEPTH);
    // 직교투영 함수: 좀더 유연하게 사용 가능.
    let left = 0;
    let right = gl.canvas.width;
    let top = 0;
    let bottom = gl.canvas.height;
    let near = DEPTH;
    let far = -DEPTH;
    let m = m4.orthographic(left, right, bottom, top, near, far);
    m = m4.translate(
      m,
      settings.translationX,
      settings.translationY,
      settings.translationZ
    );
    m = m4.xRotate(m, settings.rotationX);
    m = m4.yRotate(m, settings.rotationY);
    m = m4.zRotate(m, settings.rotationZ);
    m = m4.scale(m, settings.scalingX, settings.scalingY, settings.scalingZ);

    gl.uniformMatrix4fv(matrixLoc, false, m);
  }
  applyMatrix();

  // 설정 UI
  gui.add(settings, "translationX", -WIDTH, WIDTH).onChange(refresh);
  gui.add(settings, "translationY", -HEIGHT, HEIGHT).onChange(refresh);
  gui.add(settings, "translationZ", -DEPTH, DEPTH).onChange(refresh);
  gui.add(settings, "scalingX", -5, 5).onChange(refresh);
  gui.add(settings, "scalingY", -5, 5).onChange(refresh);
  gui.add(settings, "scalingZ", -5, 5).onChange(refresh);
  gui
    .add(settings, "rotationX", -2 * Math.PI, 2 * Math.PI, 0.01)
    .onChange(refresh);
  gui
    .add(settings, "rotationY", -2 * Math.PI, 2 * Math.PI, 0.01)
    .onChange(refresh);
  gui
    .add(settings, "rotationZ", -2 * Math.PI, 2 * Math.PI, 0.01)
    .onChange(refresh);

  // prettier-ignore
  // 면이 시계 반대반향으로 그려줘야 보임
  let box = [
    //top
    -150, -100, -90,
    -150, 100, -90,
    150, -100, -90,
    150, -100, -90,
    -150, 100, -90,
    150, 100, -90,
    //bottom
    150, -100, 90,
    -150, 100, 90,
    -150, -100, 90,
    150, 100, 90,
    -150, 100, 90,
    150, -100, 90,
    // left
    -150, -100, 90,
    -150, 100, -90,
    -150, -100, -90,
    -150, 100, 90,
    -150, 100, -90,
    -150, -100, 90,
    // right
    150, -100, -90,
    150, 100, -90,
    150, -100, 90,
    150, -100, 90,
    150, 100, -90,
    150, 100, 90,
    // upper
    -150, -100, 90,
    -150, -100, -90,
    150, -100, -90,
    -150, -100, 90,
    150, -100, -90,
    150, -100, 90,
    // lower
    150, 100, -90,
    -150, 100, -90,
    -150, 100, 90,
    150, 100, 90,
    150, 100, -90,
    -150, 100, 90
  ];

  // 사각형 버퍼
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(box), gl.STATIC_DRAW);

  // 색상 버퍼
  let colorData = [];
  // 사각형은 2개 삼각형으로 구성
  let gray = 100;
  for (let i = 0, n = box.length / 12; i < n; ++i, gray += 10) {
    let r = gray + 10;
    let g = gray;
    let b = gray;
    // 삼각형 3 정점에 색상 동일하게 지정
    for (let j = 0; j < 6; ++j) {
      colorData.push(r, g, b);
    }
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuf);
  // 데이터형에 맞게 Uint8Array로 변경!!
  gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(colorData), gl.STATIC_DRAW);

  function refresh() {
    onResize();
    applyMatrix();
    // 화면 투명하기 삭제
    gl.clearColor(0, 0, 0, 0);
    // 색 및 깊이 버퍼 지움
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // in 3D!!

    // 화면 출력
    gl.drawArrays(gl.TRIANGLES, 0, box.length / 3);
  }

  refresh();
})();
