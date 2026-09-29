/**
 * Escaping for text taken from source and put into a generated page.
 *
 * MDX is not markdown: `{` opens an expression and `<` opens an element, so a
 * sentence lifted out of a component can stop being a sentence. One hint read
 * `{ifaces.error || '…'}`, went into a page unescaped, and the build failed
 * with "Could not parse expression with acorn" — the page was valid right up
 * until something tried to parse it.
 *
 * This lived as a `cell` function copied into every guide module, and the
 * copies had drifted: four escaped braces, six did not. Whether a page survived
 * depended on which module happened to render the text, which is not a property
 * anyone can reason about. So there is one of it now.
 */

/** Text safe anywhere in generated MDX, including inside a table cell. */
export const cell = (s: string): string =>
  s
    // A newline ends a table row, so a quoted sentence that wrapped in source
    // has to come back as one line.
    .replace(/\s*\n\s*/g, ' ')
    .replace(/</g, '\\<')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    // A pipe would end the column it sits in.
    .replace(/\|/g, '\\|')
    .trim();

/**
 * Every `{`, `}` or `<` in generated content that is not escaped and not part
 * of a tag this generator wrote itself.
 *
 * Used as a check after writing, so the next one of these is caught where it is
 * made rather than by the MDX parser several steps later.
 */
export function unescapedMdx(content: string): string[] {
  const bad: string[] = [];
  let fenced = false;
  for (const raw of content.split('\n')) {
    if (/^\s*```/.test(raw)) { fenced = !fenced; continue; }
    if (fenced) continue;
    const line = raw
      // A brace inside a code span is text to MDX, not an expression — which is
      // why the escaper deliberately leaves code spans alone. Checking them
      // anyway reported two pages that were never in danger.
      .replace(/`[^`]*`/g, '')
      // Our own components are the only tags emitted here, and none takes an
      // expression, so a brace outside them is text that should be escaped.
      .replace(/<\/?[A-Za-z][^>]*>/g, '');
    if (/(^|[^\\])[{}]/.test(line)) bad.push(raw.trim().slice(0, 120));
  }
  return bad;
}
