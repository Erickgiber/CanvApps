import { defineConfig } from './CanvApps';

export default defineConfig({
  target: 'PWA',
  title: 'CanvApps Application',
  outDir: 'dist-app',
  pwa: {
    name: 'CanvApps Canvas Application',
    shortName: 'CanvApps',
    description: 'High performance 100% Canvas UI Framework application',
    themeColor: '#090d16',
    backgroundColor: '#090d16',
    display: 'standalone',
  },
  capacitor: {
    appId: 'com.canvapps.app',
    appName: 'CanvApps',
  },
});
