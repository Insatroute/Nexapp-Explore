/**
 * Access Control guide notes, one file per group so they can be written
 * independently: RADIUS, TACACS+, Security, and PKI (Access Credentials plus
 * CAs & Certificates). Same shape as `admin-notes.ts`, rendered by
 * `guide-admin.ts` with images under `public/img/access/<shotDir>/`, pinned by
 * `check:descriptions` under `access:<route>`.
 */
import type { AdminNotes } from './admin-notes.ts';
import { RADIUS_NOTES } from './access-radius-notes.ts';
import { TACACS_NOTES } from './access-tacacs-notes.ts';
import { SECURITY_NOTES } from './access-security-notes.ts';
import { PKI_NOTES } from './access-pki-notes.ts';

export const ACCESS_NOTES: Record<string, AdminNotes> = {
  ...RADIUS_NOTES,
  ...TACACS_NOTES,
  ...SECURITY_NOTES,
  ...PKI_NOTES,
};
