/*
  framebuffer
  
  framebuffer은 버퍼 저장소 역할로 랜더 결과를 임시로 저장해서 다른 랜더에서 사용할 수 있게 한다.
  사용하는 framebuffer 종류는 색상, 깊이, 스텐실이 있다. 여기서는 색상에 대해서 다룬다.
  framebuffer을 사용해 필터 효과를 중복해서 적용해보자. framebuffer은 어태치먼트 목록으로 상태 모음이다. 텍스처를 framebuffer에 첨부해서 framebuffer을 활성화하면 앞으로 렌더링 작업은 첨부된 texture에 저장된다. 
    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    let fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  
  텍스처를 생성하고 바인드하고 그리고 텍스처에 대한 정보를 설정한다. 그리고 framebuffer을 생성하고 바인드한다. 그리고 framebuffer 텍스처 설정에 앞에 생성한 텍스처를 사용한다.
  중복 해서 필터 효과를 적용하기 위해서는 framebuffer을 두개 생성해서 서로 입력과 출력을 번갈아가면서 처리하면 된다.
  
  Ref:
    Ref: https://webglfundamentals.org/webgl/lessons/ko/webgl-image-processing-continued.html
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

// prettier-ignore
const kernels = {
  normal: [0, 0, 0, 0, 1, 0, 0, 0, 0],
  gaussianBlur: [0.045, 0.122, 0.045, 0.122, 0.332, 0.122, 0.045, 0.122, 0.045],
  gaussianBlur2: [1, 2, 1, 2, 4, 2, 1, 2, 1],
  gaussianBlur3: [0, 1, 0, 1, 1, 1, 0, 1, 0],
  unsharpen: [-1, -1, -1, -1, 9, -1, -1, -1, -1],
  sharpness: [0, -1, 0, -1, 5, -1, 0, -1, 0],
  sharpen: [-1, -1, -1, -1, 16, -1, -1, -1, -1],
  edgeDetect: [-0.125, -0.125, -0.125, -0.125, 1, -0.125, -0.125, -0.125, -0.125],
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
  triangleBlur: [0.0625, 0.125, 0.0625, 0.125, 0.25, 0.125, 0.0625, 0.125, 0.0625],
  emboss: [-2, -1, 0, -1, 1, 1, 0, 1, 2]
};

/////////////////////////////////////// Functions //////////////////////////////////////////////
// 사각형 생성 함수
function setRectangle(gl, x, y, width, height) {
  let [x1, y1, x2, y2] = [x, y, x + width, y + height];
  let positions = [x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2];

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW); // 데이터 저장
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
    throw new Error(`${name} texture is not found!!`);
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
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  return texture;
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
  // gl.uniform2f(resolutionLoc, WIDTH, HEIGHT);

  // uniform: pixelSize - 1픽셀이 텍스처 좌표에서 상대 크기 계산
  let pixelSizeLoc = gl.getUniformLocation(program, "u_pixelSize");
  gl.uniform2f(pixelSizeLoc, 1.0 / img.width, 1.0 / img.height);

  // uniform: kernel - 이미지 컨볼루션 커널
  let kernelLoc = gl.getUniformLocation(program, "u_kernel[0]");
  // let kernel = kernels.normal;
  // gl.uniform1fv(kernelLoc, kernel);

  // uniform: flip
  let flipLoc = gl.getUniformLocation(program, "u_flip");

  // uniform: kernelWeight - 커널 가중치
  function computeKernelWeight(kernel) {
    var weight = kernel.reduce(function (prev, curr) {
      return prev + curr;
    });
    return weight <= 0 ? 1 : weight;
  }

  let kernelWeightLoc = gl.getUniformLocation(program, "u_kernelWeight");
  // gl.uniform1f(kernelWeightLoc, computeKernelWeight(kernel));

  // kernel 설정
  let settings = {};
  Object.keys(kernels).forEach((it) => {
    if ("normal" === it) return;
    settings[it] = false;
    gui.add(settings, it).onChange(render);
  });

  // 텍스처: u_image
  let orgTexture = defineTexture(gl, program, "u_image");
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

  /*
   텍스처 2개로 입력과 출력으로 사용해서 반복적으로 효과를 적용한다.
     원본 이미지 -> [Blur] -> 텍스처1 -> [Shapen] -> 텍스처2 -> [Normal] -> 캔버스
     
   이를 위해 프레임 버퍼 사용한다. 프레임 버퍼는 실제 버퍼 역활보다는 첨부 목록을 관리한다.
   출력용 텍스처를 첨부하고 랜더링하면 결과가 출력용 텍스처에 저장된다.
  */
  // 텍스처와 프레임 쌍으로 구성해서 2개 생성: [프레임버퍼] -> 출력텍스처
  let textures = [];
  let framebuffers = [];
  for (let i = 0; i < 2; ++i) {
    // 이미지 크기과 같은 출력용 빈 텍스처 생성
    let texture = createTexture(gl);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      img.width,
      img.height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null
    );
    textures.push(texture);

    // 프레임버퍼 생성
    var fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    // 텍스처를 프레임버퍼에 첨부
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      texture,
      0
    );

    framebuffers.push(fb);
  }

  function render() {
    // 프레임버퍼에서는 플립이 필요 없음
    gl.uniform2f(flipLoc, 1, 1);

    // 원본이미지 바인딩하여 초기 입력 텍스처 사용
    gl.bindTexture(gl.TEXTURE_2D, orgTexture);

    let idxFramebuffer = 0;
    for (let it in settings) {
      if (!settings[it]) continue;
      // 선택된 효과를 현재 프레임 버퍼에서 랜더링하고 출력 텍스처를 다시 입력 텍스처로 바인딩
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[idxFramebuffer % 2]); // 랜더링할 프레임버퍼 바인딩
      gl.uniform2f(resolutionLoc, img.width, img.height); // 이미지 해상도 설정
      gl.viewport(0, 0, img.width, img.height); // 뷰포트 설정

      let kernel = kernels[it];
      gl.uniform1fv(kernelLoc, kernel); // 커널 설정
      gl.uniform1f(kernelWeightLoc, computeKernelWeight(kernel));
      gl.drawArrays(gl.TRIANGLES, 0, 6); //사각형 화면 출력

      gl.bindTexture(gl.TEXTURE_2D, textures[idxFramebuffer % 2]); // 다음 입력 텍스처 바인딩

      ++idxFramebuffer;
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null); // 캔버스(화면)로 랜더링
    gl.uniform2f(resolutionLoc, WIDTH, HEIGHT); // 캔버스 해상도 설정
    gl.viewport(0, 0, WIDTH, HEIGHT); // 뷰포트 설정

    // 마지막 출력 텍스처를 그대로 화면으로 출력
    gl.uniform1fv(kernelLoc, kernels["normal"]); // 커널 설정
    gl.uniform1f(kernelWeightLoc, computeKernelWeight(kernels["normal"]));
    gl.uniform2f(flipLoc, 1, -1); // 최종 화면 출력에서 상하 플립
    gl.drawArrays(gl.TRIANGLES, 0, 6); //사각형 화면 출력
  }

  render();
}
