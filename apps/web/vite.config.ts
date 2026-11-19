import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const { version } = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
) as { version: string };

// In docker-compose the server is another container; locally it's on :8080.
const api = process.env['API_TARGET'] ?? 'http://localhost:8080';

export default defineConfig({
  plugins: [react()],
  // The client reloads when the server reports a different version.
  define: { __APP_VERSION__: JSON.stringify(version) },
  server: {
    port: 5173,
    // In dev the game server runs separately; the room websocket goes straight to :8080.
    proxy: { '/health': api, '/api': api },
  },
});
