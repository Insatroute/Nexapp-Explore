/**
 * The screenshot section of a generated page.
 *
 * Screenshots are the one part of this handbook that cannot be read from
 * source — they have to come from a running controller — so every section that
 * wants them needs the same three behaviours, and they were being written
 * again per section:
 *
 *   - show only what is BOTH declared here and present on disk, because an
 *     undeclared image has no caption and renders with an empty `alt`;
 *   - say what is still missing, so an empty slot is visible rather than a
 *     picture nobody notices the absence of;
 *   - report an image on disk that nothing declares, which is how a captured
 *     screenshot silently never appears.
 *
 * `renderNotes` in guide-admin.ts has its own copy covering the sections built
 * on AdminNotes. This one serves the generators that are not — Policy Engine
 * and Firmware — rather than making a third.
 *
 * Not to be confused with `page-shots.ts`, which is a different helper for the
 * devices/vpn/templates guides.
 */
import { readdir } from 'node:fs/promises';
import * as path from 'node:path';
import { APP_ROOT } from './config.ts';

export interface Shot {
  /** File name under `public/img/<root>/<dir>/`. */
  file: string;
  alt: string;
  /**
   * The caption, and before the file exists, the brief for whoever takes it.
   *
   * Those two are rarely the same sentence — a brief says what to capture, a
   * caption says what is on screen — so re-read it against the real image once
   * one lands. It is wrapped in `*…*` when rendered, so an asterisk inside
   * closes the emphasis early; and a bare `<word>` is read by MDX as a tag.
   * Use quotes and bold instead of either.
   */
  what: string;
}

/**
 * @param heading `##` for a page whose sections are top level, `###` where the
 *   screenshots sit under one.
 */
export async function shotSection(
  root: string,
  dir: string,
  shots: Shot[],
  warn: (m: string) => void,
  heading = '###',
): Promise<string[]> {
  // `dir` is empty for a section that is a single page, e.g. Firmware.
  const url = dir ? `${root}/${dir}` : root;
  const rel = path.join('public', 'img', url);
  const have = new Set(await readdir(path.join(APP_ROOT, rel)).catch(() => [] as string[]));
  for (const f of have) {
    if (!shots.some((s) => s.file === f)) warn(`${rel}/${f} is not declared, so it is never shown`);
  }
  const L = [`${heading} Screenshots`, ''];
  const placed = shots.filter((s) => have.has(s.file));
  const missing = shots.filter((s) => !have.has(s.file));

  for (const s of placed) {
    L.push(`<img src="/kb/img/${url}/${s.file}" alt=${JSON.stringify(s.alt)} />`, '', `*${s.what}*`, '');
  }
  if (missing.length) {
    L.push(
      `<Callout type="warn">${placed.length ? '' : 'None yet. '}` +
        `Screenshots have to be captured from a running controller rather than generated. ` +
        `Drop ${missing.length === 1 ? 'this' : 'these'} into \`${rel}/\` and ${missing.length === 1 ? 'it appears' : 'each appears'} here on the next build.</Callout>`,
      '',
      ...missing.map((s) => `- \`${s.file}\` — ${s.what}`),
      '',
    );
  }
  return L;
}
