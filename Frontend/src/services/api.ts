import axios from 'axios';

// Shared axios instance for every backend call.
// Services call paths like api.get('/health') and this fills in the base URL.
// Set VITE_API_URL in .env (and in Vercel when deployed).
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  headers: { 'Content-Type': 'application/json' },
});

export default api;
