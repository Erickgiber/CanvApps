import { defineConfig } from './CanvApps';

export default defineConfig({
  // Deployment Target: 'SPA' (Clean Standard Web) | 'PWA' (Offline PWA) | 'CAPACITOR' (Native Mobile)
  target: 'PWA',
  title: 'CanvApps Application',
  outDir: 'dist-app',

  // Build Watermark Banner: Set to false to disable auto-generated open-source attribution banners in JS/HTML
  banner: true,

  // Automatic Safe Area Insets Support (Notch / Dynamic Island / Status Bar). Default: true
  safeArea: true,

  // Theme Color & Status Bar auto-synchronization for light and dark modes. Default: true
  themeColor: {
    light: '#f8fafc',
    dark: '#090d16',
  },

  // Global Text Selection Strategy (false = zero Ghost DOM overhead; developers opt-in per component)
  selectable: false,



  // Optional: Uncomment to configure Progressive Web App (target: 'PWA')
  pwa: {
    name: 'CanvApps Canvas Application',
    shortName: 'CanvApps',
    description: 'High performance 100% Canvas UI Framework application',
    themeColor: '#f8fafc',
    backgroundColor: '#f8fafc',
    display: 'standalone',
  },


  // Optional: Uncomment to configure Capacitor Native Container (target: 'CAPACITOR')
  // capacitor: {
  //   appId: 'com.canvapps.app',
  //   appName: 'CanvApps',
  // },
});
