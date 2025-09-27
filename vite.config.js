import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// This is the configuration file for Vite, our build tool.
// We are configuring it to use the PWA plugin to automatically
// generate a service worker for us.

export default defineConfig({
  plugins: [
    VitePWA({
      // This tells the plugin to automatically update the service worker
      // whenever we deploy a new version.
      registerType: 'autoUpdate',
      
      // By setting injectRegister to 'auto', the plugin will automatically
      // add the service worker registration script to your index.html.
      // This is why we removed the manual code from app.js.
      injectRegister: 'auto',

      // This section configures the service worker itself.
      workbox: {
        // This tells the service worker to cache all the static assets
        // in your final 'dist' folder.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,ttf}'],
      },

      // This section configures the web app manifest.
      // The plugin will use this information to automatically generate
      // the manifest.json file for us.
      manifest: {
        name: 'Textfile.me',
        short_name: 'Textfile',
        description: 'An ultra-simple, browser-based text editor.',
        theme_color: '#F5F5F5',
        icons: [
          {
            src: 'icon-192.png', // Ensure you have this in your /public folder
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512.png', // Ensure you have this in your /public folder
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
});

