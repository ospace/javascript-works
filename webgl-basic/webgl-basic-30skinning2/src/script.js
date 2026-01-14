/*
  # skinning2


  Ref:
    1. https://webglfundamentals.org/webgl/lessons/ko/webgl-skinning.html
    2. https://webglfundamentals.org/webgl/lessons/resources/webgl-state-diagram.html
    3. https://www.khronos.org/files/gltf20-reference-guide.pdf
    4. https://ospace.tistory.com/870

    GLSL spec: https://www.khronos.org/files/opengles_shading_language.pdf
    Linear algebra: https://www.youtube.com/watch?v=kjBOesZCoqc&list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab
    https://github.com/benvanik/WebGL-Inspector
*/
///////////////////////////// enviroments ///////////////////////////////
const RADIAN_IN_DEG = Math.PI / 180;
const uriGltf =
  "https://webglfundamentals.org/webgl/resources/models/killer_whale/whale.CYCLES.gltf";
const target = [0, 0, -10];
const up = [0, 1, 0];
const DEPTH = 2000;
const RANGE = 10;
const nBones = 4;
const MAT_SIZE = 16;

let _cnt = 0;

let settings = {
  cameraAngle: 25, // 60
  cameraX: 10,
  cameraY: 0,
  cameraZ: -5,
  fov: 60,
  cameraNear: 1,
  cameraFar: 2000,
  translationX: 0,
  translationY: 0,
  translationZ: 0,
  rotationX: 0,
  rotationY: 0,
  rotationZ: 0
};

let gltf;
let scenes;
let skins;
let g;

function onResize() {
  const { clientWidth, clientHeight } = document.body;
  if (c.width == clientWidth && c.height == clientHeight) return false;

  c.width = clientWidth;
  c.height = clientHeight;

  return true;
}

// onResize();
// addEventListener("resize", onResize);
//////////////////////////////// Functions ///////////////////////////////
function clone(obj, attrs) {
  let ret = Object.create(obj);
  return attrs ? Object.assign(ret, attrs) : ret;
}

function noOp() {}

const OSpace = Object.freeze(
  clone(null, {
    clone: function (attrs) {
      return clone(this, attrs);
    },
    str: function (replacer, space) {
      return JSON.stringify(this, replacer, space);
    }
  })
);

function toStr(a, fixed = 1) {
  return (
    "[" +
    Array.prototype.map
      .call(a, (it) =>
        Array.isArray(it) || ArrayBuffer.isView(it)
          ? toStr(it, fixed)
          : undefined != it
          ? it.toFixed(fixed)
          : "-"
      )
      .join() +
    "]"
  );
}

function infoOfWebgl(gl) {
  if (!gl) {
    return console.warn("gl is", gl);
  }
  let ret = [];

  const webgl = {
    webgl1: {
      ALIASED_POINT_SIZE_RANGE: "정점 크기 범위[최소,최대]",
      MAX_VERTEX_ATTRIBS: "최대 속성 개수",
      MAX_VERTEX_UNIFORM_VECTORS: "정점 셰이더 최대 vec4 유니폼 개수",
      MAX_VARYING_VECTORS: "최대 베링 개수",
      MAX_COMBINED_TEXTURE_IMAGE_UNITS: "최대 존재하는 텍스처 유닛 개수",
      MAX_VERTEX_TEXTURE_IMAGE_UNITS: "정점 셰이더 최대 텍스처 유닛 개수",
      MAX_TEXTURE_IMAGE_UNITS: "프래그먼트 셰이더 최대 텍스처 유닛 개수",
      MAX_FRAGMENT_UNIFORM_VECTORS: "프래그먼트 셰이더 최대 vec4 유니폼 개수",
      MAX_CUBE_MAP_TEXTURE_SIZE: "큐브맵 최대 크기",
      MAX_RENDERBUFFER_SIZE: "렌더 버퍼 최대 크기",
      MAX_VIEWPORT_DIMS: "뷰포트 최대 크기"
    },
    webgl2: {
      MAX_3D_TEXTURE_SIZE: "3D 텍스처 최대 크기",
      MAX_DRAW_BUFFERS: "최대 색상 어태치먼트 개수",
      MAX_ARRAY_TEXTURE_LAYERS: "2D 텍스처 배열 최대 레이어",
      MAX_TRANSFORM_FEEDBACK_SEPARATE_ATTRIBS:
        "변환 피드백 사용시 별도 버퍼로 출력 최대 베링 개수",
      MAX_TRANSFORM_FEEDBACK_INTERLEAVED_COMPONENTS:
        "모든 걸 단일 버퍼로 보낼 때 최대 베링 개수",
      MAX_COMBINED_UNIFORM_BLOCKS:
        "종합적으로 사용 가능한 최대 유니폼 블록 개수",
      MAX_VERTEX_UNIFORM_BLOCKS: "정점 셰이더 최대 유니폼 블록 개수",
      MAX_FRAGMENT_UNIFORM_BLOCKS: "프래그먼트 셰이더 최대 유니폼 블록 개수"
    }
  };

  Object.keys(webgl).forEach((it) => {
    let ver = webgl[it];
    Object.keys(ver).forEach((type) => {
      const val = gl.getParameter(gl[type]);
      ret.push([it, type, ver[type], val]);
    });
  });

  return ret;
}

function createSphere(radius, divide = 5) {
  const halfPi = Math.PI * 0.5;
  const aRadian = Math.PI / divide;
  const n = divide * 2;
  const uDELTA = 1.0 / divide;
  const vDELTA = 1.0 / n;

  let a_normal = new Float32Array((divide + 1) * (n + 1) * 3);
  let a_texcoord = new Float32Array((divide + 1) * (n + 1) * 2);
  // let uvcoords = [];
  for (let i = 0; i < divide + 1; ++i) {
    const q = i * aRadian - halfPi; // 위도 각도 계산
    const xy = Math.cos(q);
    const z = Math.sin(q);
    const v = uDELTA * i;
    for (let j = 0; j < n; ++j) {
      const p = j * aRadian;
      let idx = (i * (n + 1) + j) * 3;
      a_normal[idx++] = xy * Math.sin(p);
      a_normal[idx++] = z;
      a_normal[idx++] = xy * Math.cos(p);
      idx = (i * (n + 1) + j) * 2;
      const u = vDELTA * j;
      // uvcoords.push([u, v]);
      a_texcoord[idx++] = u;
      a_texcoord[idx++] = v;
    }

    let t = ((i + 1) * (n + 1) - 1) * 3;
    let s = i * (n + 1) * 3;
    a_normal[t++] = a_normal[s++];
    a_normal[t++] = a_normal[s++];
    a_normal[t++] = a_normal[s++];
    let idx = ((i + 1) * (n + 1) - 1) * 2;
    // uvcoords.push([vDELTA * n, v]);
    a_texcoord[idx++] = vDELTA * n;
    a_texcoord[idx++] = v;
  }
  let vertices = new Float32Array(a_normal.length);
  for (let i = 0; i < a_normal.length; ++i) {
    vertices[i] = radius * a_normal[i];
  }

  let indices = new Uint16Array(divide * n * 6);
  for (let i = 0; i < divide; ++i) {
    const around = i * (n + 1);
    for (let j = 0; j < n; ++j) {
      const p0 = around + j;
      const p1 = around + j + 1;
      const p2 = around + n + j + 1;
      const p3 = around + n + j + 2;
      let idx = i * n * 6 + j * 6;
      indices[idx++] = p0;
      indices[idx++] = p2;
      indices[idx++] = p1;
      indices[idx++] = p1;
      indices[idx++] = p2;
      indices[idx++] = p3;
    }
  }

  let a_position = vertices;
  let nVertices = a_position.length / 3;

  return { a_position, a_normal, a_texcoord, indices, nVertices };
}

const ctx2D = document.createElement("canvas").getContext("2d");

function createTextCanvas(text, width, height) {
  ctx2D.save();

  ctx2D.canvas.width = width;
  ctx2D.canvas.height = height;
  ctx2D.font = `${height * 0.9}px sans-serif`;
  ctx2D.textAlign = "center";
  ctx2D.textBaseline = "middle";
  ctx2D.fillStyle = "black";
  ctx2D.clearRect(0, 0, width, height);
  ctx2D.fillText(text, width / 2, height / 2);

  ctx2D.restore();

  return ctx2D.canvas;
}

function createCubeMapSample(gl, width, height) {
  const CUBE_MAP = [
    [gl.TEXTURE_CUBE_MAP_POSITIVE_X, "+X", "#F00", "#0FF"],
    [gl.TEXTURE_CUBE_MAP_NEGATIVE_X, "-X", "#FF0", "#00F"],
    [gl.TEXTURE_CUBE_MAP_POSITIVE_Y, "+Y", "#0F0", "#F0F"],
    [gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, "-Y", "#0FF", "#F00"],
    [gl.TEXTURE_CUBE_MAP_POSITIVE_Z, "+Z", "#00F", "#FF0"],
    [gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, "-Z", "#0FF", "#0F0"]
  ];

  // const ctx = document.createElement("canvas").getContext("2d");
  ctx2D.save();
  ctx2D.canvas.width = width;
  ctx2D.canvas.height = height;
  ctx2D.font = `${width * 0.7}px sans-serif`;
  ctx2D.textAlign = "center";
  ctx2D.textBaseline = "middle";

  let texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

  CUBE_MAP.forEach((it, i) => {
    ctx2D.fillStyle = it[2];
    ctx2D.fillRect(0, 0, width, height);
    ctx2D.fillStyle = it[3];
    ctx2D.fillText(it[1], width / 2, height / 2);
    gl.texImage2D(it[0], 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, ctx.canvas);
  });

  gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
  // prettier-ignore
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

  ctx2D.restore();

  return texture;
}

function checkFramebuffer(gl) {
  let status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    throw new Error("Framebuffer is not complete!");
  }
}

function createCubeLine(size = 1) {
  const l = size * 0.5;
  // prettier-ignore
  const vertices = [
    [-l, -l, -l], // 0
    [ l, -l, -l], // 1
    [-l,  l, -l], // 2
    [ l,  l, -l], // 3
    [-l, -l,  l], // 4
    [ l, -l,  l], // 5
    [-l,  l,  l], // 6
    [ l,  l,  l]  // 7
  ];

  // prettier-ignore
  const lines = [
    0, 1, 1, 3, 3, 2, 2, 0,
    4, 5, 5, 7, 7, 6, 6, 4,
    0, 4, 1, 5, 3, 7, 2, 6,
  ];

  let a_position = new Float32Array(
    lines.reduce((prev, it) => prev.concat(vertices[it]), [])
  );

  return { a_position };
}

// 이미지 전체가 한면을 채우는 텍스처 좌표을 사각형 면 개수(nFaces)에 맞게 적용한다.
function applyNormalTexCoord(gl, nFaces = 6) {
  let normalTexcoord = createNormalTexCoord(6);

  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(normalTexcoord),
    gl.STATIC_DRAW
  );
}

function createNormalTexCoord(nFaces = 6) {
  return new Float32Array(
    new Array(nFaces)
      .fill()
      .reduce((acc, _) => acc.concat([0, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1]), [])
  );
}

// apply checker bodard to texture
// prettier-ignore
function applyCheckerTexture(gl, width = 8, height = 8, tile0 = 0xff, tile1 = 0xcc) {
  let checkerData = [];
  for (let i = 0; i < height; ++i) {
    for (let j = 0; j < width; ++j) {
      checkerData.push((i + j) & 1 ? tile1 : tile0);
    }
  }

  gl.texImage2D(
    gl.TEXTURE_2D,
    0, // mip level
    gl.LUMINANCE, // internal format
    width,
    height,
    0, // border
    gl.LUMINANCE, // format
    gl.UNSIGNED_BYTE, // type
    new Uint8Array(checkerData) // data
  );

  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
}

/*
  가운데 매핑 정보(+z) 기준으로 큐브 매핑 좌표 생성
			      +--+
			      |+y|
			   +--+--+--+--+
			   |-x|+z|+x|-z|
			   +--+--+--+--+
			      |-y|
			      +--+
 */
function createCubeMapping(z_x, z_y, z_w, z_h, img_width, img_height) {
  function face_map(i, j) {
    // prettier-ignore
    return [
      (z_x + z_w * i) / img_width, (z_y + z_h * j) / img_height,
      (z_x + z_w * i) / img_width, (z_y + z_h * (j + 1)) / img_height,
      (z_x + z_w * (i + 1)) / img_width, (z_y + z_h * j) / img_height,
      (z_x + z_w * i) / img_width, (z_y + z_h * (j + 1)) / img_height,
      (z_x + z_w * (i + 1)) / img_width, (z_y + z_h * (j + 1)) / img_height,
      (z_x + z_w * (i + 1)) / img_width, (z_y + z_h * j) / img_height
    ];
  }

  // prettier-ignore
  const map_info = [[0, 0], [2, 0], [-1, 0], [1, 0], [0,-1], [0, 1]];

  return map_info.reduce((pre, it) => pre.concat(face_map.apply(null, it)), []);
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
  if (new URL(src, window.location.href).origin !== window.location.origin) {
    img.crossOrigin = "";
  }
  // img.crossOrigin = "Anonymous";
  // img.crossOrigin = "";
  img.onload = callback;
  img.onerror = function (msg, url, no) {
    console.error("image:", src);
  };
  // img.src = src;

  // fetch(src, { mode: "no-cors" })
  fetch(src)
    .then((res) => res.blob())
    .then((blob) => (img.src = URL.createObjectURL(blob)))
    .catch((e) => console.error(`loadImage(): ${e.message}`));

  return img;
}

function createTexture(gl, unitNo = -1) {
  let maxUnit = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
  if (0 <= unitNo && maxUnit - 1 < unitNo) {
    throw new Error(
      `unitNo(${unitNo}) is over than MAX_TEXTURE_IMAGE_UNITS(${maxUnit})`
    );
  }

  // 텍스처 생성 및 유닛 설정
  let texture = gl.createTexture();
  if (0 <= unitNo) {
    gl.activeTexture(gl.TEXTURE0 + unitNo); // 바인딩할 유닛
  }
  gl.bindTexture(gl.TEXTURE_2D, texture); // 텍스처 유닛에 바인딩

  // 이미지 랜더링 설정
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  return texture;
}

// count x count 배열 배치 좌표 생성
function arrangeArray(count, range, callbackXYZ) {
  const gap = range / count;
  const firstPt = ~~((-range + gap) * 0.5);

  for (let i = 0; i < count; ++i) {
    let x = firstPt + gap * i;
    for (let j = 0; j < count; ++j) {
      let z = firstPt + gap * j;
      callbackXYZ(x, 0, z);
    }
  }
}

// 벡터 정규화
function normalize(v) {
  var length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  // 0으로 나뉘지 않도록 하기
  if (length > 0.00001) {
    return [v[0] / length, v[1] / length, v[2] / length];
  } else {
    return [0, 0, 0];
  }
}

// 벡터 뺄셈
function subtractVectors(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

// 벡터곱
function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];
}

function createPlane(width, height) {
  const w = width * 0.5;
  const h = height * 0.5;
  /*
			        2 ---- 3
			      /      /
			     0 ---- 1
 */
  let vertices = [
    [-w, 0, +h], // 0
    [+w, 0, +h], // 1
    [-w, 0, -h], // 2
    [+w, 0, -h] // 3
  ];

  let indices = new Uint16Array([2, 0, 3, 0, 1, 3]);

  let a_position = new Float32Array(
    indices.reduce((prev, it) => prev.concat(vertices[it]), [])
  );

  return { a_position };
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
  const vertices = [
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
  const indices = new Uint16Array([
    0, 1, 2, 2, 1, 3, // front
    6, 7, 4, 4, 7, 5, // back
    4, 5, 0, 0, 5, 1, // left
    2, 3, 6, 6, 3, 7, // right
    4, 0, 6, 6, 0, 2, // top
    1, 5, 3, 3, 5, 7, // bottom
  ]);

  const faceNormals = [
    [+0, +0, +1], // front
    [+0, +0, -1], // back
    [-1, +0, +0], // left
    [+1, +0, +0], // right
    [+0, +1, +0], // top
    [+0, -1, +0] // bottom
  ];

  let a_position = new Float32Array(
    vertices.reduce((agg, it) => agg.concat(it), [])
  );

  let a_normal = new Float32Array(
    faceNormals.reduce((agg, it) => agg.concat(Array(6).fill(it).flat()), [])
  );

  return { a_position, a_normal, indices };
}

function setBox(gl, x, y, z, w, h, d) {
  let box = createBox(w, h, d);
  let a_position = new Float32Array(box.a_position.length);
  for (let i = 0; i < box.a_position.length; i += 3) {
    a_position[i + 0] = box.a_position[i + 0] + x + w * 0.5;
    a_position[i + 1] = box.a_position[i + 1] + y + h * 0.5;
    a_position[i + 2] = box.a_position[i + 2] + z + d * 0.5;
  }

  gl.bufferData(gl.ARRAY_BUFFER, a_position, gl.STATIC_DRAW); // 데이터 저장

  return a_positions.length / 3;
}

// create a rectangle
function createRectangle(width = 1, height = 1) {
  const w = width / 2;
  const h = height / 2;
  /* vetices positions
			     0 ---- 2
			     |      |
			     |      |
			     1 ---- 3
  */
  // prettier-ignore
  const vertices = new Float32Array([
    -w, +h, // 0
    -w, -h, // 1
    +w, +h, // 2
    +w, -h // 3
  ]);

  const indices = new Uint16Array([0, 1, 2, 2, 1, 3]);
  let a_position = vertices;

  return { a_position, indices, nVertices: a_position.length / 2 };
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

// prettier-ignore
function defineAttribute2(gl, program, name, size, type = gl.FLOAT, normalized = false ) {
  let loc = gl.getAttribLocation(program.program, name); // 속성 위치 정보
  if (0 > loc) {
    console.warn(`"${name}" attribute is not found!`)
    return null;
    // throw new Error(name + " attribute is not found!");
  }

  // 버퍼 생성하고 ARRYA_BUFFER에 바인딩
  let buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  // vertex array에서 해당 attribute 활성화
  gl.enableVertexAttribArray(loc);
  // vertex array에 속성 설정
  gl.vertexAttribPointer(loc, size, type, normalized, 0, 0); // 데이터 속성

  return {
    buffer: [gl.ARRAY_BUFFER, buffer],
    pointer: [loc, size, type, normalized, 0, 0],
    bindBuffer: gl.bindBuffer.bind(gl, gl.ARRAY_BUFFER, buffer),
    vertexAttribPointer: gl.vertexAttribPointer.bind(gl, loc, size, type, normalized, 0, 0)
  };
}

// 정점과 프레그먼트 소스로 프로그램 관리할 객체를 생성
// 객체에는 program, attributes 속성이 있다.
function createProgram2(gl, vSource, fSource) {
  // 두 셰이셔 생성
  const vShader = createShader(gl, gl.VERTEX_SHADER, vSource);
  const fShader = createShader(gl, gl.FRAGMENT_SHADER, fSource);

  // 프로그램으로 두 셰이더 연결
  let program = createProgram(gl, vShader, fShader);

  return { program };
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
    console.error(type === gl.VERTEX_SHADER ? "vertex" : "fragment", err);
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

// let MatType = Float32Array;
const m4 = {
  /**
   * creates a matrix from translation, quaternion, scale
   * @param {Number[]} translation [x, y, z] translation
   * @param {Number[]} quaternion [x, y, z, z] quaternion rotation
   * @param {Number[]} scale [x, y, z] scale
   * @param {Matrix4} [dst] optional matrix to store result
   * @return {Matrix4} dst or a new matrix if none provided
   */
  compose: function (translation, quaternion, scale, dst) {
    dst = dst || new Array(16);

    const x = quaternion[0];
    const y = quaternion[1];
    const z = quaternion[2];
    const w = quaternion[3];

    const x2 = x + x;
    const y2 = y + y;
    const z2 = z + z;

    const xx = x * x2;
    const xy = x * y2;
    const xz = x * z2;

    const yy = y * y2;
    const yz = y * z2;
    const zz = z * z2;

    const wx = w * x2;
    const wy = w * y2;
    const wz = w * z2;

    const sx = scale[0];
    const sy = scale[1];
    const sz = scale[2];

    dst[0] = (1 - (yy + zz)) * sx;
    dst[1] = (xy + wz) * sx;
    dst[2] = (xz - wy) * sx;
    dst[3] = 0;

    dst[4] = (xy - wz) * sy;
    dst[5] = (1 - (xx + zz)) * sy;
    dst[6] = (yz + wx) * sy;
    dst[7] = 0;

    dst[8] = (xz + wy) * sz;
    dst[9] = (yz - wx) * sz;
    dst[10] = (1 - (xx + yy)) * sz;
    dst[11] = 0;

    dst[12] = translation[0];
    dst[13] = translation[1];
    dst[14] = translation[2];
    dst[15] = 1;

    return dst;
  },
  decompose: function (mat, translation, quaternion, scale) {
    let sx = m4.length(mat.slice(0, 3));
    const sy = m4.length(mat.slice(4, 7));
    const sz = m4.length(mat.slice(8, 11));

    // if determinate is negative, we need to invert one scale
    const det = m4.determinate(mat);
    if (det < 0) {
      sx = -sx;
    }

    translation[0] = mat[12];
    translation[1] = mat[13];
    translation[2] = mat[14];

    // scale the rotation part
    const matrix = m4.copy(mat);

    const invSX = 1 / sx;
    const invSY = 1 / sy;
    const invSZ = 1 / sz;

    matrix[0] *= invSX;
    matrix[1] *= invSX;
    matrix[2] *= invSX;

    matrix[4] *= invSY;
    matrix[5] *= invSY;
    matrix[6] *= invSY;

    matrix[8] *= invSZ;
    matrix[9] *= invSZ;
    matrix[10] *= invSZ;

    m4.quatFromRotationMatrix(matrix, quaternion);

    scale[0] = sx;
    scale[1] = sy;
    scale[2] = sz;
  },
  quatFromRotationMatrix: function (m, dst) {
    // http://www.euclideanspace.com/maths/geometry/rotations/conversions/matrixToQuaternion/index.htm

    // assumes the upper 3x3 of m is a pure rotation matrix (i.e, unscaled)
    const m11 = m[0];
    const m12 = m[4];
    const m13 = m[8];
    const m21 = m[1];
    const m22 = m[5];
    const m23 = m[9];
    const m31 = m[2];
    const m32 = m[6];
    const m33 = m[10];

    const trace = m11 + m22 + m33;

    if (trace > 0) {
      const s = 0.5 / Math.sqrt(trace + 1);
      dst[3] = 0.25 / s;
      dst[0] = (m32 - m23) * s;
      dst[1] = (m13 - m31) * s;
      dst[2] = (m21 - m12) * s;
    } else if (m11 > m22 && m11 > m33) {
      const s = 2 * Math.sqrt(1 + m11 - m22 - m33);
      dst[3] = (m32 - m23) / s;
      dst[0] = 0.25 * s;
      dst[1] = (m12 + m21) / s;
      dst[2] = (m13 + m31) / s;
    } else if (m22 > m33) {
      const s = 2 * Math.sqrt(1 + m22 - m11 - m33);
      dst[3] = (m13 - m31) / s;
      dst[0] = (m12 + m21) / s;
      dst[1] = 0.25 * s;
      dst[2] = (m23 + m32) / s;
    } else {
      const s = 2 * Math.sqrt(1 + m33 - m11 - m22);
      dst[3] = (m21 - m12) / s;
      dst[0] = (m13 + m31) / s;
      dst[1] = (m23 + m32) / s;
      dst[2] = 0.25 * s;
    }
  },
  transformVector: function (m, v, ret) {
    ret = ret || new Array(16);
    for (let i = 0; i < 4; ++i) {
      ret[i] = 0.0;
      for (let j = 0; j < 4; ++j) {
        ret[i] += v[j] * m[j * 4 + i];
      }
    }
    return ret;
  },
  /**
   * Computes a 4-by-4 perspective transformation matrix given the angular height
   * of the frustum, the aspect ratio, and the near and far clipping planes.  The
   * arguments define a frustum extending in the negative z direction.  The given
   * angle is the vertical angle of the frustum, and the horizontal angle is
   * determined to produce the given aspect ratio.  The arguments near and far are
   * the distances to the near and far clipping planes.  Note that near and far
   * are not z coordinates, but rather they are distances along the negative
   * z-axis.  The matrix generated sends the viewing frustum to the unit box.
   * We assume a unit box extending from -1 to 1 in the x and y dimensions and
   * from -1 to 1 in the z dimension.
   * @param {number} fieldOfViewInRadians field of view in y axis.
   * @param {number} aspect aspect of viewport (width / height)
   * @param {number} near near Z clipping plane
   * @param {number} far far Z clipping plane
   * @param {Matrix4} [dst] optional matrix to store result
   * @return {Matrix4} dst or a new matrix if none provided
   * @memberOf module:webgl-3d-math
   */
  frustum: function (left, right, bottom, top, near, far, ret) {
    ret = ret || new Array(16);

    let dx = right - left;
    let dy = top - bottom;
    let dz = far - near;

    ret[0] = (2 * near) / dx;
    ret[1] = 0;
    ret[2] = 0;
    ret[3] = 0;
    ret[4] = 0;
    ret[5] = (2 * near) / dy;
    ret[6] = 0;
    ret[7] = 0;
    ret[8] = (left + right) / dx;
    ret[9] = (top + bottom) / dy;
    ret[10] = -(far + near) / dz;
    ret[11] = -1;
    ret[12] = 0;
    ret[13] = 0;
    ret[14] = (-2 * near * far) / dz;
    ret[15] = 0;

    return ret;
  },
  lookAt: function (cameraPosition, target, up) {
    var zAxis = normalize(subtractVectors(cameraPosition, target));
    var xAxis = normalize(cross(up, zAxis));
    var yAxis = normalize(cross(zAxis, xAxis));
    // prettier-ignore
    return [
			       xAxis[0], xAxis[1], xAxis[2], 0,
			       yAxis[0], yAxis[1], yAxis[2], 0,
			       zAxis[0], zAxis[1], zAxis[2], 0,
			       cameraPosition[0],
			       cameraPosition[1],
			       cameraPosition[2],
			       1,
			    ];
  },
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
  xRotation: function (radian) {
    let c = Math.cos(radian);
    let s = Math.sin(radian);

    return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1];
  },
  yRotation: function (radian) {
    let c = Math.cos(radian);
    let s = Math.sin(radian);

    return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1];
  },
  zRotation: function (radian) {
    let c = Math.cos(radian);
    let s = Math.sin(radian);

    return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  },
  scaling: function (sx, sy, sz) {
    return [sx, 0, 0, 0, 0, sy, 0, 0, 0, 0, sz, 0, 0, 0, 0, 1];
  },
  translate: function (m, tx, ty, tz, ret) {
    return m4.multiply(m, m4.translation(tx, ty, tz), ret);
  },
  xRotate: function (m, angleInRadians, ret) {
    return m4.multiply(m, m4.xRotation(angleInRadians), ret);
  },
  yRotate: function (m, angleInRadians, ret) {
    return m4.multiply(m, m4.yRotation(angleInRadians), ret);
  },
  zRotate: function (m, angleInRadians, ret) {
    return m4.multiply(m, m4.zRotation(angleInRadians), ret);
  },
  scale: function (m, sx, sy, sz, ret) {
    return m4.multiply(m, m4.scaling(sx, sy, sz), ret);
  },
  multiply: function (a, b, ret) {
    ret = ret || new Array(16);

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

    ret[0] = b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30;
    ret[1] = b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31;
    ret[2] = b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32;
    ret[3] = b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33;
    ret[4] = b10 * a00 + b11 * a10 + b12 * a20 + b13 * a30;
    ret[5] = b10 * a01 + b11 * a11 + b12 * a21 + b13 * a31;
    ret[6] = b10 * a02 + b11 * a12 + b12 * a22 + b13 * a32;
    ret[7] = b10 * a03 + b11 * a13 + b12 * a23 + b13 * a33;
    ret[8] = b20 * a00 + b21 * a10 + b22 * a20 + b23 * a30;
    ret[9] = b20 * a01 + b21 * a11 + b22 * a21 + b23 * a31;
    ret[10] = b20 * a02 + b21 * a12 + b22 * a22 + b23 * a32;
    ret[11] = b20 * a03 + b21 * a13 + b22 * a23 + b23 * a33;
    ret[12] = b30 * a00 + b31 * a10 + b32 * a20 + b33 * a30;
    ret[13] = b30 * a01 + b31 * a11 + b32 * a21 + b33 * a31;
    ret[14] = b30 * a02 + b31 * a12 + b32 * a22 + b33 * a32;
    ret[15] = b30 * a03 + b31 * a13 + b32 * a23 + b33 * a33;

    return ret;
  },
  inverse: function (m, ret) {
    ret = ret || new Array(16);

    var m00 = m[0 * 4 + 0];
    var m01 = m[0 * 4 + 1];
    var m02 = m[0 * 4 + 2];
    var m03 = m[0 * 4 + 3];
    var m10 = m[1 * 4 + 0];
    var m11 = m[1 * 4 + 1];
    var m12 = m[1 * 4 + 2];
    var m13 = m[1 * 4 + 3];
    var m20 = m[2 * 4 + 0];
    var m21 = m[2 * 4 + 1];
    var m22 = m[2 * 4 + 2];
    var m23 = m[2 * 4 + 3];
    var m30 = m[3 * 4 + 0];
    var m31 = m[3 * 4 + 1];
    var m32 = m[3 * 4 + 2];
    var m33 = m[3 * 4 + 3];
    var tmp00 = m22 * m33;
    var tmp01 = m32 * m23;
    var tmp02 = m12 * m33;
    var tmp03 = m32 * m13;
    var tmp04 = m12 * m23;
    var tmp05 = m22 * m13;
    var tmp06 = m02 * m33;
    var tmp07 = m32 * m03;
    var tmp08 = m02 * m23;
    var tmp09 = m22 * m03;
    var tmp10 = m02 * m13;
    var tmp11 = m12 * m03;
    var tmp12 = m20 * m31;
    var tmp13 = m30 * m21;
    var tmp14 = m10 * m31;
    var tmp15 = m30 * m11;
    var tmp16 = m10 * m21;
    var tmp17 = m20 * m11;
    var tmp18 = m00 * m31;
    var tmp19 = m30 * m01;
    var tmp20 = m00 * m21;
    var tmp21 = m20 * m01;
    var tmp22 = m00 * m11;
    var tmp23 = m10 * m01;

    // prettier-ignore
    {
      let t0 = tmp00 * m11 + tmp03 * m21 + tmp04 * m31 -
          (tmp01 * m11 + tmp02 * m21 + tmp05 * m31);
      let t1 = tmp01 * m01 + tmp06 * m21 + tmp09 * m31 -
          (tmp00 * m01 + tmp07 * m21 + tmp08 * m31);
      let t2 = tmp02 * m01 + tmp07 * m11 + tmp10 * m31 -
          (tmp03 * m01 + tmp06 * m11 + tmp11 * m31);
      let t3 = tmp05 * m01 + tmp08 * m11 + tmp11 * m21 -
          (tmp04 * m01 + tmp09 * m11 + tmp10 * m21);

      let d = 1.0 / (m00 * t0 + m10 * t1 + m20 * t2 + m30 * t3);

      ret[0] = d * t0;
      ret[1] = d * t1;
      ret[2] = d * t2;
      ret[3] = d * t3;
      ret[4] = d * (tmp01 * m10 + tmp02 * m20 + tmp05 * m30 -
                    (tmp00 * m10 + tmp03 * m20 + tmp04 * m30));
      ret[5] = d * (tmp00 * m00 + tmp07 * m20 + tmp08 * m30 -
                    (tmp01 * m00 + tmp06 * m20 + tmp09 * m30));
      ret[6] = d * (tmp03 * m00 + tmp06 * m10 + tmp11 * m30 -
                    (tmp02 * m00 + tmp07 * m10 + tmp10 * m30));
      ret[7] = d * (tmp04 * m00 + tmp09 * m10 + tmp10 * m20 -
                    (tmp05 * m00 + tmp08 * m10 + tmp11 * m20));
      ret[8] = d * (tmp12 * m13 + tmp15 * m23 + tmp16 * m33 -
                    (tmp13 * m13 + tmp14 * m23 + tmp17 * m33));
      ret[9] = d * (tmp13 * m03 + tmp18 * m23 + tmp21 * m33 -
                    (tmp12 * m03 + tmp19 * m23 + tmp20 * m33));
      ret[10] = d * (tmp14 * m03 + tmp19 * m13 + tmp22 * m33 -
                     (tmp15 * m03 + tmp18 * m13 + tmp23 * m33));
      ret[11] = d * (tmp17 * m03 + tmp20 * m13 + tmp23 * m23 -
                     (tmp16 * m03 + tmp21 * m13 + tmp22 * m23));
      ret[12] = d * (tmp14 * m22 + tmp17 * m32 + tmp13 * m12 -
                     (tmp16 * m32 + tmp12 * m12 + tmp15 * m22));
      ret[13] = d * (tmp20 * m32 + tmp12 * m02 + tmp19 * m22 -
                     (tmp18 * m22 + tmp21 * m32 + tmp13 * m02));
      ret[14] = d * (tmp18 * m12 + tmp23 * m32 + tmp15 * m02 -
                     (tmp22 * m32 + tmp14 * m02 + tmp19 * m12));
      ret[15] = d * (tmp22 * m22 + tmp16 * m02 + tmp21 * m12 -
                     (tmp20 * m12 + tmp23 * m22 + tmp17 * m02));
    }
    return ret;
  },
  transpose: function (m) {
    // prettier-ignore
    return [
      m[0], m[4], m[8], m[12],
      m[1], m[5], m[9], m[13],
      m[2], m[6], m[10], m[14],
      m[3], m[7], m[11], m[15],
    ];
  },
  copy: function (src, dst) {
    dst = dst || new Array(16);

    dst[0] = src[0];
    dst[1] = src[1];
    dst[2] = src[2];
    dst[3] = src[3];
    dst[4] = src[4];
    dst[5] = src[5];
    dst[6] = src[6];
    dst[7] = src[7];
    dst[8] = src[8];
    dst[9] = src[9];
    dst[10] = src[10];
    dst[11] = src[11];
    dst[12] = src[12];
    dst[13] = src[13];
    dst[14] = src[14];
    dst[15] = src[15];

    return dst;
  },
  /**
   * Computes the length of a vector
   * @param {Vector3} v vector to take length of
   * @return {number} length of vector
   */
  length: function (v) {
    return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  },
  determinate: function (m) {
    var m00 = m[0 * 4 + 0];
    var m01 = m[0 * 4 + 1];
    var m02 = m[0 * 4 + 2];
    var m03 = m[0 * 4 + 3];
    var m10 = m[1 * 4 + 0];
    var m11 = m[1 * 4 + 1];
    var m12 = m[1 * 4 + 2];
    var m13 = m[1 * 4 + 3];
    var m20 = m[2 * 4 + 0];
    var m21 = m[2 * 4 + 1];
    var m22 = m[2 * 4 + 2];
    var m23 = m[2 * 4 + 3];
    var m30 = m[3 * 4 + 0];
    var m31 = m[3 * 4 + 1];
    var m32 = m[3 * 4 + 2];
    var m33 = m[3 * 4 + 3];
    var tmp_0 = m22 * m33;
    var tmp_1 = m32 * m23;
    var tmp_2 = m12 * m33;
    var tmp_3 = m32 * m13;
    var tmp_4 = m12 * m23;
    var tmp_5 = m22 * m13;
    var tmp_6 = m02 * m33;
    var tmp_7 = m32 * m03;
    var tmp_8 = m02 * m23;
    var tmp_9 = m22 * m03;
    var tmp_10 = m02 * m13;
    var tmp_11 = m12 * m03;

    var t0 =
      tmp_0 * m11 +
      tmp_3 * m21 +
      tmp_4 * m31 -
      (tmp_1 * m11 + tmp_2 * m21 + tmp_5 * m31);
    var t1 =
      tmp_1 * m01 +
      tmp_6 * m21 +
      tmp_9 * m31 -
      (tmp_0 * m01 + tmp_7 * m21 + tmp_8 * m31);
    var t2 =
      tmp_2 * m01 +
      tmp_7 * m11 +
      tmp_10 * m31 -
      (tmp_3 * m01 + tmp_6 * m11 + tmp_11 * m31);
    var t3 =
      tmp_5 * m01 +
      tmp_8 * m11 +
      tmp_11 * m21 -
      (tmp_4 * m01 + tmp_9 * m11 + tmp_10 * m21);

    return 1.0 / (m00 * t0 + m10 * t1 + m20 * t2 + m30 * t3);
  }
};

function isPowerOf2(value) {
  return (value & (value - 1)) === 0;
}

///////////////////////////////// WebGL //////////////////////////////////
function TRS(t, r, s) {
  this.t = t || [0, 0, 0];
  this.r = r || [0, 0, 0, 1];
  this.s = s || [1, 1, 1];
  this.val = null;
}
Object.assign(TRS.prototype, {
  init() {
    this.t = [0, 0, 0];
    this.r = [0, 0, 0, 1];
    this.s = [1, 1, 1];
    this.val = null;
    return this;
  },
  decompose(mat) {
    m4.decompose(mat, this.t, this.r, this.s);
    this.val = null;
    return this;
  },
  compose() {
    if (!this.val) {
      this.val = m4.compose(this.t, this.r, this.s);
    }
    return this.val;
  },
  toString(fixed = 1) {
    return `t${toStr(this.t, fixed)} r${toStr(this.r, fixed)} s${toStr(
      this.s,
      fixed
    )}`;
  }
});
let _trs = new TRS();

(async function main() {
  const gl = c.getContext("webgl");
  g = gl;
  // const info = infoOfWebgl(gl);
  // console.log(info);

  const WIDTH = gl.canvas.width;
  const HEIGHT = gl.canvas.height;
  // WEBGL_depth_texture 확인
  // const ext = gl.getExtension("WEBGL_depth_texture");
  // if (!ext) {
  //   throw new Error("WEBGL_depth_texture not supported!");
  // }

  const ext2 = gl.getExtension("OES_texture_float");
  if (!ext2) {
    throw new Error("OES_texture_float not supported!");
  }

  let mouseX = 0;
  let mouseY = 0;
  gl.canvas.addEventListener("mousemove", ({ clientX, clientY }) => {
    const { left, top } = gl.canvas.getBoundingClientRect();
    mouseX = clientX - left;
    mouseY = clientY - top;
  });

  gl.enable(gl.CULL_FACE); // 3D, 앞뒷면그리지 않고 앞면(반시계방향chrome://flags/)만 그림
  gl.enable(gl.DEPTH_TEST); // 3D, 깊이감 고려해서 그림
  // gl.enable(gl.SCISSOR_TEST); // diviced by area
  // gl.enable(gl.BLEND); //!!
  // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); //!!
  // 문제는 Canvas 2D API가 미리 곱한 알파 값만 나타낸다는 겁니다. 캔버스의 컨텐츠를 텍스처에 업로드할 때 WebGL은 값을 미리 곱하지 않으려고 하지만 미리 곱한 알파는 손실되었기 때문에 이를 완벽히 수행할 수 없습니다.
  // gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true); // 미리 곱하지 말라고 WebGL에 지시해봅시다.!!
  // 이는 미리 곱한 알파 값을 gl.texImage2D와 gl.texSubImage2D에 제공하라고 WebGL에 지시합니다. gl.texImage2D에 전달된 데이터가 이미 Canvas 2D 데이터처럼 미리 곱해졌다면 WebGL은 그냥 전달만 합니다.

  // 설정 UI
  const gui = new dat.GUI();
  gui.remember(settings);
  gui.close();

  gui.add(settings, "cameraAngle", -360, 360, 0.01);
  gui.add(settings, "cameraX", -WIDTH, WIDTH, 0.01);
  gui.add(settings, "cameraY", -HEIGHT, HEIGHT, 0.01);
  gui.add(settings, "cameraZ", -1000, 1000, 0.01);
  gui.add(settings, "fov", 0, 180, 0.1);

  let boneMatrixTexture = createTexture(gl, 1);
  // normal 프로그램 생성!!
  let normal_program = {
    program: createProgram(gl, normal_vshader.text, normal_fshader.text)
  };

  {
    let program = normal_program;
    gl.useProgram(program.program);

    Object.assign(program, {
      // attributes
      // a_POSITION: defineAttribute2(gl, program, "a_POSITION", 3),
      // a_NORMAL: defineAttribute2(gl, program, "a_NORMAL", 3),
      // uniforms
      u_projection: gl.getUniformLocation(program.program, "u_projection"),
      u_world: gl.getUniformLocation(program.program, "u_world"),
      u_view: gl.getUniformLocation(program.program, "u_view"),
      u_diffuse: gl.getUniformLocation(program.program, "u_diffuse"),
      u_lightDir: gl.getUniformLocation(program.program, "u_lightDir"),
      u_texJoint: gl.getUniformLocation(program.program, "u_texJoint"),
      u_nJoints: gl.getUniformLocation(program.program, "u_nJoints")
      // u_texBone: gl.getUniformLocation(program.program, "u_texBone"),
      // u_nBones: gl.getUniformLocation(program.program, "u_nBones")
    });

    // initialization
    // let nBones = 4;
    // let bones = new Float32Array(nBones * 16);
    // gl.uniformMatrix4fv(program.u_bones, false, bones);
    gl.uniform3fv(program.u_lightDir, normalize([-1, 3, 5]));
    gl.uniform4fv(program.u_diffuse, [0.5, 0.5, 1.0, 1.0]);

    gl.uniform1i(program.u_texJoint, 1);
    // gl.uniform1f(program.u_nBones, nBones);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  function throwNoKey(key) {
    throw new Error(`no key: ${key}`);
  }

  const glTypeToTypedArray = {
    5120: Int8Array, // gl.BYTE
    5121: Uint8Array, // gl.UNSIGNED_BYTE
    5122: Int16Array, // gl.SHORT
    5123: Uint16Array, // gl.UNSIGNED_SHORT
    5124: Int32Array, // gl.INT
    5125: Uint32Array, // gl.UNSIGNED_INT
    5126: Float32Array, // gl.FLOAT
    get(type) {
      return this[type] || throwNoKey(type);
    }
  };

  const glTypeToStr = {
    5120: "gl.BYTE",
    5121: "gl.UNSIGNED_BYTE",
    5122: "gl.SHORT",
    5123: "gl.UNSIGNED_SHORT",
    5124: "gl.INT",
    5125: "gl.UNSIGNED_INT",
    5126: "gl.FLOAT",
    get(type) {
      return this[type] || throwNoKey(type);
    }
  };

  // prettier-ignore
  const accessorTypeToNumComponents = {
    SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16,
    get (type) { return this[type] || throwNoKey(type); }
  };

  function getAccessorAndWebglBuffer(gl, gltf, accessorIndex) {
    const accessor = gltf.accessors[accessorIndex];
    let bufferView = gltf.bufferViews[accessor.bufferView];
    if (!bufferView) {
      return console.warn(`no bufferView: index[${accessor.bufferView}]`);
    }

    if (!bufferView.webgl) {
      const TypedArray = glTypeToTypedArray.get(accessor.componentType);
      const arrayBuffer = gltf.buffers[bufferView.buffer];
      const byteOffset = bufferView.byteOffset + (accessor.byteOffset || 0);
      const length =
        accessor.count * accessorTypeToNumComponents.get(accessor.type);
      const data = new TypedArray(arrayBuffer, byteOffset, length);
      bufferView.webgl = { buffer: gl.createBuffer(), data };
      const target = bufferView.target || gl.ARRAY_BUFFER;
      gl.bindBuffer(target, bufferView.webgl.buffer);
      gl.bufferData(target, data, gl.STATIC_DRAW);
    }

    let { buffer, data: array } = bufferView.webgl;

    console.log(
      `accessor: ${accessor.componentType}(${glTypeToStr.get(
        accessor.componentType
      )}) ${accessor.type}(${accessorTypeToNumComponents.get(
        accessor.type
      )}) count[${accessor.count}] > bufferView: byteLength[${
        bufferView.byteLength
      }] byteOffset[${bufferView.byteOffset}]`
    );

    return { accessor, array, buffer, stride: bufferView.stride || 0 };
  }

  async function loadGltf(strUri) {
    const gltf = await fetch(strUri).then((res) => res.json());
    const baseURL = new URL(strUri, location.href);
    gltf.buffers = await Promise.all(
      gltf.buffers.map((it) => {
        const url = new URL(it.uri, baseURL.href);
        return fetch(url.href).then((res) => res.arrayBuffer());
      })
    );

    return gltf;
  }

  gltf = await loadGltf(uriGltf);

  if (gltf) {
    const defaultMaterial = {
      uniforms: {
        u_diffuse: [0.5, 0.8, 1, 1]
      }
    };
    // convert primitive
    gltf.meshes.forEach((mesh) => {
      mesh.bufferInfos = mesh.bufferInfos || [];
      mesh.primitives.forEach((primitive) => {
        const attribs = {};
        for (const [attName, index] of Object.entries(primitive.attributes)) {
          const { accessor, buffer, stride } = getAccessorAndWebglBuffer(
            gl,
            gltf,
            index
          );
          let { componentType, type, byteOffset, count } = accessor;
          nComponents = accessorTypeToNumComponents.get(type);

          console.log(`primitive: ${attName}`);
          let offset = byteOffset || 0;
          attribs[`a_${attName}`] = {
            buffer,
            nComponents,
            componentType,
            stride,
            offset,
            count
          };
        }

        const bufferInfo = {
          attribs,
          nElements: attribs["a_POSITION"].count || 0
        };

        if (primitive.indices !== undefined) {
          const { accessor, buffer } = getAccessorAndWebglBuffer(
            gl,
            gltf,
            primitive.indices
          );
          bufferInfo.nElements = accessor.count;
          bufferInfo.indices = buffer;
          bufferInfo.elementType = accessor.componentType;
        }

        primitive.bufferInfo = bufferInfo;

        primitive.material =
          (gltf.materals && gltf.materials[primitive.material]) ||
          defaultMaterial;

        bufferInfo.material = primitive.material;

        mesh.bufferInfos.push(bufferInfo);
      });
    });

    let Node = OSpace.clone({
      parent: null,
      children: [],
      setParent(parent) {
        let ret = null;
        if (this.parent) {
          this.parent.removeChild(this);
          ret = this.parent;
          this.parent = null;
        }
        if (parent) {
          parent.addChild(this);
          this.parent = parent;
        }
        return ret;
      },
      addChild(...child) {
        this.children.push(...child);
      },
      removeChild(child) {
        let idx = this.children.indexOf(child);
        this.children.splice(idx, 1);
      },
      forEach(callback) {
        callback(this);
        this.children.forEach((it) => it.forEach(callback));
      }
    });

    const DrawableNode = Node.clone({
      localMat: m4.identity(),
      worldMat: m4.identity(),
      updateWorld(parentWorld) {
        if (parentWorld) {
          m4.multiply(parentWorld, this.localMat, this.worldMat);
        } else {
          m4.copy(this.localMat, this.worldMat);
        }
        const worldMat = this.worldMat;
        for (const child of this.children) {
          child.updateWorld(worldMat);
        }
      }
    });

    let nodes = gltf.nodes.map((node) => {
      const { name, skin, mesh, translation, rotation, scale } = node;

      let source = new TRS(translation, rotation, scale);
      let ret = DrawableNode.clone({
        name,
        source,
        localMat: source.compose(),
        worldMat: m4.identity(),
        parent: null,
        children: []
      });
      const meshObj = gltf.meshes[mesh];
      if (meshObj) {
        ret.drawables = ret.drawables || [];
        ret.drawables.push(meshObj.bufferInfos);
      }
      return ret;
    });

    gltf.nodes.forEach((node, i) => {
      let children = node.children;
      let parent = nodes[i];
      children && children.forEach((child) => nodes[child].setParent(parent));
    });

    const Skin = OSpace.clone({
      // joints: joints,
      // jointMat: [],
      // inverseBindMat: [],
      // texJoint: null,
      // jointData: [],
      update(node) {
        // 각 조인트를 통해 현재 월드 행렬 구하기
        // 바인드 역행렬을 적용하고 조인트를 텍스처에 저장
        const inverseWorldMat = m4.inverse(node.worldMat);
        let n = this.joints.length;
        for (let i = 0; i < n; ++i) {
          const dst = this.jointMat[i];
          m4.multiply(inverseWorldMat, this.joints[i].worldMat, dst);
          m4.multiply(dst, this.inverseBindMat[i], dst);
        }
        gl.bindTexture(gl.TEXTURE_2D, this.texJoint);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          4,
          n,
          0,
          gl.RGBA,
          gl.FLOAT,
          this.jointData
        );
        if (++_cnt < 3)
          console.log(
            ">",
            node.name,
            toStr(node.worldMat),
            toStr(this.jointData)
          );
      }
    });

    function createSkin(joints, inverseBindData) {
      let inverseBindMat = [];
      let jointMat = [];
      let jointData = new Float32Array(joints.length * 16);

      for (let i = 0; i < joints.length; ++i) {
        inverseBindMat.push(
          new Float32Array(
            inverseBindData.buffer,
            inverseBindData.byteOffset +
              Float32Array.BYTES_PER_ELEMENT * 16 * i,
            16
          )
        );
        jointMat.push(
          new Float32Array(
            jointData.buffer,
            Float32Array.BYTES_PER_ELEMENT * 16 * i,
            16
          )
        );
      }

      let texJoint = createTexture(gl, 1);
      gl.activeTexture(gl.TEXTURE0);

      return Skin.clone({
        joints,
        inverseBindMat,
        jointMat,
        jointData,
        texJoint
      });
    }

    skins = gltf.skins.map((skin) => {
      const joints = skin.joints.map((it) => nodes[it]);
      const { array } = getAccessorAndWebglBuffer(
        gl,
        gltf,
        skin.inverseBindMatrices
      );
      return createSkin(joints, array);
    });

    gltf.nodes.forEach((node, i) => {
      const skin = skins[node.skin];
      if (!skin) return;
      nodes[i].skin = skin;
    });

    scenes = gltf.scenes.map((scene) => {
      let root = DrawableNode.clone({
        name: scene.name,
        localMat: m4.identity(),
        worldMat: m4.identity(),
        parent: null,
        children: []
      });
      scene.nodes.forEach((it) => nodes[it].setParent(root));
      return root;
    });

    scenes.forEach((it) => it.updateWorld());
  }

  const orgMat = new Map();
  function animateSkin(skin, angle) {
    for (let i = 0; i < skin.joints.length; ++i) {
      const joint = skin.joints[i];
      if (!orgMat.has(joint)) {
        orgMat.set(joint, m4.copy(joint.localMat));
      }
      const found = orgMat.get(joint);
      m4.xRotate(found, angle, joint.localMat);
    }
  }

  // 화면 그려주는 함수
  function renderNode(program, projectionMat, cameraMat, worldMat, node) {
    if (!node || !node.drawables) return;

    // 프로그램 활성화
    gl.useProgram(program.program);

    if (node.skin) {
      if (++_cnt < 5) console.log(">", node.name, node.skin);
      if (program.u_nJoints) {
        gl.uniform1f(program.u_nJoints, node.skin.joints.length);
      }
      node.skin.update(node);
    }

    let viewMat = m4.inverse(cameraMat);

    gl.uniformMatrix4fv(program.u_view, false, viewMat);
    gl.uniformMatrix4fv(program.u_projection, false, projectionMat);

    if (program.u_viewWorld) {
      gl.uniform3fv(program.u_viewWorld, cameraMat.slice(12, 15));
    }

    if (program.u_world) {
      gl.uniformMatrix4fv(program.u_world, false, node.worldMat);
    }

    // 각 객체별로 화면 출력
    node.drawables.forEach((primitives) => {
      primitives.forEach((obj) => {
        const uniforms = obj.material.uniforms;
        // 객체의 world 행렬과 곱해서 최종 월드 행렬 적용
        if (uniforms.u_diffuse && program.u_diffuse) {
          gl.uniform4fv(program.u_diffuse, uniforms.u_diffuse);
        }

        for (const [id, attr] of Object.entries(obj.attribs)) {
          if (!attr.bindAttribute) {
            let loc = gl.getAttribLocation(program.program, id); // 속성 위치 정보
            if (0 > loc) {
              console.warn(`"${id}" attribute is not found!`);
              attr.bindAttribute = noOp;
            } else {
              console.info(
                `${id}: nComponents[${attr.nComponents}] componentType[${attr.componentType}]`
              );
              attr.bindAttribute = function () {
                gl.bindBuffer(gl.ARRAY_BUFFER, attr.buffer);
                gl.enableVertexAttribArray(loc);
                gl.vertexAttribPointer(
                  loc,
                  attr.nComponents,
                  attr.componentType,
                  false,
                  attr.stride,
                  attr.offset
                );
              };
            }
          }
          attr.bindAttribute();
        }

        // 화면 출력
        if (obj.indices) {
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.indices);
          gl.drawElements(gl.TRIANGLES, obj.nElements, gl.UNSIGNED_SHORT, 0);
        } else {
          gl.drawArrays(gl.TRIANGLES, 0, obj.nElements);
        }
      });
    });
  }

  // var glext_ft = gl.getExtension("GLI_frame_terminator");
  // console.log("glext_ft:", glext_ft);

  let then = 0;
  gl.clearColor(0, 0, 0, 1);
  // animateSkin(skins[0], 0);
  function render(t) {
    onResize();

    if (t) {
      let angle = Math.sin(t * 0.001) * 0.5;
      animateSkin(skins[0], angle);
    }

    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;

    let m1 = m4.perspective(
      settings.fov * RADIAN_IN_DEG,
      aspect,
      settings.cameraNear,
      settings.cameraFar
    );

    let cameraMat = m4.yRotation(settings.cameraAngle * RADIAN_IN_DEG);
    // prettier-ignore
    cameraMat = m4.translate(cameraMat, settings.cameraX, settings.cameraY, settings.cameraZ);
    cameraMat = m4.lookAt(cameraMat.slice(12, 15), target, up);

    let worldMat = m4.translation(
      settings.translationX,
      settings.translationY,
      settings.translationZ
    );
    worldMat = m4.xRotate(worldMat, settings.rotationX * RADIAN_IN_DEG);
    worldMat = m4.yRotate(worldMat, settings.rotationY * RADIAN_IN_DEG);
    worldMat = m4.zRotate(worldMat, settings.rotationZ * RADIAN_IN_DEG);

    {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      scenes.forEach((scene) => {
        scene.updateWorld();
        scene.forEach((it) => {
          renderNode(normal_program, m1, cameraMat, worldMat, it);
        });
      });
    }

    // if (glext_ft) {
    //   glext_ft.frameTerminator();
    // }

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
})();
