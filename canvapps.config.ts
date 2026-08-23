import { defineConfig } from './CanvApps';

export default defineConfig({
  // Deployment Target: 'SPA' (Clean Standard Web) | 'PWA' (Offline PWA) | 'CAPACITOR' (Native Mobile)
  // If set to 'SPA' (or omitted), it generates a clean index.html with no PWA or Capacitor data.
  target: 'SPA',
  title: 'CanvApps Application',
  outDir: 'dist-app',

  // Optional: Uncomment to configure Progressive Web App (target: 'PWA')
  // pwa: {
  //   name: 'CanvApps Canvas Application',
  //   shortName: 'CanvApps',
  //   description: 'High performance 100% Canvas UI Framework application',
  //   themeColor: '#090d16',
  //   backgroundColor: '#090d16',
  //   display: 'standalone',
  // },

  // Optional: Uncomment to configure Capacitor Native Container (target: 'CAPACITOR')
  // capacitor: {
  //   appId: 'com.canvapps.app',
  //   appName: 'CanvApps',
  // },
});
