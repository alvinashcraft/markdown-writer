import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './', // Use relative paths instead of root relative paths
  server: {
    host: 'localhost', // Only bind to localhost, not 0.0.0.0
    strictPort: false,
    cors: {
      origin: false // Disable CORS in dev - only allow same-origin requests
    }
  }
})
