/**
 * @fileoverview Constantes y configuración visual y de layout para la aplicación TODO.
 * Define dimensiones, paletas de colores y parámetros de animación para WebGL y Canvas 2D.
 */

/**
 * @typedef {Object} UIConfig
 * @property {number} maxWidth - Ancho máximo del contenedor en píxeles.
 * @property {number} padding - Relleno horizontal y vertical de los componentes.
 * @property {number} inputHeight - Altura del campo de texto de entrada.
 * @property {number} addBtnWidth - Ancho del botón de añadir/guardar tarea.
 * @property {number} itemHeight - Altura vertical de cada elemento de la lista.
 * @property {number} listStartY - Posición Y inicial donde comienza la lista de tareas.
 * @property {number} checkboxSize - Tamaño del cuadro de selección de la tarea.
 * @property {number} borderRadius - Radio aproximado o ajustes visuales.
 */
export const UI = {
    maxWidth: window.innerWidth,
    padding: 20,
    inputHeight: 44,
    addBtnWidth: 90,
    itemHeight: 52,
    listStartY: 150,
    checkboxSize: 20,
    headerY: 48,
    inputY: 76
};

/**
 * @typedef {Object} AnimationConfig
 * @property {number} defaultLerp - Factor de interpolación lineal estándar para movimiento y opacidad.
 * @property {number} strikeLerp - Factor de interpolación lineal para la animación del tachado.
 * @property {number} deleteThreshold - Umbral de opacidad por debajo del cual se remueve la tarea.
 * @property {number} cursorBlinkInterval - Intervalo en milisegundos para el parpadeo del cursor.
 */
export const ANIMATION = {
    defaultLerp: 0.15,
    strikeLerp: 0.2,
    deleteThreshold: 0.05,
    cursorBlinkInterval: 530
};

/**
 * Paleta de colores temáticos utilizados en los shaders de WebGL y contextos 2D.
 */
export const THEME = {
    // Fondos y bordes
    canvasBackground: '#ffffff',
    separatorLine: '#f1f5f9',

    // Input estado normal
    inputBorder: '#cbd5e1',
    inputBg: '#f8fafc',
    buttonPrimary: '#3b82f6',
    buttonPrimaryHover: '#2563eb',

    // Input estado edición
    inputBorderEditing: '#f59e0b',
    inputBgEditing: '#fffbeb',
    buttonEditing: '#f59e0b',

    // Tareas y Checkbox
    checkboxBorder: '#94a3b8',
    checkboxDone: '#22c55e',
    checkboxBg: '#ffffff',
    strikeColor: '#94a3b8',

    // Tipografía
    titleText: '#0f172a',
    taskTextNormal: '#1e293b',
    taskTextDone: '#94a3b8',
    inputText: '#0f172a',
    buttonText: '#ffffff',

    // Botones de acción
    editIcon: '#f59e0b',
    deleteIcon: '#ef4444'
};
