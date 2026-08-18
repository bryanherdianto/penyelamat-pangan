'use client';

/**
 * The old header held a non-functional search box, two dead icon buttons and a
 * hardcoded profile (fixed name, fixed email, random picsum.dev avatar). There
 * is no auth or search in this app, so it now shows only real state: when the
 * sensor feed last updated, and a way to refresh it.
 */
export default function Topbar({
  title,
  subtitle,
  lastUpdated,
  online,
  onRefresh,
  busy = false,
}: {
  title: string;
  subtitle?: string;
  lastUpdated?: string | null;
  online: boolean;
  onRefresh: () => void;
  busy?: boolean;
}) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 lg:mb-6 bg-surface-muted p-4 lg:p-5 rounded-2xl">
      <div className="min-w-0">
        <h1 className="text-lg lg:text-xl font-semibold truncate">{title}</h1>
        {subtitle && <p className="text-xs lg:text-sm text-ink-muted truncate">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className="flex items-center gap-2 text-xs text-ink-muted">
          <span
            className={`w-2 h-2 rounded-full ${online ? 'bg-fresh' : 'bg-danger'}`}
            aria-hidden="true"
          />
          {online
            ? lastUpdated
              ? `Updated ${new Date(lastUpdated).toLocaleTimeString()}`
              : 'Connected'
            : 'Sensor API offline'}
        </span>

        <button
          onClick={onRefresh}
          disabled={busy}
          className="flex items-center gap-2 px-3 py-2 bg-surface rounded-full text-sm text-ink-muted hover:text-brand-dark transition-colors disabled:opacity-50"
        >
          <svg
            className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>
    </header>
  );
}
