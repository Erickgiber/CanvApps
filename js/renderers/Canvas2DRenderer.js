/**
 * @fileoverview Renderizador Canvas 2D encargado del dibujo de texto de alta definición,
 * métricas tipográficas, cursores animados e iconos vectoriales/tipográficos.
 */

import { THEME } from '../config.js';

export class Canvas2DRenderer {
    /**
     * Inicializa el contexto 2D y configura las propiedades base.
     * @param {HTMLCanvasElement} canvas - Elemento canvas HTML para renderizado 2D.
     */
    constructor(canvas) {
        /** @type {HTMLCanvasElement} */
        this.canvas = canvas;
        /** @type {CanvasRenderingContext2D} */
        this.ctx = canvas.getContext('2d', { alpha: true });
        /** @type {number} */
        this.logicalWidth = 0;
        /** @type {number} */
        this.logicalHeight = 0;
    }

    /**
     * Ajusta la resolución del canvas y aplica la matriz de transformación para pantallas Retina/HiDPI.
     * @param {number} logicalWidth - Ancho lógico en píxeles.
     * @param {number} logicalHeight - Alto lógico en píxeles.
     * @param {number} dpr - Densidad de píxeles del dispositivo.
     */
    resize(logicalWidth, logicalHeight, dpr) {
        this.logicalWidth = logicalWidth;
        this.logicalHeight = logicalHeight;

        this.canvas.width = logicalWidth * dpr;
        this.canvas.height = logicalHeight * dpr;
        this.canvas.style.width = `${logicalWidth}px`;
        this.canvas.style.height = `${logicalHeight}px`;

        // Aplicamos el escalado por DPR para que todo el renderizado 2D sea nítido
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    /**
     * Limpia completamente el área lógica del lienzo 2D.
     */
    clear() {
        this.ctx.clearRect(0, 0, this.logicalWidth, this.logicalHeight);
    }

    /**
     * Renderiza el encabezado principal y subtítulo de la aplicación.
     * @param {number} x - Coordenada X inicial.
     * @param {number} y - Coordenada Y de la línea base del texto.
     */
    drawHeader(x, y) {
        const ctx = this.ctx;
        ctx.save();
        ctx.fillStyle = THEME.titleText;
        ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText('TODO en WebGL + 2D', x, y);

        ctx.fillStyle = '#64748b';
        ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText('Renderizado híbrido acelerado por GPU', x, y + 18);
        ctx.restore();
    }

    /**
     * Renderiza el texto del campo de entrada junto con el cursor parpadeante.
     * @param {string} text - Contenido actual del campo de texto.
     * @param {number} x - Posición X del inicio del texto.
     * @param {number} y - Posición Y de la línea base.
     * @param {boolean} showCursor - Si el cursor parpadeante debe dibujarse en este frame.
     */
    drawInputText(text, x, y, showCursor) {
        const ctx = this.ctx;
        ctx.save();
        ctx.fillStyle = THEME.inputText;
        ctx.font = '15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const display = text + (showCursor ? '|' : '');
        ctx.fillText(display, x, y);
        ctx.restore();
    }

    /**
     * Dibuja el texto centrado dentro de un botón.
     * @param {string} text - Etiqueta del botón ("Añadir" o "Guardar").
     * @param {number} btnX - Coordenada X del botón.
     * @param {number} btnY - Coordenada Y del botón.
     * @param {number} btnWidth - Ancho del botón.
     * @param {number} btnHeight - Altura del botón.
     */
    drawButtonText(text, btnX, btnY, btnWidth, btnHeight) {
        const ctx = this.ctx;
        ctx.save();
        ctx.fillStyle = THEME.buttonText;
        ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const textMetrics = ctx.measureText(text);
        const textX = btnX + (btnWidth - textMetrics.width) / 2;
        const textY = btnY + (btnHeight / 2) + 5;
        ctx.fillText(text, textX, textY);
        ctx.restore();
    }

    /**
     * Dibuja los textos e iconos de acción correspondientes a una tarea individual.
     * @param {import('../state/TodoState.js').Task} task - Objeto con datos de la tarea.
     * @param {number} width - Ancho total disponible del contenedor.
     * @param {number} padding - Relleno lateral.
     */
    drawTask(task, width, padding) {
        const ctx = this.ctx;
        ctx.save();
        ctx.globalAlpha = task.opacity;

        // Texto descriptivo de la tarea
        ctx.fillStyle = task.done ? THEME.taskTextDone : THEME.taskTextNormal;
        ctx.font = task.done
            ? 'italic 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            : '15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(task.text, padding + 35, task.y + 15);

        // Icono de Editar (✎)
        ctx.fillStyle = THEME.editIcon;
        ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText('✎', width - padding - 48, task.y + 16);

        // Icono de Eliminar (✕)
        ctx.fillStyle = THEME.deleteIcon;
        ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText('✕', width - padding - 20, task.y + 16);

        ctx.restore();
    }

    /**
     * Calcula el ancho en píxeles que ocupará un string de texto con la fuente indicada.
     * @param {string} text - Texto a medir.
     * @param {string} [font='15px sans-serif'] - Definición de fuente CSS.
     * @returns {number} Ancho en píxeles.
     */
    measureTextWidth(text, font = '15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif') {
        this.ctx.save();
        this.ctx.font = font;
        const width = this.ctx.measureText(text).width;
        this.ctx.restore();
        return width;
    }
}
