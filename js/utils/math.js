/**
 * @fileoverview Funciones matemáticas y utilidades de interpolación para animaciones fluidas.
 */

/**
 * Realiza una interpolación lineal entre dos valores numéricos.
 *
 * @param {number} start - Valor inicial actual.
 * @param {number} end - Valor objetivo al que se desea converger.
 * @param {number} [factor=0.15] - Tasa de interpolación (entre 0 y 1).
 * @returns {number} El nuevo valor interpolado.
 * @example
 * const newY = lerp(currentY, targetY, 0.15);
 */
export function lerp(start, end, factor = 0.15) {
    return start + (end - start) * factor;
}

/**
 * Restringe un valor numérico dentro de un rango mínimo y máximo.
 *
 * @param {number} value - El valor numérico a restringir.
 * @param {number} min - El límite inferior.
 * @param {number} max - El límite superior.
 * @returns {number} El valor restringido dentro del rango [min, max].
 */
export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
