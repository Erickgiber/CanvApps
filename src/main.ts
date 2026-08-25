import { Engine } from '@canvapps';
import config from '../canvapps.config';
import createApp from './App.cvs';
import { sessionStore } from './stores/session.store';

const initialBg = sessionStore.state.theme === 'dark' ? '#101010' : '#f8fafc';

// 1. Initialize CanvApps Engine with project configuration
const engine = new Engine({
  container: '#app-container',
  backgroundColor: initialBg,
  autoResize: true,
  selectable: config.selectable ?? false,
  safeArea: config.safeArea ?? true,
  themeColor: config.themeColor ?? { light: '#f8fafc', dark: '#101010' },
});

// Reactively synchronize engine background color whenever theme toggles
if (typeof window !== 'undefined') {
  sessionStore.select('theme').subscribe((theme) => {
    engine.setBackgroundColor(theme === 'dark' ? '#101010' : '#f8fafc');
  });
}

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

