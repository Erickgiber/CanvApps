/**
 * @fileoverview Punto de entrada principal y orquestador del ciclo de vida de la aplicación.
 * Coordina el bucle de renderizado híbrido (WebGL + Canvas 2D), la gestión del estado
 * y el manejo de eventos de ventana.
 */

import { UI, ANIMATION, THEME } from './config.js';
import { TodoState } from './state/TodoState.js';
import { WebGLRenderer } from './renderers/WebGLRenderer.js';
import { Canvas2DRenderer } from './renderers/Canvas2DRenderer.js';
import { InputController } from './controllers/InputController.js';

class App {
    /**
     * Inicializa los componentes principales del sistema y comienza el bucle de animación.
     */
    constructor() {
        const glCanvas = /** @type {HTMLCanvasElement} */ (document.getElementById('glCanvas'));
        const textCanvas = /** @type {HTMLCanvasElement} */ (document.getElementById('textCanvas'));

        if (!glCanvas || !textCanvas) {
            throw new Error('No se encontraron los elementos canvas requeridos en el DOM.');
        }

        /** @type {TodoState} */
        this.state = new TodoState();

        /** @type {WebGLRenderer} */
        this.glRenderer = new WebGLRenderer(glCanvas);

        /** @type {Canvas2DRenderer} */
        this.renderer2D = new Canvas2DRenderer(textCanvas);

        /** @type {InputController} */
        this.inputController = new InputController(textCanvas, this.state, this.renderer2D);

        /** @type {number} */
        this.logicalWidth = 0;
        /** @type {number} */
        this.logicalHeight = 0;

        this.handleResize = this.onResize.bind(this);
        this.loop = this.render.bind(this);

        this.init();
    }

    /**
     * Configura escuchadores iniciales y lanza el primer frame.
     * @private
     */
    init() {
        window.addEventListener('resize', this.handleResize);
        this.onResize();
        requestAnimationFrame(this.loop);
    }

    /**
     * Recalcula tamaños de viewport y ajusta los renderizadores ante cambios de ventana.
     * @private
     */
    onResize() {
        const w = Math.min(window.innerWidth, UI.maxWidth);
        const h = window.innerHeight;
        const dpr = window.devicePixelRatio || 1;

        this.logicalWidth = w;
        this.logicalHeight = h;

        this.glRenderer.resize(w, h, dpr);
        this.renderer2D.resize(w, h, dpr);
        this.inputController.updateDimensions(w, h);
        this.state.updateLayout();
    }

    /**
     * Ciclo principal de renderizado y actualización por frame.
     * @private
     */
    render() {
        const w = this.logicalWidth;
        const state = this.state;
        const isEditing = state.editingId !== null;

        // 1. Actualizar físicas y transiciones de estado
        state.updateAnimations();

        // 2. Limpiar lienzos
        this.glRenderer.clear(1.0, 1.0, 1.0, 1.0);
        this.renderer2D.clear();

        // --- CAPA 1: DIBUJO GEOMÉTRICO POR GPU (WebGL) ---
        const inputY = UI.inputY;
        const inputWidth = w - (UI.padding * 2) - UI.addBtnWidth - 10;
        const btnX = UI.padding + inputWidth + 10;

        // Borde y fondo del Input
        const borderCol = isEditing ? THEME.inputBorderEditing : THEME.inputBorder;
        const bgCol = isEditing ? THEME.inputBgEditing : THEME.inputBg;
        this.glRenderer.drawRect(UI.padding, inputY, inputWidth, UI.inputHeight, borderCol);
        this.glRenderer.drawRect(UI.padding + 2, inputY + 2, inputWidth - 4, UI.inputHeight - 4, bgCol);

        // Fondo del Botón Añadir / Guardar
        const btnCol = isEditing ? THEME.buttonEditing : THEME.buttonPrimary;
        this.glRenderer.drawRect(btnX, inputY, UI.addBtnWidth, UI.inputHeight, btnCol);

        // Elementos visuales de cada tarea
        state.tasks.forEach(task => {
            const opacity = task.opacity;

            // Línea separadora
            this.glRenderer.drawRect(UI.padding, task.y - 12, w - (UI.padding * 2), 1, THEME.separatorLine, opacity);

            // Borde exterior del Checkbox
            const checkBorderColor = task.done ? THEME.checkboxDone : THEME.checkboxBorder;
            this.glRenderer.drawRect(UI.padding, task.y, UI.checkboxSize, UI.checkboxSize, checkBorderColor, opacity);

            // Fondo interior blanco del Checkbox
            this.glRenderer.drawRect(UI.padding + 2, task.y + 2, UI.checkboxSize - 4, UI.checkboxSize - 4, THEME.checkboxBg, opacity);

            // Relleno animado verde al completar
            if (task.strikeProg > 0) {
                this.glRenderer.drawRect(
                    UI.padding + 4,
                    task.y + 4,
                    UI.checkboxSize - 8,
                    UI.checkboxSize - 8,
                    THEME.checkboxDone,
                    task.strikeProg * opacity
                );
            }

            // Línea de tachado acelerada por WebGL
            if (task.strikeProg > 0.01) {
                const textWidth = this.renderer2D.measureTextWidth(task.text);
                this.glRenderer.drawRect(
                    UI.padding + 35,
                    task.y + 9,
                    textWidth * task.strikeProg,
                    2,
                    THEME.strikeColor,
                    opacity
                );
            }
        });

        // --- CAPA 2: DIBUJO TIPOGRÁFICO Y TEXTUAL POR CPU (Canvas 2D) ---
        // Encabezado
        this.renderer2D.drawHeader(UI.padding, UI.headerY);

        // Texto del input con cursor parpadeante
        const showCursor = Math.floor(Date.now() / ANIMATION.cursorBlinkInterval) % 2 === 0;
        this.renderer2D.drawInputText(state.inputText, UI.padding + 12, inputY + 27, showCursor);

        // Texto del botón
        const btnLabel = isEditing ? 'Guardar' : 'Añadir';
        this.renderer2D.drawButtonText(btnLabel, btnX, inputY, UI.addBtnWidth, UI.inputHeight);

        // Textos e iconos de tareas
        state.tasks.forEach(task => {
            this.renderer2D.drawTask(task, w, UI.padding);
        });

        // Solicitar siguiente frame
        requestAnimationFrame(this.loop);
    }
}

// Inicialización cuando el DOM esté completamente cargado
window.addEventListener('DOMContentLoaded', () => {
    new App();
});
