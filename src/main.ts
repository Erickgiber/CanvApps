import { Engine } from '@canvapps';
import config from '../canvapps.config';
import createApp from './App.cvs';

// 1. Initialize CanvApps Engine with project configuration
const engine = new Engine({
  container: '#app-container',
  backgroundColor: '#f8fafc',
  autoResize: true,
  selectable: config.selectable ?? false,
});

// 2. Instantiate and mount compiled .cvs component
const appRoot = createApp();
engine.setRoot(appRoot);
engine.start();

// 3. Hot Module Replacement (HMR) Runtime hook
if (typeof window !== 'undefined') {
  (window as any).__CANVAPPS_HMR_UPDATE__ = (newCreateApp: typeof createApp) => {
    console.log('⚡ [CanvApps HMR]: Hot updating .cvs component tree...');
    const nextRoot = newCreateApp();
    engine.setRoot(nextRoot);
  };
}
