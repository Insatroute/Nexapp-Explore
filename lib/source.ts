import { loader } from 'fumadocs-core/source';
import { defineDocs } from 'fumadocs-mdx/macro';
import { openapiPlugin } from 'fumadocs-openapi/server';

/**
 * TWO documentation roots, one app.
 *
 * SDWAN Lite owns /docs; the Nexapp Controller owns /controller. They are
 * separate collections rather than one tree because they are separate products:
 * merged, a reader browsing the controller's sidebar would be shown SDWAN Lite's
 * sections as siblings of their own.
 *
 * One app rather than two also means one build, one port and one deploy — and it
 * is what lets the landing page link straight across to the other handbook
 * instead of pointing at a second server that may not be running.
 */
const docs = defineDocs({ dir: 'content/docs' });
const controllerDocs = defineDocs({ dir: 'content/controller' });

export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
  // Puts a GET/POST/DELETE badge beside each generated endpoint in the sidebar.
  plugins: [openapiPlugin()],
});

export const controllerSource = loader({
  baseUrl: '/controller',
  source: controllerDocs.toFumadocsSource(),
  plugins: [openapiPlugin()],
});
