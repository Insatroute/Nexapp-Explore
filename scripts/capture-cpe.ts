/**
 * Screenshots for the CPE handbook, captured from a running controller.
 *
 * Every CPE page in the handbook already carries empty screenshot slots and a
 * list of the shots it wants (see public/img/cpe/README.md). This fills them.
 * It is the one part of that handbook that cannot be generated from source: a
 * screenshot needs a browser, a login and a device with real state on it.
 *
 * WHAT IT DOES
 *   Walks the same `CPE_MENU` the documentation is generated from, so it
 *   visits exactly the screens the handbook describes — no list to keep in
 *   step. For each one it captures what that page asks for:
 *
 *     list.png      the screen as it opens
 *     form.png      its drawer, open on a new record
 *     delete.png    the delete confirmation
 *     applied.png   the staged-changes bar, where the screen stages
 *
 *   and writes them straight to public/img/cpe/<section>/<screen>/.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *   It never saves, applies or deletes anything. Drawers are opened and
 *   cancelled; the delete dialog is opened and dismissed. `applied.png` is
 *   skipped unless --allow-writes is passed, because producing it means
 *   actually saving a record on the device.
 *
 * BEFORE YOU RUN IT
 *   These images go into the repository and are served from /kb/. Treat them
 *   as published. Point it at a lab device if you have one; otherwise use
 *   --mask, which blanks the device header's name, MAC, serial and management
 *   IP before each shot.
 *
 * USAGE
 *   npx playwright install chromium          # once
 *   NXC_URL=https://controller.example       \
 *   NXC_USER=admin NXC_PASS=...              \
 *     npm run capture:cpe -- --device C-Dev --mask
 *
 *   Credentials come from the environment and are never written to disk or to
 *   the console. Prefer a shell that does not record history, or a .env file
 *   you do not commit.
 *
 * FLAGS
 *   --device <name>   which device to open (required)
 *   --only <slug>     one screen, e.g. performance-sla/path-monitors
 *   --mask            blank identifying fields in the device header
 *   --allow-writes    also capture applied.png, which SAVES a record
 *   --headed          watch it work, for when a selector needs tuning
 */
import { mkdir, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCpeMenu, type CpePage, type CpeSection } from '../nexapp-controller/extract-cpe.ts';

/**
 * As much of Playwright's surface as this script uses. Declared here rather
 * than imported so the file carries no dependency; if a call drifts from the
 * real API, the failure is at run time with a clear message, which is the
 * right trade for a script nobody runs during a build.
 */
interface PwPage {
  goto(url: string, o?: object): Promise<unknown>;
  getByLabel(re: RegExp): PwLocator;
  getByRole(role: string, o?: { name?: string | RegExp; exact?: boolean }): PwLocator;
  getByText(text: string, o?: { exact?: boolean }): PwLocator;
  locator(sel: string, o?: { hasText?: string }): PwLocator;
  waitForURL(re: RegExp, o?: object): Promise<unknown>;
  waitForSelector(sel: string, o?: object): Promise<unknown>;
  waitForTimeout(ms: number): Promise<unknown>;
  addStyleTag(o: { content: string }): Promise<unknown>;
  screenshot(o: { path: string }): Promise<unknown>;
  keyboard: { press(key: string): Promise<unknown> };
}
interface PwLocator {
  first(): PwLocator;
  or(other: PwLocator): PwLocator;
  count(): Promise<number>;
  click(): Promise<void>;
  fill(value: string): Promise<void>;
}
interface Chromium {
  launch(o: { headless: boolean }): Promise<{
    newContext(o: object): Promise<{ newPage(): Promise<PwPage> }>;
    close(): Promise<void>;
  }>;
}

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(APP_ROOT, 'public', 'img', 'cpe');

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

interface Opts {
  url: string;
  user: string;
  pass: string;
  device: string;
  only?: string;
  mask: boolean;
  allowWrites: boolean;
  headed: boolean;
}

function options(): Opts {
  const argv = process.argv.slice(2);
  const flag = (name: string) => argv.includes(`--${name}`);
  const value = (name: string) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };

  const url = process.env.NXC_URL;
  const user = process.env.NXC_USER;
  const pass = process.env.NXC_PASS;
  const device = value('device');

  const missing = [
    !url && 'NXC_URL',
    !user && 'NXC_USER',
    !pass && 'NXC_PASS',
    !device && '--device',
  ].filter(Boolean);
  if (missing.length) {
    console.error(
      `capture-cpe: missing ${missing.join(', ')}\n\n` +
        `  NXC_URL=https://controller.example NXC_USER=admin NXC_PASS=… \\\n` +
        `    npm run capture:cpe -- --device C-Dev --mask\n`,
    );
    process.exit(2);
  }

  return {
    url: url!.replace(/\/+$/, ''),
    user: user!,
    pass: pass!,
    device: device!,
    only: value('only'),
    mask: flag('mask'),
    allowWrites: flag('allow-writes'),
    headed: flag('headed'),
  };
}

/**
 * Playwright is not a dependency of this app — it is only needed to capture,
 * which is a once-in-a-while job on someone's machine rather than part of the
 * build. Imported dynamically so `npm ci` and `npm run build` stay unaffected.
 */
async function playwright(): Promise<{ chromium: Chromium }> {
  try {
    // The specifier is a variable on purpose: a literal would make `tsc`
    // resolve it, and this file has to type-check on machines that have never
    // installed Playwright — which is everyone who only builds the site.
    const id = 'playwright';
    return (await import(id)) as { chromium: Chromium };
  } catch {
    console.error(
      'capture-cpe: playwright is not installed.\n' +
        '  npm i -D playwright && npx playwright install chromium\n',
    );
    process.exit(2);
  }
}

/** The identifying fields in the device header, blanked before a shot. */
const MASK_CSS = `
  .dhero__name, .dhero__sub, .dhv .mono { color: transparent !important; position: relative; }
  .dhero__name::after, .dhero__sub::after, .dhv .mono::after {
    content: ''; position: absolute; inset: 0; background: currentColor;
    opacity: .12; border-radius: 3px;
  }
`;

async function main() {
  const o = options();

  // The screen list is resolved BEFORE Playwright is required, so a typo in
  // --only is reported on any machine rather than only on one that has the
  // browser installed.
  const menu = await readCpeMenu();
  const wanted: Array<{ section: CpeSection; page: CpePage; dir: string }> = [];
  for (const section of menu) {
    for (const page of section.pages) {
      const dir = `${slug(section.label)}/${slug(page.label)}`;
      if (o.only && dir !== o.only) continue;
      wanted.push({ section, page, dir });
    }
  }
  if (!wanted.length) {
    console.error(`capture-cpe: --only ${o.only} matched no screen`);
    process.exit(2);
  }

  const { chromium } = await playwright();
  const browser = await chromium.launch({ headless: !o.headed });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // ---- sign in
  await page.goto(`${o.url}/app/login`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel(/user/i).fill(o.user);
  await page.getByLabel(/password/i).fill(o.pass);
  await page.getByRole('button', { name: /sign in|log ?in/i }).click();
  await page.waitForURL(/\/app\//, { timeout: 30_000 });

  // ---- open the device, then its CPE tab
  await page.goto(`${o.url}/app/devices`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: o.device, exact: false }).first().click();
  await page.getByRole('tab', { name: 'CPE' }).or(page.getByText('CPE', { exact: true })).first().click();
  await page.waitForSelector('.cpenav__item', { timeout: 30_000 });

  if (o.mask) await page.addStyleTag({ content: MASK_CSS });

  const shot = async (dir: string, file: string) => {
    const to = path.join(OUT, dir);
    await mkdir(to, { recursive: true });
    await page.screenshot({ path: path.join(to, file) });
    console.log(`  ${dir}/${file}`);
  };

  let captured = 0;
  const skipped: string[] = [];

  for (const { section, page: cpe, dir } of wanted) {
    console.log(`${section.label} › ${cpe.label}`);
    try {
      // The shell holds the active page in React state, not in the URL, so a
      // screen is reached by clicking: open its section, then pick the page.
      const sec = page.locator('.cpenav__parent', { hasText: section.label }).first();
      if (await sec.count()) await sec.click();
      await page.locator('.cpenav__item', { hasText: cpe.label }).first().click();
      await page.waitForTimeout(1200);

      await shot(dir, 'list.png');
      captured++;

      // The drawer, on a NEW record — the starting values the field table
      // documents are only visible here.
      const add = page.getByRole('button', { name: /^(add|new|create)\b/i }).first();
      if (await add.count()) {
        await add.click();
        await page.waitForTimeout(800);
        await shot(dir, 'form.png');
        captured++;
        await page.getByRole('button', { name: /^cancel$/i }).first().click().catch(() => {});
        await page.waitForTimeout(400);
      }

      // The delete confirmation, opened and dismissed. Nothing is deleted.
      const rowMenu = page.locator('[aria-label^="Actions for"]').first();
      if (await rowMenu.count()) {
        await rowMenu.click();
        const del = page.getByRole('menuitem', { name: /^(delete|remove)\b/i }).first();
        if (await del.count()) {
          await del.click();
          await page.waitForTimeout(600);
          await shot(dir, 'delete.png');
          captured++;
          await page.getByRole('button', { name: /^cancel$/i }).first().click().catch(() => {});
        }
        await page.keyboard.press('Escape').catch(() => {});
      }

      if (!o.allowWrites) skipped.push(`${dir}/applied.png`);
    } catch (e) {
      // One screen failing must not cost the other forty-four. The controller
      // is a live system; a tab can be slow, empty, or gated on a service.
      console.log(`  skipped: ${(e as Error).message.split('\n')[0]}`);
    }
  }

  await browser.close();

  console.log(`\n${captured} image(s) written under public/img/cpe/`);
  if (skipped.length) {
    console.log(
      `${skipped.length} applied.png shot(s) not taken — that one needs a real save.\n` +
        `Re-run with --allow-writes on a device you are willing to change.`,
    );
  }
  console.log('Run `npm run generate` to place them, then `npm run build`.');

  // A record of what this run produced, so a later run can be compared to it.
  await writeFile(
    path.join(OUT, 'last-capture.json'),
    `${JSON.stringify({ at: new Date().toISOString(), device: o.device, captured, masked: o.mask }, null, 2)}\n`,
  );
}

await main();
