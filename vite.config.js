import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,      // Change to your desired port
    host: '0.0.0.0', // Listen on all network interfaces
  }
})
