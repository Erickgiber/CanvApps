/// <reference types="vite/client" />

declare module '*.cvs' {
  import { UIElement } from '@canvapps';
  const createComponent: (props?: Record<string, any>) => UIElement;
  export default createComponent;
}
