import { source, controllerSource } from '@/lib/source';
import { createSearchAPI } from 'fumadocs-core/search/server';
import type { AdvancedIndex } from 'fumadocs-core/search/server';
import type * as PageTree from 'fumadocs-core/page-tree';
import { DOCS_TAG, tagForPath } from '@/lib/search-tags';

/**
 * ONE index, TWO handbooks, kept apart by a tag.
 *
 * The site serves two products from one build: SDWAN Lite under /docs and the
 * Nexapp Controller under /controller (see lib/source.ts). `createFromSource`
 * takes a single loader, so indexing only `source` left all 165 controller
 * pages unsearchable — a reader inside the controller handbook searching for
 * "opnsense" or "org" got SDWAN Lite's three placeholder pages or nothing.
 *
 * So the indexes are built by hand from BOTH loaders and every record carries
 * a tag for the material it came from (see lib/search-tags.ts).
 * components/search.tsx sets that tag from the URL the reader is on, so
 * searching inside the controller handbook searches the controller — with a
 * switcher to cross over deliberately.
 */

/**
 * The sidebar path down to a page ("Network > Devices"), shown beside a result
 * so two pages with the same title stay distinguishable.
 *
 * fumadocs computes this internally for `createFromSource` but does not export
 * the helper, so it is walked here.
 */
function breadcrumbsFor(
  tree: PageTree.Root,
  url: string,
): string[] | undefined {
  const trail: string[] = [];

  function walk(nodes: PageTree.Node[]): boolean {
    for (const node of nodes) {
      if (node.type === 'page') {
        if (node.url === url) return true;
        continue;
      }
      if (node.type !== 'folder') continue;

      const name = typeof node.name === 'string' ? node.name : undefined;
      // A folder's own index page is the folder, so it is not its own
      // ancestor — record the folders above it and stop.
      if (node.index?.url === url) return true;

      if (name) trail.push(name);
      if (walk(node.children)) return true;
      if (name) trail.pop();
    }
    return false;
  }

  const root = typeof tree.name === 'string' && tree.name.length > 0 ? tree.name : undefined;
  if (!walk(tree.children)) return undefined;
  return root ? [root, ...trail] : trail;
}

type Loader = typeof source | typeof controllerSource;

async function indexesFor(
  loader: Loader,
  tagFor: (url: string) => string,
): Promise<AdvancedIndex[]> {
  const tree = loader.getPageTree();

  return Promise.all(
    loader.getPages().map(async (page) => {
      // fumadocs-mdx hands the heading/content breakdown over either eagerly or
      // behind `load()`, depending on how the collection was compiled.
      const data = page.data as {
        title?: string;
        description?: string;
        structuredData?: unknown;
        load?: () => Promise<{ structuredData: unknown }>;
      };

      let structuredData = data.structuredData;
      if (typeof structuredData === 'function') structuredData = await structuredData();
      if (!structuredData && typeof data.load === 'function') {
        structuredData = (await data.load()).structuredData;
      }
      if (!structuredData) {
        throw new Error(`no structured data to index for ${page.url}`);
      }

      return {
        id: page.url,
        url: page.url,
        title: data.title ?? page.url,
        description: data.description,
        breadcrumbs: breadcrumbsFor(tree, page.url),
        structuredData,
        tag: tagFor(page.url),
      } as AdvancedIndex;
    }),
  );
}

// `staticGET`, not `GET`: a static export has no server to answer a search
// request, so the index is built once and written out as a JSON file that the
// browser downloads and queries locally.
export const revalidate = false;
export const { staticGET: GET } = createSearchAPI('advanced', {
  language: 'english',
  // The browser downloads this whole index before the first keystroke can be
  // answered, so nothing goes into it that is not searched. Results are ranked
  // by relevance, never by a document field, and the sorter's copy of every
  // field is a quarter of the file.
  sort: { enabled: false },
  indexes: async () => [
    // The controller's own pages split between the handbook and the generated
    // API reference; SDWAN Lite is one tag whatever its URL.
    ...(await indexesFor(controllerSource, tagForPath)),
    ...(await indexesFor(source, () => DOCS_TAG)),
  ],
});
