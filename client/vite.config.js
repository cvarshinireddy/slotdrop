import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  server: {
    port: 5173,
    // In dev the API and websocket live on :5000; proxying avoids CORS and mirrors production paths.
    proxy: { '/api': 'http://localhost:5000', '/uploads': 'http://localhost:5000', '/socket.io': { target: 'http://localhost:5000', ws: true } },
  },
});
