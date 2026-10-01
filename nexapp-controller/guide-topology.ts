/**
 * Task guides for the four Network Topology pages.
 *
 * Wiring only — the field tables, numbered tasks and screenshot slots are all
 * `renderNotes` from guide-admin.ts, so this section cannot drift into a
 * different layout from Administration, IPAM and Overlay Networks.
 */
import { renderNotes } from './guide-admin.ts';
import { TOPOLOGY_NOTES } from './topology-notes.ts';

export async function topologyGuide(route: string): Promise<string> {
  const notes = TOPOLOGY_NOTES[route];
  if (!notes) return '';
  const warnings: string[] = [];
  const out = await renderNotes(notes, (m) => warnings.push(m), 'topology');
  // A note naming a field the drawer does not have is a note that has gone
  // stale. Reported rather than printed, so a page never documents a control
  // that is not on screen.
  for (const w of warnings) console.log(`  topology ${route}: ${w}`);
  return out;
}
