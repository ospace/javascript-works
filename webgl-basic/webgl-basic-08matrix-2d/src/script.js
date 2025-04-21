/*
  # matrix - 이동, 회전, 스케일
  
  이번에는 정점 셰이더에서 했던 작업을 자바스크립트에서 모두 계산해서 넣어주는 방식이다. 그러면 정점 셰이더 코드가 단순해진다.
  물론 자바스크립트 코드는 조금 복잡해진다.
  행렬이라 갑자기 무서울 수 있지만, 생각보다 간단하게 적용할 수 있다. 주의할 부분은 순서이다. 물론 의도를 가진고 순서를 바꿀 수 있다.
  
  회전rotate 인 경우 행렬이다.
    |c   -s  0.0|
    |s   c   0.0|
    |0.0 0.0 1.0|
    
  여기서 s = sin(angle), c = cos(angle)이다. 아래 처럼 회전 행렬이 계산된다.
              |c,-s, 0|
    |x,y,1| * |s, c, 0| = [x*c+y*s,-x*s+y*c,1]
              |0, 0, 1|

  회전 행렬이 조금 복잡하다. 이는 삼각함수에서 점 위치 이동과 관련되어 있다. 점의 회전변환을 검색해보면 된다.

  스케일scale인 경우 행렬이다.
    |sx  0.0 0.0|
    |0.0 sy  0.0|
    |0.0 0.0 1.0|

  아래 처럼 스케일 행렬이 계산된다.    
              |sx,0, 0|
    |x,y,1| * |0, sy,0| = [x*sx,y*sy,1]
              |0, 0, 1|
                
  x와 y에 각각 sx와 sy가 곱해진다. 그만큼 커지거나 작아지게 된다.

  이동transpose 인 경우 행렬이다.
    |1.0 0.0 0.0|
    |0.0 1.0 0.0|
    |tx  ty  1.0|
    
  아래 처럼 이동 행렬이 계산된다.
              |1, 0, 0|
    |x,y,1| * |0, 1, 0| = [x+tx,y+ty,1]
              |tx,ty,1|
    
  결국 x와 y에 각각 tx와 ty만큼 더해져서 위치가 변경된다.
  
  그리고 프로젝션 행렬을 이용해 화면 스케일을 clip space 스케일로 변환한다.
    |2/width,        0, 0|
    |      0,-2/height, 0|
    |      -1,       1, 1]
    
  이를 계산하면 다음과 같다.
              |2/width,        0,0|
    |x,y,1| * |      0,-2/height,0| = |x*2/width-1,-y*2/width+1,1|
              |     -1,        1,1|

  앞에서 nomalize 결과와 동일하다.
  단, 화면는 아래 방향이 +방향이지만 clip space에서 위 방향이 +방향으로 서로 반대이므로 y요소에 -을 곱해주었다.
    
  Ref:
    https://webglfundamentals.org/webgl/lessons/ko/webgl-2d-matrices.html
    https://webglfundamentals.org/webgl/lessons/resources/webgl-state-diagram.html
    
  GLSL spec: https://www.khronos.org/files/opengles_shading_language.pdf
  Linear algebra: https://www.youtube.com/watch?v=kjBOesZCoqc&list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab
 */
///////////////////////////////////////////////// enviroments //////////////////////////////////////
function onResize() {
  c.width = document.body.clientWidth;
  c.height = document.body.clientHeight;
}
onResize();
addEventListener("resize", onResize);

const gui = new dat.GUI();

/////////////////////////////////////////////// Functions ////////////////////////////////////////////

// soruce: https://gist.github.com/jannunzi/12a05b10efcbf59dbbf2c700a067be37
const m3 = {
  projection: function (width, height) {
    // Note: This matrix flips the Y axis so that 0 is at the top.
    return [2 / width, 0, 0, 0, -2 / height, 0, -1, 1, 1];
  },

  identity: function () {
    return [1, 0, 0, 0, 1, 0, 0, 0, 1];
  },

  translation: function (tx, ty) {
    return [1, 0, 0, 0, 1, 0, tx, ty, 1];
  },

  rotation: function (angleInRadians) {
    var c = Math.cos(angleInRadians);
    var s = Math.sin(angleInRadians);
    return [c, -s, 0, s, c, 0, 0, 0, 1];
  },

  scaling: function (sx, sy) {
    return [sx, 0, 0, 0, sy, 0, 0, 0, 1];
  },

  multiply: function (a, b) {
    var a00 = a[0 * 3 + 0];
    var a01 = a[0 * 3 + 1];
    var a02 = a[0 * 3 + 2];
    var a10 = a[1 * 3 + 0];
    var a11 = a[1 * 3 + 1];
    var a12 = a[1 * 3 + 2];
    var a20 = a[2 * 3 + 0];
    var a21 = a[2 * 3 + 1];
    var a22 = a[2 * 3 + 2];
    var b00 = b[0 * 3 + 0];
    var b01 = b[0 * 3 + 1];
    var b02 = b[0 * 3 + 2];
    var b10 = b[1 * 3 + 0];
    var b11 = b[1 * 3 + 1];
    var b12 = b[1 * 3 + 2];
    var b20 = b[2 * 3 + 0];
    var b21 = b[2 * 3 + 1];
    var b22 = b[2 * 3 + 2];
    return [
      b00 * a00 + b01 * a10 + b02 * a20,
      b00 * a01 + b01 * a11 + b02 * a21,
      b00 * a02 + b01 * a12 + b02 * a22,
      b10 * a00 + b11 * a10 + b12 * a20,
      b10 * a01 + b11 * a11 + b12 * a21,
      b10 * a02 + b11 * a12 + b12 * a22,
      b20 * a00 + b21 * a10 + b22 * a20,
      b20 * a01 + b21 * a11 + b22 * a21,
      b20 * a02 + b21 * a12 + b22 * a22
    ];
  },

  translate: function (m, tx, ty) {
    return m3.multiply(m, m3.translation(tx, ty));
  },

  rotate: function (m, angleInRadians) {
    return m3.multiply(m, m3.rotation(angleInRadians));
  },

  scale: function (m, sx, sy) {
    return m3.multiply(m, m3.scaling(sx, sy));
  }
};

// 사각형 생성 함수
function setRectangle(gl, x, y, width, height) {
  let [x1, y1, x2, y2] = [x, y, x + width, y + height];
  let positions = [x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2];

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW); // 데이터 저장
}

// name: attribute 이름
// size: 반복 개수
// normalized: 데이터 정규화
function defineAttribute(gl, program, name, size, normalized) {
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
  gl.vertexAttribPointer(loc, size, gl.FLOAT, normalized, 0, 0); // 데이터 속성

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

////////////////////////////////////////////////// WebGL ///////////////////////////////////////////////
(function main() {
  const gl = c.getContext("webgl");
  const WIDTH = gl.canvas.width;
  const HEIGHT = gl.canvas.height;

  const fragment = document.querySelector('script[type="x-shader/x-fragment"]');
  const vertex = document.querySelector('script[type="x-shader/x-vertex"]');

  // 프로그램으로 두 셰이더 연결
  const program = createProgram(gl, vertex.text, fragment.text);

  // clip space 영역 설정
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  // 프로그램 활성화
  gl.useProgram(program);

  // attribute: position
  let positionBuf = defineAttribute(gl, program, "a_position", 2);
  let colorBuf = defineAttribute(gl, program, "a_color", 4);

  /*
  uniform은 정점 셰이더에 직접 데이터를 전달되며 전역 변수 처럼 사용된다.
  유니폼은 개별 프로그램 별로 직접 설정된다.
*/
  let settings = {
    translationX: WIDTH * 0.5,
    translationY: HEIGHT * 0.5,
    scalingX: 1,
    scalingY: 1,
    rotation: 0
  };

  // uniform: matrix
  var matrixLoc = gl.getUniformLocation(program, "u_matrix");

  function applyMatrix() {
    // 순서 중요!
    // projection: screen space -> clip space
    let m = m3.projection(gl.canvas.width, gl.canvas.height);
    // 위치 이동
    m = m3.translate(m, settings.translationX, settings.translationY);
    // 회전
    m = m3.rotate(m, settings.rotation);
    // 스케일
    m = m3.scale(m, settings.scalingX, settings.scalingY);

    gl.uniformMatrix3fv(matrixLoc, false, m);
  }
  applyMatrix();

  // 설정 UI
  gui.add(settings, "translationX", -WIDTH, WIDTH).onChange(() => {
    // gl.uniform2f(translatingLoc, settings.translationX, settings.translationY);
    refresh();
  });
  gui.add(settings, "translationY", -HEIGHT, HEIGHT).onChange(() => {
    // gl.uniform2f(translatingLoc, settings.translationX, settings.translationY);
    refresh();
  });

  gui.add(settings, "scalingX", -5, 5).onChange(() => {
    // gl.uniform2f(scalingLoc, settings.scalingX, settings.scalingY);
    refresh();
  });
  gui.add(settings, "scalingY", -5, 5).onChange(() => {
    // gl.uniform2f(scalingLoc, settings.scalingX, settings.scalingY);
    refresh();
  });

  gui.add(settings, "rotation", -2 * Math.PI, 2 * Math.PI).onChange(() => {
    // let c = Math.cos(settings.rotation);
    // let s = Math.sin(settings.rotation);
    // gl.uniform2f(rotatingLoc, s, c);
    refresh();
  });

  // uniform: resolution
  var resolutionLoc = gl.getUniformLocation(program, "u_resolution");
  gl.uniform2f(resolutionLoc, gl.canvas.width, gl.canvas.height);

  // 사각형 버퍼
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuf);
  setRectangle(gl, -150, -100, 300, 200);

  // 색상 버퍼
  let colorData = [];
  // 사각형은 2개 삼각형으로 구성
  for (let i = 0; i < 2; ++i) {
    let r = Math.random();
    let g = Math.random();
    let b = Math.random();
    // 삼각형 3 정점에 색상 동일하게 지정
    for (let j = 0; j < 3; ++j) {
      colorData.push(r, g, b, 1);
    }
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colorData), gl.STATIC_DRAW);

  function refresh() {
    onResize();
    applyMatrix();
    // 화면 투명하기 삭제
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // 화면 출력
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  refresh();
})();
