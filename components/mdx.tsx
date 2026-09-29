import defaultMdxComponents from 'fumadocs-ui/mdx';
import { Step, Steps } from 'fumadocs-ui/components/steps';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import type { MDXComponents } from 'mdx/types';

// The generated pages are reference AND task guides, and the two read very
// differently. A guide is a sequence of things to do, with long field tables
// hanging off it; as plain markdown that is a wall of prose and pipes.
//
// These are registered globally rather than imported per page because the pages
// are generated — there is nowhere to put an import statement, and an MDX file
// that names a component nobody registered fails the build rather than degrading.
export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    Steps,
    Step,
    Accordions,
    Accordion,
    Tabs,
    Tab,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
