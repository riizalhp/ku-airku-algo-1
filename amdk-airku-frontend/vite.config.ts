import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
const PORT = Number(process.env.VITE_PORT || process.env.PORT || 5173);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    }
  },
  server: {
    host: '0.0.0.0', // Bind ke semua network interfaces
    port: PORT,
    strictPort: false, // allow override via CLI/env when 5173 sudah terpakai
  }
})