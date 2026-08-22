/**
 * @fileoverview Gestión del estado reactivo de las tareas, animaciones físicas
 * y persistencia en almacenamiento local (LocalStorage).
 */

import { UI, ANIMATION } from '../config.js';
import { lerp } from '../utils/math.js';

/**
 * @typedef {Object} Task
 * @property {number|string} id - Identificador único de la tarea.
 * @property {string} text - Contenido de texto de la tarea.
 * @property {boolean} done - Estado de completado de la tarea.
 * @property {number} y - Posición vertical actual interpolada (en píxeles).
 * @property {number} targetY - Posición vertical destino (en píxeles).
 * @property {number} opacity - Opacidad actual interpolada (0.0 a 1.0).
 * @property {number} targetOpacity - Opacidad destino (0.0 a 1.0).
 * @property {number} strikeProg - Progreso actual de la línea de tachado (0.0 a 1.0).
 * @property {number} targetStrike - Progreso objetivo de la línea de tachado (0.0 o 1.0).
 * @property {boolean} isDeleting - Si la tarea está en animación de eliminación.
 */

const STORAGE_KEY = 'canvapps_todos_v1';

export class TodoState {
    /**
     * Inicializa el estado de la aplicación cargando datos guardados o valores por defecto.
     */
    constructor() {
        /** @type {Task[]} */
        this.tasks = [];
        /** @type {string} */
        this.inputText = '';
        /** @type {number|string|null} */
        this.editingId = null;

        this.loadTasks();
        this.updateLayout();
    }

    /**
     * Carga las tareas desde localStorage o establece las tareas iniciales demostrativas.
     * @private
     */
    loadTasks() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    this.tasks = parsed.map((item, index) => ({
                        id: item.id || Date.now() + index,
                        text: item.text || '',
                        done: !!item.done,
                        y: UI.listStartY + (index * UI.itemHeight),
                        targetY: UI.listStartY + (index * UI.itemHeight),
                        opacity: 1,
                        targetOpacity: 1,
                        strikeProg: item.done ? 1 : 0,
                        targetStrike: item.done ? 1 : 0,
                        isDeleting: false
                    }));
                    return;
                }
            }
        } catch (e) {
            console.warn('No se pudo cargar desde localStorage:', e);
        }

        // Tareas iniciales por defecto
        this.tasks = [
            {
                id: 1,
                text: 'Comprar café de especialidad',
                done: false,
                y: UI.listStartY,
                targetY: UI.listStartY,
                opacity: 1,
                targetOpacity: 1,
                strikeProg: 0,
                targetStrike: 0,
                isDeleting: false
            },
            {
                id: 2,
                text: 'Aprender WebGL & Canvas2D',
                done: true,
                y: UI.listStartY + UI.itemHeight,
                targetY: UI.listStartY + UI.itemHeight,
                opacity: 1,
                targetOpacity: 1,
                strikeProg: 1,
                targetStrike: 1,
                isDeleting: false
            }
        ];
    }

    /**
     * Guarda la lista actual de tareas activas en localStorage.
     * @private
     */
    saveTasks() {
        try {
            const dataToSave = this.tasks
                .filter(t => !t.isDeleting)
                .map(t => ({ id: t.id, text: t.text, done: t.done }));
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
        } catch (e) {
            console.warn('No se pudo guardar en localStorage:', e);
        }
    }

    /**
     * Recalcula las posiciones objetivo (targetY) y estados de tachado para organizar
     * primero las tareas pendientes y luego las completadas.
     */
    updateLayout() {
        let displayIndex = 0;

        // Tareas pendientes
        this.tasks
            .filter(t => !t.done && !t.isDeleting)
            .forEach(t => {
                t.targetY = UI.listStartY + (displayIndex * UI.itemHeight);
                t.targetStrike = 0;
                displayIndex++;
            });

        // Tareas completadas
        this.tasks
            .filter(t => t.done && !t.isDeleting)
            .forEach(t => {
                t.targetY = UI.listStartY + (displayIndex * UI.itemHeight);
                t.targetStrike = 1;
                displayIndex++;
            });

        // Tareas en proceso de borrado
        this.tasks
            .filter(t => t.isDeleting)
            .forEach(t => {
                t.targetOpacity = 0;
            });
    }

    /**
     * Actualiza las interpolaciones de físicas y animaciones para cada frame.
     * Elimina del array aquellas tareas cuya animación de borrado haya finalizado.
     */
    updateAnimations() {
        let layoutNeedsUpdate = false;

        for (let i = this.tasks.length - 1; i >= 0; i--) {
            const task = this.tasks[i];
            task.y = lerp(task.y, task.targetY, ANIMATION.defaultLerp);
            task.opacity = lerp(task.opacity, task.targetOpacity, ANIMATION.defaultLerp);
            task.strikeProg = lerp(task.strikeProg, task.targetStrike, ANIMATION.strikeLerp);

            // Si está borrándose y ya es invisible, removerla definitivamente
            if (task.isDeleting && task.opacity < ANIMATION.deleteThreshold) {
                this.tasks.splice(i, 1);
                layoutNeedsUpdate = true;
            }
        }

        if (layoutNeedsUpdate) {
            this.updateLayout();
            this.saveTasks();
        }
    }

    /**
     * Alterna el estado de completado de una tarea por su ID.
     * @param {number|string} id - ID de la tarea a alternar.
     */
    toggleTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task && !task.isDeleting) {
            task.done = !task.done;
            this.updateLayout();
            this.saveTasks();
        }
    }

    /**
     * Inicia el modo de edición de una tarea existente.
     * @param {number|string} id - ID de la tarea a editar.
     */
    startEditing(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task && !task.isDeleting) {
            this.editingId = task.id;
            this.inputText = task.text;
        }
    }

    /**
     * Cancela el modo de edición actual restableciendo el campo de texto.
     */
    cancelEditing() {
        this.editingId = null;
        this.inputText = '';
    }

    /**
     * Marca una tarea para animación de borrado gradual.
     * @param {number|string} id - ID de la tarea a eliminar.
     */
    deleteTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.isDeleting = true;
            if (this.editingId === task.id) {
                this.cancelEditing();
            }
            this.updateLayout();
        }
    }

    /**
     * Añade una nueva tarea o guarda los cambios de la tarea en edición.
     */
    submitTask() {
        const trimmed = this.inputText.trim();
        if (!trimmed) return;

        if (this.editingId !== null) {
            const task = this.tasks.find(t => t.id === this.editingId);
            if (task) {
                task.text = trimmed;
            }
            this.editingId = null;
        } else {
            const newTask = {
                id: Date.now(),
                text: trimmed,
                done: false,
                y: UI.listStartY - 40,
                targetY: UI.listStartY,
                opacity: 0,
                targetOpacity: 1,
                strikeProg: 0,
                targetStrike: 0,
                isDeleting: false
            };
            this.tasks.push(newTask);
        }

        this.inputText = '';
        this.updateLayout();
        this.saveTasks();
    }

    /**
     * Remueve el último caracter del texto del input (Backspace).
     */
    removeLastInputChar() {
        if (this.inputText.length > 0) {
            this.inputText = this.inputText.slice(0, -1);
        }
    }

    /**
     * Añade un caracter al texto del input si es válido.
     * @param {string} char - Caracter a agregar.
     */
    appendInputChar(char) {
        this.inputText += char;
    }
}
