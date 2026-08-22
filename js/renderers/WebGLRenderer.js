/**
 * @fileoverview Renderizador WebGL encargado del dibujo de geometrías, fondos,
 * bordes y líneas acelerados por tarjeta gráfica (GPU).
 */

import { hexToRgbA } from '../utils/color.js';

/**
 * Código fuente GLSL para el Vertex Shader.
 * Transforma coordenadas de pantalla en píxeles a coordenadas de recorte WebGL (-1.0 a +1.0).
 */
const VERTEX_SHADER_SRC = `
    attribute vec2 a_position;
    uniform vec2 u_resolution;
    void main() {
        vec2 zeroToOne = a_position / u_resolution;
        vec2 zeroToTwo = zeroToOne * 2.0;
        vec2 clipSpace = zeroToTwo - 1.0;
        // Invertimos el eje Y para que (0,0) esté en la esquina superior izquierda
        gl_Position = vec4(clipSpace * vec2(1.0, -1.0), 0.0, 1.0);
    }
`;

/**
 * Código fuente GLSL para el Fragment Shader.
 * Aplica el color RGBA definido por el uniform a cada píxel rasterizado.
 */
const FRAGMENT_SHADER_SRC = `
    precision mediump float;
    uniform vec4 u_color;
    void main() {
        gl_FragColor = u_color;
    }
`;

export class WebGLRenderer {
    /**
     * Inicializa el contexto WebGL, shaders, buffers y atributos necesarios.
     * @param {HTMLCanvasElement} canvas - Elemento canvas HTML para el contexto WebGL.
     * @throws {Error} Si el navegador o hardware no soporta WebGL.
     */
    constructor(canvas) {
        /** @type {HTMLCanvasElement} */
        this.canvas = canvas;
        /** @type {WebGLRenderingContext|null} */
        this.gl = canvas.getContext('webgl', { antialias: true, alpha: false, preserveDrawingBuffer: false });

        if (!this.gl) {
            throw new Error('WebGL no está soportado en este navegador o entorno.');
        }

        this.initShaders();
        this.initBuffers();
        this.setupGLState();
    }

    /**
     * Compila un shader individual de tipo VERTEX o FRAGMENT.
     * @private
     * @param {number} type - Tipo de shader (`gl.VERTEX_SHADER` o `gl.FRAGMENT_SHADER`).
     * @param {string} source - Código fuente GLSL.
     * @returns {WebGLShader} Shader compilado exitosamente.
     */
    compileShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const info = gl.getShaderInfoLog(shader);
            gl.deleteShader(shader);
            throw new Error(`Error compilando shader: ${info}`);
        }

        return shader;
    }

    /**
     * Inicializa el programa WebGL enlazando los Vertex y Fragment Shaders y
     * localiza las variables de atributos y uniforms.
     * @private
     */
    initShaders() {
        const gl = this.gl;
        const vertexShader = this.compileShader(gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
        const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC);

        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const info = gl.getProgramInfoLog(program);
            throw new Error(`Error enlazando programa WebGL: ${info}`);
        }

        gl.useProgram(program);
        this.program = program;

        // Ubicaciones de uniforms y atributos
        this.positionLocation = gl.getAttribLocation(program, 'a_position');
        this.resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
        this.colorLocation = gl.getUniformLocation(program, 'u_color');
    }

    /**
     * Inicializa el buffer de posiciones para envío de coordenadas a la GPU.
     * @private
     */
    initBuffers() {
        const gl = this.gl;
        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(this.positionLocation);
        gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);

        // Reutilizamos el array tipado de 12 floats (2 triángulos x 3 vértices x 2 coords)
        this.quadArray = new Float32Array(12);
    }

    /**
     * Configura el estado global de WebGL como el canal de mezcla alfa (Alpha Blending).
     * @private
     */
    setupGLState() {
        const gl = this.gl;
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }

    /**
     * Ajusta la resolución del viewport y del canvas según la densidad de píxeles (DPI).
     * @param {number} logicalWidth - Ancho lógico en píxeles CSS.
     * @param {number} logicalHeight - Alto lógico en píxeles CSS.
     * @param {number} dpr - Ratio de píxeles del dispositivo (window.devicePixelRatio).
     */
    resize(logicalWidth, logicalHeight, dpr) {
        const gl = this.gl;
        this.canvas.width = logicalWidth * dpr;
        this.canvas.height = logicalHeight * dpr;
        this.canvas.style.width = `${logicalWidth}px`;
        this.canvas.style.height = `${logicalHeight}px`;

        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.useProgram(this.program);
        gl.uniform2f(this.resolutionLocation, logicalWidth, logicalHeight);
    }

    /**
     * Limpia el búfer de color de la pantalla.
     * @param {number} [r=1.0] - Componente Rojo (0.0 a 1.0).
     * @param {number} [g=1.0] - Componente Verde (0.0 a 1.0).
     * @param {number} [b=1.0] - Componente Azul (0.0 a 1.0).
     * @param {number} [a=1.0] - Componente Alfa (0.0 a 1.0).
     */
    clear(r = 1.0, g = 1.0, b = 1.0, a = 1.0) {
        const gl = this.gl;
        gl.clearColor(r, g, b, a);
        gl.clear(gl.COLOR_BUFFER_BIT);
    }

    /**
     * Dibuja un rectángulo sólido en la GPU a partir de dos triángulos.
     *
     * @param {number} x - Coordenada X superior izquierda (en píxeles lógicos).
     * @param {number} y - Coordenada Y superior izquierda (en píxeles lógicos).
     * @param {number} width - Ancho del rectángulo.
     * @param {number} height - Alto del rectángulo.
     * @param {string} hexColor - Color en formato hexadecimal.
     * @param {number} [alpha=1.0] - Opacidad del rectángulo (0.0 a 1.0).
     */
    drawRect(x, y, width, height, hexColor, alpha = 1.0) {
        if (alpha <= 0 || width <= 0 || height <= 0) return;

        const gl = this.gl;
        const x1 = x;
        const x2 = x + width;
        const y1 = y;
        const y2 = y + height;

        // Asignación rápida en el buffer preasignado
        const arr = this.quadArray;
        arr[0] = x1; arr[1] = y1;
        arr[2] = x2; arr[3] = y1;
        arr[4] = x1; arr[5] = y2;
        arr[6] = x1; arr[7] = y2;
        arr[8] = x2; arr[9] = y1;
        arr[10] = x2; arr[11] = y2;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, arr, gl.DYNAMIC_DRAW);

        gl.uniform4fv(this.colorLocation, hexToRgbA(hexColor, alpha));
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
}
