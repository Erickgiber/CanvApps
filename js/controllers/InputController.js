/**
 * @fileoverview Controlador de interacciones de usuario (eventos de puntero, mouse y teclado).
 * Gestiona el hit testing de áreas interactivas y la entrada de texto.
 */

import { UI } from '../config.js';

export class InputController {
    /**
     * Inicializa los escuchadores de eventos sobre el canvas y la ventana.
     * @param {HTMLCanvasElement} canvas - Canvas interactivo superior.
     * @param {import('../state/TodoState.js').TodoState} state - Instancia de estado de la aplicación.
     * @param {import('../renderers/Canvas2DRenderer.js').Canvas2DRenderer} renderer2D - Renderizador 2D para métricas de texto.
     */
    constructor(canvas, state, renderer2D) {
        /** @type {HTMLCanvasElement} */
        this.canvas = canvas;
        /** @type {import('../state/TodoState.js').TodoState} */
        this.state = state;
        /** @type {import('../renderers/Canvas2DRenderer.js').Canvas2DRenderer} */
        this.renderer2D = renderer2D;
        /** @type {number} */
        this.logicalWidth = 0;
        /** @type {number} */
        this.logicalHeight = 0;

        this.onPointerDown = this.handlePointerDown.bind(this);
        this.onKeyDown = this.handleKeyDown.bind(this);

        this.attachEvents();
    }

    /**
     * Vincula los escuchadores de eventos al DOM.
     * @private
     */
    attachEvents() {
        this.canvas.addEventListener('pointerdown', this.onPointerDown);
        window.addEventListener('keydown', this.onKeyDown);
    }

    /**
     * Desvincula los eventos al destruir el controlador.
     */
    destroy() {
        this.canvas.removeEventListener('pointerdown', this.onPointerDown);
        window.removeEventListener('keydown', this.onKeyDown);
    }

    /**
     * Actualiza las dimensiones lógicas para el cálculo de coordenadas de colisión (Hit Testing).
     * @param {number} logicalWidth - Ancho lógico en píxeles.
     * @param {number} logicalHeight - Alto lógico en píxeles.
     */
    updateDimensions(logicalWidth, logicalHeight) {
        this.logicalWidth = logicalWidth;
        this.logicalHeight = logicalHeight;
    }

    /**
     * Maneja el evento de pulsación o clic en el lienzo calculando la posición relativa.
     * @private
     * @param {PointerEvent} e - Evento de puntero emitido.
     */
    handlePointerDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) * (this.logicalWidth / rect.width);
        const mouseY = (e.clientY - rect.top) * (this.logicalHeight / rect.height);

        const w = this.logicalWidth;
        const inputWidth = w - (UI.padding * 2) - UI.addBtnWidth - 10;
        const btnX = UI.padding + inputWidth + 10;
        const btnY = UI.inputY;

        // 1. Clic en botón "Añadir" / "Guardar"
        if (
            mouseX >= btnX &&
            mouseX <= btnX + UI.addBtnWidth &&
            mouseY >= btnY &&
            mouseY <= btnY + UI.inputHeight
        ) {
            this.state.submitTask();
            return;
        }

        // 2. Interacciones en la lista de tareas (Checkbox, Editar, Eliminar)
        for (const task of this.state.tasks) {
            if (task.isDeleting) continue;

            const taskY = task.y;

            // Detección en Checkbox (con margen de tolerancia)
            if (
                mouseX >= UI.padding - 4 &&
                mouseX <= UI.padding + UI.checkboxSize + 6 &&
                mouseY >= taskY - 4 &&
                mouseY <= taskY + UI.checkboxSize + 6
            ) {
                this.state.toggleTask(task.id);
                return;
            }

            // Detección en botón Editar (icono ✎)
            if (
                mouseX >= w - UI.padding - 54 &&
                mouseX <= w - UI.padding - 28 &&
                mouseY >= taskY - 4 &&
                mouseY <= taskY + UI.checkboxSize + 6
            ) {
                this.state.startEditing(task.id);
                return;
            }

            // Detección en botón Eliminar (icono ✕)
            if (
                mouseX >= w - UI.padding - 26 &&
                mouseX <= w - UI.padding + 4 &&
                mouseY >= taskY - 4 &&
                mouseY <= taskY + UI.checkboxSize + 6
            ) {
                this.state.deleteTask(task.id);
                return;
            }
        }
    }

    /**
     * Maneja eventos de teclado para escritura en el campo de texto, borrado y confirmación.
     * @private
     * @param {KeyboardEvent} e - Evento de teclado emitido.
     */
    handleKeyDown(e) {
        if (e.key === 'Backspace') {
            e.preventDefault();
            this.state.removeLastInputChar();
            return;
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            this.state.submitTask();
            return;
        }

        if (e.key === 'Escape') {
            e.preventDefault();
            this.state.cancelEditing();
            return;
        }

        // Escritura de caracteres estándar
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            const w = this.logicalWidth;
            const maxTextWidth = w - (UI.padding * 2) - UI.addBtnWidth - 40;
            const currentWidth = this.renderer2D.measureTextWidth(this.state.inputText + e.key);

            if (currentWidth < maxTextWidth) {
                this.state.appendInputChar(e.key);
            }
        }
    }
}
