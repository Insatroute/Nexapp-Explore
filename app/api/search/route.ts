import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

// `staticGET`, not `GET`: a static export has no server to answer a search
// request, so the index is built once and written out as a JSON file that the
// browser downloads and queries locally.
export const revalidate = false;
export const { staticGET: GET } = createFromSource(source, {
  language: 'english',
});
