/**
 * The Traffic tab, read from the panel and the model behind it.
 *
 * Traffic is the device's DPI view, and almost everything about how to read it
 * is a literal: the sub-tabs, the date presets, the four breakdowns, and — the
 * part no reader could guess — which breakdowns a drill-down is allowed to show.
 * That last rule exists because the payload only supports some splits, and the
 * file says so: "which breakdowns a drill-down can honestly show".
 */
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { FE } from './config.ts';
import { clean } from './read-form-fields.ts';

export interface TrafficFacts {
  subs: { key: string; label: string }[];
  presets: { key: string; label: string }[];
  /** kind -> the panel heading it appears under. */
  kinds: { key: string; label: string; panel: string }[];
  /** What opening a row of each kind can be split by. */
  drilldown: { from: string; into: string[] }[];
}

const PANEL = path.join(FE, 'components', 'DeviceTrafficPanel.jsx');
const MODEL = path.join(FE, 'components', 'traffic', 'trafficModel.js');

export async function readTrafficFacts(): Promise<TrafficFacts | undefined> {
  const [panel, model] = await Promise.all([
    readFile(PANEL, 'utf8').catch(() => ''),
    readFile(MODEL, 'utf8').catch(() => ''),
  ]);
  if (!panel || !model) return undefined;

  const subsBlock = /const SUBS\s*=\s*\[([\s\S]*?)\n\]/.exec(panel)?.[1] ?? '';
  const subs = [...subsBlock.matchAll(/key:\s*'([^']+)'\s*,\s*label:\s*'([^']+)'/g)].map((m) => ({
    key: m[1],
    label: clean(m[2]),
  }));

  const presetBlock = /export const PRESETS\s*=\s*\[([\s\S]*?)\n\]/.exec(model)?.[1] ?? '';
  const presets = [...presetBlock.matchAll(/key:\s*'([^']+)'\s*,\s*label:\s*'([^']+)'/g)].map((m) => ({
    key: m[1],
    label: clean(m[2]),
  }));

  const kindBlock = /export const KINDS\s*=\s*\{([\s\S]*?)\n\}/.exec(model)?.[1] ?? '';
  const kinds = [...kindBlock.matchAll(/(\w+):\s*\{\s*label:\s*'([^']+)'\s*,\s*panel:\s*'([^']+)'/g)].map(
    (m) => ({ key: m[1], label: clean(m[2]), panel: clean(m[3]) }),
  );

  const dBlock = /const DETAIL_PANELS\s*=\s*\{([\s\S]*?)\n\}/.exec(panel)?.[1] ?? '';
  const drilldown = [...dBlock.matchAll(/(\w+):\s*\[([^\]]*)\]/g)].map((m) => ({
    from: m[1],
    into: m[2].split(',').map((x) => clean(x).replace(/^'|'$/g, '')).filter(Boolean),
  }));

  return { subs, presets, kinds, drilldown };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const t = await readTrafficFacts();
  if (!t) console.log('no traffic source found');
  else {
    console.log(`sub-tabs : ${t.subs.map((s) => s.label).join(' · ')}`);
    console.log(`presets  : ${t.presets.map((p) => p.label).join(', ')}`);
    console.log(`panels   : ${t.kinds.map((k) => `${k.label} → ${k.panel}`).join(', ')}`);
    console.log('drill-down:');
    for (const d of t.drilldown) console.log(`   from a ${d.from.padEnd(12)} → ${d.into.join(', ')}`);
  }
}
