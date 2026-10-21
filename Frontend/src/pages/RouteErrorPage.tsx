import { isRouteErrorResponse, useRouteError } from 'react-router';
import Button from '../components/ui/Button';
import Panel from '../components/ui/Panel';

// Shown in place of a screen that crashed, instead of React Router's
// developer error. Needs nothing from the app's contexts, so it also works as
// the last-resort page for errors outside the main layout.

// A chunk of the app that can't be loaded (usually because a newer version was
// deployed, or the dev server rebuilt its bundles, while the page was open).
// Reloading fixes it.
const STALE_APP = /dynamically imported module|Importing a module script failed|error loading dynamically imported module|reading 'use[A-Z]\w*'/i;

function describe(error: unknown): { title: string; message: string; stale: boolean } {
  if (isRouteErrorResponse(error)) {
    return error.status === 404
      ? { title: 'Uncharted space', message: 'There’s nothing at these coordinates, Pilot.', stale: false }
      : { title: 'Transmission failed', message: `The ship’s systems reported an error (${error.status}).`, stale: false };
  }
  const text = error instanceof Error ? error.message : String(error);
  if (STALE_APP.test(text)) {
    return {
      title: 'Systems out of sync',
      message: 'Part of Questack was updated while this page was open. Reload to pick up the latest version.',
      stale: true,
    };
  }
  return {
    title: 'Systems malfunction',
    message: 'Something went wrong on this screen. Your progress is saved on the server, so reloading is safe.',
    stale: false,
  };
}

export default function RouteErrorPage() {
  const error = useRouteError();
  const { title, message, stale } = describe(error);

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <Panel label={stale ? 'Reload needed' : 'Error'}>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-[0.1em] uppercase">{title}</h1>
        <p role="alert" className="mt-2 text-sm text-slate-300">
          {message}
        </p>

        {import.meta.env.DEV && error instanceof Error && (
          <details className="mt-4 text-xs text-muted">
            <summary className="cursor-pointer">Details (development only)</summary>
            <pre className="mt-2 max-h-48 overflow-auto font-mono whitespace-pre-wrap">{error.stack ?? error.message}</pre>
          </details>
        )}

        <div className="mt-6 flex gap-3">
          <Button onClick={() => window.location.reload()} className="flex-1">
            Reload
          </Button>
          {/* A full page load, so a broken screen can't keep the app in a bad state */}
          <Button variant="outline" onClick={() => window.location.assign('/')} className="flex-1">
            Galaxy map
          </Button>
        </div>
      </Panel>
    </main>
  );
}
