/**
 * The route table and the permission each route requires.
 *
 * Two sources, both declarative:
 *   App.jsx                 <Route path="devices" element={<DeviceList />} />
 *   auth/navPermissions.js  ROUTE_PERM: { '/devices': 'config.device', … }
 *
 * `element` gives the component, which gives the file, which is where the page's
 * own facts (columns, actions, tabs, API calls) are read from. Nothing here is
 * inferred from a route's name.
 */
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { FE } from './config.ts';

export type PermValue = string | string[] | null;

export interface RouteRec {
  /** Route path as declared, normalised to a leading slash. */
  path: string;
  /** Component name from element={<X />}. */
  component: string;
  /** Resolved source file, when the lazy/static import could be traced. */
  file?: string;
  /**
   * Set when this record was reached through a `:param` pattern rather than an
   * exact path — e.g. /policy-engine/bgp served by /policy-engine/:tab. The
   * component is then a SHARED HUB rendering many tabs, so its facts describe
   * the hub and not this one entry; the generator says so rather than
   * attributing the hub's whole call surface to a single tab.
   */
  viaPattern?: string;
}

export interface RouteTable {
  routes: Map<string, RouteRec>;
  perms: Record<string, PermValue>;
  /** Resolve a concrete path, through `:param` patterns when needed. */
  match(navPath: string): RouteRec | undefined;
  /** The access sentence for a concrete path. */
  permSentence(navPath: string, isNavTarget?: boolean): string;
}

/** `<Route path="x" element={<Y />} />` — the only form this app uses. */
export async function readRoutes(): Promise<Map<string, RouteRec>> {
  const src = await readFile(path.join(FE, 'App.jsx'), 'utf8');
  const out = new Map<string, RouteRec>();

  const re = /<Route\s+([^>]*?)\/?>/gs;
  for (const m of src.matchAll(re)) {
    const attrs = m[1];
    const p = /\bpath=(?:"([^"]*)"|\{'([^']*)'\})/.exec(attrs);
    const el = /\belement=\{\s*<\s*([A-Za-z0-9_]+)/.exec(attrs);
    if (!p || !el) continue;                       // layout/index routes carry no path
    const raw = (p[1] ?? p[2] ?? '').trim();
    const norm = '/' + raw.replace(/^\//, '');
    out.set(norm, { path: norm, component: el[1] });
  }

  // `<Route index element={<Dashboard />} />` is the "/" route and has no path.
  const idx = /<Route\s+index\s+element=\{\s*<\s*([A-Za-z0-9_]+)/.exec(src);
  if (idx) out.set('/', { path: '/', component: idx[1] });

  await resolveFiles(src, out);
  return out;
}

/** Map each component back to the file it is imported from. */
async function resolveFiles(appSrc: string, routes: Map<string, RouteRec>): Promise<void> {
  const byComponent = new Map<string, string>();
  // static:  import DeviceList from './pages/DeviceList.jsx'
  for (const m of appSrc.matchAll(/import\s+([A-Za-z0-9_]+)\s+from\s+'([^']+)'/g)) {
    byComponent.set(m[1], m[2]);
  }
  // lazy:    const X = lazy(() => import('./pages/X.jsx'))
  for (const m of appSrc.matchAll(/const\s+([A-Za-z0-9_]+)\s*=\s*lazy\(\s*\(\)\s*=>\s*import\(\s*'([^']+)'/g)) {
    byComponent.set(m[1], m[2]);
  }

  for (const r of routes.values()) {
    const spec = byComponent.get(r.component);
    if (!spec?.startsWith('.')) continue;
    r.file = path.join(FE, spec.replace(/^\.\//, ''));
  }
}

/** ROUTE_PERM is a plain object literal; evaluate it rather than pattern-match. */
export async function readPermissions(): Promise<Record<string, PermValue>> {
  const src = await readFile(path.join(FE, 'auth', 'navPermissions.js'), 'utf8');
  const start = src.indexOf('ROUTE_PERM');
  if (start < 0) return {};
  const open = src.indexOf('{', start);

  let depth = 0, inLine = false, inBlock = false, quote: string | null = null, end = -1;
  for (let i = open; i < src.length; i++) {
    const c = src[i], next = src[i + 1], prev = src[i - 1];
    if (inLine) { if (c === '\n') inLine = false; continue; }
    if (inBlock) { if (c === '*' && next === '/') { inBlock = false; i++; } continue; }
    if (quote) { if (c === quote && prev !== '\\') quote = null; continue; }
    if (c === '/' && next === '/') { inLine = true; i++; continue; }
    if (c === '/' && next === '*') { inBlock = true; i++; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end < 0) return {};
  return new Function(`"use strict"; return (${src.slice(open, end + 1)});`)() as
    Record<string, PermValue>;
}

/**
 * Resolve a concrete path against the route table, through `:param` patterns.
 *
 * Exact match first. Failing that, a pattern of the same segment count whose
 * every literal segment agrees — fewest parameters wins, so a more specific
 * route is never shadowed by a vaguer one.
 *
 * Without this, 22 sidebar entries resolved to nothing: /policy-engine/bgp,
 * /security/ips, /pki/authorities and /app-intelligence/* are all served by
 * `:tab` routes, and their pages printed "Not resolved to a route" while their
 * permission sat unread in ROUTE_PERM.
 */
export function matchRoute(routes: Map<string, RouteRec>, navPath: string): RouteRec | undefined {
  const exact = routes.get(navPath);
  if (exact) return exact;

  const segs = navPath.split('/').filter(Boolean);
  let best: RouteRec | undefined;
  let bestParams = Infinity;

  for (const r of routes.values()) {
    const rs = r.path.split('/').filter(Boolean);
    if (rs.length !== segs.length) continue;
    let params = 0;
    let ok = true;
    for (let i = 0; i < rs.length; i++) {
      if (rs[i].startsWith(':')) { params++; continue; }
      // '*' is the catch-all route's literal segment, not a wildcard to honour
      // here: letting it match would give every unresolved path the NotFound
      // component and a confident, wrong component name.
      if (rs[i] !== segs[i]) { ok = false; break; }
    }
    if (ok && params > 0 && params < bestParams) { best = r; bestParams = params; }
  }
  return best ? { ...best, viaPattern: best.path } : undefined;
}

/**
 * The access sentence for a concrete path.
 *
 * Keyed on the PATH against ROUTE_PERM — which is exactly what leafVisible()
 * does — rather than on a resolved route record. A route record is the wrong key
 * for two reasons: a `:tab` route has no ROUTE_PERM entry of its own even though
 * every concrete path it serves does, and the dashboard is special-cased in the
 * source before ROUTE_PERM is consulted at all.
 *
 * `isNavTarget` matters and must not be dropped. ROUTE_PERM governs what the
 * SIDEBAR shows, so its rule "null / absent -> superuser-only" is a statement
 * about menu entries. A detail page reached by clicking a table row
 * (/devices/:id) or the login screen were never menu entries, so their absence
 * says nothing about who may open them.
 */
export function permSentenceFor(
  perms: Record<string, PermValue>,
  navPath: string,
  isNavTarget = true,
): string {
  // navPermissions.js:141 — `if (to === '/') return true // Dashboard: everyone`,
  // checked BEFORE the superuser test and before ROUTE_PERM. The dashboard is
  // deliberately absent from the map, so the "absent -> superuser-only" rule
  // does not reach it.
  if (navPath === '/') {
    return 'Visible to every signed-in user — `leafVisible` special-cases the dashboard.';
  }

  if (!(navPath in perms)) {
    return isNavTarget
      ? 'Superusers only — the menu permission map lists no entry for it.'
      : 'Not a menu entry, so `ROUTE_PERM` does not govern it; the page\'s own API enforces access.';
  }

  const v = perms[navPath];
  if (v === null) return 'Superusers only.';
  if (v === 'staff') return 'Requires a staff account.';
  if (v === 'auth') return 'Available to any signed-in user.';
  if (Array.isArray(v)) {
    return `Requires any permission on ${v.map((m) => `\`${m}\``).join(' or ')}.`;
  }
  if (typeof v === 'string') return `Requires any permission on \`${v}\`.`;
  return 'Superusers only.';
}

/** Routes and permissions together, with resolution that understands patterns. */
export async function readRouteTable(): Promise<RouteTable> {
  const [routes, perms] = await Promise.all([readRoutes(), readPermissions()]);
  return {
    routes,
    perms,
    match: (p) => matchRoute(routes, p),
    permSentence: (p, isNavTarget = true) => permSentenceFor(perms, p, isNavTarget),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const table = await readRouteTable();
  const { readNav, flatten } = await import('./extract-nav.ts');
  const entries = flatten(await readNav()).filter((e) => e.leaf.to);

  let exact = 0, viaPattern = 0, unresolved = 0;
  for (const e of entries) {
    const r = table.match(e.leaf.to!);
    if (!r) unresolved++;
    else if (r.viaPattern) viaPattern++;
    else exact++;
  }
  console.log(
    `${table.routes.size} routes · ${Object.keys(table.perms).length} ROUTE_PERM entries\n` +
      `${entries.length} menu entries: ${exact} exact, ${viaPattern} via a :param pattern, ${unresolved} unresolved\n`,
  );
  for (const p of ['/', '/devices', '/policy-engine/bgp', '/security/ips', '/pki/authorities']) {
    const r = table.match(p);
    console.log(`  ${p.padEnd(24)} ${(r?.component ?? '—').padEnd(16)} ${table.permSentence(p)}`);
  }
}
