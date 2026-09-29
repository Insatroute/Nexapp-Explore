/**
 * The device inventory, read from the page that renders it.
 *
 * Devices are unlike every other page guided so far: there is no create form.
 * A router registers itself and the controller decides whether to admit it, so
 * the things worth documenting are the columns, the health tiles, the admission
 * states and the bulk actions — all of them literals in `DeviceList.jsx`.
 *
 * The admission states in particular are not a plain status field: two backend
 * flags produce three outcomes, and the file spells out which combination means
 * what. That is exactly the kind of rule a reader cannot infer from the screen.
 */
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { FE } from './config.ts';
import { clean } from './read-form-fields.ts';

export interface DeviceColumn {
  key: string;
  title: string;
  group: string;
  /** Cannot be switched off. */
  always: boolean;
  /** Shown by default. */
  shown: boolean;
}
export interface DeviceFacts {
  columns: DeviceColumn[];
  groups: string[];
  tiles: { key: string; label: string }[];
  /** Seconds between quiet reloads when auto-refresh is on. */
  refreshSecs?: number;
  /** CSV columns the import accepts. */
  importColumns: string[];
  /** CSV columns the export writes. */
  exportColumns: string[];
}

const LIST = path.join(FE, 'pages', 'DeviceList.jsx');
const IMPORT = path.join(FE, 'components', 'DeviceImportDrawer.jsx');

export async function readDeviceFacts(): Promise<DeviceFacts | undefined> {
  const [list, imp] = await Promise.all([
    readFile(LIST, 'utf8').catch(() => ''),
    readFile(IMPORT, 'utf8').catch(() => ''),
  ]);
  if (!list) return undefined;

  const colBlock = /const COLUMNS\s*=\s*\[([\s\S]*?)\n\]/.exec(list)?.[1] ?? '';
  const columns: DeviceColumn[] = [];
  for (const m of colBlock.matchAll(/\{\s*key:\s*'([^']+)'[^}]*?title:\s*'([^']+)'[^}]*?\}/g)) {
    const row = m[0];
    const always = /\balways:\s*true/.test(row);
    columns.push({
      key: m[1],
      title: clean(m[2]),
      group: /\bgroup:\s*'([^']+)'/.exec(row)?.[1] ?? '',
      always,
      // `always` columns are shown too; `essential` is what the picker ticks.
      shown: always || /\bessential:\s*true/.test(row),
    });
  }

  // The health tiles are the only objects in the file carrying a `tone`, so
  // they are matched on that rather than on where the array happens to start.
  const tiles = [...list.matchAll(/\{\s*key:\s*'([^']+)'\s*,\s*label:\s*'([^']+)'\s*,\s*tone:/g)].map(
    (m) => ({ key: m[1], label: m[2] }),
  );

  const refresh = /const REFRESH_SECS\s*=\s*(\d+)/.exec(list)?.[1];

  const exportColumns = (/const cols\s*=\s*\[([^\]]*)\]/.exec(list)?.[1] ?? '')
    .split(',')
    .map((x) => clean(x).replace(/^'|'$/g, ''))
    .filter(Boolean);

  // The importer names the two it insists on, then the ones it will use if present.
  const importColumns: string[] = [];
  if (imp) {
    const must = /header must include "([^"]+)" and "([^"]+)"/.exec(imp);
    if (must) importColumns.push(must[1], must[2]);
    for (const m of imp.matchAll(/header\.indexOf\('([^']+)'\)/g)) {
      if (!importColumns.includes(m[1])) importColumns.push(m[1]);
    }
  }

  return {
    columns,
    groups: [...new Set(columns.map((c) => c.group).filter(Boolean))],
    tiles,
    refreshSecs: refresh ? Number(refresh) : undefined,
    importColumns,
    exportColumns,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const d = await readDeviceFacts();
  if (!d) console.log('no device source found');
  else {
    console.log(`columns (${d.columns.length}, ${d.columns.filter((c) => c.shown).length} shown by default):`);
    for (const c of d.columns) {
      console.log(`   ${c.title.padEnd(16)}${c.group.padEnd(10)}${c.always ? 'always' : c.shown ? 'default' : 'off'}`);
    }
    console.log(`\ntiles   : ${d.tiles.map((t) => t.label).join(', ')}`);
    console.log(`refresh : every ${d.refreshSecs}s`);
    console.log(`import  : ${d.importColumns.join(', ')}`);
    console.log(`export  : ${d.exportColumns.join(', ')}`);
  }
}
