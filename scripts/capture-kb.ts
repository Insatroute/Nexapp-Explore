/**
 * Screenshots for the handbook, captured from a running controller.
 *
 * Driven by the pages themselves: every generated page that wants pictures
 * ends with a "Screenshots" list naming each file and what it should show, and
 * the folder it belongs in. This reads those lists, so it captures exactly the
 * files the pages are waiting for, under exactly the names they expect.
 *
 * Covers the device CPE screens (public/img/cpe/…) and the Administration
 * pages (public/img/admin/…).
 *
 * READ-ONLY BY CONSTRUCTION
 *   It opens lists, drawers and delete confirmations, then cancels them. It
 *   never presses Save, Apply, Upload or a confirm button. A requested shot
 *   that can only be produced by saving (`applied.png`, `form-save.png`) is
 *   reported as skipped.
 *
 * USAGE
 *   set -a; . ~/.nexapp-capture.env; set +a     # NXC_URL, NXC_USER, NXC_PASS
 *   node --experimental-strip-types scripts/capture-kb.ts --device C-Dev --mask
 *
 * FLAGS
 *   --device <name>   device whose CPE tab is photographed (required for CPE)
 *   --only <dir>      one folder, e.g. cpe/vpn/gre or admin/users
 *   --mask            blank the device header's identifiers; replace emails
 *                     and phone numbers on screen before each shot
 *   --headed          show the browser
 */
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCpeMenu } from '../nexapp-controller/extract-cpe.ts';

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.join(APP_ROOT, 'content', 'controller');
const IMG = path.join(APP_ROOT, 'public', 'img');

const FE_CPE = path.join(process.env.NXC_SRC ?? path.join(APP_ROOT, '..', 'nexapp-controller-new-ui'), 'frontend', 'src', 'components', 'cpe');

/**
 * Whether EVERY Delete in a CPE component asks for confirmation before it calls
 * the router. Several do not — the row menu's Delete fires the RPC at once on
 * IPS, AntiSpam, Antivirus and Instashield lists — and the script cannot tell
 * which table's row it is about to open, so a screen gets a delete shot only
 * when the whole component is proven safe. Anything unresolvable counts as
 * unsafe.
 */
async function deletesAllConfirm(component: string | undefined): Promise<boolean> {
  if (!component) return false;
  const src = await readFile(path.join(FE_CPE, component), 'utf8').catch(() => '');
  if (!src) return false;
  const handlers = [...src.matchAll(/onDelete=\{([^}]*)\}/g)].map((m) => m[1]);
  if (!handlers.length) return false;
  for (const h of handlers) {
    const name = /^\s*(?:\([^)]*\)\s*=>\s*)?([A-Za-z_$][\w$]*)/.exec(h)?.[1];
    if (!name) return false;
    const def = new RegExp(`(?:const|function)\\s+${name}\\b`).exec(src);
    if (!def) return false;
    const body = src.slice(def.index, def.index + 1500);
    const conf = body.search(/confirm\(/);
    const call = body.search(/nsbondProxy|api\.|unwrap\(/);
    if (conf < 0 || (call >= 0 && call < conf)) return false;
  }
  return true;
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Want { file: string; what: string }
interface Folder { dir: string; wants: Want[]; route?: string }

// ------------------------------------------------------------ what is wanted

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (e.name.endsWith('.mdx')) out.push(p);
  }
  return out;
}

/** Every page's still-missing shots, keyed by `cpe/<section>/<screen>` or `admin/<page>`. */
async function requests(): Promise<Folder[]> {
  const out = new Map<string, Want[]>();
  const routes = new Map<string, string>();
  for (const f of await walk(CONTENT)) {
    const src = await readFile(f, 'utf8');
    const at = src.search(/^#{2,3} Screenshots$/m);
    const block = at < 0 ? '' : src.slice(at);
    // The folder comes from the Screenshots callout, or — on a page whose shots
    // were all captured and so has no such section — from its images.
    const dir = /public\/img\/([a-z-]+\/[a-z0-9/-]+?)\/?`/.exec(block)?.[1]
      ?? /<img src="\/kb\/img\/([a-z-]+\/[a-z0-9/-]+?)\/[a-z0-9-]+\.png"/.exec(src)?.[1];
    if (!dir) continue;
    // The page's own Path card names the console route it documents.
    const route = /<Card title="Path" description="(\/[^"]*)"/.exec(src)?.[1];
    if (route) routes.set(dir, route);
    const wants = out.get(dir) ?? [];
    for (const m of block.matchAll(/^- `([a-z0-9-]+\.png)` — (.*)$/gm)) {
      const have = await readFile(path.join(IMG, dir, m[1])).then(() => true, () => false);
      if (!have && !wants.some((w) => w.file === m[1])) wants.push({ file: m[1], what: m[2] });
    }
    // Pictures the page already shows but which are gone from disk — a page
    // regenerated while they existed lists them as images, not as requests.
    for (const m of src.matchAll(/<img src="\/kb\/img\/([a-z-]+\/[a-z0-9/-]+?)\/([a-z0-9-]+\.png)" alt="([^"]*)"/g)) {
      if (m[1] !== dir) continue;
      const have = await readFile(path.join(IMG, m[1], m[2])).then(() => true, () => false);
      if (!have && !wants.some((w) => w.file === m[2])) wants.push({ file: m[2], what: m[3] });
    }
    if (wants.length) out.set(dir, wants);
  }
  return [...out].map(([dir, wants]) => ({ dir, wants, route: routes.get(dir) }));
}

// ------------------------------------------------------------------ options

function options() {
  const argv = process.argv.slice(2);
  const value = (n: string) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
  const url = process.env.NXC_URL?.replace(/\/+$/, '').replace(/\/app$/, '');
  const user = process.env.NXC_USER;
  const pass = process.env.NXC_PASS;
  const missing = [!url && 'NXC_URL', !user && 'NXC_USER', !pass && 'NXC_PASS'].filter(Boolean);
  if (missing.length) {
    console.error(`capture-kb: missing ${missing.join(', ')} — load them with: set -a; . ~/.nexapp-capture.env; set +a`);
    process.exit(2);
  }
  return {
    url: url!, user: user!, pass: pass!,
    device: value('device'),
    only: value('only'),
    mask: argv.includes('--mask'),
    headed: argv.includes('--headed'),
  };
}

// ------------------------------------------------------------------ masking

/** Device header identifiers — name, MAC, serial, management IP. */
const MASK_CSS = `
  .dhero__name, .dhero__sub, .dhv .mono, .prail__dev { color: transparent !important; position: relative; }
  .dhero__name::after, .dhero__sub::after, .dhv .mono::after, .prail__dev::after {
    content: ''; position: absolute; inset: 0; background: currentColor; opacity: .12; border-radius: 3px;
  }
`;

/** Emails and phone numbers in visible text and input values, replaced in place. */
const MASK_TEXT = (cpe: boolean) => {
  const email = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
  const phone = /\+\d[\d\s-]{7,}\d/g;
  // Hardware and overlay identifiers: MAC addresses, and the 16-hex network
  // IDs OOBM uses (a device can be asked to join one by it).
  const mac = /\b[0-9a-fA-F]{2}(?:[:-][0-9a-fA-F]{2}){5}\b/g;
  const netid = /\b[0-9a-f]{16}\b/g;
  const fix = (s: string) => s.replace(email, 'user@example.com').replace(phone, '+91 00000 00000')
    .replace(mac, 'xx:xx:xx:xx:xx:xx').replace(netid, (m) => (cpe ? 'xxxxxxxxxxxxxxxx' : m))
    // Off the router's own screens, a public IPv4 is a person's address (who
    // signed in, from where): replaced. Private and loopback ranges are kept —
    // they are what the pages are about.
    .replace(/(?<![v\w.])(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\b/g, (m, a, b) => {
      if (cpe) return m;
      const A = +a, B = +b;
      const priv = A === 10 || A === 127 || A === 0 || (A === 192 && B === 168) || (A === 172 && B >= 16 && B <= 31) || (A === 100 && B >= 64 && B <= 127) || A >= 224;
      return priv ? m : 'x.x.x.x';
    });
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    // The sidebar's version label ("v2.0.0.0") is not an address.
    if ((n.parentElement as Element | null)?.closest('.sb__version')) continue;
    const t = n.nodeValue ?? '';
    const f = fix(t);
    if (f !== t) n.nodeValue = f;
  }
  for (const el of Array.from(document.querySelectorAll('input'))) {
    const i = el as HTMLInputElement;
    if (i.type !== 'password' && i.value && fix(i.value) !== i.value) i.value = fix(i.value);
  }
};

// ------------------------------------------------------------------- browser

/** `--plan`: print what would be captured, and how, without signing in. */
async function plan() {
  const argv = process.argv.slice(2);
  const only = argv.includes('--only') ? argv[argv.indexOf('--only') + 1] : undefined;
  const folders = (await requests()).filter((f) => !only || f.dir === only);
  const menu = await readCpeMenu();
  const labels = new Map<string, { component?: string }>();
  for (const s of menu) for (const p of s.pages) labels.set(`cpe/${slug(s.label)}/${slug(p.label)}`, { component: p.component });
  let take = 0, skipN = 0;
  for (const f of folders.filter((x) => x.dir.startsWith('cpe/'))) {
    const where = labels.get(f.dir);
    const safeDelete = await deletesAllConfirm(where?.component);
    for (const w of f.wants) {
      let how = 'capture';
      if (!where) how = 'SKIP: no menu entry';
      else if (w.file === 'applied.png' || w.file === 'form-save.png') how = 'skip: needs a real save';
      else if (w.file === 'delete.png' && !safeDelete) how = 'skip: delete without confirmation';
      else if (w.file.startsWith('form') && !/\*\*(.+?)\*\* (?:drawer|form)/.test(w.what)) how = 'SKIP: no drawer title';
      if (how === 'capture') take++; else skipN++;
      console.log(`${how.padEnd(36)} ${f.dir}/${w.file}`);
    }
  }
  console.log(`\n${take} to capture, ${skipN} skipped`);
}

async function main() {
  if (process.argv.includes('--plan')) return plan();
  const o = options();
  let folders = await requests();
  if (o.only) folders = folders.filter((f) => f.dir === o.only);
  const prefix = process.argv.includes('--prefix') ? process.argv[process.argv.indexOf('--prefix') + 1] : undefined;
  if (prefix) folders = folders.filter((f) => f.dir.startsWith(prefix));
  if (!folders.length) { console.log('Nothing to capture — every requested shot exists.'); return; }

  const id = 'playwright';
  const { chromium } = (await import(id)) as any;
  const browser = await chromium.launch({ headless: !o.headed });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15_000);

  const app = (p: string) => `${o.url}/app${p}`;
  const results: { dir: string; file: string; ok: boolean; why?: string }[] = [];

  const shot = async (dir: string, file: string, full = false) => {
    // The deployed controller adds a floating assistant tab (and its tooltip)
    // that is not part of any screen being documented.
    await page.addStyleTag({ content: '#nexparth-handle, [id^="nexparth"] { display: none !important; }' }).catch(() => {});
    // Park the pointer on empty canvas so no hover tooltip is in the picture.
    await page.mouse.move(760, 880).catch(() => {});
    await sleep(250);
    if (o.mask) {
      await page.addStyleTag({ content: MASK_CSS }).catch(() => {});
      await page.evaluate(MASK_TEXT, dir.startsWith('cpe/')).catch(() => {});
    }
    await mkdir(path.join(IMG, dir), { recursive: true });
    await page.screenshot({ path: path.join(IMG, dir, file), fullPage: full });
    results.push({ dir, file, ok: true });
    console.log(`  ✓ ${dir}/${file}`);
  };
  const skip = (dir: string, file: string, why: string) => {
    results.push({ dir, file, ok: false, why });
    console.log(`  – ${dir}/${file}: ${why}`);
  };
  const settle = async (ms = 900) => {
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    // Placeholder bars and spinners mean the screen is still loading.
    for (let i = 0; i < 20; i++) {
      const busy = await page.locator('.skel:visible, .loading__spin:visible, .cpeskel__title:visible').count().catch(() => 0);
      if (!busy) break;
      await sleep(500);
    }
    await sleep(ms);
  };
  const drawerTitle = async () =>
    (await page.locator('.drawer__t').count()) ? ((await page.locator('.drawer__t').first().innerText()) || '').trim() : null;
  const closeDrawer = async () => {
    const x = page.locator('.drawer__x');
    if (await x.count()) await x.first().click().catch(() => {});
    else await page.keyboard.press('Escape').catch(() => {});
    await sleep(400);
  };
  const cancelDialog = async () => {
    const c = page.locator('.modal').getByRole('button', { name: /^cancel$/i });
    if (await c.count()) await c.first().click().catch(() => {});
    else await page.keyboard.press('Escape').catch(() => {});
    await sleep(300);
  };

  // ---- sign in
  await page.goto(app('/login'), { waitUntil: 'domcontentloaded' });
  await page.locator('#lg-user').fill(o.user);
  await page.locator('#lg-pw').fill(o.pass);
  await page.getByRole('button', { name: /^sign in$/i }).click();
  await settle(1500);
  if (await page.locator('#lg-tok').count()) {
    console.error('capture-kb: this account asks for a two-factor code; use an account without 2FA for capture.');
    await browser.close();
    process.exit(3);
  }
  if (/\/login/.test(page.url())) {
    console.error('capture-kb: sign-in did not succeed — check NXC_USER / NXC_PASS.');
    await browser.close();
    process.exit(3);
  }

  /** The --device router's own SD-LAN panel (its id is only in the page address). */
  const openDeviceSdlan = async () => {
    if (!o.device) throw new Error('--device not given');
    await page.goto(app('/devices')); await settle();
    const search = page.getByPlaceholder(/search name, mac/i);
    if (await search.count()) { await search.fill(o.device); await search.press('Enter'); await settle(); }
    await page.getByRole('link', { name: new RegExp(esc(o.device)) }).first().click(); await settle();
    const id = /\/devices\/([^/?#]+)/.exec(page.url())?.[1];
    if (!id) throw new Error('could not read the device id');
    await page.goto(app(`/devices/${id}/sdlan`)); await settle(2000);
  };

  // ---- Administration
  const ADMIN: Record<string, Record<string, () => Promise<boolean | void>>> = {
    'admin/users': {
      'list.png': async () => { await page.goto(app('/users')); await settle(); },
      'form-new.png': async () => {
        await page.goto(app('/users/new')); await settle();
        await page.locator('#uu').fill('priya.shah');
        await page.locator('#ue').fill('priya.shah@example.com');
        await page.locator('#up').fill('priya2026');
      },
      'form-edit.png': async () => {
        await page.goto(app('/users')); await settle();
        await page.locator('a.devcell').first().click(); await settle();
      },
      'memberships.png': async () => {
        await page.goto(app('/users')); await settle();
        await page.locator('a.devcell').first().click(); await settle();
        await page.getByRole('button', { name: /manage memberships/i }).click(); await settle(600);
      },
    },
    'admin/organizations': {
      'list.png': async () => { await page.goto(app('/organizations')); await settle(); },
      'form-new.png': async () => { await page.goto(app('/organizations/new')); await settle(); },
      'members.png': async () => {
        await page.goto(app('/organizations')); await settle();
        await page.locator('a.devcell').first().click(); await settle();
        await page.getByRole('button', { name: /manage members/i }).click(); await settle(800);
      },
    },
    'admin/allowed-serials': {
      'list.png': async () => { await page.goto(app('/allowed-serials')); await settle(); },
      'form-new.png': async () => {
        await page.goto(app('/allowed-serials')); await settle();
        await page.getByRole('button', { name: /add serial number/i }).click(); await settle(500);
      },
      'csv.png': async () => {
        await page.goto(app('/allowed-serials')); await settle();
        await page.getByRole('button', { name: /upload csv/i }).click(); await settle(500);
      },
    },
    'admin/permission-groups': {
      'list.png': async () => { await page.goto(app('/groups')); await settle(); },
      'form.png': async () => {
        await page.goto(app('/groups')); await settle();
        await page.locator('table a').first().click(); await settle();
        await page.getByText('Selected only', { exact: true }).click().catch(() => {});
        await sleep(500);
      },
    },
    'admin/device-groups': {
      'list.png': async () => { await page.goto(app('/device-groups')); await settle(); },
      'form-new.png': async () => {
        await page.goto(app('/device-groups')); await settle();
        await page.getByRole('button', { name: /add device group/i }).click(); await settle(800);
      },
      'tree.png': async () => { await page.goto(app('/device-groups/tree')); await settle(1500); },
    },
    'admin/hierarchy': {
      'tree.png': async () => { await page.goto(app('/hierarchy')); await settle(2000); },
    },
    'intel/applications': {
      'list.png': async () => { await page.goto(app('/app-intelligence/applications')); await settle(1500); },
      'details.png': async () => {
        await page.goto(app('/app-intelligence/applications')); await settle(1500);
        // An application with both kinds of pattern shows the panel at its fullest.
        const q = page.getByPlaceholder(/search applications/i);
        await q.fill('zoom'); await q.press('Enter'); await settle(1500);
        await page.locator('button.devcell').first().click(); await settle(1500);
      },
    },
    'intel/app-traffic': {
      'details.png': async () => {
        await page.goto(app('/app-intelligence/traffic')); await settle(2000);
        await page.locator('table button.devcell').first().click(); await settle(1000);
      },
    },
    'intel/discovered-devices': {
      'details.png': async () => {
        await page.goto(app('/app-intelligence/discovered')); await settle(2000);
        await page.locator('table button.devcell').first().click(); await settle(1000);
      },
    },
    'intel/snapshots': {
      'details.png': async () => {
        await page.goto(app('/app-intelligence/snapshots')); await settle(2000);
        await page.locator('table button.devcell').first().click(); await settle(1000);
      },
    },
    // Each click below was checked in source to open a form or switch a view only.
    'network/sdlan': {
      'form-new.png': async () => {
        await page.goto(app('/sdlan')); await settle(2000);
        await page.locator('button.btn--primary').first().click(); await settle(800);
      },
    },
    'network/ha-devices': {
      'form-new.png': async () => {
        await page.goto(app('/ha/devices')); await settle(2000);
        await page.getByRole('button', { name: /set up ha/i }).first().click(); await settle(1000);
      },
    },
    'network/sdlan-access': {
      'list.png': async () => { await openDeviceSdlan(); },
      'form-new.png': async () => {
        await openDeviceSdlan();
        await page.getByRole('button', { name: /^\s*add\s*$/i }).first().click(); await settle(800);
      },
    },
    'overlay/sd-wan-fabric': {
      'wizard.png': async () => { await page.goto(app('/topologies/new')); await settle(2000); },
      'detail.png': async () => {
        await page.goto(app('/topologies')); await settle(2000);
        await page.locator('table a').first().click(); await settle(2500);
      },
    },
    'dashboard/dashboard': {
      'uplinks.png': async () => {
        await page.goto(app('/')); await settle(3000);
        await page.getByRole('tab', { name: /wan uplinks/i }).click(); await settle(1500);
      },
      'traffic.png': async () => {
        await page.goto(app('/')); await settle(3000);
        await page.getByRole('tab', { name: /traffic insights/i }).click(); await settle(2500);
      },
    },
    'reports/report-view': {
      'list.png': async () => {
        await page.goto(app('/reports')); await settle(2000);
        await page.locator('a[href*="/reports/"]:not([href*="schedules"]):not([href*="custom"])').first().click(); await settle(2500);
      },
    },
    'reports/reports': {
      'schedule-form.png': async () => {
        await page.goto(app('/reports/schedules')); await settle(2000);
        await page.locator('button.btn--primary').first().click(); await settle(800);
      },
    },
    'admin/license': {
      'page.png': async () => { await page.goto(app('/license')); await settle(1500); return true; },
    },
  };

  /**
   * Access Control pages share one shape: a list with the primary button in the
   * card header opening a drawer. `list.png` is the page; a form shot clicks
   * that one button (verified in source to only open a drawer on every Access
   * Control page) and is kept only if a drawer actually opened.
   */
  // Where a page's primary header button has been checked in source to do
  // nothing but open a drawer. Everywhere else a generic step only navigates:
  // HA, fabric and similar pages carry buttons that act on live systems.
  const DRAWER_ONLY = ['access/', 'network/locations', 'reports/reports'];
  const genericStep = (dir: string, route: string, file: string) => {
    if (route.includes(':')) return undefined;
    if (file === 'list.png' || file === 'page.png') return async () => { await page.goto(app(route)); await settle(2000); return file === 'page.png'; };
    if (/^form(-new)?\.png$/.test(file) && DRAWER_ONLY.some((p) => dir.startsWith(p))) return async () => {
      await page.goto(app(route)); await settle(1500);
      const btn = page.locator('.card__head button.btn--primary').first();
      if (!(await btn.count())) throw new Error('no primary button on this page');
      await btn.click(); await settle(800);
      if (!(await drawerTitle())) throw new Error('the primary button opened no drawer');
    };
    return undefined;
  };

  for (const f of folders.filter((x) => !x.dir.startsWith('cpe/'))) {
    console.log(f.dir);
    for (const w of f.wants) {
      const step = ADMIN[f.dir]?.[w.file] ?? (f.route ? genericStep(f.dir, f.route, w.file) : undefined);
      if (!step) { skip(f.dir, w.file, 'no capture step defined'); continue; }
      try {
        const full = await step();
        await shot(f.dir, w.file, full === true);
      } catch (e) {
        skip(f.dir, w.file, (e as Error).message.split('\n')[0]);
      }
    }
  }

  // ---- CPE
  const cpeFolders = folders.filter((x) => x.dir.startsWith('cpe/'));
  if (cpeFolders.length && !o.device) {
    for (const f of cpeFolders) for (const w of f.wants) skip(f.dir, w.file, '--device not given');
  } else if (cpeFolders.length) {
    const menu = await readCpeMenu();
    const labels = new Map<string, { section: string; page: string; component?: string }>();
    for (const s of menu) for (const p of s.pages) labels.set(`cpe/${slug(s.label)}/${slug(p.label)}`, { section: s.label, page: p.label, component: p.component });

    const openCpe = async () => {
      await page.goto(app('/devices')); await settle();
      const search = page.getByPlaceholder(/search name, mac/i);
      if (await search.count()) { await search.fill(o.device!); await search.press('Enter'); await settle(); }
      await page.getByRole('link', { name: new RegExp(esc(o.device!)) }).first().click();
      await settle();
      await page.getByRole('tab', { name: /^CPE$/ }).click();
      await page.waitForSelector('.cpenav__item', { timeout: 30_000 });
      await settle();
    };
    await openCpe();

    const openScreen = async (section: string, label: string) => {
      const exact = (t: string) => new RegExp(`^\\s*${esc(t)}\\s*$`);
      const item = page.locator('.cpenav__item').filter({ hasText: exact(label) });
      if (!(await item.first().isVisible().catch(() => false))) {
        const sec = page.locator('.cpenav__parent').filter({ hasText: exact(section) });
        if (await sec.count()) { await sec.first().click(); await sleep(300); }
      }
      await item.first().click();
      await settle(1500);
    };

    /** Open the drawer whose title matches, by its button or by trying likely buttons. */
    const openForm = async (w: Want): Promise<boolean> => {
      const title = /\*\*(.+?)\*\* (?:drawer|form)/.exec(w.what)?.[1];
      const button = /opened with \*\*(.+?)\*\*/.exec(w.what)?.[1];
      if (!title) return false;
      const want = new RegExp(`^${esc(title).replace(/‹…›/g, '.*')}$`, 'i');
      const tryHere = async (): Promise<boolean> => {
        const all = page.locator('.cpepg button:visible');
        const texts: string[] = ((await all.allInnerTexts()) as string[]).map((t: string) => t.trim());
        const order = texts
          .map((t: string, i: number) => ({ t, i }))
          .filter(({ t }: { t: string }) => (button ? t.toLowerCase() === button.toLowerCase()
            // A bare "Add" sits beside an inline text box and submits it — never a drawer.
            : /^(add|create|new|configure|grant)\b/i.test(t) && !/^add$/i.test(t)));
        for (const { i } of order) {
          await all.nth(i).click().catch(() => {});
          await sleep(700);
          const t = await drawerTitle();
          if (t && want.test(t)) return true;
          if (t) await closeDrawer();
          else if (await page.locator('.modal').count()) await cancelDialog();
        }
        return false;
      };
      if (await tryHere()) return true;
      // A drawer opened from a row's menu ("Create alias on wan"): click only an
      // item whose text matches the drawer title exactly.
      const menus = page.locator('.cpepg [aria-label^="Actions for"]:visible');
      for (let i = 0, n = Math.min(await menus.count(), 3); i < n; i++) {
        await menus.nth(i).click().catch(() => {});
        await sleep(300);
        const items = page.getByRole('menuitem');
        const texts: string[] = ((await items.allInnerTexts()) as string[]).map((t: string) => t.trim());
        // The item may be worded differently from the drawer it opens ("Create
        // alias interface" → "Create alias on wan"); its fixed leading words
        // must match, and the drawer title is still checked after the click.
        const lead = title.split('‹')[0].trim().replace(/\s+(on|for|to|in)$/i, '');
        const hit = texts.findIndex((t: string) => want.test(t)
          || (lead.split(/\s+/).length >= 2 && t.toLowerCase().startsWith(lead.toLowerCase())));
        if (hit >= 0) {
          await items.nth(hit).click();
          await sleep(700);
          const t = await drawerTitle();
          if (t && want.test(t)) return true;
          if (t) await closeDrawer();
        } else {
          await page.keyboard.press('Escape').catch(() => {});
          await sleep(200);
        }
      }
      // Forms tucked inside a collapsed section ("Advanced: raw rules…").
      const summaries = page.locator('.cpepg details:not([open]) > summary');
      for (let i = (await summaries.count()) - 1; i >= 0; i--) await summaries.nth(i).click().catch(() => {});
      const closed = page.locator('.cpepg [aria-expanded="false"]:visible');
      const nClosed = await closed.count();
      if (nClosed || (await page.locator('.cpepg details[open]').count())) {
        for (let i = nClosed - 1; i >= 0; i--) await closed.nth(i).click().catch(() => {});
        await settle(800);
        if (await tryHere()) return true;
      }
      const tabs = page.locator('.cpesub__item');
      const n = await tabs.count();
      for (let i = 0; i < n; i++) {
        await tabs.nth(i).click().catch(() => {});
        await settle(800);
        if (await tryHere()) return true;
      }
      return false;
    };

    for (const f of cpeFolders) {
      const where = labels.get(f.dir);
      console.log(f.dir);
      if (!where) { for (const w of f.wants) skip(f.dir, w.file, 'no CPE menu entry with this slug'); continue; }
      for (const w of f.wants) {
        try {
          if (w.file === 'applied.png' || w.file === 'form-save.png') { skip(f.dir, w.file, 'needs a real save — not taken'); continue; }
          if (!page.url().includes('/devices/')) await openCpe();
          await openScreen(where.section, where.page);
          if (w.file === 'list.png') { await shot(f.dir, w.file); continue; }
          if (w.file === 'settings.png') { await shot(f.dir, w.file, true); continue; }
          if (w.file === 'delete.png') {
            if (!(await deletesAllConfirm(where.component))) { skip(f.dir, w.file, 'a Delete on this screen acts without confirmation — not clicked'); continue; }
            const menuBtn = page.locator('[aria-label^="Actions for"]:visible').first();
            if (!(await menuBtn.count())) { skip(f.dir, w.file, 'no rows to open a delete dialog on'); continue; }
            await menuBtn.click(); await sleep(300);
            const del = page.getByRole('menuitem', { name: /^(delete|remove)\b/i }).first();
            if (!(await del.count())) { await page.keyboard.press('Escape'); skip(f.dir, w.file, 'row menu has no delete'); continue; }
            await del.click(); await sleep(600);
            if (!(await page.locator('.modal[role="alertdialog"]').count())) { skip(f.dir, w.file, 'no confirmation appeared'); continue; }
            await shot(f.dir, w.file);
            await cancelDialog();
            continue;
          }
          if (w.file.startsWith('form')) {
            if (await openForm(w)) { await sleep(400); await shot(f.dir, w.file); await closeDrawer(); }
            else skip(f.dir, w.file, 'could not find the button for this drawer');
            continue;
          }
          skip(f.dir, w.file, 'unknown shot type');
        } catch (e) {
          skip(f.dir, w.file, (e as Error).message.split('\n')[0]);
          await page.keyboard.press('Escape').catch(() => {});
        }
      }
    }
  }

  await browser.close();
  const ok = results.filter((r) => r.ok).length;
  console.log(`\n${ok} captured, ${results.length - ok} skipped.`);
  await writeFile(
    path.join(IMG, 'last-capture.json'),
    `${JSON.stringify({ at: new Date().toISOString(), device: o.device ?? null, masked: o.mask, results }, null, 2)}\n`,
  );
}

await main();
