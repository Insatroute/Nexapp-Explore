/**
 * The VPN server form, read from the two files that define it.
 *
 * `VpnList.jsx` holds the backend list, copied verbatim from `VPN_BACKENDS` in
 * the Django settings — the file says so, and says why: the model validates
 * against those exact dotted paths, so a guessed value is rejected with "is not
 * a valid choice". `VpnForm.jsx` holds what each backend requires, established
 * by POSTing to the API and reading the validation errors back rather than by
 * inferring from class names.
 *
 * Both are the kind of fact a hand-written page gets wrong quietly: add a
 * backend and the list here grows on the next build.
 */
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { FE } from './config.ts';
import { readFormFields, clean, type FormField } from './read-form-fields.ts';

export interface VpnBackend {
  /** The dotted path the API validates against. */
  path: string;
  label: string;
  needsCa: boolean;
  needsCert: boolean;
  needsSubnet: boolean;
  needsAuthToken: boolean;
}
export type VpnField = FormField;
export interface VpnFacts {
  backends: VpnBackend[];
  fields: VpnField[];
}

const LIST = path.join(FE, 'pages', 'VpnList.jsx');
const FORM = path.join(FE, 'pages', 'VpnForm.jsx');


export async function readVpnFacts(): Promise<VpnFacts | undefined> {
  const [list, form] = await Promise.all([
    readFile(LIST, 'utf8').catch(() => ''),
    readFile(FORM, 'utf8').catch(() => ''),
  ]);
  if (!list || !form) return undefined;

  // ---- the backend list, in the order the form offers it
  const backendsBlock = /const BACKENDS\s*=\s*\[([\s\S]*?)\n\]/.exec(list);
  const pairs = backendsBlock
    ? [...backendsBlock[1].matchAll(/\[\s*'([^']+)'\s*,\s*'([^']+)'\s*\]/g)].map((m) => ({
        path: m[1],
        label: m[2],
      }))
    : [];

  // ---- what each one requires
  const needsBlock = /const BACKEND_NEEDS\s*=\s*\{([\s\S]*?)\n\}/.exec(form);
  const needs = new Map<string, string>();
  if (needsBlock) {
    for (const m of needsBlock[1].matchAll(/'([^']+)':\s*\{([^}]*)\}/g)) needs.set(m[1], m[2]);
  }
  const backends: VpnBackend[] = pairs.map((p) => {
    const n = needs.get(p.path) ?? '';
    return {
      ...p,
      needsCa: /\bca:\s*true/.test(n),
      needsCert: /\bcert:\s*true/.test(n),
      needsSubnet: /\bsubnet:\s*true/.test(n),
      needsAuthToken: /\bauthToken:\s*true/.test(n),
    };
  });

  // ---- the fields, in the order the form lays them out
  const fields = readFormFields(form, ['IpamPicker']);

  return { backends, fields };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const v = await readVpnFacts();
  if (!v) console.log('no VPN source found');
  else {
    console.log(`backends (${v.backends.length}):`);
    for (const b of v.backends) {
      const n = [
        b.needsCa && 'CA',
        b.needsCert && 'cert',
        b.needsSubnet && 'subnet',
        b.needsAuthToken && 'auth token',
      ].filter(Boolean);
      console.log(`   ${b.label.padEnd(22)}${(n.join(', ') || 'nothing extra').padEnd(20)}${b.path}`);
    }
    console.log(`\nfields (${v.fields.length}):`);
    for (const f of v.fields) {
      const h = f.hints.map((x) => x.text).join(' | ');
      console.log(
        `   ${f.label.padEnd(24)}${f.required ? 'req ' : '    '}${f.readOnly ? 'ro ' : ''}` +
          `${h}${f.blank ? `  blank=${f.blank}` : ''}${f.placeholder ? `  [${f.placeholder}]` : ''}`,
      );
    }
  }
}
