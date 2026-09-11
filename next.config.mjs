import { createMDX } from 'fumadocs-mdx/next';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

const withMDX = createMDX();

/**
 * Built as a STATIC SITE, deliberately.
 *
 * The knowledge base ships inside the SDWAN Lite console's own nginx image and is
 * served from /kb/ on the same origin as the platform. That means no second Node
 * process to run, no extra port to open, no PM2 unit to babysit, and no separate
 * TLS certificate — deploying the KB is copying a directory.
 *
 * Consequences, all of them deliberate:
 *  - `output: 'export'`  -> plain HTML, no server. Anything needing a running
 *                           server (redirects, route handlers, ISR) is unavailable.
 *  - `basePath: '/kb'`   -> every asset URL is emitted under /kb, matching where
 *                           nginx mounts it. Dev runs the same way, so a path bug
 *                           shows up locally instead of on the box.
 *  - `trailingSlash`     -> emits `guides/alarms/index.html` rather than
 *                           `guides/alarms.html`, which `try_files $uri $uri/`
 *                           serves without any nginx rewriting.
 *  - `images.unoptimized`-> the optimizer is a server feature; without this the
 *                           export fails on the first <img>.
 *
 * Search is statically indexed — see app/api/search/route.ts.
 *
 * @type {import('next').NextConfig}
 */
const config = {
  reactStrictMode: true,
  output: 'export',
  basePath: '/kb',
  trailingSlash: true,
  images: { unoptimized: true },

  // Pin the workspace root.
  //
  // Turbopack infers it by walking up for a lockfile and finds one in the home
  // directory, which would make the whole of ~ the project root. It warns and
  // backs off, but the inference is a coin-flip on any machine with a stray
  // package.json above the repo — so state it.
  turbopack: { root: HERE },
};

export default withMDX(config);
