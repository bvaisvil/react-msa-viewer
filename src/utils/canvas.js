const convert = require('color-convert');

// TODO: use more abstract, non-canvas-like API
class DrawingBase {
  constructor(el) {
    this.el = el;
    this.state = {};
  }

  updateEl(el) {
    this.el = el;
  }

  // props
  font(fontName) {
    this.state.font = fontName;
  }

  globalAlpha(globalAlpha) {
    this.state.globalAlpha = globalAlpha;
  }

  startDrawingFrame() {
    this.clear();
  }
  endDrawingFrame() {}
  save(){}
  restore(){}
}

class CanvasCharCache {
  constructor(g) {
    this.cache = {};
    this.cacheHeight = 0;
    this.cacheWidth = 0;
  }

  // returns a cached canvas
  getFontTile(letter, width, height, font) {
    // validate cache
    if (width !== this.cacheWidth || height !== this.cacheHeight || font !== this.font) {
      this.updateDimensions(width, height);
      this.font = font;
    }

    if (this.cache[letter] === undefined) {
      this.createTile(letter, width, height);
    }

    return this.cache[letter];
  }

  // creates a canvas with a single letter
  // (for the fast font cache)
  createTile(letter, width, height, font) {
    const canvas = this.cache[letter] = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    this.ctx = canvas.getContext('2d');
    this.ctx.font = this.font + "px mono";

    this.ctx.textBaseline = 'middle';
    this.ctx.textAlign = "center";

    return this.ctx.fillText(letter, width / 2, height / 2, width, font);
  }
  updateDimensions(width, height) {
    this.invalidate();
    this.cacheWidth = width;
    this.cacheHeight = height;
  }

  invalidate() {
    // TODO: destroy the old canvas elements
    this.cache = {};
  }
}

class Canvas extends DrawingBase {
  constructor(el) {
    super(el);
    this.ctx = el.getContext('2d');
    this.cache = new CanvasCharCache();
  }

  clear() {
    // fastest way to clear the canvas
    // http://jsperf.com/canvas-clear-speed/25
    this.el.width = this.el.width;
  }

  fillRect(x, y, width, height) {
    this.ctx.fillRect(x, y, width, height);
  }

  // TODO: rename as its effectively only one letter
  fillText(text, x, y) {
    //this.ctx.fillText(text, x, y);
    return this.ctx.drawImage(
      this.cache.getFontTile(text, 20, 20, this.ctx.font),
      x, y, 20, 20,
    );
  }

  // props
  font(fontName) {
    this.ctx.font = fontName;
  }

  fillStyle(fillStyle) {
    this.ctx.fillStyle = fillStyle;
  }

  globalAlpha(globalAlpha) {
    this.ctx.globalAlpha = globalAlpha;
  }

  save() {
    this.ctx.save();
  }

  restore() {
    this.ctx.restore();
  }
}

class WebGL extends DrawingBase {

  constructor(el) {
    super(el);
    this.gl = el.getContext('webgl') || el.getContext('experimental-webgl');
    this.init();
    this.initEl();
  }

  initEl() {
    this.gl.viewportWidth = this.el.width;
    this.gl.viewportHeight = this.el.height;
    //this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
    this.gl.viewport(0, 0, this.el.width, this.el.height);
  }

  init() {
    this.initBuffers();
    this.initProgram();
    this.bindVariables();
  }

  initShaders() {
    const vertexShaderSource = `
      attribute vec2 a_position;

      uniform vec2 u_resolution;

      void main() {
        // convert the rectangle from pixels to 0.0 to 1.0
        vec2 zeroToOne = a_position / u_resolution;

        // convert from 0->1 to 0->2
        vec2 zeroToTwo = zeroToOne * 2.0;

        // convert from 0->2 to -1->+1 (clipspace)
        vec2 clipSpace = zeroToTwo - 1.0;

        gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
      }
    `;
    this.vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);

    const fragmentShaderSource = `
      precision mediump float;
      uniform vec4 u_color;
      void main() {
        gl_FragColor = vec4(
          u_color[0] / 255.,
          u_color[1] / 255.,
          u_color[2] / 255.,
          u_color[3]
        );
      }
    `;
    this.fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);
  }

  createShader(shaderType, shaderSource) {
    const shader = this.gl.createShader(shaderType);
    this.gl.shaderSource(shader, shaderSource);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.log(this.gl.getShaderInfoLog(shader));
    }
    return shader;
  }

  initBuffers() {
    this.squareBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.squareBuffer);
  }

  initProgram() {
    this.initShaders();
    // setup a GLSL program
    this.program = this.gl.createProgram(this.gl);
    this.gl.attachShader(this.program, this.vertexShader);
    this.gl.attachShader(this.program, this.fragmentShader);
    this.gl.linkProgram(this.program);
    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      console.log("Could not initialize shaders");
    }
    this.gl.useProgram(this.program);
  }

  bindVariables() {
    this.resolutionUniformLocation = this.gl.getUniformLocation(this.program, "u_resolution");
    this.gl.uniform2f(this.resolutionUniformLocation, this.gl.canvas.width, this.gl.canvas.height);

    // TODO: difference between uniform and attrib location
    this.colorUniformLocation = this.gl.getUniformLocation(this.program, "u_color");
    this.positionLocation = this.gl.getAttribLocation(this.program, "a_position");
  }

  static isSupported(el) {
    try {
      return el.getContext("webgl") || el.getContext("experimental-webgl");
    } catch (e) {
      return false;
    }
  }

  clear() {
    this.gl.clearColor(1, 1, 1, 1);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  startDrawingFrame() {
    super.startDrawingFrame();
    this.bufferTile();
  }

  fillStyle(fillStyle) {
    if (!fillStyle)
      return;
    if (fillStyle[0] === "#") {
      this.state.fillStyle = convert.hex.rgb(fillStyle.slice(1));
    } else {
      this.state.fillStyle = convert.keyword.rgb(fillStyle);
    }
  }

  bufferTile(x, y, width, height) {
    //const x = 0, y = 0;
    //const width = 20, height = 20;
    const x1 = x;
    const x2 = x + width;
    const y1 = y;
    const y2 = y + height;

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.squareBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([
       x1, y1,
       x2, y1,
       x1, y2,
       x1, y2,
       x2, y1,
       x2, y2,
    ]), this.gl.STATIC_DRAW);
  }

  fillRect(x, y, width, height) {

    // set a color
    this.gl.uniform4f(this.colorUniformLocation,
      this.state.fillStyle[0],
      this.state.fillStyle[1],
      this.state.fillStyle[2],
      1);
      //this.state.globalAlpha);

    this.gl.enableVertexAttribArray(this.positionLocation);
    this.gl.vertexAttribPointer(this.positionLocation, 2, this.gl.FLOAT, false, 0, 0);

    this.bufferTile(x, y, width, height);
    const offset = 0;
    const count = 6; // number of vertices
    this.gl.drawArrays(this.gl.TRIANGLES, offset, count);
  }

  fillText(text, x, y) {
    // TODO
    //this.ctx.fillText(text, x, y);
  }

  // TODO: destroy canvas
  // TODO: resize events
}

export {Canvas, WebGL};
