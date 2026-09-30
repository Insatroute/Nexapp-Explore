/**
 * One device's page, read from the component that renders it.
 *
 * The page is mostly its tab bar, and the tab list is a literal. So are the
 * quick actions in the header rail — each carries a `title` written for the
 * operator, which is a better description of what the button does than anything
 * that could be inferred from its icon.
 *
 * The Summary tab's own tables are here too: the interface columns and the port
 * map's legend. What is NOT read is any of their values — those come from the
 * device's own check-in, and writing one down would freeze a snapshot.
 */
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { FE } from './config.ts';
import { clean } from './read-form-fields.ts';

/** The identity strip on the left of the header, left to right. */
export interface DeviceIdentity {
  /** The back link's own aria-label, when it is there. */
  back?: string;
  /** The live dot beside the name. */
  pulse: boolean;
  /** The model badge beside the name. */
  model: boolean;
  mac: boolean;
  /** The serial, appended to the MAC rather than given a slot of its own. */
  serial: boolean;
}

export interface DeviceDetailFacts {
  tabs: string[];
  /** Quick actions in the header rail, described by their own tooltips. */
  actions: string[];
  /** The readouts between the name and the buttons, in the console's order. */
  vitals: string[];
  identity: DeviceIdentity;
  /** What a SIM chip says when it is present but not carrying traffic. */
  simNotes: string[];
  /** Columns of the Summary tab's interface table. */
  interfaceColumns: string[];
  /** What the port map's colours mean. */
  legend: string[];
}

const FILE = path.join(FE, 'pages', 'DeviceDetail.jsx');

export async function readDeviceDetailFacts(): Promise<DeviceDetailFacts | undefined> {
  const src = await readFile(FILE, 'utf8').catch(() => '');
  if (!src) return undefined;

  const tabsBlock = /const TABS\s*=\s*\[([\s\S]*?)\n\]/.exec(src)?.[1] ?? '';
  const tabs = [...tabsBlock.matchAll(/label:\s*'([^']+)'/g)].map((m) => m[1]);

  // Bounded to the header rail: `title` is a common attribute, and reading the
  // whole file for it collects tooltips from every table cell on the page.
  //
  // Anchored on `className="…"` rather than the bare class name, because the
  // JSX comments in this header cite these classes by name — slicing from the
  // bare word starts the block inside a comment and cuts the markup short.
  const railAt = src.indexOf('className="dhero__actions"');
  // Bounded by where the rail closes, not by a character count: a fixed window
  // stopped just short of Reboot, which is the most consequential button on it.
  const railEnd = railAt < 0 ? -1 : src.indexOf('{confirmDialog}', railAt);
  const rail = railAt < 0 ? '' : src.slice(railAt, railEnd < 0 ? railAt + 5000 : railEnd);
  const actions = [...rail.matchAll(/title="([^"]{8,})"/g)]
    .map((m) => clean(m[1]))
    // Reloading the page is not an action on the device.
    .filter((t) => !/^Reload /.test(t));
  // A link, not a button, so it carries its label as text rather than a title.
  if (/SDLAN Access/.test(rail)) actions.push('SDLAN Access \u2014 reach this device\u2019s own services through the controller');

  // The readouts, in source order — which is the order they are laid out in,
  // and the order matters: Signal is deliberately first.
  const vitalsAt = src.indexOf('className="dhero__vitals"');
  const vitalsEnd = vitalsAt < 0 ? -1 : src.indexOf('className="dhero__actions"', vitalsAt);
  const vitalsBlock =
    vitalsAt < 0 ? '' : src.slice(vitalsAt, vitalsEnd < 0 ? vitalsAt + 4000 : vitalsEnd);
  const vitals = [...vitalsBlock.matchAll(/<span>([A-Z][^<{]{2,30})<\/span>/g)].map((m) =>
    clean(m[1]),
  );

  // A SIM chip's two failure tooltips. Both are template literals opening with
  // `SIM ${s.slot}`, so the slot number is replaced by a placeholder rather
  // than written down as 1.
  const simNotes = [...vitalsBlock.matchAll(/`SIM \$\{s\.slot\} ([^`]+)`/g)].map((m) =>
    clean(`A SIM ${m[1]}`),
  );

  // The identity strip. Each piece is conditional in the JSX, so what is
  // recorded is which pieces the console renders at all — the values are the
  // device's own and are never written down.
  const idAt = src.indexOf('className="dhero__id"');
  const idBlock = idAt < 0 || vitalsAt < 0 ? '' : src.slice(idAt, vitalsAt);
  const identity: DeviceIdentity = {
    back: /aria-label="([^"]+)"/.exec(idBlock)?.[1],
    pulse: /dhero__pulse/.test(idBlock),
    model: /dhero__model/.test(idBlock),
    mac: /mac_address/.test(idBlock),
    serial: /SN \$\{serial\}/.test(idBlock),
  };

  const legend = [...src.matchAll(/className="lgk lgk--[a-z]+">([^<]+)</g)].map((m) => clean(m[1]));

  // The interface table's headers, taken from the block the legend introduces.
  const tableAt = src.indexOf('fplate__legend');
  const table = tableAt < 0 ? '' : src.slice(tableAt, tableAt + 1500);
  const interfaceColumns = [...table.matchAll(/<th[^>]*>([^<]+)<\/th>/g)].map((m) => clean(m[1]));

  return { tabs, actions, vitals, identity, simNotes, interfaceColumns, legend };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const d = await readDeviceDetailFacts();
  if (!d) console.log('no device detail source found');
  else {
    console.log(`tabs (${d.tabs.length}): ${d.tabs.join(' · ')}\n`);
    console.log(`header actions (${d.actions.length}):`);
    for (const a of d.actions) console.log(`   ${a}`);
    console.log(`\nlegend    : ${d.legend.join(', ')}`);
    console.log(`interfaces: ${d.interfaceColumns.join(', ')}`);
  }
}
