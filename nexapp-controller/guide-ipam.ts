/**
 * Task guides for the two IPAM pages.
 *
 * All the machinery is `renderNotes` from guide-admin.ts — the field tables,
 * the numbered tasks, the screenshot slots. This file is only the wiring, so
 * the two sections cannot drift into two different layouts.
 */
import { renderNotes } from './guide-admin.ts';
import { IPAM_NOTES } from './ipam-notes.ts';

export async function ipamGuide(route: string): Promise<string> {
  const notes = IPAM_NOTES[route];
  if (!notes) return '';
  const warnings: string[] = [];
  const out = await renderNotes(notes, (m) => warnings.push(m), 'ipam');
  // A note naming a field the form does not have is a note that has gone
  // stale. Reported rather than printed, so the page never documents a
  // control that is not on screen.
  for (const w of warnings) console.log(`  ipam ${route}: ${w}`);
  return out;
}
