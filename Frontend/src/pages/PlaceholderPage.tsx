import { useParams } from 'react-router';
import Button from '../components/ui/Button';
import Panel from '../components/ui/Panel';

// Temporary stand-in for screens that haven't been built yet
export default function PlaceholderPage({ title }: { title: string }) {
  const params = Object.entries(useParams());

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <Panel label="Coming soon">
        <h1 className="mt-2 font-display text-2xl font-bold tracking-[0.1em] uppercase">{title}</h1>
        <p className="mt-2 text-sm text-slate-300">This screen hasn't been built yet.</p>

        {params.length > 0 && (
          <dl className="mt-4 font-mono text-xs text-muted">
            {params.map(([key, value]) => (
              <div key={key} className="flex gap-2">
                <dt>{key}:</dt>
                <dd className="text-accent">{value}</dd>
              </div>
            ))}
          </dl>
        )}

        <Button variant="outline" to="/" className="mt-6 w-full">
          Back to galaxy map
        </Button>
      </Panel>
    </main>
  );
}
