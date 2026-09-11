/**
 * Where the controller source lives.
 *
 * The SDWAN Lite generator hardcoded `../../../IOT RMS_2026/nexapp-rms2`, which
 * broke the moment the docs app was moved to a different depth — a relative path
 * silently encodes the layout of one developer's disk. This reads an env var and
 * falls back to the sibling checkout, so moving either repo is a one-line change
 * and a wrong path fails loudly with the path it actually tried.
 *
 *   export NXC_SRC=/path/to/nexapp-controller-new-ui
 */
import * as path from 'node:path';
import { access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

/**
 * Anchored to THIS FILE, not to process.cwd().
 *
 * cwd only happens to be the app root because npm runs scripts there. Running a
 * script directly from this folder — which is the obvious thing to do while
 * debugging one — resolved the controller to a sibling of the wrong directory
 * and failed with a path that does not exist.
 */
const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const CONTROLLER = path.resolve(
  // Default: a sibling of the docs app, i.e. both repos in one workspace dir.
  process.env.NXC_SRC ?? path.join(APP_ROOT, '..', 'nexapp-controller-new-ui'),
);

/** React SPA source — the nav, routes and permissions all come from here. */
export const FE = path.join(CONTROLLER, 'frontend', 'src');
/** Django project root — the API schema is dumped from here. */
export const BE = path.join(CONTROLLER, 'tests');
/** Authored prose, beside the code it describes. */
export const KB = path.join(CONTROLLER, 'docs', 'kb');

/** Where the controller's pages are written — a SECOND docs root, not the first. */
export const OUT = path.join(APP_ROOT, 'content', 'controller');

/**
 * URL prefix the controller handbook is served under.
 *
 * The SDWAN Lite handbook owns /docs in this app. Giving the controller its own
 * prefix keeps the two sidebars separate — one product per navigation tree —
 * while both ship from a single build, a single port and a single deploy.
 */
export const URL_BASE = '/controller';

export async function requireController(): Promise<void> {
  const probe = path.join(FE, 'components', 'Sidebar.jsx');
  try {
    await access(probe);
  } catch {
    throw new Error(
      `Controller source not found.\n` +
        `  Looked for: ${probe}\n` +
        `  Set NXC_SRC to your checkout of nexapp-controller-new-ui:\n` +
        `      export NXC_SRC=/path/to/nexapp-controller-new-ui`,
    );
  }
}
