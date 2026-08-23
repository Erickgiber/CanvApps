/**
 * CanvApps Framework
 *
 * High-performance 100% Canvas-based UI Framework for SPA, PWA, and Native Mobile via Capacitor.
 */

export * from './core';
export * from './nodes';
export * from './layout';
export * from './types';
export * from './events';
export * from './ghost';
export * from './reactivity';
export * from './animation';
export * from './router';
export * from './compiler/types';
export { CVSParser } from './compiler/parser';
export { CVSCodeGenerator } from './compiler/codegen';
export { compileCVS } from './compiler/transformer';
export { defineConfig, type CanvAppsConfig, type BuildTarget, type PWAConfig, type CapacitorConfig } from './cli/config';
