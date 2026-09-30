import axios from 'axios';

// Shared axios instance for every backend call.
// Services call paths like api.get('/health') and this fills in the base URL.
//
// The API is reached on the same origin as the app (/api): the Vite dev server
// proxies it locally, and a Vercel rewrite does it in production. That keeps
// the httpOnly session cookie first-party, so the browser sends it with every
// request. VITE_API_URL can override this, but it should stay same-origin.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

export default api;
