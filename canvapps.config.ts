import { defineConfig } from './CanvApps';

export default defineConfig({
  // Deployment Target: 'SPA' (Clean Standard Web) | 'PWA' (Offline PWA) | 'CAPACITOR' (Native Mobile)
  target: 'SPA',
  title: 'CanvApps Application',
  outDir: 'dist-app',

  // Global Text Selection Strategy (false = zero Ghost DOM overhead; developers opt-in per component)
  selectable: false,

  // Optional: Uncomment to configure Progressive Web App (target: 'PWA')
  pwa: {
    name: 'CanvApps Canvas Application',
    shortName: 'CanvApps',
    description: 'High performance 100% Canvas UI Framework application',
    themeColor: '#090d16',
    backgroundColor: '#090d16',
    display: 'standalone',
  },

  // Optional: Uncomment to configure Capacitor Native Container (target: 'CAPACITOR')
  // capacitor: {
  //   appId: 'com.canvapps.app',
  //   appName: 'CanvApps',
  // },
});
