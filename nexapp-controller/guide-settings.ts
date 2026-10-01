/**
 * Task guides for the Settings pages.
 *
 * Wiring only — the field tables, numbered tasks and screenshot slots are all
 * `renderNotes` from guide-admin.ts, so this section cannot drift into a
 * different layout from Administration, IPAM and Network Topology.
 */
import { renderNotes } from './guide-admin.ts';
import { SETTINGS_NOTES } from './settings-notes.ts';

export async function settingsGuide(route: string): Promise<string> {
  const notes = SETTINGS_NOTES[route];
  if (!notes) return '';
  const warnings: string[] = [];
  const out = await renderNotes(notes, (m) => warnings.push(m), 'settings');
  // A note naming a field the form does not have is a note that has gone
  // stale. Reported rather than printed, so a page never documents a control
  // that is not on screen.
  for (const w of warnings) console.log(`  settings ${route}: ${w}`);
  return out;
}
