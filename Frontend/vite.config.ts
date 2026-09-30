import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // The browser only ever talks to this dev server; /api is passed on to the
    // backend. Same origin means the httpOnly session cookie is first-party.
    // In production a Vercel rewrite does the same job.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
