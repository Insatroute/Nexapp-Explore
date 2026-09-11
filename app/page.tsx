import Link from 'next/link';

// A STATIC entry page, not a redirect. `redirect()` needs a server, and this site
// is exported to plain HTML — so without a real page here, "/" is a 404 for anyone
// who trims the URL, and Next's own route-tree prefetch 404s alongside it.
//
// Two handbooks ship from this one app: SDWAN Lite at /docs and the Nexapp
// Controller at /controller. Both links are internal, so neither depends on a
// second server being up.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Nexapp knowledge base</h1>
        <p className="text-fd-muted-foreground max-w-md">
          Two platforms, documented from the platforms themselves — how each one
          works, and how to do the everyday jobs.
        </p>
      </div>

      {/* Side by side on anything wider than a phone; stacked below that, where
          two buttons on one row would each be too narrow to read. */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <Link
          href="/docs"
          className="bg-fd-primary text-fd-primary-foreground rounded-lg px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
        >
          SDWAN Lite handbook
        </Link>
        <Link
          href="/controller"
          className="border border-fd-border bg-fd-card text-fd-card-foreground rounded-lg px-5 py-2.5 text-sm font-medium transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
        >
          Nexapp Controller handbook
        </Link>
      </div>
    </main>
  );
}
