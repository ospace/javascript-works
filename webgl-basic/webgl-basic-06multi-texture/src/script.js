/*
  multi-texture
  
  이미지를 여러개 가져와서 출력하는 방법은 단순한다. 텍스처를 여러개 생성해서 불러온 이미지를 할당한다.
  유닛 번호에 해당하는 위치에 텍스처를 지정하고 sampler2D 형식 uniform에서 유닛 번호를 설정하면 된다.
  이미지 합성은 multiply을 사용했다.
    vec4 color0 = texture2D(u_image0, v_texCoord);    
    vec4 color1 = texture2D(u_image1, v_texCoord);    
    gl_FragColor = color0 * color1;
  
  Ref:
    https://webglfundamentals.org/webgl/lessons/ko/webgl-2-textures.html
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

// 여러 이미지 정보!!
const imgSrcs = [
  "https://images.unsplash.com/photo-1612144431180-2d672779556c?crop=entropy&cs=srgb&fm=jpg&ixid=MnwzMjM4NDZ8MHwxfHJhbmRvbXx8fHx8fHx8fDE2ODI3ODU3OTk&ixlib=rb-4.0.3&q=85&w=400",
  "https://images.unsplash.com/photo-1680223859084-af359d5cda4f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwzMjM4NDZ8MHwxfHJhbmRvbXx8fHx8fHx8fDE2ODI4NjQ2Mzc&ixlib=rb-4.0.3&q=80&w=400"
];

var imgs = loadImages(imgSrcs, main);

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

// 텍스처 생성
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

function loadImages(srcs, callback) {
  let countdown = srcs.length;

  let imgs = srcs.map((it) =>
    loadImage(it, function () {
      if (0 == --countdown) callback(imgs);
    })
  );

  return imgs;
}

function loadImage(src, callback) {
  var img = new Image();
  img.onload = callback;

  fetch(src)
    .then((res) => res.blob())
    .then((blob) => (img.src = URL.createObjectURL(blob)));

  return img;
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
  setRectangle(gl, 0, 0, imgs[0].width, imgs[0].height);

  // uniform: resolution
  let resolutionLoc = gl.getUniformLocation(program, "u_resolution");
  gl.uniform2f(resolutionLoc, WIDTH, HEIGHT);

  // uniform: flip
  let flipLoc = gl.getUniformLocation(program, "u_flip");
  gl.uniform2f(flipLoc, 1, -1); // 최종 화면 출력에서 상하 플립

  // 텍스처: u_image
  imgs.map((it, i) => {
    let tex = defineTexture(gl, program, "u_image" + i, i);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, it);
    return tex;
  });

  function render() {
    gl.drawArrays(gl.TRIANGLES, 0, 6); //사각형 화면 출력
  }

  render();
}
