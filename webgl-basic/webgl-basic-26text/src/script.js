/* 
  # text
  
  webgl에서 화면에 텍스트를 표시하는 방법을 알아보자. 가장 쉬운 방법은 HTML 태그를 사용해서 캔버스 위에 표시하는 방법이다.
  HTML의 기능을 충분히 활용해서 할 수 있다.
    <div class="container">
      <canvas id="c"></canvas>
      <div id="overlay">
        <div>Time: <span id="time"></span></div>
        <div>ID: <span id="id"></span></div>
        <div>Pos: <span id="pos"></span></div>
      </div>
    </div>
  
  CSS로 화면 위치를 조절한다.
    .container {
      position: relative;
      margin: 0;
      min-height: 100vh;
    }
    #overlay {
      position: absolute;
      left: 10px;
      top: 10px;
      margin: 0;
      z-index: 10;
      overflow: hidden;
    }

  이를 화면에 표시할 때에는 텍스트 노드를 사용하는게 성능상에 이점이 있지만 innerHTML을 사용해도 된다.
    let timeText = time.appendChild(document.createTextNode(""));
    timeText.nodeValue = now Date().toISOString();
    
  표시위치를 변경하는 방법도 쉽다.
    overlay.style.left = Math.floor(posX) + "px";
    overlay.style.top = Math.floor(posY) + "px";
  
  단점은 캔버스 위에 그리기 때문에 깊이 표현은 불가능핟.
    
  다른 방법은 캔버스 위에 2D용 캔버스를 위치해서 텍스트를 출력합니다. 이미지 위에 다른 이미지를 오베레이한다고 보면된다.
  캔버스를 활용해서 다양한 효과를 사용할 수 있다는 장점이 있지만 이것도 앞에 HTML을 사용한 방식과 비슷한 한계가 있다.
  
  조금 발전된 방법은 캔버스에 텍스트를 작성하고 이 캔버스를 텍스처로 사용하는 방법이다.
  webgl 안에 들어오기 때문에 webgl의 모든 기능을 적용할 수 있다.
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
    
  텍스트가 작성된 생성한 캔버스를 텍스처로 만든다.
    const textWidth = 150, textHeight = 26;
    let textCanvas = createTextCanvas("Cubic World!", textWidth, textHeight);
    let texText = createTexture(gl, 2);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textCanvas);
  
  텍스트 텍스처를 출력할 셰이더가 필요하다. 단순 텍스처 출력하는 셰이더이기 때문에 단순한다.
  그리고 텍스처를 출력할 사각형 객체가 필요하다. 그리고 위치와 크기는 적당히 수정한다.
  텍스트 배경이 있기 때문에 이를 제거해보자. 블렌드를 사용해 혼합함수로 픽셀을 결합한다.
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  
  이렇게 해도 텍스트가 글자와 겹치는 부분에서 희미한 흰색이 보인다. 이는 깊이 버퍼로 인해 이미 그려진 텍스트와 겹치면서 발생한다.
  해결 방법은 먼저 블렌드를 끄고 깊이버퍼 업데이트를 키고 불투명체를 먼저 그린다.
    gl.disable(gl.BLEND);
    gl.depthMask(true);
    
  다음으로 블렌드를 키고 깊이버퍼 업데이트를 끄고 z로 정렬된 투명체를 그린다.
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
  
  Ref:
    https://webglfundamentals.org/webgl/lessons/ko/webgl-text-html.html
    https://webglfundamentals.org/webgl/lessons/ko/webgl-text-canvas2d.html
    https://webglfundamentals.org/webgl/lessons/resources/webgl-state-diagram.html
    
  GLSL spec: https://www.khronos.org/files/opengles_shading_language.pdf
  Linear algebra: https://www.youtube.com/watch?v=kjBOesZCoqc&list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab
*/
///////////////////////////// enviroments ///////////////////////////////
const RADIAN_IN_DEG = Math.PI / 180;

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

  let positions = lines.reduce((prev, it) => prev.concat(vertices[it]), []);

  return { positions };
}

// 이미지 전체가 한면을 채우는 텍스처 좌표을 사각형 면 개수(nFaces)에 맞게 적용한다.
function applyNormalTexCoord(gl, nFaces = 6) {
  let normalTexcoord = createNormalTexCoord(6);

  gl.bufferData(gl.ARRAY_BUFFER, normalTexcoord, gl.STATIC_DRAW);
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

/* 텍스처 생성
  사용예)
  defineTexture(gl, program, "u_image");
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
*/
// function defineTexture(gl, program, name, defaultUnitNo = 0) {
//   let maxUnit = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
//   if (defaultUnitNo > maxUnit) {
//     throw new Error(
//       `unitNo($unitNo) is over than MAX_TEXTURE_IMAGE_UNITS(${maxUnit})`
//     );
//   }

//   // 유니폼에 유닛 설정
//   let loc = gl.getUniformLocation(program, name);
//   if (0 > loc || null === loc || undefined === loc) {
//     throw new Error(`${name} texture is not found!`);
//   }

//   gl.uniform1i(loc, defaultUnitNo); // 유닛 설정

//   // return createTexture(gl, unitNo);
//   return loc;
// }

function createTexture(gl, unitNo = -1) {
  let maxUnit = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
  if (0 <= unitNo && maxUnit - 1 < unitNo) {
    throw new Error(
      `unitNo($unitNo) is over than MAX_TEXTURE_IMAGE_UNITS(${maxUnit})`
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
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
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

  let indices = [2, 0, 3, 3, 0, 1];

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
  const indices = [
    0, 1, 2, 2, 1, 3, // front
    6, 7, 4, 4, 7, 5, // back
    4, 5, 0, 0, 5, 1, // left
    2, 3, 6, 6, 3, 7, // right
    4, 0, 6, 6, 0, 2, // top
    1, 5, 3, 3, 5, 7, // bottom
  ];

  const faceNormals = [
    [+0, +0, +1], // front
    [+0, +0, -1], // back
    [-1, +0, +0], // left
    [+1, +0, +0], // right
    [+0, +1, +0], // top
    [+0, -1, +0] // bottom
  ];

  let a_position = new Float32Array(
    indices.reduce((agg, it) => agg.concat(vertices[it]), [])
  );
  // prettier-ignore
  let a_normal = new Float32Array(faceNormals.reduce((agg, it) => agg.concat(Array(6).fill(it).flat()), []));

  return { a_position, a_normal };
}

function setBox(gl, x, y, z, w, h, d) {
  let box = createBox(w, h, d);
  let a_position = [];
  for (let i = 0; i < box.positions.length; i += 3) {
    a_positions.push(box.a_position[i] + x + w * 0.5);
    a_positions.push(box.a_position[i + 1] + y + h * 0.5);
    a_positions.push(box.a_position[i + 2] + z + d * 0.5);
  }

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(a_positions), gl.STATIC_DRAW); // 데이터 저장

  return a_positions.length / 3;
}

// 사각형 생성 함수
function setRectangle(gl, x, y, width, height) {
  let rect = createRectangle(width - x, height - y);
  for (let i = 0; i < rect.a_position.length; i += 3) {
    rect.a_position[i] += x;
    rect.a_position[i + 1] += y;
  }

  gl.bufferData(gl.ARRAY_BUFFER, rect.a_position, gl.STATIC_DRAW); // 데이터 저장
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
  const vertices = [
    [-w, +h], // 0
    [-w, -h], // 1
    [+w, +h], // 2
    [+w, -h] // 3
  ];

  const indices = [0, 1, 2, 2, 1, 3];
  let a_position = new Float32Array(
    indices.reduce((agg, it) => agg.concat(vertices[it]), [])
  );

  return { a_position, nVertices: a_position.length / 2 };
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
    throw new Error(name + " attribute is not found!");
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
  transformVector: function (m, v, dst) {
    dst = dst || [];
    for (var i = 0; i < 4; ++i) {
      dst[i] = 0.0;
      for (var j = 0; j < 4; ++j) {
        dst[i] += v[j] * m[j * 4 + i];
      }
    }
    return dst;
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
  frustum: function (left, right, bottom, top, near, far, dst) {
    // dst = dst || new MatType(16);
    dst = dst || [];

    var dx = right - left;
    var dy = top - bottom;
    var dz = far - near;

    dst[0] = (2 * near) / dx;
    dst[1] = 0;
    dst[2] = 0;
    dst[3] = 0;
    dst[4] = 0;
    dst[5] = (2 * near) / dy;
    dst[6] = 0;
    dst[7] = 0;
    dst[8] = (left + right) / dx;
    dst[9] = (top + bottom) / dy;
    dst[10] = -(far + near) / dz;
    dst[11] = -1;
    dst[12] = 0;
    dst[13] = 0;
    dst[14] = (-2 * near * far) / dz;
    dst[15] = 0;

    return dst;
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
  },
  inverse: function (m) {
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
    var tmp_12 = m20 * m31;
    var tmp_13 = m30 * m21;
    var tmp_14 = m10 * m31;
    var tmp_15 = m30 * m11;
    var tmp_16 = m10 * m21;
    var tmp_17 = m20 * m11;
    var tmp_18 = m00 * m31;
    var tmp_19 = m30 * m01;
    var tmp_20 = m00 * m21;
    var tmp_21 = m20 * m01;
    var tmp_22 = m00 * m11;
    var tmp_23 = m10 * m01;

    // prettier-ignore
    var t0 = tmp_0 * m11 + tmp_3 * m21 + tmp_4 * m31 -
      (tmp_1 * m11 + tmp_2 * m21 + tmp_5 * m31);
    // prettier-ignore
    var t1 = tmp_1 * m01 + tmp_6 * m21 + tmp_9 * m31 -
      (tmp_0 * m01 + tmp_7 * m21 + tmp_8 * m31);
    // prettier-ignore
    var t2 = tmp_2 * m01 + tmp_7 * m11 + tmp_10 * m31 -
      (tmp_3 * m01 + tmp_6 * m11 + tmp_11 * m31);
    // prettier-ignore
    var t3 = tmp_5 * m01 + tmp_8 * m11 + tmp_11 * m21 -
      (tmp_4 * m01 + tmp_9 * m11 + tmp_10 * m21);

    var d = 1.0 / (m00 * t0 + m10 * t1 + m20 * t2 + m30 * t3);

    // prettier-ignore
    return [ d * t0, d * t1, d * t2, d * t3,
      d * (tmp_1 * m10 + tmp_2 * m20 + tmp_5 * m30 -
          (tmp_0 * m10 + tmp_3 * m20 + tmp_4 * m30)),
      d * (tmp_0 * m00 + tmp_7 * m20 + tmp_8 * m30 -
          (tmp_1 * m00 + tmp_6 * m20 + tmp_9 * m30)),
      d * (tmp_3 * m00 + tmp_6 * m10 + tmp_11 * m30 -
          (tmp_2 * m00 + tmp_7 * m10 + tmp_10 * m30)),
      d * (tmp_4 * m00 + tmp_9 * m10 + tmp_10 * m20 -
          (tmp_5 * m00 + tmp_8 * m10 + tmp_11 * m20)),
      d * (tmp_12 * m13 + tmp_15 * m23 + tmp_16 * m33 -
          (tmp_13 * m13 + tmp_14 * m23 + tmp_17 * m33)),
      d * (tmp_13 * m03 + tmp_18 * m23 + tmp_21 * m33 -
          (tmp_12 * m03 + tmp_19 * m23 + tmp_20 * m33)),
      d * (tmp_14 * m03 + tmp_19 * m13 + tmp_22 * m33 -
          (tmp_15 * m03 + tmp_18 * m13 + tmp_23 * m33)),
      d * (tmp_17 * m03 + tmp_20 * m13 + tmp_23 * m23 -
          (tmp_16 * m03 + tmp_21 * m13 + tmp_22 * m23)),
      d * (tmp_14 * m22 + tmp_17 * m32 + tmp_13 * m12 -
          (tmp_16 * m32 + tmp_12 * m12 + tmp_15 * m22)),
      d * (tmp_20 * m32 + tmp_12 * m02 + tmp_19 * m22 -
          (tmp_18 * m22 + tmp_21 * m32 + tmp_13 * m02)),
      d * (tmp_18 * m12 + tmp_23 * m32 + tmp_15 * m02 -
          (tmp_22 * m32 + tmp_14 * m02 + tmp_19 * m12)),
      d * (tmp_22 * m22 + tmp_16 * m02 + tmp_21 * m12 -
          (tmp_20 * m12 + tmp_23 * m22 + tmp_17 * m02))
    ];
  },
  transpose: function (m) {
    // prettier-ignore
    return [
      m[0], m[4], m[8], m[12],
      m[1], m[5], m[9], m[13],
      m[2], m[6], m[10], m[14],
      m[3], m[7], m[11], m[15],
    ];
  }
};

function isPowerOf2(value) {
  return (value & (value - 1)) === 0;
}

///////////////////////////////// WebGL //////////////////////////////////
(function main() {
  let timeText = time.appendChild(document.createTextNode(""));
  let idText = id.appendChild(document.createTextNode(""));
  let posText = pos.appendChild(document.createTextNode(""));

  const gl = c.getContext("webgl");

  // WEBGL_depth_texture 확인
  const ext = gl.getExtension("WEBGL_depth_texture");
  if (!ext) {
    throw new Error("WEBGL_depth_texture not supported!");
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
  gl.enable(gl.SCISSOR_TEST); // diviced by area
  // gl.enable(gl.BLEND); //!!
  // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); //!!
  // 문제는 Canvas 2D API가 미리 곱한 알파 값만 나타낸다는 겁니다. 캔버스의 컨텐츠를 텍스처에 업로드할 때 WebGL은 값을 미리 곱하지 않으려고 하지만 미리 곱한 알파는 손실되었기 때문에 이를 완벽히 수행할 수 없습니다.
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true); // 미리 곱하지 말라고 WebGL에 지시해봅시다.!!
  // 이는 미리 곱한 알파 값을 gl.texImage2D와 gl.texSubImage2D에 제공하라고 WebGL에 지시합니다. gl.texImage2D에 전달된 데이터가 이미 Canvas 2D 데이터처럼 미리 곱해졌다면 WebGL은 그냥 전달만 합니다.

  const target = [0, 0, 0];
  const up = [0, 1, 0];
  const WIDTH = gl.canvas.width;
  const HEIGHT = gl.canvas.height;
  const DEPTH = 2000;
  const depthTextureSize = 512;
  const [texWidth, texHeight] = [512, 512];

  const cameraRange = 30;

  let settings = {
    cameraAngle: 5, // 35
    cameraX: 0,
    cameraY: 10,
    cameraZ: cameraRange,
    fov: 30,
    cameraNear: 5,
    cameraFar: 200,
    translationX: 0,
    translationY: 0,
    translationZ: 0,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0
  };

  // 설정 UI
  const gui = new dat.GUI();
  gui.remember(settings);
  gui.close();

  gui.add(settings, "cameraAngle", -360, 360, 0.01);
  gui.add(settings, "cameraX", -50, 50, 0.01);
  gui.add(settings, "cameraY", -50, 50, 0.01);
  gui.add(settings, "fov", 0, 180, 0.1);

  const targetTexture = createTexture(gl, 0);
  const depthBuffer = gl.createRenderbuffer(gl);
  gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);

  function setFramebufferAttachementSizes(width, height) {
    // 텍스처와 렌더버퍼 크기 조정
    gl.bindTexture(gl.TEXTURE_2D, targetTexture);
    // prettier-ignore
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
    // prettier-ignore
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
  }

  setFramebufferAttachementSizes(1, 1);

  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

  // 생상 어테치먼트 첨부
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    targetTexture,
    0
  );

  // 깊이 버퍼와 대상 텍스처 크기 같게 설정
  gl.framebufferRenderbuffer(
    gl.FRAMEBUFFER,
    gl.DEPTH_ATTACHEMENT,
    gl.RENDERBUFFER,
    depthBuffer
  );

  checkFramebuffer(gl);

  const textWidth = 150;
  const textHeight = 26;
  let textCanvas = createTextCanvas("Cubic World!", textWidth, textHeight);
  let texText = createTexture(gl, 2);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    textCanvas
  );
  gl.activeTexture(gl.TEXTURE0);

  // normal 프로그램 생성!!
  let normal_program = {
    program: createProgram(gl, normal_vshader.text, normal_fshader.text)
  };

  {
    let program = normal_program;
    gl.useProgram(program.program);

    Object.assign(program, {
      // attributes
      a_position: defineAttribute2(gl, program, "a_position", 3),
      a_texcoord: defineAttribute2(gl, program, "a_texcoord", 2),
      // uniforms
      u_projection: gl.getUniformLocation(program.program, "u_projection"),
      u_world: gl.getUniformLocation(program.program, "u_world"),
      u_view: gl.getUniformLocation(program.program, "u_view"),
      u_texture: gl.getUniformLocation(program.program, "u_texture"),
      u_colorMult: gl.getUniformLocation(program.program, "u_colorMult")
    });
    // initialization
    // program.a_texcoord.bindBuffer();
    // applyNormalTexCoord(gl, 6);
    let unitNo = 1;
    createTexture(gl, unitNo);
    applyCheckerTexture(gl, 4, 4);
    gl.uniform1i(program.u_texture, unitNo);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  // pick 프로그램 생성!!
  let pick_program = {
    program: createProgram(gl, pick_vshader.text, pick_fshader.text)
  };
  {
    let program = pick_program;
    gl.useProgram(program.program);

    Object.assign(program, {
      // attributes
      a_position: defineAttribute2(gl, program, "a_position", 3),
      // uniforms
      u_projection: gl.getUniformLocation(program.program, "u_projection"),
      u_world: gl.getUniformLocation(program.program, "u_world"),
      u_view: gl.getUniformLocation(program.program, "u_view"),
      u_id: gl.getUniformLocation(program.program, "u_id")
    });

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  // tex 프로그램 생성!!
  let tex_program = {
    program: createProgram(gl, tex_vshader.text, tex_fshader.text)
  };
  {
    let program = tex_program;
    gl.useProgram(program.program);

    Object.assign(program, {
      // attributes
      a_position: defineAttribute2(gl, program, "a_position", 2),
      a_texcoord: defineAttribute2(gl, program, "a_texcoord", 2),
      // uniforms
      u_projection: gl.getUniformLocation(program.program, "u_projection"),
      u_world: gl.getUniformLocation(program.program, "u_world"),
      u_view: gl.getUniformLocation(program.program, "u_view"),
      u_texture: gl.getUniformLocation(program.program, "u_texture")
    });

    let unitNo = 2;
    gl.activeTexture(gl.TEXTURE0 + unitNo);
    gl.bindTexture(gl.TEXTURE2D, texText);
    gl.uniform1i(program.u_texture, unitNo);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  let cube = createBox(3, 3, 3);
  cube.a_texcoord = createNormalTexCoord(6);
  cube.u_colorMult = [1, 0.5, 0.5, 1];
  cube.u_world = m4.translation(0, 0, 0);

  let rect = createRectangle(1, 1);
  rect.a_texcoord = createNormalTexCoord(1);
  rect.u_world = m4.translation(0, 2, 0);

  // 그려질 객체 배열
  const drawingObjects = [];
  const cubics = [];

  let _id = 1;
  arrangeArray(5, cameraRange, function (x, y, z) {
    let obj = Object.assign({}, cube);
    obj.id = _id;
    obj.u_world = m4.translation(x, y, z);

    drawingObjects.push(obj);
    ++_id;

    let obj2 = Object.assign({}, rect);
    obj2.u_world = m4.translation(x, y + 2, z);
    cubics.push(obj2);
  });

  let _cnt = 0;

  // 객체 화면으로 출력
  function drawObject(program, obj, worldMat) {
    // 객체의 world 행렬과 곱해서 최종 월드 행렬 적용
    if (program.u_world) {
      let objWorldMat = worldMat
        ? m4.multiply(worldMat, obj.u_world)
        : obj.u_world;
      gl.uniformMatrix4fv(program.u_world, false, objWorldMat);
    }

    if (program.u_id && obj.u_id) {
      gl.uniform4fv(program.u_id, obj.u_id);
    }

    if (obj.u_colorMult && program.u_colorMult) {
      gl.uniform4fv(program.u_colorMult, obj.u_colorMult);
    }

    if (obj.a_texcoord && program.a_texcoord) {
      program.a_texcoord.bindBuffer();
      gl.bufferData(gl.ARRAY_BUFFER, obj.a_texcoord, gl.STATIC_DRAW);
      program.a_texcoord.vertexAttribPointer();
    }

    program.a_position.bindBuffer();
    gl.bufferData(gl.ARRAY_BUFFER, obj.a_position, gl.STATIC_DRAW);
    program.a_position.vertexAttribPointer();

    // 화면 출력
    let cnt = obj.nVertices ? obj.nVertices : obj.a_position.length / 3;
    gl.drawArrays(obj.type || gl.TRIANGLES, 0, cnt);
  }

  // 화면 그려주는 함수
  function drawScene(program, projectionMat, cameraMat, worldMat) {
    // 프로그램 활성화
    gl.useProgram(program.program);

    let viewMat = m4.inverse(cameraMat);
    gl.uniformMatrix4fv(program.u_view, false, viewMat);

    gl.uniformMatrix4fv(program.u_projection, false, projectionMat);

    if (program.u_viewWorld) {
      gl.uniform3fv(program.u_viewWorld, cameraMat.slice(12, 15));
    }
    if (program.u_fogNear) {
      gl.uniform1f(program.u_fogNear, settings.fogNear);
    }
    if (program.u_fogFar) {
      gl.uniform1f(program.u_fogFar, settings.fogFar);
    }
    // 각 객체별로 화면 출력
    drawingObjects.forEach((it) => {
      drawObject(program, it, worldMat);
    });
  }

  function toStr(a, fixed = 1) {
    return a.map((it) => it.toFixed(fixed)).join();
  }

  let pickedObj = null;
  let orgColor = null;
  let then = 0;
  (function render(t) {
    onResize();

    if (t) {
      let dt = t - then;
      then = t;
      dt *= 0.01;
      settings.rotationY += -0.7 * dt;
      settings.rotationX += -0.4 * dt;
    }

    const pixelX = (mouseX * gl.canvas.width) / gl.canvas.clientWidth;
    const pixelY =
      gl.canvas.height -
      (mouseY * gl.canvas.height) / gl.canvas.clientHeight -
      1;

    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const top =
      Math.tan(settings.fov * RADIAN_IN_DEG * 0.5) * settings.cameraNear;
    const bottom = -top;
    const l = aspect * bottom;
    const r = aspect * top;
    const w = Math.abs(r - l);
    const h = Math.abs(top - bottom);

    const subLeft = l + (pixelX * w) / gl.canvas.width;
    const subBottom = bottom + (pixelY * h) / gl.canvas.height;
    const subWidth = w / gl.canvas.width;
    const subHeight = h / gl.canvas.height;

    let m1 = m4.perspective(
      settings.fov * RADIAN_IN_DEG,
      aspect,
      settings.cameraNear,
      settings.cameraFar
    );

    const m2 = m4.frustum(
      subLeft,
      subLeft + subWidth,
      subBottom,
      subBottom + subHeight,
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

    gl.disable(gl.BLEND); //!!
    gl.depthMask(true); //!!

    {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      // 화면 분할 처리
      gl.viewport(0, 0, gl.canvas.clientWidth, gl.canvas.clientHeight);
      gl.scissor(0, 0, gl.canvas.clientWidth, gl.canvas.clientHeight);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      // 화면 출력
      // gl.depthFunc(gl.LESS); // 기본 깊이 검사!!
      drawScene(pick_program, m2, cameraMat);
    }

    {
      // 픽셀값을 읽어옴
      let data = new Uint8Array(4); // 픽셀값 저장할 변수
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, data);
      const id = data[0] + (data[1] << 8) + (data[2] << 16) + (data[3] << 24);

      if (0 < id) {
        timeText.nodeValue = (t / 1000).toFixed(2) + " s";
        idText.nodeValue = id;

        if (pickedObj && pickedObj.id !== id) {
          pickedObj.u_colorMult = orgColor;
          pickedObj = null;
        }
      }

      if (!pickedObj) {
        pickedObj = drawingObjects.find((it) => id == it.id);
        if (pickedObj) {
          orgColor = pickedObj.u_colorMult;
          pickedObj.u_colorMult = [0, 1, 0, 1];
        }
      }

      if (pickedObj) {
        let perspectiveView = m4.multiply(m1, m4.inverse(cameraMat));

        let world = m4.multiply(worldMat, pickedObj.u_world);
        let matrix = m4.multiply(perspectiveView, world);
        let pos = m4.transformVector(matrix, [0, 0, 0, 1]);
        pos[0] /= pos[3];
        pos[1] /= pos[3];
        let posX = (pos[0] * 0.5 + 0.5) * gl.canvas.width;
        let posY = (pos[1] * -0.5 + 0.5) * gl.canvas.height;
        let rc = overlay.getBoundingClientRect();
        posText.nodeValue = toStr([posX, posY]);
        overlay.style.left = Math.floor(posX - rc.width / 2) + "px";
        overlay.style.top = Math.floor(posY - rc.height / 2) + "px";
      } else {
        posText.nodeValue = "";
      }
    }
    // 현재 F를 그린 다음 텍스트를 그리고, 다음 F와 텍스트 그리기를 반복하고 있는데요. Depth buffer가 있기 때문에, F의 텍스트를 그릴 때 블렌딩으로 일부 픽셀이 배경색을 유지하더라도, 깊이 버퍼는 여전히 업데이트됩니다. 다음 F를 그릴 때 F의 일부가 이전에 그려진 텍스트의 픽셀 뒤에 있다면 그려지지 않을 겁니다.
    // 대부분의 투명도 렌더링 문제에 가장 일반적인 해결책은 모든 불투명체를 먼저 그리고, 깊이 버퍼 테스트를 켜고 깊이 버퍼 업데이트는 끈 상태에서, z거리로 정렬된 투명한 물체를 모두 그리는 겁니다.
    {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      drawScene(normal_program, m1, cameraMat, worldMat);
    }

    gl.enable(gl.BLEND); //!!
    // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); //!!
    // 이전에는 src color에 알파를 곱했습니다. 이게 SRC_ALPHA가 의미하는 것입니다. 하지만 이제 텍스처의 데이터에 이미 알파가 곱해졌는데요. 이것이 사전 곱셈이 의미하는 바입니다. 따라서 곱셈에 GPU가 필요하지 않습니다. 그러니 1로 곱함을 의미하는 ONE으로 설정합시다.
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); //!!
    gl.depthMask(false); //!!
    {
      gl.useProgram(tex_program.program);
      gl.uniformMatrix4fv(tex_program.u_projection, false, m1);
      let viewMat = m4.inverse(cameraMat);
      gl.uniformMatrix4fv(tex_program.u_view, false, viewMat);

      cubics.forEach((it, i) => {
        let cubic = drawingObjects[i];
        let world = m4.multiply(worldMat, cubic.u_world);
        // let viewZ = worldMat[14];
        // viewZ = (viewZ / 13 + 1) / 2;
        // if (++_cnt < 30) console.log(`viewZ[${viewZ}]`);

        world = m4.translation(world[12], world[13] + 2, world[14]);
        // let scale = 1 / (30 + (viewZ + 15) / 30);
        let scale = 1 / 30;
        world = m4.scale(world, textWidth * scale, textHeight * scale, 1);

        it.u_world = world;
        drawObject(tex_program, it);
      });
    }

    requestAnimationFrame(render);
  })();
  // setInterval(() => render(Date.now()), 33);
})();
