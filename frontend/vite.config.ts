import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import viteCompression from 'vite-plugin-compression';

export default defineConfig({
  plugins: [
    react(),
    // Compression: generate .gz and .br files
    viteCompression({ algorithm: 'gzip' }),
    viteCompression({ algorithm: 'brotliCompress' })
  ],
  build: {
    target: 'es2020', // Target: ES2020 (drop legacy browser support)
    minify: 'esbuild', // Minification: esbuild
    rollupOptions: {
      treeshake: true, // Tree shaking enabled
      output: {
        // Manual chunks
        manualChunks: {
          vendor: ['react', 'react-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          gemini: ['@google/genai']
        }
      }
    }
  }
});
