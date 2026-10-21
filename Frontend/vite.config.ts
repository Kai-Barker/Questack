import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Briefings load these on demand, so Vite wouldn't find them until a pilot
  // opened one. Finding a package mid-session makes Vite rebuild its
  // dependency bundle under a new hash, and a page still holding the old React
  // ends up with two copies ("Cannot read properties of null (reading
  // 'useId')"). Bundling them up front keeps one React for the whole session.
  optimizeDeps: {
    include: ['mermaid', 'react-markdown', 'remark-gfm'],
  },
  server: {
    // The browser only ever talks to this dev server; /api is passed on to the
    // backend. Same origin means the httpOnly session cookie is first-party.
    // In production a Vercel rewrite does the same job.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
