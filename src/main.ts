import { createApp } from '@canvapps';
import config from '../canvapps.config';
import App from './App.cvs';
import { sessionStore } from './stores/session.store';

const initialBg = sessionStore.state.theme === 'dark' ? '#080c14' : '#f8fafc';

// 1. Initialize and configure application instance with createApp
const app = createApp(App, {
  backgroundColor: initialBg,
  autoResize: true,
  selectable: config.selectable ?? false,
  safeArea: config.safeArea ?? true,
  themeColor: config.themeColor ?? { light: '#f8fafc', dark: '#080c14' },
});

// 2. Mount application to the DOM container
const engine = app.mount('#app-container');

// 3. Reactively synchronize engine background color whenever theme toggles
if (typeof window !== 'undefined') {
  sessionStore.select('theme').subscribe((theme) => {
    engine.setBackgroundColor(theme === 'dark' ? '#080c14' : '#f8fafc');
  });
}

