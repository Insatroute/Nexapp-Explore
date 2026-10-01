/**
 * A page's screenshot gallery for guides that are not built from notes
 * (Devices, VPN servers, Templates): captured pictures are shown with their
 * caption, and anything not yet captured is listed with what it should show.
 * Images live under `public/img/<dir>/` and are served from `/kb/img/<dir>/`.
 */
import { readdir } from 'node:fs/promises';
import * as path from 'node:path';
import { APP_ROOT } from './config.ts';

export interface PageShot { file: string; what: string; alt: string }

export async function shotSection(dir: string, shots: PageShot[]): Promise<string[]> {
  const have = new Set(await readdir(path.join(APP_ROOT, 'public', 'img', dir)).catch(() => [] as string[]));
  const L = ['### Screenshots', ''];
  for (const sh of shots.filter((x) => have.has(x.file))) {
    L.push(`<img src="/kb/img/${dir}/${sh.file}" alt=${JSON.stringify(sh.alt)} />`, '', `*${sh.what}*`, '');
  }
  const missing = shots.filter((x) => !have.has(x.file));
  if (missing.length) {
    L.push(`<Callout type="warn">Still to capture, into \`public/img/${dir}/\`:</Callout>`, '');
    for (const sh of missing) L.push(`- \`${sh.file}\` — ${sh.what}`);
    L.push('');
  }
  return L;
}

export interface StepFigure { src: string; alt: string; caption: string }

/**
 * Put a picture at the end of a step. `figures` maps a step heading (the text
 * after `### `) to an image under `public/img/`; the image is inserted just
 * before that step's closing `</Step>` — and only if the file exists, so a
 * guide never points at a picture that is not there. Pictures are reused from
 * the pages they were captured for rather than taken twice.
 */
export async function withStepFigures(md: string, figures: Record<string, StepFigure>): Promise<string> {
  const { access } = await import('node:fs/promises');
  let out = md;
  for (const [heading, f] of Object.entries(figures)) {
    const ok = await access(path.join(APP_ROOT, 'public', 'img', f.src)).then(() => true, () => false);
    if (!ok) continue;
    const at = out.indexOf(`### ${heading}\n`);
    if (at < 0) continue;
    const end = out.indexOf('</Step>', at);
    if (end < 0) continue;
    const fig = `<img src="/kb/img/${f.src}" alt=${JSON.stringify(f.alt)} />\n\n*${f.caption}*\n\n`;
    out = out.slice(0, end) + fig + out.slice(end);
  }
  return out;
}
