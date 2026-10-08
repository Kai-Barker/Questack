import { http, HttpResponse, type JsonBodyType } from 'msw';
import { setupServer } from 'msw/node';

// A fake backend for the frontend tests. Tests add handlers with
// server.use(...) for the calls they expect; anything else is an error.

export const server = setupServer();

// Full URL for an API path, as the app's axios instance calls it
export const apiUrl = (path: string) => `http://localhost:5173/api${path}`;

type Method = 'get' | 'post' | 'patch';

// Answers one API route with a fixed status and body, and records each
// request so the test can check what was sent
export function respond(method: Method, path: string, status: number, body?: JsonBodyType) {
  const calls: { url: URL; body: unknown }[] = [];
  server.use(
    http[method](apiUrl(path), async ({ request }) => {
      const text = await request.text();
      calls.push({ url: new URL(request.url), body: text ? JSON.parse(text) : undefined });
      return status === 204 ? new HttpResponse(null, { status }) : HttpResponse.json(body ?? null, { status });
    }),
  );
  return calls;
}

// A route the backend can't be reached on (connection refused)
export function unreachable(method: Method, path: string) {
  server.use(http[method](apiUrl(path), () => HttpResponse.error()));
}
