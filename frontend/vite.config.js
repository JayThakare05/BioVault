import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react()
  ],
  server: {
    allowedHosts: [
      '1f8b95693385e8.lhr.life'
    ]
  }
})
