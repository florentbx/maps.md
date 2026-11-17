// Links between maps, and the names they reach. Reads the maps of a folder, lists every link they write (`[[file]]`, `[[file#Element]]`,
// `[[file#Element#Item]]`, `[[#Element]]`), and resolves each one; a link to an item leads to the item itself. A page then gets clickable links, the links of the
// other maps that point to it, and its broken links. Nothing is written in the maps: all of it is computed. Renaming
// rewrites the links to a name (`rename`, for rename.mjs), and follows a name edited in the page (`followName`).
// Plain functions with no file system, shared by the page (maps.html), the check and the test.
// Source: rewritten for the current format (FORMAT.md, "Names" and "Links"); the index of a first implementation
// of maps.md was not reused.

import type { ElementLink, HrefOf, IndexedElement, IndexedFile, Item, LinkIndex, MapDoc, PageLinks, Resolved, Source } from './model.ts';
import { decided, nameKey, readArrow, readItems, readMap, readProperty, RESERVED } from './read.ts';

/** No line break inside French quotes: « word » keeps its marks. */
export const typeset = (t: string) => t.replace(/« /g, '«\u00a0').replace(/ »/g, '\u00a0»');
export const escapeHtml = (t: string) => typeset(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Text of a map as HTML: escaped, with `code` between backticks drawn as code, **bold** and *italics* (the only
 *  Markdown drawn in a text); nothing inside code. */
const inline = (t: string) =>
  escapeHtml(t)
    .split(/(`[^`]+`)/)
    .map((part, k) => (k % 2 ? `<code>${part.slice(1, -1)}</code>` : part.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*\w])\*([^*\s](?:[^*]*[^*\s])?)\*(?![*\w])/g, '$1<em>$2</em>')))
    .join('');

const WIKILINK = /\[\[([^\]|#]*)((?:#[^\]|#]*)*)(?:\|([^\]]*))?\]\]/g;

/** The HTML id of an element, so that a link can reach it. */
export const anchorOf = (name: string) => `el-${nameKey(name)}`;

/** File names match ignoring case, as in Obsidian. */
const fileKey = (name: string) => name.toLowerCase();

/** The projects of a folder, from the paths of its files: each folder that holds a `types/` folder with type
 *  definitions is a project, whose maps take their types there (the nearest one up) and link among themselves. `rootOf`
 *  gives the folder of the project of a path, with its `/` (`showcase/1-courts/`), or undefined when there is none;
 *  `prefixOf` what its names start with: '' in a folder of one project, else where the project is in the folder
 *  (`1-courts/`), so that two projects can have maps of the same name. */
export function projectsOf(paths: string[]) {
  const slash = (p: string) => p.replace(/\\/g, '/');
  const roots = [...new Set(paths.map((p) => /^(.*\/)?types\/[^/]+\.md$/i.exec(slash(p))).filter((m) => m).map((m) => m![1] ?? ''))].sort((a, b) => b.length - a.length);
  const rootOf = (path: string) => roots.find((r) => slash(path).startsWith(r)) ?? roots.at(-1);
  // The part the roots share, up to a `/`: left out of the names, which keep only where each project is.
  let common = roots.length > 1 ? roots.reduce((a, b) => { let k = 0; while (k < a.length && a[k] === b[k]) k++; return a.slice(0, k); }) : '';
  common = common.slice(0, common.lastIndexOf('/') + 1);
  const prefixOf = (path: string) => (roots.length > 1 ? (roots.find((r) => slash(path).startsWith(r)) ?? common).slice(common.length) : '');
  return { rootOf, prefixOf };
}

/** The name of an item: its label for a property, its label for a value with an arrow (in a sequence), else its text. */
function nameOf(item: Item) {
  const property = readProperty(item);
  const arrow = !property && readArrow(item.text);
  return nameKey(property ? property.label : arrow ? arrow.label : item.text);
}

/** The names under an element, at any depth: property labels, and items by their label or their whole text. */
function namesOf(items: Item[]) {
  const names = new Set<string>();
  const walk = (list: Item[]): void => list.forEach((item) => (names.add(nameOf(item)), walk(item.children)));
  walk(items);
  return names;
}

/** The lines of the file where the names of a path under an element are written, from the first to the last: each
 *  name is looked for under the one before, at any depth (a link may skip a property: `[[#Phase#A pain point]]`). The
 *  page reaches the last one it draws. */
function linesOf(items: Item[], path: string[]) {
  const lines: number[] = [];
  const find = (list: Item[], key: string): Item | undefined => {
    for (const item of list) {
      if (nameOf(item) === key) return item;
      const found = find(item.children, key);
      if (found) return found;
    }
  };
  let list = items;
  for (const name of path) {
    const item = find(list, nameKey(name));
    if (!item) break;
    lines.push(item.src!.line);
    list = item.children;
  }
  return lines;
}

/** Indexes the `.md` files of a folder, given as `{ path, text }`, and every link of its maps. `hrefOf(file, anchor)`
 *  gives the address of a file, or of one of its elements (the page; none for the check). */
export function buildIndex(sources: Source[], { hrefOf = () => '' }: { hrefOf?: HrefOf } = {}): LinkIndex {
  const files = new Map<string, IndexedFile>();
  const { prefixOf } = projectsOf(sources.map((s) => s.path));
  for (const { path, text } of sources) {
    const name = path.split(/[\\/]/).pop()!.replace(/\.md$/i, '');
    let map: MapDoc | undefined;
    let error: string | undefined;
    try {
      map = readMap(text);
    } catch (e) {
      error = (e as Error).message; // A file that cannot be read is still a link target; its page reports the error.
    }
    // Type definitions and layouts are not link targets: left out, a map may have the name of its type.
    if (map?.meta.type === 'type-definition' || /\.layout$/i.test(name)) continue;
    const isMap = Boolean(map?.meta.type);
    const elements = new Map<string, IndexedElement>();
    // Every section is a link target, `Context` and `Open questions` included.
    for (const section of isMap ? map!.sections : []) {
      const items = readItems(section.lines, section.start);
      elements.set(nameKey(section.name), { name: section.name, items, names: namesOf(items) });
    }
    const project = prefixOf(path);
    files.set(fileKey(project + name), { name, project, key: project + name, path, text, map, error, isMap, title: map?.meta.title || name, elements } as IndexedFile);
  }
  const index: LinkIndex = { files, hrefOf, links: [] };
  for (const file of files.values()) {
    if (!file.isMap) continue;
    for (const section of file.map.sections) {
      // The property of a link is the label of the top-level item it is written under (an arrow has none). In
      // `Context` and `Open questions`, which are free text, there is no property.
      const free = RESERVED.includes(section.name.toLowerCase());
      let property = '';
      for (const line of section.lines) {
        const top = /^[-*+]\s+(.*)$/.exec(line);
        if (top && !free) property = readProperty({ text: top[1], children: [] })?.label ?? '';
        for (const m of line.matchAll(WIKILINK)) {
          index.links.push({ from: { file, element: section.name, property }, ...resolve(index, file, m[0]) });
        }
      }
    }
  }
  return index;
}

/** Resolves one link written in `fromFile`: its target, its text, its address, or the reason it is broken. */
function resolve(index: LinkIndex, fromFile: IndexedFile | undefined, raw: string): Resolved {
  const m = new RegExp(`^${WIKILINK.source}$`).exec(raw)!;
  const [fileName, path, alias] = [m[1].trim(), m[2].split('#').slice(1).map((s) => s.trim()), m[3]?.trim()];
  const file = fileName ? index.files.get(fileKey((fromFile?.project ?? '') + fileName)) : fromFile; // in its project
  // The full address of a link: the file name of the map when it is another one, then the names of the path. Its text
  // is shorter: the last name of the path, or the map for a link to a map or to its Context; the address on hover.
  const full = [file && file !== fromFile ? file.name : fileName, ...path].filter(Boolean).join(' › ');
  const last = path.at(-1);
  const short = !last || /^context$/i.test(last) ? (file && file !== fromFile ? file.name : fileName) || full : last;
  const label = alias || short;
  if (!file) return { raw, label, full, problem: `no file "${fileName}" in the folder` };
  if (!path.length) return { raw, label, full, file, href: index.hrefOf(file, '') };
  const element = file.elements.get(nameKey(path[0]));
  if (!element) return { raw, label, full, file, problem: `no element "${path[0]}" in ${file.name}` };
  const missing = path.slice(1).find((n) => !element.names.has(nameKey(n)));
  if (missing) return { raw, label, full, file, element, problem: `no "${missing}" under ${element.name} in ${file.name}` };
  // An item is reached by the lines where its path is written, after its element: `el-home/12/14`.
  const lines = linesOf(element.items, path.slice(1));
  return { raw, label, full, file, element, path, lines, href: index.hrefOf(file, [anchorOf(element.name), ...lines].join('/')) };
}

/** What a page needs from the index: text with clickable links, its backlinks and its broken links. */
export function linksOf(index: LinkIndex, key: string): PageLinks {
  const file = index.files.get(fileKey(key));
  // Two links of the page that read the same and lead to different places (`Balances` of a flow and of a sitemap, the
  // `Open questions` of two maps): each names its map first (`sitemap › Balances`), or, when that still reads
  // the same, its whole address. A link with its own text (`|text`) keeps it.
  const where = (r: Resolved) => [r.file!.name, r.element && !/^context$/i.test(r.element.name) ? nameKey(r.element.name) : '', ...(r.lines ?? [])].join('#');
  const shown = index.links.filter((l) => l.from.file === file && !l.problem && !l.raw.includes('|'));
  const clash = (label: (r: Resolved) => string, r: Resolved) => shown.some((l) => label(l).toLowerCase() === label(r).toLowerCase() && where(l) !== where(r));
  const named = (r: Resolved) => `${r.file!.name} › ${r.label}`;
  const labelOf = (r: Resolved) => (r.raw.includes('|') || !clash((l) => l.label, r) ? r.label : clash(named, r) ? [r.file!.name, ...(r.path ?? [])].join(' › ') : named(r));
  const links = (text: string) => {
    // A value that is a link alone: marked, so that the canvas draws it as text (a click shows what it reaches).
    const alone = /^\s*\[\[[^\]]+\]\]\s*$/.test(text) ? ' link--alone' : '';
    return text
      .split(new RegExp(`(${WIKILINK.source})`))
      .map((part, k) => {
        if (k % 5 === 0) return inline(part); // split keeps the 4 groups of each link after its text
        if (k % 5 !== 1) return '';
        const r = resolve(index, file, part);
        return r.problem
          ? `<span class="link link--broken" title="${escapeHtml(`Broken link: ${r.problem}`)}">${escapeHtml(part)}</span>`
          : `<a class="link${alone}" href="${escapeHtml(r.href!)}" title="${escapeHtml(r.file !== file ? `${r.full} (${r.file!.title})` : r.full)}">${escapeHtml(labelOf(r))}</a>`;
      })
      .join('');
  };
  // Links alone between parentheses say where a fact comes from: each one is drawn as a small mark (↗), its target on
  // hover, so that the text stays readable (maps.html hides them on the canvas: its panel shows them, through `links`).
  const mark = (raw: string) => {
    const r = resolve(index, file, raw);
    const where = r.file && r.file !== file ? `${r.full} (${r.file.title})` : r.full;
    return r.problem
      ? `<span class="mark link--broken" title="${escapeHtml(`Broken link ${raw}: ${r.problem}`)}">↗</span>`
      : `<a class="mark" href="${escapeHtml(r.href!)}" title="${escapeHtml(where)}">↗</a>`;
  };
  const SOURCES = new RegExp(`\\s*\\(\\s*((?:${WIKILINK.source})(?:\\s*,\\s*(?:${WIKILINK.source}))*)\\s*\\)`, 'g');
  const linkify = (text: string) => {
    let html = '';
    let at = 0;
    for (const m of text.matchAll(SOURCES)) {
      html += links(text.slice(at, m.index)) + [...m[1].matchAll(WIKILINK)].map((l) => mark(l[0])).join('');
      at = m.index + m[0].length;
    }
    return html + links(text.slice(at));
  };
  // The open questions of the map (not those with a Decision), each with what its links reach: the panel of an
  // element or a value shows those about it.
  const section = file?.map?.sections.find((s) => s.name.toLowerCase() === 'open questions');
  const questions = (section ? readItems(section.lines, section.start) : [])
    .filter((item) => !decided(item))
    .map((item) => ({ item, targets: [...item.text.matchAll(WIKILINK)].map((m) => resolve(index, file, m[0])).filter((r) => r.file === file && r.element) as ElementLink[] }));
  return {
    linkify,
    links,
    questions,
    resolve: (raw: string) => resolve(index, file, raw),
    backlinks: index.links.filter((l) => l.file === file && l.from.file !== file && !l.problem),
    broken: index.links.filter((l) => l.from.file === file && l.problem),
    hrefOf: index.hrefOf,
  };
}

/** Renames an element or an item, `file#Element` or `file#Element#Item` (any depth; `file` its key, with its project
 *  in a folder of several: `1-courts/rules#Element`), and rewrites every link to it or
 *  under it in the maps of the folder, given as `{ path, text }`: a link is rewritten when it resolves to the same place,
 *  however it is written (another case, an alias, a property skipped in its path). Returns the files changed, as
 *  `{ path, text }`, or throws when the target is not found. Plain function, shared by rename.ts and the page. */
export function rename(sources: Source[], target: string, newName: string): Source[] {
  const index = buildIndex(sources);
  const [fileName, ...path] = target.split('#').map((s) => s.trim());
  const file = index.files.get(fileKey(fileName));
  if (!file?.isMap) throw new Error(`no map "${fileName}" in the folder`);
  if (!path.length) throw new Error('give an element: file#Element, or an item: file#Element#Item');
  const element = file.elements.get(nameKey(path[0]));
  if (!element) throw new Error(`no element "${path[0]}" in ${file.name}`);
  const lines = linesOf(element.items, path.slice(1));
  if (lines.length < path.length - 1) throw new Error(`no "${path[lines.length + 1]}" under ${element.name} in ${file.name}`);
  const texts = new Map([...index.files.values()].map((f) => [f, f.text.split('\n')]));
  const own = texts.get(file)!;
  // The name itself: the heading of the element, or the name of the item (its label, or its whole text).
  if (path.length === 1) {
    if (nameKey(newName) !== nameKey(element.name) && file.elements.has(nameKey(newName))) throw new Error(`${file.name} already has an element "${newName}"`);
    const section = file.map.sections.find((s) => nameKey(s.name) === nameKey(element.name))!;
    own[section.src.line] = own[section.src.line].slice(0, section.src.col) + newName + own[section.src.line].slice(section.src.col + section.name.length);
  } else {
    const at = lines.at(-1)!;
    const item = /^(\s*[-*+]\s+)(.*)$/.exec(own[at])!;
    const property = readProperty({ text: item[2], children: [] });
    const arrow = !property && readArrow(item[2]);
    const name = property ? property.label : arrow ? arrow.label : item[2];
    const from = item[1].length + item[2].indexOf(name);
    own[at] = own[at].slice(0, from) + newName + own[at].slice(from + name.length);
  }
  // The links: in the sections of every map (not in its header comment, which is built from its type).
  for (const f of index.files.values()) {
    if (!f.isMap) continue;
    const text = texts.get(f)!;
    for (const section of f.map.sections) {
      for (let k = section.start; k < section.start + section.lines.length; k++) {
        text[k] = text[k].replace(WIKILINK, (raw: string, linkFile: string, linkPath: string, alias?: string) => {
          const r = resolve(index, f, raw);
          if (r.problem || r.file !== file || r.element !== element) return raw;
          // The name to replace in the path of the link: the element, or the name written where the item is.
          const at = path.length === 1 ? 0 : r.lines!.indexOf(lines.at(-1)!) + 1;
          if (at < 0 || (path.length > 1 && at === 0)) return raw;
          const names = linkPath.split('#').slice(1);
          // In a link, the name without what a link cannot hold: names match without punctuation.
          names[at] = names[at].replace(names[at].trim(), newName.replace(/[#|[\]]/g, '').replace(/\s+/g, ' ').trim());
          return `[[${linkFile}${names.map((n) => `#${n}`).join('')}${alias === undefined ? '' : `|${alias}`}]]`;
        });
      }
    }
  }
  return [...texts].filter(([f, t]) => t.join('\n') !== f.text).map(([f, t]) => ({ path: f.path, text: t.join('\n') }));
}

/** What a link can name under an element or an item: the values written as nested items of its properties, each with
 *  its property, and the elements under it (a tree). Not a property, nor a detail of a value (they are
 *  `Label: value`), nor an arrow of a graph, nor a value that holds a link. A value is named by its text, without its
 *  own arrow (FORMAT.md, "Arrows between values"). */
export function linkable(items: Item[]): { item: Item; name: string; property: string }[] {
  const found: { item: Item; name: string; property: string }[] = [];
  for (const item of items) {
    const property = readProperty(item);
    if (!property) {
      if (!readArrow(item.text)) found.push({ item, name: item.text, property: '' });
    } else if (!property.value) {
      for (const value of property.children) if (!readProperty(value)) found.push({ item: value, name: readArrow(value.text)?.label ?? value.text, property: property.label });
    }
  }
  return found.filter((f) => f.name.trim() && !f.name.includes('[['));
}

/** A line whose name names nothing for now (emptied while it is retyped, or a name already taken): its place in the
 *  file as written, and its text when links last reached it. */
export interface NameLeft {
  path: string;
  line: number;
  text: string;
}

/** What a line names, as it is written: the heading of an element, or an item that is not a property; `kind` tells
 *  a heading from an item, and an item by its indent. No name for `Context` and `Open questions`, a property, an
 *  empty line of its kind, a value that holds a link. */
function nameOn(line: string): { kind: string; name: string } | undefined {
  const heading = /^##(?!#)\s*(.*)$/.exec(line);
  if (heading) return { kind: '##', name: RESERVED.includes(heading[1].trim().toLowerCase()) ? '' : heading[1].trim() };
  const item = /^(\s*)[-*+](?:\s+(.*))?$/.exec(line);
  if (!item) return undefined;
  const text = (item[2] ?? '').trim();
  const name = readProperty({ text, children: [] }) ? '' : (readArrow(text)?.label ?? text);
  return { kind: `${item[1].length}-`, name: name.includes('[[') ? '' : name };
}

/** The address of what the line `line` of a map names, `file#Element` or `file#Element#Item…`, when a link written
 *  so reaches that very line. */
function targetAt(index: LinkIndex, file: IndexedFile, line: number): string | undefined {
  if (!file.isMap) return undefined;
  for (const section of file.map.sections) {
    if (RESERVED.includes(section.name.toLowerCase())) continue;
    if (section.src.line === line) return `${file.key}#${section.name}`;
    const under = (items: Item[], path: string[]): string | undefined => {
      for (const { item, name } of linkable(items)) {
        const found = item.src?.line === line ? [...path, name].join('#') : under(item.children, [...path, name]);
        if (found) return found;
      }
    };
    const target = under(readItems(section.lines, section.start), [file.name, section.name]);
    if (target) return resolve(index, file, `[[${target}]]`).lines?.at(-1) === line ? file.project + target : undefined;
  }
}

/** The lines two texts do not share, as hunks: the lines of the first that are gone (`del`) and those of the second
 *  that came (`ins`), by their numbers; and where each line they share is in the second (`kept`). */
function hunksOf(a: string[], b: string[]) {
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let end = 0;
  while (end < a.length - start && end < b.length - start && a[a.length - 1 - end] === b[b.length - 1 - end]) end++;
  const [m, n] = [a.length - start - end, b.length - start - end];
  const kept = new Map<number, number>();
  for (let k = 0; k < start; k++) kept.set(k, k);
  for (let k = 0; k < end; k++) kept.set(a.length - 1 - k, b.length - 1 - k);
  const hunks: { del: number[]; ins: number[] }[] = [];
  if (!m && !n) return { hunks, kept };
  // The longest run of lines shared in the middle (it is small: what one types between two savings); too large, the
  // middle is one hunk.
  const lcs = m * n > 250000 ? undefined : Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  if (lcs) for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--) lcs[i][j] = a[start + i] === b[start + j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  let hunk = { del: [] as number[], ins: [] as number[] };
  const close = () => {
    if (hunk.del.length || hunk.ins.length) hunks.push(hunk);
    hunk = { del: [], ins: [] };
  };
  for (let i = 0, j = 0; i < m || j < n; ) {
    if (lcs && i < m && j < n && a[start + i] === b[start + j]) {
      close();
      kept.set(start + i++, start + j++);
    } else if (i < m && (j >= n || !lcs || lcs[i + 1][j] >= lcs[i][j + 1])) hunk.del.push(start + i++);
    else hunk.ins.push(start + j++);
  }
  close();
  return { hunks, kept };
}

/** Follows a name edited in the page: the file `path` of the folder (`sources`, as last written) now has the text
 *  `text`. When one line that named an element or an item (its heading, a value, an element under another) now
 *  names it otherwise, at the same place, the links to it are rewritten in the whole folder, as `rename` does.
 *  Returns the files to write, the edited one first, with its own links rewritten; what was renamed, with how many
 *  links in how many maps (`renamed`), or why the links could not follow (`problem`: a name already taken); and what
 *  to remember for the next time (`left`): a name that names nothing for now, emptied while it is retyped, so that
 *  its links follow once it is typed. Nothing is renamed when more than one name changed at once, when the line
 *  moved or was taken out, or when the name is the same for a link (its case, its punctuation). */
export function followName(sources: Source[], path: string, text: string, left?: NameLeft): { files: Source[]; renamed?: { from: string; to: string; links: number; maps: number }; problem?: string; left?: NameLeft } {
  const plain = { files: [{ path, text }] };
  const old = sources.find((s) => s.path === path);
  if (!old) return plain;
  const [oldLines, newLines] = [old.text.replace(/\r\n?/g, '\n').split('\n'), text.split('\n')];
  const { hunks, kept } = hunksOf(oldLines, newLines);
  const baseOf = (line: number) => (left?.path === path && left.line === line ? left.text : oldLines[line]);
  // A name remembered on a line that was not touched stays remembered, where the line now is.
  const still = left?.path === path && kept.has(left.line) ? { ...left, line: kept.get(left.line)! } : undefined;
  // The lines that named something and are gone, each with the line that came in its place: the only one of its
  // kind in its hunk, or the only one at all.
  const edited = hunks.flatMap(({ del, ins }) =>
    del.flatMap((line) => {
      const was = nameOn(baseOf(line));
      if (!was?.name) return [];
      const same = ins.filter((k) => nameOn(newLines[k])?.kind === was.kind);
      const now = same.length === 1 ? same[0] : del.length === 1 && ins.length === 1 ? ins[0] : undefined;
      return now === undefined ? [] : [{ base: baseOf(line), was, now }];
    }),
  );
  if (edited.length !== 1) return { ...plain, left: still };
  const [{ base, was, now }] = edited;
  const keep = still && still.line !== now ? { left: still } : {}; // a name remembered on another line
  // The folder as it was, with the edited file as it is but for that line: its links still reach the name.
  const before = newLines.with(now, base).join('\n');
  const folder = sources.map((s) => (s.path === path ? { path, text: before } : s));
  const index = buildIndex(folder);
  const file = [...index.files.values()].find((f) => f.path === path);
  const target = file && targetAt(index, file, now);
  if (!target) return { ...plain, ...keep };
  const remembered = { path, line: now, text: base };
  const name = nameOn(newLines[now]);
  if (!name || name.kind !== was.kind || !nameKey(name.name)) return { ...plain, left: remembered };
  if (nameKey(name.name) === nameKey(was.name)) return { ...plain, ...keep };
  try {
    const changed = rename(folder, target, name.name);
    // The edited file: its links rewritten, its line as it was typed.
    const own = (changed.find((c) => c.path === path)?.text ?? before).split('\n').with(now, newLines[now]).join('\n');
    const files = [{ path, text: own }, ...changed.filter((c) => c.path !== path)];
    const linksOf = (t: string) => [...t.matchAll(WIKILINK)].map((m) => m[0]);
    const counts = files.map((f) => {
      const then = linksOf(folder.find((s) => s.path === f.path)!.text);
      return linksOf(f.text).filter((l, k) => l !== then[k]).length;
    });
    return { files, renamed: { from: was.name, to: name.name, links: counts.reduce((a, b) => a + b, 0), maps: counts.filter(Boolean).length }, ...keep };
  } catch (e) {
    return { ...plain, problem: (e as Error).message, left: remembered };
  }
}
