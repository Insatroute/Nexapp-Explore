'use client';
import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogFooter,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
  TagsList,
  TagsListItem,
  type SharedProps,
} from 'fumadocs-ui/components/dialog/search';
import { useDocsSearch } from 'fumadocs-core/search/client';
import { staticClient } from 'fumadocs-core/search/client/orama-static';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SEARCH_TAGS, tagForPath } from '@/lib/search-tags';

// The static counterpart to app/api/search/route.ts: this client fetches the
// prebuilt index and searches in the browser, rather than calling an endpoint.
//
// That index holds BOTH handbooks, so a tag decides which one is being
// searched. It starts as the handbook the reader is already in — a reader in
// the controller handbook is asking about the controller — and the footer lets
// them switch without leaving the dialog.
export default function StaticSearchDialog(props: SharedProps) {
  const pathname = usePathname();
  const [tag, setTag] = useState(() => tagForPath(pathname));

  // Follow the reader across handbooks. Only while the dialog is closed, so
  // navigating to a result never yanks the filter out from under the results
  // still on screen.
  useEffect(() => {
    if (!props.open) setTag(tagForPath(pathname));
  }, [pathname, props.open]);

  const { search, setSearch, query } = useDocsSearch({
    client: staticClient({ tag }),
  });

  return (
    <SearchDialog
      search={search}
      onSearchChange={setSearch}
      isLoading={query.isLoading}
      {...props}
    >
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList items={query.data !== 'empty' ? query.data : null} />
        <SearchDialogFooter>
          <TagsList tag={tag} onTagChange={(v) => setTag(v ?? tag)}>
            {SEARCH_TAGS.map((t) => (
              <TagsListItem key={t.value} value={t.value}>
                {t.label}
              </TagsListItem>
            ))}
          </TagsList>
        </SearchDialogFooter>
      </SearchDialogContent>
    </SearchDialog>
  );
}
