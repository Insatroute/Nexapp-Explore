import { controllerSource } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';

export default function Layout({ children }: LayoutProps<'/controller'>) {
  return (
    <DocsLayout
      tree={controllerSource.getPageTree()}
      // Its own title, so a reader always knows which product's handbook they
      // are in — the two sit at the same origin and look alike otherwise.
      nav={{ title: 'Nexapp Controller' }}
    >
      {children}
    </DocsLayout>
  );
}
