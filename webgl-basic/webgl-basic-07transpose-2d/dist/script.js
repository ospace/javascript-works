/*
  # matrix - 이동, 회전, 스케일
  
  webgl에서는 물체 이동, 회전, 스케일을 바로 지원하지는 않는다. 정점 정보를 가지고 직접 조작해야 한다.
  정점 셰이더 코드가 복잡해지지만, 정점 셰이더에 이동, 회전, 스케일을 위치에 적용하는 코드를 작성해준다.
    vec2 position = a_position * u_scaling; // 스케일 적용
    position = vec2(position.x * u_rotation.y + position.y * u_rotation.x,
                    position.y * u_rotation.y - position.x * u_rotation.x); // 회전 적용
    position = position + u_translation; // 이동 적용
    
  스케일은 입력된 값을 곱해주고, 이동은 입력된 값을 더해준다. 회전은 점위 회전변환에 의한 계산식을 넣어준다.
  물론 자바스크립트 코드에서 입력할 때에 삼각함수가 계산된 값을 전달한다.
    let c = Math.cos(angle);
    let s = Math.sin(angle);
    gl.uniform2f(rotatingLoc, s, c);

  Ref:
    https://webglfundamentals.org/webgl/lessons/resources/webgl-state-diagram.html
    
  GLSL spec: https://www.khronos.org/files/opengles_shading_language.pdf
 */
///////////////////////////////////////////////// enviroments //////////////////////////////////////
function onResize() {
  c.width = document.body.clientWidth;
  c.height = document.body.clientHeight;
}
onResize();

const gui = new dat.GUI();

/////////////////////////////////////// Functions //////////////////////////////////////////////
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

  // uniform: translation
  var translatingLoc = gl.getUniformLocation(program, "u_translation");
  gl.uniform2f(translatingLoc, settings.translationX, settings.translationY);

  // 설정 UI
  gui.add(settings, "translationX", -WIDTH, WIDTH).onChange(() => {
    gl.uniform2f(translatingLoc, settings.translationX, settings.translationY);
    render();
  });
  gui.add(settings, "translationY", -HEIGHT, HEIGHT).onChange(() => {
    gl.uniform2f(translatingLoc, settings.translationX, settings.translationY);
    render();
  });

  // uniform: scale
  var scalingLoc = gl.getUniformLocation(program, "u_scaling");
  gl.uniform2f(scalingLoc, settings.scalingX, settings.scalingY);

  // 설정 UI
  gui.add(settings, "scalingX", 0, 10).onChange(() => {
    gl.uniform2f(scalingLoc, settings.scalingX, settings.scalingY);
    render();
  });
  gui.add(settings, "scalingY", 0, 10).onChange(() => {
    gl.uniform2f(scalingLoc, settings.scalingX, settings.scalingY);
    render();
  });

  // uniform: rotate
  var rotatingLoc = gl.getUniformLocation(program, "u_rotation");
  gl.uniform2f(rotatingLoc, 0, 1);

  // 설정 UI
  gui.add(settings, "rotation", -2 * Math.PI, 2 * Math.PI).onChange(() => {
    let c = Math.cos(settings.rotation);
    let s = Math.sin(settings.rotation);
    gl.uniform2f(rotatingLoc, s, c);
    render();
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

  function render() {
    onResize();
    // 화면 투명하기 삭제
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // 화면 출력
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  render();
})();