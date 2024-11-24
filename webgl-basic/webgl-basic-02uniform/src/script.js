/*
  # uniform
  
  uniform은 프로그램에서 설정되며 두 쉐이더에 직접 값을 전달된다. uniform은 전역변수 처럼 사용된다. uniform을 통해 텍스처 정보를 전달한다.
  uniform은 개별 프로그램 별로 직접 설정된다. 프로그램을 먼저 활성화하고 설정해야 한다.
  
  아키텍처 적으로 global state로 전역 상태를 관리하는 부분으로 이를 통해서 각 프로그램과 셰이더에 상호작용을 하게 된다. 모든 작업은 global state에 올려놓고 작업을 진행하게 된다. 그리고 프로그램에 의해서 셰이더와 global state에 의해서 구성된 설정을 관리한다. attribute에 구성된 세부 정보는 추가로 vertex 배열에 저장되어서 관리된다. 실제 데이터는 버퍼와 텍스처에 저장된다.
  
  Ref:
    https://webglfundamentals.org/webgl/lessons/ko/webgl-fundamentals.html
    https://webglfundamentals.org/webgl/lessons/resources/webgl-state-diagram.html
    
  GLSL spec: https://www.khronos.org/files/opengles_shading_language.pdf
 */

///////////////////////////////////////////////// enviroments //////////////////////////////////////
function onResize() {
  c.width = document.body.clientWidth;
  c.height = document.body.clientHeight;
}
onResize();
// addEventListener("resize", onResize);

/////////////////////////////////////// Functions //////////////////////////////////////////////
// 사각형 생성 함수!!
function setRectangle(gl, x, y, width, height) {
  let [x1, y1, x2, y2] = [x, y, x + width, y + height];
  let positions = [x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2];

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW); // 데이터 저장
}

/* attribute 정의
 파라미터
 - name: attribute 이름
 - size: 반복 개수
 - normalized: 데이터 정규화
 */
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

  // 캔버스 크기 설정
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  // 화면 투명하기 삭제
  gl.clearColor(0, 0, 0, 0); // 삭제 색 지정
  gl.clear(gl.COLOR_BUFFER_BIT); // 화면 삭제

  // 프로그램 활성화
  gl.useProgram(program);

  // attribute: position
  defineAttribute(gl, program, "a_position", 2);

  // uniform: resolution
  var resolutionLoc = gl.getUniformLocation(program, "u_resolution");
  gl.uniform2f(resolutionLoc, gl.canvas.width, gl.canvas.height);

  // uniform: color
  var colorLoc = gl.getUniformLocation(program, "u_color");

  // 랜더링: 3 정점(x,y,z) 셰이더
  for (let i = 0; i < 30; ++i) {
    setRectangle(
      gl,
      Math.random() * (WIDTH - 100),
      Math.random() * (HEIGHT - 100),
      Math.random() * (WIDTH - 100),
      Math.random() * (HEIGHT - 100)
    );

    // u_color 설정
    gl.uniform4f(colorLoc, Math.random(), Math.random(), Math.random(), 1);

    // 화면 출력
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
})();
