/* 
  # perspective
  
  원근 투영으로 깊이값을 표현하는 원근법을 말한다.
  같은 물체라고 해도 멀리있을 수록 작아진다. 즉, 깊이가 깊어질 수록 비례하여 작아진다.
  깊이가 z라고 하면 z에 의해서 x와 y의 크기가 달라진다.
    x' = x / z
    y' = y / z

  이를 정점 셰이더에 적용하면 아래와 같다.
    float zToDivideBy =  position.z * u_fudgeFactor + 1.0;
    gl_Position = vec4(position.xy / zToDivideBy, position.zw);

  깊이값을 조절하기 위해서 fudgeFactor을 사용했다. +1은 -부분을 없애서 길이로 만든다. 값이 커지만 더 빨리 줄어들게 된다.
  webgl에서는 gl_Position에서 x,y,z에 대해 자동으로 w으로 나눠주는 기능이 있다.
  이를 이용하면 직접 나누지 않고 webgl에서 알아서 나눠주게 더 단순하게 처리할 수 있다.
    |1, 0, 0,           0|
    |0, 1, 0,           0|
    |0, 0, 1, fudgeFactor|
    |0, 0, 0,           1|
  
  이를 정점과 곱하면 w에 z*fudgeFactor+1가 저장된다. 그럼 자동으로 z*fudgeFactor+1으로 나눠주게 된다.
  
  x와 y값이 커질 수록 fudgeFactor을 조절해야 한다. z 범위를 사용해서 원근 투영을 계산하는 수학적 접근법이 있다.
  가로, 세로 길이처럼 깊이 길이를 사용한다. 먼저, 원근 계산을 위해 바라보는 시점 위치가 원점 (0,0,0)이라고 가정하다.
    - fov: 시야각
    - aspect: canvas ratio = width / height
    - near: Z = -1로 매핑되는 지점
    - far: Z = 1로 매핑되는 지점
  Note: near는 가까운 위치로 Z가 -1이고 far는 가장 먼 위치로 Z가 1이다. +Y는 위쪽, -Y는 아래쪽 방향이다.
    
  사용할 공간은 fov은 시야각으로 바라보는 시점 대상으로 사각지대인 near와 far 사이에 존재해야 한다.
  near보다 가까우거나 far보다 멀리 있으면 보이지 않는다.
                             +
         fov=60/2            | 
    <) --|-------------------|
        -near                |-far
                             +
                             
  시야각이 원점에서 시작되고 투영은 -Z 방향으로 되며 +Y가 위쪽이지만, 물체는 +Z가 아래 방향이다.
  fov의 절반 각도가 한쪽에서 보이는 각도가 되며 직각 삼각형 모양이 된다. 이를 사용해서 tan으로 near와 far위치에 절반 높이를 구할 수 있다.
  예를 들어, -near가 1이고 fov가 60도일 경우 Z=-1에서 절두체 높이는 tan(60/2) * 2으로 1.154이고 너비는 1.154*aspect이 된다.
  Z=-2000에서 높이는 2309이다. 예를 들어 물체 크기가 100이라면 어느정도 멀리 떨어져야 전체가 보일지 계산이 가능하다.

  이를 수식을 정리해보자. 시야각 fov가 -Z 방향으로 바라보고 있다고 하자.
  임의 z 지점에서 시야각의 최대 높이 y는 다음과 같은 식으로 유도할 수 있다.
    tan(fovY / 2) = y / -z
    
  여기서 fovY은 y축 방향 시야각이고 2로 나누고 이유는 삼각함수가 기준이 되기 때문이다.
    y = tan(fovY / 2) * -z
    
  f = 1 / tan(fovY / 2) 라고 정의하면 다음 처럼 정리할 수 있다.
    y = -z / f
    
  여기서 f는 tan(Math.PI * .5 - .5 * fovY)와 동일한 형태이다.
  이를 카메라 공간에서 클립 공간로 변환이 필요하다. 클립 공간이 -1~+1이므로 카메라 공간 y를 나눠서 구할 수 있다.
  임의 점 z에서 최대 높이로 나누면 클립 공간에서 y를 구할 수 있다.
    clipY = cameraY / y = cameraY * f / -z

  x에 대해서 종횡비를 고려해보자.
    clipX = cameraX / x = cameraX * f / (aspect * -z)
    
  z에 대해서 카메라에 가까운 -z가 먼 z 보다 더 큰 해상도를 가지도록 역함수로 생성한다.
    clipZ = s / cameraZ + c
    
  cameraZ가 커지면(멀어지면) clipZ 작아지고 cameraZ가 작아지면(가까우면) clipZ는 커진다.
  여기서 s와 c는 알지 못하지만 구해야할 미지수이다.
  -zNear을 -1로 -zFar을 +1 범위로 알고 있다. 이 조건을 위식에 대입하면 아래와 같게 된다.
    -1 = s / -zNear + c
     1 = s / -zFar  + c
     
  여기서 zNear은 z방향 near위치고 zFar은 z방향 far위치이다.
  연립 방정식으로 방정식을 풀면 된다. s기준으로 정리하면, 아래와 같다.
    s = (-1 - c) * -zNear
    s = ( 1 - c) * -zFar
    
  두식이 서로 같은 같으므로 정리하면 아래와 같다.
    s = (-1 - c) * -zNear = ( 1 - c) * -zFar
    
  괄호를 풀어서 c로 정리하면 아래와 같다.
    zNear + c * zNear = -zFar + c * zFar
    c = -(zFar + zNear) / (zNear - zFar)
    
  앞에 식에 c를 대입해서 s를 구할 수 있다.
    s = (1 - -((zFar + zNear) / (zNar - zFar))) * -zFar
      = (2 * zNear * zFar) / (zNear - zFar)
      
  s와 c를 가지고 clipZ 구해보자.
    clipZ = (2 * zNear * zFar) / (zNear - zFar) / -cameraZ - (zFar + zNear) / (zNar - zFar)
    
  rangeInv = 1 / (zNear - zFar)라고 정의하면 아래 처럼 정리할 수 있다.
    clipZ = ((2 * zNear * zFar) * rangeInv) + (zFar + zNear) * rangeInv * cameraZ) / -cameraZ
    
  앞의 모든 결과를 행렬로 표현하면 다음과 같다.
    matrix[5] = tan(Math.PI * .5 - .5 * fovY)
    matrix[11] = -1
    clipY = cameraY * matrix[5] / cameraZ * matrix[11]
    
    matrix[0] = tan(Math.PI * .5 - .5 * fovY) /aspect
    clipX = cameraX * matrix[0] / cameraZ * matrix[11]
    rangeInv = 1 / (zNear - zFar)
    
    matrix[10] = (zFar + zNear) * rangeInv
    matrix[14] = 2 * zNear * zFar * rangeInv
    clipZ = (matrix[10] * cameraZ + matrix[14]) / (cameraZ * matrix[11])
      
  Ref:
    https://webglfundamentals.org/webgl/lessons/ko/webgl-3d-perspective.html
    https://stackoverflow.com/questions/28286057/trying-to-understand-the-math-behind-the-perspective-matrix-in-webgl/28301213#28301213
    https://unspecified.wordpress.com/2012/06/21/calculating-the-gluperspective-matrix-and-other-opengl-matrix-maths/
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
// addEventListener("resize", onResize);

const gui = new dat.GUI();
gui.close();
/////////////////////////////////////// Functions //////////////////////////////////////////////
/*
  원근감 위한 행렬
*/
function makeZToWMatrix(fudgeFactor) {
  /*
  z * fudgeFactor곱이 w로 사용되고 자동으로 나눠짐
  z 커진다는 의미는 멀어진다는 의미이다.
  커진 z로 xy을 나누면 작아진다. 즉 멀어질수록 물체가 작아진다.
  */
  // prettier-ignore
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, fudgeFactor,
    0, 0, 0, 1,
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
  let positionBuf = defineAttribute(gl, program, "a_position", 3); // in 3D,
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
    // fudgeFactor: 0.8,
    fov: 60,
    translationX: 0,
    translationY: 0,
    translationZ: -700,
    scalingX: 1,
    scalingY: 1,
    scalingZ: 1,
    rotationX: -70,
    rotationY: 0,
    rotationZ: -10
  };

  // uniform: matrix
  var matrixLoc = gl.getUniformLocation(program, "u_matrix");
  const radianInDeg = Math.PI / 180;
  // sequence is important!
  function applyMatrix() {
    // 원근감
    // var m = makeZToWMatrix(settings.fudgeFactor);

    // 프로젝션 함수: screen space -> clip space
    // let m = m4.projection(gl.canvas.width, gl.canvas.height, DEPTH);

    // // 직교투영 함수: 좀더 유연하게 사용 가능.
    // let left = 0;
    // let right = gl.canvas.width;
    // let top = 0;
    // let bottom = gl.canvas.height;
    // let near = DEPTH;
    // let far = -DEPTH;
    // m = m4.multiply(m, m4.orthographic(left, right, bottom, top, near, far));

    // 원근 투영: 클립공간변환+원근감+시야갹
    let aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    let zNear = 1;
    let zFar = 2000;
    let m = m4.perspective(settings.fov * radianInDeg, aspect, zNear, zFar);
    m = m4.translate(
      m,
      settings.translationX,
      settings.translationY,
      settings.translationZ
    );
    m = m4.xRotate(m, settings.rotationX * radianInDeg);
    m = m4.yRotate(m, settings.rotationY * radianInDeg);
    m = m4.zRotate(m, settings.rotationZ * radianInDeg);
    m = m4.scale(m, settings.scalingX, settings.scalingY, settings.scalingZ);

    gl.uniformMatrix4fv(matrixLoc, false, m);
  }
  applyMatrix();

  // 설정 UI
  // gui.add(settings, "fudgeFactor", -3, 3, 0.001).onChange(refresh);
  gui.add(settings, "fov", 0, 180, 0.1).onChange(refresh);
  gui.add(settings, "translationX", -WIDTH, WIDTH).onChange(refresh);
  gui.add(settings, "translationY", -HEIGHT, HEIGHT).onChange(refresh);
  gui.add(settings, "translationZ", -2000, 0).onChange(refresh);
  gui.add(settings, "scalingX", -5, 5).onChange(refresh);
  gui.add(settings, "scalingY", -5, 5).onChange(refresh);
  gui.add(settings, "scalingZ", -5, 5).onChange(refresh);
  gui.add(settings, "rotationX", -360, 360, 0.1).onChange(refresh);
  gui.add(settings, "rotationY", -360, 360, 0.1).onChange(refresh);
  gui.add(settings, "rotationZ", -360, 360, 0.1).onChange(refresh);

  // 사각형 버퍼
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuf);
  let cntTriangle = setBox(gl, -150, -100, -90, 300, 200, 180);

  // 색상 버퍼
  let colorData = [];
  // 사각형은 2개 삼각형으로 구성
  let gray = 100;
  for (let i = 0, n = cntTriangle; i < n; ++i, gray += 10) {
    let r = gray + 10;
    let g = gray;
    let b = gray;
    // 삼각형 3 정점에 색상 동일하게 지정
    for (let j = 0; j < 6; ++j) {
      colorData.push(r, g, b);
    }
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuf);
  // 데이터형에 맞게 Uint8Array로 변경,
  gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(colorData), gl.STATIC_DRAW);

  function refresh() {
    onResize();
    applyMatrix();

    // 화면 투명하기 삭제
    gl.clearColor(0, 0, 0, 0);
    // 색 및 깊이 버퍼 지움
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // in 3D,

    // 화면 출력
    gl.drawArrays(gl.TRIANGLES, 0, cntTriangle);
  }

  refresh();
})();
