// Scopes a stylesheet under one selector, so that it styles the maps of the plugin and nothing else in Obsidian:
// `renderer/style.css` at build time (build.ts), and the style of a type (`types/<type>.css`) or the theme of a
// project (`theme.css`) as the plugin reads them. Plain text in, plain text out; no dependency.
//
// - A rule `a, b { … }` becomes `<scope> a, <scope> b { … }`.
// - `:root`, `html` and `body` at the start of a selector become the scope itself: the tokens of the page are defined
//   on the container of a map, not on the whole of Obsidian.
// - `@media (prefers-color-scheme: dark) { … }` becomes rules under `<dark> <scope>`: Obsidian says light or dark with a
//   class on its body (`.theme-dark`), not with the media query, which follows the system.
// - Other at-rules that hold rules (`@media`, `@supports`, `@layer`, `@container`, `@starting-style`) are scoped
//   inside; the others (`@keyframes`, `@font-face`, `@import`…) are kept as they are.
// - `rename` replaces names in the selectors first (`#page` → `#maps-md-page`): a name of the page that would be too
//   common in Obsidian.

export interface ScopeOptions {
  /** The selector of the container, for every rule (`.maps-md`). */
  scope: string;
  /** What is above the container in dark mode (`.theme-dark`). */
  dark?: string;
  /** Names replaced in the selectors, as whole names: `{ '#page': '#maps-md-page' }`. */
  rename?: Record<string, string>;
}

/** The text of a stylesheet without its comments, strings kept. */
function uncomment(css: string) {
  let out = '';
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (c === '"' || c === "'") {
      const end = endOfString(css, i);
      out += css.slice(i, end);
      i = end - 1;
    } else if (c === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      i = end < 0 ? css.length : end + 1;
    } else out += c;
  }
  return out;
}

/** The index right after the string that starts at `i`. */
function endOfString(css: string, i: number) {
  const quote = css[i];
  for (let k = i + 1; k < css.length; k++) {
    if (css[k] === '\\') k++;
    else if (css[k] === quote) return k + 1;
  }
  return css.length;
}

/** The top-level parts of a stylesheet: `{ prelude, body }` for a block, `{ prelude }` for a statement (`@import …;`). */
function blocks(css: string) {
  const parts: { prelude: string; body?: string }[] = [];
  let start = 0;
  let depth = 0;
  let open = -1;
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (c === '"' || c === "'") i = endOfString(css, i) - 1;
    else if (c === '{') {
      if (depth++ === 0) open = i;
    } else if (c === '}') {
      if (--depth === 0) {
        parts.push({ prelude: css.slice(start, open).trim(), body: css.slice(open + 1, i) });
        start = i + 1;
      }
      if (depth < 0) depth = 0; // a stray brace: ignored
    } else if (c === ';' && depth === 0) {
      const prelude = css.slice(start, i).trim();
      if (prelude) parts.push({ prelude });
      start = i + 1;
    }
  }
  return parts;
}

/** Splits a list of selectors on its top-level commas (not those inside `:is(…)`). */
function selectors(list: string) {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    if (c === '"' || c === "'") i = endOfString(list, i) - 1;
    else if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (c === ',' && depth === 0) (out.push(list.slice(start, i).trim()), (start = i + 1));
  }
  out.push(list.slice(start).trim());
  return out.filter(Boolean);
}

const escape = (t: string) => t.replace(/[.*+?^$()|[\]\\{}]/g, '\\$&');

/** One selector under the scope. */
function scopeSelector(selector: string, scope: string, rename: Record<string, string>) {
  let s = selector;
  for (const [from, to] of Object.entries(rename)) s = s.replace(new RegExp(`${escape(from)}(?![\\w-])`, 'g'), to);
  const root = /^(?::root|html|body)(?![\w-])/.exec(s);
  if (root) return `${scope}${s.slice(root[0].length)}`;
  return `${scope} ${s}`;
}

const NESTED = /^@(media|supports|layer|container|starting-style|document)\b/i;
const DARK = /^@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)\s*$/i;

/** A stylesheet scoped under `options.scope` (see the head of this file). */
export function scopeCss(css: string, options: ScopeOptions): string {
  const rename = options.rename ?? {};
  const walk = (text: string, scope: string): string =>
    blocks(text)
      .map(({ prelude, body }) => {
        if (body === undefined) return `${prelude};`;
        if (prelude.startsWith('@')) {
          if (options.dark && DARK.test(prelude)) return walk(body, `${options.dark} ${scope}`);
          if (NESTED.test(prelude)) return `${prelude} {\n${walk(body, scope)}\n}`;
          return `${prelude} {${body}}`; // @keyframes, @font-face…: as they are
        }
        return `${selectors(prelude).map((s) => scopeSelector(s, scope, rename)).join(', ')} {${body}}`;
      })
      .join('\n');
  return walk(uncomment(css), options.scope);
}

/** Every selector of the style rules of a stylesheet, at any depth of its at-rules (not in `@keyframes`): for the tests. */
export function selectorsOf(css: string): string[] {
  return blocks(uncomment(css)).flatMap(({ prelude, body }) => {
    if (body === undefined) return [];
    if (prelude.startsWith('@')) return NESTED.test(prelude) ? selectorsOf(body) : [];
    return selectors(prelude);
  });
}
