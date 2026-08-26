import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  server: {
    port: 3000,
    open: true,
  },

  // Netlify `publish` is already pointed at build/, so keep CRA's output
  // directory rather than switching to Vite's default dist/.
  build: {
    outDir: 'build',
    sourcemap: true,

    rollupOptions: {
      output: {
        // Firebase and framer-motion are large and change far less often than
        // app code. Splitting them out keeps them cached across deploys instead
        // of being re-downloaded every time a component changes.
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth'],
          motion: ['framer-motion'],
          router: ['react-router-dom'],
        },
      },
    },
  },
});
