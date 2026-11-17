// What the editor of maps.html proposes where the cursor is, as a list. Step 1, while a link is written (`[[…`): one level of its path at a time, the maps, the elements
// of a map, what is under an element. Step 2, what the type of the map allows: the values of a property after its
// label (an enum, a scale), and the properties or the details not written yet while a label is typed; and the labels
// the type does not know, for the editor to tell them apart.
// Plain functions with no page and no editor, shared by the editor (editor.ts, through viewer.ts) and the test.
// Generic: it knows the format (FORMAT.md) and what a definition says, shapes and kinds of values, never a type.

import type { Definition, Item, LinkIndex, MapDoc, PropertySpec } from './model.ts';
import { linkable } from './links.ts';
import { labelEnd, nameKey, readArrow, readItems, readMap, readProperty, RESERVED } from './read.ts';

/** A change of a line: `insert` in place of its columns `from` to `to`; the cursor goes after it, or `cursor`
 *  characters into it. */
export interface Change {
  from: number;
  to: number;
  insert: string;
  cursor?: number;
}

/** A row of the list: its name, what places it (`detail`: the title of a map, the property of a value), and what it
 *  writes when it is accepted (`accept`). `down`, for a row of a link once its part has letters: what `#` writes to
 *  go down a level from it. `again`: the list opens again after it (the row of this map, a property and its values). */
export interface Row {
  name: string;
  detail: string;
  accept: Change;
  down?: Change;
  again?: true;
}

/** What is proposed where the cursor is: the rows, and the column of the line where what is typed of them starts. */
export interface Proposal {
  from: number;
  rows: Row[];
}

/** What the list reads: the maps of the folder, the name of the file in the editor, and the definition of a type
 *  (none when the type is not known or cannot be read). */
export interface Folder {
  index: LinkIndex;
  name: string;
  definitionOf: (type: string) => Definition | undefined;
}

/** What to propose in the file `folder.name`, whose text in the editor is `text`, with the cursor on its line `line`
 *  (from 0) at the column `at`: for a link being written, else for what the type allows. */
export function propose(folder: Folder, text: string, line: number, at: number): Proposal | undefined {
  const lines = text.split('\n');
  return proposeLink(folder.index, folder.name, text, lines[line] ?? '', at) ?? proposeType(folder.definitionOf, text, lines, line, at);
}

// ---- Step 1: a link ----

/** The characters a link cannot hold in a name; names match without punctuation, so a name is written without them. */
const written = (name: string) => name.replace(/[#|[\]]/g, '').replace(/\s+/g, ' ').trim();

/** What a link can name at a level: its name, what places it, what it writes in the path, and the items under it.
 *  `here` is the row of this map, which writes `#` alone and closes no link. */
interface Entry {
  name: string;
  detail: string;
  write: string;
  under: Item[];
  here?: true;
}

/** What a link can name under an element or an item (`linkable`): a value, with its property as what places it, an
 *  element under it (a tree). */
const entriesOf = (items: Item[]): Entry[] =>
  linkable(items)
    .filter((l) => written(l.name))
    .map((l) => ({ name: l.name, detail: l.property, write: written(l.name), under: l.item.children }));

/** The elements of a map: its `##`, then `Context` and `Open questions` when it has them, which a link can name too
 *  (nothing proposed under them). */
const elementsOf = (map: MapDoc): Entry[] => {
  const reserved = (s: { name: string }) => RESERVED.includes(s.name.toLowerCase());
  return [
    ...map.sections.filter((s) => !reserved(s)).map((s) => ({ name: s.name, detail: '', write: written(s.name), under: readItems(s.lines, s.start) })),
    ...map.sections.filter(reserved).map((s) => ({ name: s.name, detail: '', write: written(s.name), under: [] })),
  ];
};

/** What to propose in `line` with the cursor at column `at`, in the file `name` of the folder indexed, whose text in
 *  the editor is `text` (this map is read as it is typed; the other maps from the index). Nothing when the cursor is
 *  not in the path of a link being written, or when the path leads nowhere. */
export function proposeLink(index: LinkIndex, name: string, text: string, line: string, at: number): Proposal | undefined {
  const open = /\[\[([^[\]|]*)$/.exec(line.slice(0, at));
  if (!open) return undefined;
  const parts = open[1].split('#');
  const typed = parts.pop()!;
  const own = index.files.get(name.toLowerCase());
  const project = own?.project ?? '';
  let entries: Entry[];
  if (!parts.length) {
    const maps = [...index.files.values()].filter((f) => f.isMap && f !== own && f.project === project).sort((a, b) => a.name.localeCompare(b.name));
    entries = [
      { name: 'This map', detail: own?.title ?? '', write: '', here: true, under: [] },
      ...maps.map((f) => ({ name: f.name, detail: f.title === f.name ? '' : f.title, write: written(f.name), under: [] })),
    ];
  } else {
    const [file, ...path] = parts.map((p) => p.trim());
    let map: MapDoc | undefined;
    if (file && (project + file).toLowerCase() !== name.toLowerCase()) {
      const other = index.files.get((project + file).toLowerCase());
      map = other?.isMap ? other.map : undefined;
    } else {
      try {
        map = readMap(text);
      } catch {
        // A map that cannot be read while it is typed has nothing to propose.
      }
    }
    entries = map ? elementsOf(map) : [];
    for (const step of path) entries = entriesOf(entries.find((e) => nameKey(e.name) === nameKey(step))?.under ?? []);
  }
  // The rows whose name holds what is typed, ignoring case: the name typed whole first, then those that start with
  // it, then the others, each in the order given.
  const key = typed.trim().toLowerCase();
  const rank = (e: Entry) => (key && nameKey(e.name) === nameKey(key) ? 0 : e.name.toLowerCase().startsWith(key) ? 1 : e.name.toLowerCase().includes(key) ? 2 : 3);
  const kept = [0, 1, 2].flatMap((r) => entries.filter((e) => rank(e) === r));
  if (!kept.length) return undefined;
  // After the cursor: the rest of the path, when the link is closed further on the line by `]]` or by its text.
  const rest = /^([^[\]|]*)(\]\]|\|[^[\]]*\]\])/.exec(line.slice(at));
  const from = at - typed.length;
  const pathEnd = at + (rest ? rest[1].length : 0);
  // Going down a level (`#`): the name then `#`, in place of what was typed of the part and of the rest of the path
  // of a link already closed. Right after `[[` or a `#`, with no letter yet, `#` is itself: `[[#` is this map.
  const down = (e: Entry): Change => ({ from, to: pathEnd, insert: `${e.write}#` });
  // Accepting: the name then `]]`, the link closed there, in place of the rest of the link when it is already closed
  // (never two `]]`, and its text after `|` kept). The row of this map goes down instead.
  const close = (e: Entry): Change => ({ from, to: pathEnd + (rest?.[2] === ']]' ? 2 : 0), insert: e.write + (rest && rest[2] !== ']]' ? '' : ']]') });
  return {
    from,
    rows: kept.map((e) => ({ name: e.name, detail: e.detail, accept: e.here ? down(e) : close(e), ...(key ? { down: down(e) } : {}), ...(e.here ? { again: true as const } : {}) })),
  };
}

// ---- Step 2: what the type allows ----

const ITEM = /^(\s*)[-*+]\s+/;
const HEADING = /^#{1,6}\s/;
const labelOf = (text: string) => readProperty({ text, children: [] });

/** The values a property allows, when its kind closes them: those of an enum, in the order of the type; each number
 *  of a scale (a number with a `Min` and a `Max`). */
function valuesOf(spec: PropertySpec): string[] {
  if (spec.kind === 'enum') return spec.values ?? [];
  if (spec.kind !== 'number' || spec.min === undefined || spec.max === undefined) return [];
  const values: string[] = [];
  for (let n = Math.ceil(spec.min); n <= spec.max; n++) values.push(String(n));
  return values;
}

/** The property of a label among those known at a place, ignoring case; else the one for any other property (`*`). */
const find = (specs: PropertySpec[], label: string) => specs.find((s) => s.name.toLowerCase() === label.trim().toLowerCase()) ?? specs.find((s) => s.name === '*');

/** The definition of the type of a map, from its text; none when the map or its type cannot be read. */
function definitionIn(definitionOf: Folder['definitionOf'], text: string) {
  try {
    const type = readMap(text).meta.type;
    return type ? definitionOf(type) : undefined;
  } catch {
    return undefined; // a map that cannot be read while it is typed has nothing to propose
  }
}

/** Where an item is, by the items above it: the column where its text starts, its indent, the line of the heading of
 *  its `##` (`top`), whether it is right under it (`first`), and the properties known there (`specs`): those of the
 *  type, under an element or under an element under it (a tree); the details of a property, under one of its values
 *  (nested under it, or written on its line). No `specs` under a property (its values are free), nor under what the
 *  type does not know. Nothing for a line that is not an item of an element. */
function placeOf(definition: Definition, lines: string[], line: number) {
  const item = ITEM.exec(lines[line] ?? '');
  if (!item) return undefined;
  const indent = item[1].length;
  // The items above it, from the nearest: each one less indented than the one before; then its heading.
  const above: string[] = [];
  let top = line - 1;
  for (let least = indent; top >= 0 && !HEADING.test(lines[top]); top--) {
    const m = ITEM.exec(lines[top]);
    if (!m || m[1].length >= least) continue;
    least = m[1].length;
    above.unshift(lines[top].slice(m[0].length));
  }
  const heading = /^##\s+(.*)$/.exec(lines[top] ?? '');
  if (!heading || RESERVED.includes(heading[1].trim().toLowerCase())) return undefined;
  let specs: PropertySpec[] | undefined = definition.properties;
  let element = true;
  for (let k = 0; k < above.length && specs; k++) {
    const property = labelOf(above[k]);
    if (!property) specs = element && definition.shape === 'tree' ? specs : undefined; // an element under an element
    else {
      // A property, then one of its values: the item is among its details. Right under a property with no value
      // (`- Evidence:`), an item is a value whatever it holds, `: ` included (FORMAT.md, rule 7).
      const value = property.value || ++k < above.length;
      specs = value ? find(specs, property.label)?.details : undefined;
      element = false;
    }
  }
  return { start: item[0].length, indent, top, first: !above.length, specs };
}

/** What the type of the map allows in an item, the cursor in it: after `Label: `, the values of the property when
 *  its kind closes them, those that start with what is typed (none once a value is typed whole: Enter then continues
 *  the list of the map); while a label is typed, at the end of the line, the properties of the type, or the details
 *  of the property of the value above, that are not written yet and start with what is typed. On an empty item,
 *  nothing; but on the first item of an element that has no other, every property of the type, and before them a row
 *  that writes them all. */
function proposeType(definitionOf: Folder['definitionOf'], text: string, lines: string[], line: number, at: number): Proposal | undefined {
  if (!ITEM.test(lines[line] ?? '')) return undefined;
  const definition = definitionIn(definitionOf, text);
  const place = definition && placeOf(definition, lines, line);
  if (!place?.specs || at < place.start) return undefined;
  const { start, indent, top, specs } = place;
  const before = lines[line].slice(start, at);
  const colon = labelEnd(before);
  if (colon >= 0) {
    const spec = find(specs, before.slice(0, colon));
    const from = start + colon + 2;
    const typed = lines[line].slice(from, at).trim().toLowerCase();
    const values = spec ? valuesOf(spec) : [];
    if (values.some((v) => v.toLowerCase() === typed)) return undefined;
    // In place of the value of the line; the note of a number, after its comma, is kept.
    const comma = spec?.note ? lines[line].indexOf(',', from) : -1;
    const to = comma >= 0 ? comma : lines[line].length;
    const rows = values.filter((v) => v.toLowerCase().startsWith(typed)).map((v) => ({ name: v, detail: '', accept: { from, to, insert: v } }));
    return rows.length ? { from, rows } : undefined;
  }
  if (at < lines[line].length) return undefined;
  // The labels already written beside it: the items at its indent under the same item, or the same heading.
  const beside = new Set<string>();
  let alone = place.first; // the only item of its element
  const start0 = top + 1 + lines.slice(top + 1, line).findLastIndex((l) => (ITEM.exec(l)?.[1].length ?? indent) < indent) + 1;
  for (let k = start0; k < lines.length && !HEADING.test(lines[k]); k++) {
    const m = ITEM.exec(lines[k]);
    if (m && m[1].length < indent) break;
    if (m && k !== line) alone = false;
    const label = m && k !== line && m[1].length === indent && labelOf(lines[k].slice(m[0].length))?.label;
    if (label) beside.add(label.toLowerCase());
  }
  if (!before && !alone) return undefined;
  const left = specs.filter((s) => s.name !== '*' && !beside.has(s.name.toLowerCase()) && s.name.toLowerCase().startsWith(before.toLowerCase()));
  const rows: Row[] = left.map((s) => ({ name: s.name, detail: '', accept: { from: start, to: at, insert: `${s.name}: ` }, again: true }));
  // A new element: all its properties at once, one item each, in the order of the type; the cursor at the first value.
  if (!before && left.length > 1) {
    const insert = left.map((s) => `${s.name}: `).join(`\n${lines[line].slice(0, start)}`);
    rows.unshift({ name: `All ${left.length} properties`, detail: '', accept: { from: start, to: at, insert, cursor: `${left[0].name}: `.length }, again: true });
  }
  return rows.length ? { from: start, rows } : undefined;
}

/** The labels the type of the map does not know, in its lines `from` to `to` (from 0), each as its line and its
 *  columns: a property of an element that is not one of the type (when the type takes no other, `## *`), a detail a
 *  property does not declare. The editor writes them in italics, as the map draws them. Not an arrow of a graph. */
export function addedLabels(definitionOf: Folder['definitionOf'], text: string, from: number, to: number): { line: number; from: number; to: number }[] {
  const definition = definitionIn(definitionOf, text);
  if (!definition) return [];
  const lines = text.split('\n');
  const added = [];
  for (let line = from; line <= to && line < lines.length; line++) {
    const place = placeOf(definition, lines, line);
    const content = place?.specs && lines[line].slice(place.start);
    const label = content && !readArrow(content) && labelOf(content)?.label;
    if (label && !find(place!.specs!, label)) added.push({ line, from: place!.start + content.indexOf(label), to: place!.start + content.indexOf(label) + label.length });
  }
  return added;
}
