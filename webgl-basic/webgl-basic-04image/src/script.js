/*
  image
  
  이미지를 처리하기 위해서는 texture을 사용해야 한다. webgl에서 주의할 부분은 이미지는 같은 도메인이라는 제약사항이 있다.
  텍스처는 프레그먼트 셰이더에서 주로 사용되는 데이터로 직접 값을 전달한다. 물론 먼저 데이터를 텍스처로 로딩하고 해당 텍스처를 
  global state의 텍스처 유닛에 지정하고 이를 program의 해당 유닛을 지정하면 된다.
  그러면 프레그먼트 셰이더에서 sampler2D에 의해 지정된 유닛에 있는 텍스처를 가져와서 처리하게 된다.
    uniform sampler2D u_image;
    
  u_image에서는 텍스처가 저장되지 않고 유닛 인덱스가 저장되어 있다.
  그리고 실제 텍스처 픽셀 색상 정보를 가져오기 위해서는 texture2D()를 사용해서 가져온다.
    texture2D(u_image, {clip space position})
    
  텍스처를 사용할 때 추가 정보로 텍스처 좌표 정보이다. 이 정보를 이용해서 이미지에서 출력할 영역을 판단하게 된다.
  
  kernel을 사용해서 이미지에 컨볼루션 연산으로 필터 효과를 적용할 수 있다.
    vec4 colorSum =
      texture2D(u_image, v_texCoord + u_pixelSize * vec2(-1, -1)) * u_kernel[0] +
      texture2D(u_image, v_texCoord + u_pixelSize * vec2( 0, -1)) * u_kernel[1] +
      texture2D(u_image, v_texCoord + u_pixelSize * vec2( 1, -1)) * u_kernel[2] +
      texture2D(u_image, v_texCoord + u_pixelSize * vec2(-1,  0)) * u_kernel[3] +
      texture2D(u_image, v_texCoord + u_pixelSize * vec2( 0,  0)) * u_kernel[4] +
      texture2D(u_image, v_texCoord + u_pixelSize * vec2( 1,  0)) * u_kernel[5] +
      texture2D(u_image, v_texCoord + u_pixelSize * vec2(-1,  1)) * u_kernel[6] +
      texture2D(u_image, v_texCoord + u_pixelSize * vec2( 0,  1)) * u_kernel[7] +
      texture2D(u_image, v_texCoord + u_pixelSize * vec2( 1,  1)) * u_kernel[8] ;
  
  v_texCoord은 현재 정점 기준으로 텍스처 위치값이고 u_pixelSize은 픽셀 단위당 clip space의 크기를 의미하며 vec(-1,-1)을 곱함으로써 x축으로 -1 픽셀, y축으로 -1 픽셀에 해당하는 clip space 좌표로 변환된다. 즉, 3 x 3크기 필터영역으로 컨볼루션 연산을 한다.
  
  Ref:
    Ref: https://webglfundamentals.org/webgl/lessons/ko/webgl-image-processing.html
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

const imgSrc =
  "https://images.unsplash.com/photo-1612144431180-2d672779556c?crop=entropy&cs=srgb&fm=jpg&ixid=MnwzMjM4NDZ8MHwxfHJhbmRvbXx8fHx8fHx8fDE2ODI3ODU3OTk&ixlib=rb-4.0.3&q=85&w=400";
var img = new Image();
img.onload = function () {
  main();
};

fetch(imgSrc)
  .then((res) => res.blob())
  .then((blob) => (img.src = URL.createObjectURL(blob)));

const kernels = {
  normal: [0, 0, 0, 0, 1, 0, 0, 0, 0],
  gaussianBlur: [0.045, 0.122, 0.045, 0.122, 0.332, 0.122, 0.045, 0.122, 0.045],
  gaussianBlur2: [1, 2, 1, 2, 4, 2, 1, 2, 1],
  gaussianBlur3: [0, 1, 0, 1, 1, 1, 0, 1, 0],
  unsharpen: [-1, -1, -1, -1, 9, -1, -1, -1, -1],
  sharpness: [0, -1, 0, -1, 5, -1, 0, -1, 0],
  sharpen: [-1, -1, -1, -1, 16, -1, -1, -1, -1],
  edgeDetect: [
    -0.125,
    -0.125,
    -0.125,
    -0.125,
    1,
    -0.125,
    -0.125,
    -0.125,
    -0.125
  ],
  edgeDetect2: [-1, -1, -1, -1, 8, -1, -1, -1, -1],
  edgeDetect3: [-5, 0, 0, 0, 0, 0, 0, 0, 5],
  edgeDetect4: [-1, -1, -1, 0, 0, 0, 1, 1, 1],
  edgeDetect5: [-1, -1, -1, 2, 2, 2, -1, -1, -1],
  edgeDetect6: [-5, -5, -5, -5, 39, -5, -5, -5, -5],
  sobelHorizontal: [1, 2, 1, 0, 0, 0, -1, -2, -1],
  sobelVertical: [1, 0, -1, 2, 0, -2, 1, 0, -1],
  previtHorizontal: [1, 1, 1, 0, 0, 0, -1, -1, -1],
  previtVertical: [1, 0, -1, 1, 0, -1, 1, 0, -1],
  boxBlur: [0.111, 0.111, 0.111, 0.111, 0.111, 0.111, 0.111, 0.111, 0.111],
  triangleBlur: [
    0.0625,
    0.125,
    0.0625,
    0.125,
    0.25,
    0.125,
    0.0625,
    0.125,
    0.0625
  ],
  emboss: [-2, -1, 0, -1, 1, 1, 0, 1, 2]
};
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
function main() {
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

  // attribute: texCoord
  // 이미지의 텍스처 좌표는 이미지에 상관없이 0~1이 된다.
  defineAttribute(gl, program, "a_texCoord", 2);
  setRectangle(gl, 0, 0, 1, 1);

  // attribute: position
  // 이미지가 그려질 사각형 크기로 이미지가 사각형에 맞게 리사이즈된다.
  defineAttribute(gl, program, "a_position", 2);
  setRectangle(gl, 0, 0, img.width, img.height);

  // uniform: resolution
  let resolutionLoc = gl.getUniformLocation(program, "u_resolution");
  gl.uniform2f(resolutionLoc, gl.canvas.width, gl.canvas.height);

  // uniform: pixelSize - 1픽셀이 텍스처 좌표에서 상대 크기 계산
  let pixelSizeLoc = gl.getUniformLocation(program, "u_pixelSize");
  gl.uniform2f(pixelSizeLoc, 1.0 / img.width, 1.0 / img.height);

  // uniform: kernel - 이미지 컨볼루션 커널
  let kernel = kernels.normal;
  let kernelLoc = gl.getUniformLocation(program, "u_kernel[0]");
  gl.uniform1fv(kernelLoc, kernel);

  // uniform: kernelWeight - 커널 가중치
  function computeKernelWeight(kernel) {
    var weight = kernel.reduce(function (prev, curr) {
      return prev + curr;
    });
    return weight <= 0 ? 1 : weight;
  }

  let kernelWeightLoc = gl.getUniformLocation(program, "u_kernelWeight");
  gl.uniform1f(kernelWeightLoc, computeKernelWeight(kernel));

  // uniform: flip
  let flipLoc = gl.getUniformLocation(program, "u_flip");
  gl.uniform2f(flipLoc, 1, -1); // WebGL에서 좌측하단이 0,0에 해당하기에 상하 플립

  // uniform: image - 텍스처 이미지 유닛 별도 설정하지 않음. 미설정시 기본 0으로 사용.

  // kernel 설정
  let settings = { kernel: "normal" };
  gui.add(settings, "kernel", Object.keys(kernels)).onChange(() => {
    let kernel = kernels[settings.kernel];
    gl.uniform1fv(kernelLoc, kernel);
    gl.uniform1f(kernelWeightLoc, computeKernelWeight(kernel));
    render();
  });

  // 텍스처: u_image
  let texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture); // 텍스처 유닛에 바인딩

  // 이미지 랜더링 설정
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  // 이미지 로딩
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

  function render() {
    // 화면 투명 삭제
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // 화면 출력
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  render();
}
