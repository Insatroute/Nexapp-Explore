import { controllerSource } from '@/lib/source';
import { OpenAPIPage } from '@/components/api-page';
import { openapiController } from '@/lib/openapi.controller';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page';
import { notFound } from 'next/navigation';
import { getMDXComponents } from '@/components/mdx';
import type { Metadata } from 'next';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import type { OpenAPIPageProps_Preloaded } from 'fumadocs-openapi/server';

export default async function Page(props: PageProps<'/controller/[[...slug]]'>) {
  const params = await props.params;
  const page = controllerSource.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX
          components={getMDXComponents({
            a: createRelativeLink(controllerSource, page),
            OpenAPIPage: async (props: Omit<OpenAPIPageProps_Preloaded, 'preloaded'>) => (
              <OpenAPIPage {...props} {...await openapiController.preloadOpenAPIPage(page)} />
            ),
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return controllerSource.generateParams();
}

export async function generateMetadata(props: PageProps<'/controller/[[...slug]]'>): Promise<Metadata> {
  const params = await props.params;
  const page = controllerSource.getPage(params.slug);
  if (!page) notFound();
  return { title: page.data.title, description: page.data.description };
}
