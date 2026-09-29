/**
 * The two ways a configuration template is created, read from both of them.
 *
 * `TemplateWizard.jsx` is a four-step flow "for people who do not know the field
 * names", and its own note records that everything it collects maps 1:1 onto the
 * serializer — it is a friendlier surface over the same payload, not a different
 * model. `TemplateForm.jsx` is that payload directly, and is also the edit
 * screen. A guide that described only one of them would miss half the product.
 *
 * The purposes, the sections each offers, the step names and the advanced form's
 * own fields are all literals, so they are read rather than described.
 */
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { FE } from './config.ts';
import { readFormFields, clean, type FormField } from './read-form-fields.ts';

export interface TemplatePurpose {
  key: string;
  title: string;
  desc: string;
  /** Schema sections this purpose offers, if it curates a subset. */
  sections: string[];
  /** It starts with a minimal configuration already valid against the schema. */
  hasStarter: boolean;
}
export interface TemplateFacts {
  steps: string[];
  purposes: TemplatePurpose[];
  fields: FormField[];
}

const WIZARD = path.join(FE, 'pages', 'TemplateWizard.jsx');
const FORM = path.join(FE, 'pages', 'TemplateForm.jsx');

export async function readTemplateFacts(): Promise<TemplateFacts | undefined> {
  const [wizard, form] = await Promise.all([
    readFile(WIZARD, 'utf8').catch(() => ''),
    readFile(FORM, 'utf8').catch(() => ''),
  ]);
  if (!wizard || !form) return undefined;

  const steps = (/const STEPS\s*=\s*\[([^\]]*)\]/.exec(wizard)?.[1] ?? '')
    .split(',')
    .map((s) => clean(s).replace(/^'|'$/g, ''))
    .filter(Boolean);

  // Sections offered per purpose. A purpose with no entry offers the whole
  // catalogue rather than a curated subset — the file says so of `blank`.
  const secBlock = /const PURPOSE_SECTIONS\s*=\s*\{([\s\S]*?)\n\}/.exec(wizard)?.[1] ?? '';
  const sections = new Map<string, string[]>();
  for (const m of secBlock.matchAll(/(\w+):\s*\[([^\]]*)\]/g)) {
    sections.set(
      m[1],
      m[2].split(',').map((x) => clean(x).replace(/^'|'$/g, '')).filter(Boolean),
    );
  }

  const starterBlock = /const STARTER\s*=\s*\{([\s\S]*?)\n\}/.exec(wizard)?.[1] ?? '';
  const starters = new Set(
    [...starterBlock.matchAll(/^\s*(\w+):/gm)].map((m) => m[1]),
  );

  const purposeBlock = /const PURPOSES\s*=\s*\[([\s\S]*?)\n\]/.exec(wizard)?.[1] ?? '';
  const purposes: TemplatePurpose[] = [];
  for (const m of purposeBlock.matchAll(
    /key:\s*'([^']+)'\s*,\s*title:\s*'([^']+)'\s*,?\s*\n?\s*desc:\s*'([^']*)'/g,
  )) {
    purposes.push({
      key: m[1],
      title: m[2],
      desc: clean(m[3]),
      sections: sections.get(m[1]) ?? [],
      // `vpn` has an entry but an empty one: its configuration comes from the
      // VPN server it names, not from a snippet.
      hasStarter: starters.has(m[1]) && !/\b(\w+):\s*\{\s*\}/.test(`${m[1]}: {}`),
    });
  }

  return { steps, purposes, fields: readFormFields(form) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const t = await readTemplateFacts();
  if (!t) console.log('no template source found');
  else {
    console.log(`steps: ${t.steps.join(' → ')}\n`);
    console.log(`purposes (${t.purposes.length}):`);
    for (const p of t.purposes) {
      console.log(`   ${p.title.padEnd(24)}${p.sections.length ? `${p.sections.length} sections` : 'every section'}  ${p.desc}`);
    }
    console.log(`\nadvanced form fields (${t.fields.length}):`);
    for (const f of t.fields) {
      console.log(`   ${f.label.padEnd(18)}${f.required ? 'req ' : '    '}${f.hints.map((h) => h.text).join(' | ')}${f.blank ? `  blank=${f.blank}` : ''}`);
    }
  }
}
