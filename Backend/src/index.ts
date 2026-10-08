import 'dotenv/config';
import { app } from './app.js';

// Starts the API. Everything the app does lives in app.ts, so tests can use
// it without opening a port. .env is only loaded here, never in tests.
const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`Questack API running on http://localhost:${PORT}`);
});
