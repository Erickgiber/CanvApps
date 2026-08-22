/**
 * @fileoverview Utilidades de conversión y manipulación de colores para WebGL y Canvas 2D.
 */

/**
 * Caché interna para evitar conversiones repetidas de strings hexadecimales por frame.
 * @type {Map<string, [number, number, number]>}
 */
const colorCache = new Map();

/**
 * Convierte un código de color Hexadecimal (#RGB o #RRGGBB) a un array RGBA normalizado (0.0 a 1.0)
 * listo para ser enviado a los uniforms de WebGL.
 *
 * @param {string} hex - Código de color en formato hexadecimal (ej: '#3b82f6', '#fff').
 * @param {number} [alpha=1.0] - Canal alfa entre 0.0 (transparente) y 1.0 (opaco).
 * @returns {[number, number, number, number]} Tupla de 4 valores float [r, g, b, a].
 * @example
 * const rgba = hexToRgbA('#3b82f6', 0.8); // [0.231, 0.509, 0.964, 0.8]
 */
export function hexToRgbA(hex, alpha = 1.0) {
    let rgb = colorCache.get(hex);

    if (!rgb) {
        let cleanHex = hex.replace('#', '');
        if (cleanHex.length === 3) {
            cleanHex = cleanHex.split('').map(c => c + c).join('');
        }

        if (cleanHex.length === 6) {
            const num = parseInt(cleanHex, 16);
            rgb = [
                ((num >> 16) & 255) / 255,
                ((num >> 8) & 255) / 255,
                (num & 255) / 255
            ];
            colorCache.set(hex, rgb);
        } else {
            rgb = [0, 0, 0];
        }
    }

    return [rgb[0], rgb[1], rgb[2], alpha];
}
