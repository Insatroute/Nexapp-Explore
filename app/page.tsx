import Link from 'next/link';

// A STATIC entry page, not a redirect. `redirect()` needs a server, and this site
// is exported to plain HTML — so without a real page here, "/" is a 404 for anyone
// who trims the URL, and Next's own route-tree prefetch 404s alongside it.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">SDWAN Lite</h1>
        <p className="text-fd-muted-foreground max-w-md">
          The knowledge base for the router management platform — how it works, and
          how to do the everyday jobs.
        </p>
      </div>
      <Link
        href="/docs"
        className="bg-fd-primary text-fd-primary-foreground rounded-lg px-5 py-2.5 text-sm font-medium"
      >
        Open the handbook
      </Link>
    </main>
  );
}
