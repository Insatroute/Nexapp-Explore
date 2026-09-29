/**
 * The Checks tab, read from the panel that renders it.
 *
 * Checks is the most consequential of the small tabs: a check is what produces
 * a health metric, so what is configured here decides what the Summary tab's
 * Health card reports and what raises an alert. The panel already explains that
 * on screen — there is an "About checks" card that says it — and every rule
 * around adding, deactivating and deleting one is written somewhere in the
 * component as a hint, a placeholder or a confirmation.
 *
 * All of it is plain text with no interpolation, so it is taken verbatim.
 */
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { FE } from './config.ts';
import { clean, plainText } from './read-form-fields.ts';

export interface ChecksFacts {
  /** The panel's own "About checks" explanation. */
  about?: string;
  /** What the add form says about the rule and the schedule. */
  addHint?: string;
  /** What the Active control says it controls. */
  activeHint?: string;
  /** The placeholder shown once every type is already configured. */
  exhausted?: string;
  /** The delete confirmation, verbatim. */
  confirm?: { title: string; message: string };
  /** Field names the panel deliberately does not edit. */
  notEdited?: string;
}

const FILE = path.join(FE, 'components', 'DeviceChecksPanel.jsx');

export async function readChecksFacts(): Promise<ChecksFacts | undefined> {
  const src = await readFile(FILE, 'utf8').catch(() => '');
  if (!src) return undefined;

  const hints = [...src.matchAll(/<(?:span|p) className="hint"[^>]*>([^<{][^<]*?)<\/(?:span|p)>/g)].map(
    (m) => clean(m[1]),
  );
  const about = hints.find((h) => /produces a metric/i.test(h));
  const addHint = hints.find((h) => /each check type once/i.test(h));
  const activeHint = hints.find((h) => /should run/i.test(h));

  const exhausted = /\?\s*'([^']*already configured[^']*)'/.exec(src)?.[1];

  // `confirm({ title: `…`, message: '…' + '…' })` — the message is split across
  // two literals, so both halves are joined back.
  const cTitle = /confirm\(\{\s*\n?\s*title:\s*`([^`]+)`/.exec(src)?.[1];
  const cBody = /message:\s*((?:'(?:[^'\\]|\\.)*'\s*\+?\s*)+)/.exec(src)?.[1];
  const message = cBody
    ? clean(
        [...cBody.matchAll(/'((?:[^'\\]|\\.)*)'/g)]
          .map((m) => m[1].replace(/\\'/g, '’'))
          .join(''),
      )
    : undefined;

  // The leading comment records which serializer fields this panel edits, and
  // which it deliberately leaves to the admin form.
  const notEdited = /`params` is\s*\n?\s*\/\/\s*([\s\S]*?)\n\s*\/\/\s*\n/.exec(src)?.[1];

  return {
    about,
    addHint,
    activeHint,
    exhausted: exhausted ? clean(exhausted) : undefined,
    confirm: cTitle && message ? { title: clean(cTitle), message } : undefined,
    notEdited: notEdited ? clean(plainText(notEdited.replace(/\/\//g, ' '))) : undefined,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const c = await readChecksFacts();
  if (!c) console.log('no checks source found');
  else for (const [k, v] of Object.entries(c)) console.log(`${k}: ${JSON.stringify(v)}`);
}
