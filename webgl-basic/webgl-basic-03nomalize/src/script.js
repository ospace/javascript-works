/*
  nomalize
  
  attribute은 정점 셰이더로 데이터를 전달하다. 만약 프레그먼트 셰이더에서도 사용하려면 varying을 사용해서 정점 셰이더에서 전달해줘야 한다. 방법은 정점 셰이더와 프레그먼트 쉐이더에 동일한 이름의 varying을 정의해서 정점 셰이더에서 값을 할당해주면 된다.
  
  정점 셰이더에 현재 해상도를 넘기면 저장되 정점 정보(position)으로 나누면 정규화가 되어 0~1 값을 갖게 된다. 이를 clip space 영역인 -1~1 영역으로 변환하면 된다.
    vec2 nomalize = (a_position+u_offset) / u_resolution;
    vec2 clipSpace = nomalize * 2.0 - 1.0;

  u_offset에 의해서 그려질 위치를 지정할 수 있다.
  
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
addEventListener("resize", onResize);

const gui = new dat.GUI();

/////////////////////////////////////// Functions //////////////////////////////////////////////
// 사각형 생성 함수
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

  // 캔버스 크기 설정 (clip space => pixel space)
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
  // uniform: offset
  let offset = { x: 0, y: 0 };
  var offsetLoc = gl.getUniformLocation(program, "u_offset");
  gl.uniform2f(offsetLoc, offset.x, offset.y);

  gui.add(offset, "x", -WIDTH, WIDTH).onChange(() => {
    gl.uniform2f(offsetLoc, offset.x, offset.y);
    refresh();
  });
  gui.add(offset, "y", -HEIGHT, HEIGHT).onChange(() => {
    gl.uniform2f(offsetLoc, offset.x, offset.y);
    refresh();
  });

  // uniform: resolution
  var resolutionLoc = gl.getUniformLocation(program, "u_resolution");
  gl.uniform2f(resolutionLoc, gl.canvas.width, gl.canvas.height);

  // 사각형 버퍼
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuf);
  setRectangle(gl, Math.random() * WIDTH, Math.random() * HEIGHT, 300, 200);

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
    // 화면 투명하기 삭제
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // 화면 출력
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  refresh();
})();
