# Questack: Frontend

React 19 + Vite + TypeScript + Tailwind CSS v4. See the [root README](../README.md) for the full project and setup.

```bash
npm install
npm run dev      # http://localhost:5173 (needs the backend on :3000)
npm test         # Vitest + Testing Library; the API is answered by MSW
npm run lint
npm run build
```

## How it's organised

| Folder | Purpose |
|---|---|
| `src/pages/` | One component per screen (Dashboard, Sector, Quest, Decoder, Onboarding, Profile, Settings, admin/) |
| `src/components/` | UI grouped by screen, plus `ui/` for shared pieces (Panel, Button, ChamferFrame) |
| `src/services/` | The only code that calls the backend (`api.ts` is the shared axios instance) |
| `src/hooks/` | Data loading (`useApiRequest`) and screen state (`useQuestSession`, `useDecoder`) |
| `src/context/` | Signed-in account (`AuthProvider`) and pilot summary (`PilotProvider`) |
| `src/types/` | Shapes of the API responses |

## Routing and guards

`App.tsx` defines the routes. Each guard wraps the routes inside it:

- `BootGate` plays the splash screen. Signed-out visitors choose **Registered pilot** (login) or **New recruit** (enlist).
- `GuestOnly` covers login and enlist, which are for signed-out visitors only.
- `RequireAuth` sends anyone without a session to login.
- `RequireEnlisted` sends a pilot with no sector to `/onboarding` first.
- `RequireAdmin` sends anyone who isn't an admin back to the Galaxy Map. The backend checks the role again on every admin request.

## API access

The app calls `/api`, which Vite proxies to the backend locally (and a rewrite does in production). That keeps the httpOnly session cookie first-party. Leave `VITE_API_URL` unset unless the API is on the same origin. If a local `.env` sets it to `http://localhost:3000/api`, the tests fail, because MSW answers on the app's own origin.
