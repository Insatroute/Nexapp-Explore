/**
 * What a search covers, as tags on the one static index.
 *
 * The site serves two products (lib/source.ts), and inside the controller a
 * third kind of material: the API reference generated from the OpenAPI spec.
 * That reference is a third of every record in the index and its headings are
 * endpoint names, so left in with the guides it wins on plain words — a search
 * for "firmware upgrade" put `Api_v1_firmware-upgrader_batch-upgrade` above
 * the Firmware guide. Separating it keeps a handbook search answering with
 * handbook pages, and the dialog's footer switches to it in one click.
 *
 * Shared by the index builder (app/api/search/route.ts) and the dialog
 * (components/search.tsx) so the tag written into the index is the same string
 * the client filters on. They live here rather than in the route because a
 * Next.js route file may only export route handlers and route config.
 */
export const CONTROLLER_TAG = 'controller';
export const CONTROLLER_API_TAG = 'controller-api';
export const DOCS_TAG = 'sdwan-lite';

export const SEARCH_TAGS = [
  { value: CONTROLLER_TAG, label: 'Handbook' },
  { value: CONTROLLER_API_TAG, label: 'API reference' },
  { value: DOCS_TAG, label: 'SDWAN Lite' },
] as const;

/** Which part of the index a page belongs to, from its URL. */
export function tagForPath(pathname: string): string {
  if (pathname.startsWith('/docs')) return DOCS_TAG;
  if (pathname.startsWith('/controller/api')) return CONTROLLER_API_TAG;
  return CONTROLLER_TAG;
}
