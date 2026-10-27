import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Lets the client call /api/... without CORS issues during development.
    proxy: {
      '/api': 'http://localhost:5050',
    },
  },
});
