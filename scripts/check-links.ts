/**
 * Fails the build on a broken internal link.
 *
 * This exists because two broken links shipped past a hand-rolled check: a bulk
 * find-and-replace during a restructure rewrote `/docs/ipam` inside
 * `/docs/ipam/control-plane`, silently producing `/docs/ipam/subnets/control-plane`,
 * and a deleted page left a dangling card on the home page. Both looked fine in
 * source review and only surfaced by fetching every page.
 *
 * So this resolves links the way the site does — against the pages that actually
 * exist, including generated ones — rather than against what anyone believes exists.
 *
 * BOTH handbooks are checked, and against ONE combined set of valid URLs: a link
 * from the controller into SDWAN Lite is a real link and must resolve, so
 * checking each root in isolation would let a cross-handbook link rot unnoticed.
 *
 * Run: npm run check:links   (also runs as part of npm run build)
 */
import { readdir, readFile, access } from 'node:fs/promises';
import * as path from 'node:path';

const ROOTS: { dir: string; base: string }[] = [
  { dir: './content/docs', base: '/docs' },
  { dir: './content/controller', base: '/controller' },
];

const exists = (p: string) => access(p).then(() => true, () => false);

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full)));
    else if (e.isFile() && full.endsWith('.mdx')) out.push(full);
  }
  return out;
}

const valid = new Set<string>();
const allFiles: string[] = [];

for (const { dir, base } of ROOTS) {
  if (!(await exists(dir))) continue;
  valid.add(base);
  const files = await walk(dir);
  allFiles.push(...files);
  for (const f of files) {
    const rel = path.relative(dir, f).replace(/\\/g, '/').replace(/\.mdx$/, '');
    valid.add(`${base}/${rel}`);
    // An `index.mdx` is also reachable as its folder.
    if (rel.endsWith('/index')) valid.add(`${base}/${rel.slice(0, -'/index'.length)}`);
    if (rel === 'index') valid.add(base);
  }
}

interface Broken { url: string; file: string; line: number }
const broken: Broken[] = [];

for (const f of allFiles) {
  const src = await readFile(f, 'utf8');
  src.split('\n').forEach((line, i) => {
    // markdown links and JSX href attributes alike, in either handbook
    for (const m of line.matchAll(/(?:\]\(|href=")((?:\/docs|\/controller)[^)"#?\s]*)/g)) {
      const url = m[1].replace(/\/$/, '');
      if (!valid.has(url)) broken.push({ url, file: path.relative('.', f), line: i + 1 });
    }
  });
}

if (broken.length === 0) {
  console.log(`links: ${valid.size} pages across ${ROOTS.length} handbooks, 0 broken`);
} else {
  console.error(`\n${broken.length} BROKEN INTERNAL LINK(S):\n`);
  for (const b of broken) console.error(`  ${b.file}:${b.line}  ->  ${b.url}`);
  console.error('');
  process.exit(1);
}
