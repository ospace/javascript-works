/*
  attribute
  
  정점 셰이더와 프레그먼트 셰이드 구성된다. 두 셰이더를 생성하고 프로그램으로 두 셰이더는 연결한다. 프로그램에는 GPU을 구동할때 사용할 데이터 정보를 관리한다.
  attribute은 GPU로 데이터를 전달하는 방법으로 attribute은 버퍼를 사용해서 정점 셰이더로 데이터를 전달하는 방법이다.
  버퍼는 데이터 배열형태로 사용되므로 랜덤하게 접근은 안되며 순차적으로 실행된다. 그렇기에 프레그먼트 셰이드로 데이터를 넘겨주기 위해서는 varying을 사용해야 한다.
  uniform은 개별 프로그램 별로 직접 설정된다. 프로그램이 활성화되어 있지 않아도 설정 가능하다.
    
  그려릴 영역이 clip space로 이 영역 안에서 화면으로 출력된다. 추후에도 보겠지만 다른 값 범위를 모두 clip space 영역 안으로 변환해야 한다. viewport()에 의해서 설정된 화면 영역이 clip space 영역으로 사용된다.
  - x: -1 ~ +1
  - y: -1 ~ +1
  
  Ref:
    https://webglfundamentals.org/webgl/lessons/ko/webgl-fundamentals.html
    https://webglfundamentals.org/webgl/lessons/resources/webgl-state-diagram.html
 */
///////////////////////////////////////////////// enviroments /////////////////////////////////////////
function onResize() {
  c.width = document.body.clientWidth;
  c.height = document.body.clientHeight;
}
onResize();
addEventListener("resize", onResize);

/////////////////////////////////////// Functions //////////////////////////////////////////////
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

function createProgram(gl, vertexShader, fragmentShader) {
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

  const fragment = document.querySelector('script[type="x-shader/x-fragment"]');
  const vertex = document.querySelector('script[type="x-shader/x-vertex"]');

  // 두 셰이셔 생성
  const vShader = createShader(gl, gl.VERTEX_SHADER, vertex.text);
  const fShader = createShader(gl, gl.FRAGMENT_SHADER, fragment.text);

  // 프로그램으로 두 셰이더 연결
  const program = createProgram(gl, vShader, fShader);

  // 캔버스 크기 설정
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  // 화면 투명하기 삭제
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // 프로그램 활성화
  gl.useProgram(program);

  // attribute: position
  let positionSize = 2;
  let positionData = [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]; // 2쌍씩 6셋

  let loc = gl.getAttribLocation(program, "a_position"); // 속성 위치 정보
  if (0 > loc) {
    throw new Error(name + " attribute is not found!!");
  }

  gl.enableVertexAttribArray(loc);

  // 버퍼 생성하고 ARRYA_BUFFER에 바인딩
  let buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  // vertex array에서 해당 attribute 활성화
  gl.enableVertexAttribArray(loc);
  // vertex array에 속성 설정
  gl.vertexAttribPointer(loc, positionSize, gl.FLOAT, false, 0, 0);

  // 데이터 저장
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(positionData),
    gl.STATIC_DRAW
  );

  // 랜더링: 3 정점(x,y,z) 셰이더
  gl.drawArrays(gl.TRIANGLES, 0, 6);
})();