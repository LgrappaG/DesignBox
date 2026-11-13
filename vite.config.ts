import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('lucide-react')) return 'lucide-vendor';
            if (id.includes('@tauri-apps')) return 'tauri-vendor';
            if (id.includes('react')) return 'react-vendor';
          }
          if (id.includes('/src/data/') || id.includes('\\src\\data\\')) {
            return 'studio-data';
          }
          if (id.includes('/src/engine/') || id.includes('\\src\\engine\\')) {
            return 'studio-engine';
          }
          return undefined;
        },
      },
    },
  },
});

