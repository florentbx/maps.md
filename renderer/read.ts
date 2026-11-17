// Reading maps and type definitions: plain functions with no file system, shared by the page, the check and the test.
// Source: rewritten for the current format (FORMAT.md); the reading of a first implementation of maps.md was
// not reused.

import type { Arrow, Cardinality, Definition, Item, Kind, Labeled, Layout, MapDoc, MapElement, Meta, Property, PropertySpec, ScaleValue, Section, Shape, Src } from './model.ts';

/** Stops the reading of a definition or a layout, with a readable message. */
type Fail = (message: string) => never;

// ---- Reading a map ----

/** Front matter, then one section per `##` heading, each with its lines. Throws on a front matter left open. Each
 *  section has `src`, where its name is written in the file (`{ line, col }`, from 0), and `start`, the line of the
 *  file of its first line, so that the page can show them in the Markdown. */
export function readMap(text: string): MapDoc {
  let lines = text.replace(/^﻿/, '').split(/\r\n|\r|\n/).map((l) => l.trimEnd());
  let offset = 0;
  const meta: Meta = {};
  if (lines[0]?.trim() === '---') {
    const end = lines.findIndex((l, k) => k > 0 && l.trim() === '---');
    if (end < 0) throw new Error('the front matter is not closed: add a "---" line after it.');
    for (const line of lines.slice(1, end)) {
      const m = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line);
      if (m) meta[m[1].toLowerCase()] = m[2].replace(/^"(.*)"$/, '$1');
    }
    lines = lines.slice(end + 1);
    offset = end + 1;
  }
  // Comments are removed, their lines kept, so that a line keeps its number.
  lines = lines.join('\n').replace(/<!--[\s\S]*?-->/g, (c) => c.replace(/[^\n]/g, '')).split('\n');
  const sections: Section[] = [];
  for (const [k, line] of lines.entries()) {
    const heading = /^##\s+(.*?)\s*$/.exec(line);
    if (heading) sections.push({ name: heading[1], lines: [], src: { line: offset + k, col: line.indexOf(heading[1], 2) }, start: offset + k + 1 });
    else sections.at(-1)?.lines.push(line);
  }
  return { meta, sections };
}

/** List items as a tree, by indentation. An indented line that is not an item continues the item above it. With
 *  `start`, the line of the file of the first line, each item has `src`, where its text is written. */
export function readItems(lines: string[], start?: number): Item[] {
  const root: { children: Item[] } = { children: [] };
  const stack: { indent: number; node: { children: Item[] } }[] = [{ indent: -1, node: root }];
  for (const [k, line] of lines.entries()) {
    const m = /^(\s*)[-*+]\s+(.*)$/.exec(line);
    if (!m) {
      const indent = line.length - line.trimStart().length;
      if (line.trim() && indent > 0 && stack.length > 1) (stack.at(-1)!.node as Item).text += ` ${line.trim()}`; // above the root, an item
      continue;
    }
    const node: Item = { text: m[2], children: [], src: start === undefined ? undefined : { line: start + k, col: line.length - m[2].length } };
    while (stack.at(-1)!.indent >= m[1].length) stack.pop();
    stack.at(-1)!.node.children.push(node);
    stack.push({ indent: m[1].length, node });
  }
  return root.children;
}

/** Where the label of `Label: value` ends: at the first ": " that follows a word, not a space, so that a sentence in
 *  French, which writes " : " (`Commande oubliée : on prend ce qui reste`), stays a sentence; -1 when there is none. */
export const labelEnd = (text: string) => /(?<=\S): /.exec(text)?.index ?? -1;

/** `Label: value`. The label ends at the first ": " after a word, or at a final ":" after a word. */
export function readProperty(item: Item): Labeled | undefined {
  const at = labelEnd(item.text);
  if (at >= 0) return { label: item.text.slice(0, at).trim(), value: item.text.slice(at + 2).trim(), children: item.children };
  if (/\S:$/.test(item.text)) return { label: item.text.slice(0, -1).trim(), value: '', children: item.children };
  return undefined;
}

/** An open question answered: it has a `Decision` under it. */
export const decided = (item: Item) => item.children.some((c) => readProperty(c)?.label.toLowerCase() === 'decision');

/** An arrow, when the item has `→` or `->` before its first ": ": `label → [[#Step]]` or `label → [[file#Step]]`. */
export function readArrow(text: string): Arrow | undefined {
  const arrow = /→|->/.exec(text);
  if (!arrow) return undefined;
  const colon = labelEnd(text);
  if (colon >= 0 && colon < arrow.index) return undefined;
  const rest = text.slice(arrow.index + arrow[0].length).trim();
  const link = /^\[\[([^\]|#]*)(?:#([^\]|]*))?(?:\|[^\]]*)?\]\]/.exec(rest);
  const target = link ? (link[1] ? `${link[1]}${link[2] ? `#${link[2]}` : ''}` : (link[2] ?? '')) : rest;
  return { label: text.slice(0, arrow.index).trim(), target: target.trim(), file: link?.[1] || undefined };
}

/** An element: its properties by lowercase label; in a graph, its arrows; in a tree, its children, the items that are
 *  not properties, each read as an element. A label written twice adds its values to the first one. `src`, where the
 *  name is written, goes to the element, and where each value is written to its value. */
function readElement(name: string, items: Item[], shape?: Shape, src?: Src): MapElement {
  const properties = new Map<string, Property>();
  const arrows: Arrow[] = [];
  const children: MapElement[] = [];
  for (const item of items) {
    const arrow = shape === 'graph' ? readArrow(item.text) : undefined;
    if (arrow) {
      arrows.push(arrow);
      continue;
    }
    const p = readProperty(item);
    if (!p) {
      if (shape === 'tree') children.push(readElement(item.text.trim(), item.children, shape, item.src));
      continue;
    }
    // `undefined` alone, on the line of its label or as its only item (`- Thoughts:`, then `  - undefined`).
    const isUndefined = p.value.toLowerCase() === 'undefined' || (!p.value && p.children.length === 1 && !p.children[0].children.length && p.children[0].text.trim().toLowerCase() === 'undefined');
    const valueSrc = item.src && p.value ? { line: item.src.line, col: item.src.col + item.text.indexOf(p.value, p.label.length) } : undefined;
    const values = isUndefined ? [] : p.value ? [{ text: p.value, children: p.children, src: valueSrc }] : p.children;
    const key = p.label.toLowerCase();
    const known = properties.get(key);
    if (!known) {
      properties.set(key, { label: p.label, values, isUndefined, raw: p.value, src: valueSrc });
      continue;
    }
    known.values.push(...values);
    if (known.isUndefined && !isUndefined) known.raw = p.value;
    known.isUndefined = known.isUndefined && isUndefined;
  }
  return { name, src, properties, arrows, children };
}

/** The cardinality that ends the label of a relation (`has 0..n`), in crow's foot notation: `one` (1), `zero-one`
 *  (0..1), `many` (1..n), `zero-many` (0..n, n, *); the rest of the label. Another cardinality (2..5) is none. */
export function cardinalityOf(label: string): { label: string; kind: Cardinality } | undefined {
  const m = /^(.*?)\s*\b(0\.\.1|1\.\.[n*]|0\.\.[n*]|1|[n*])$/i.exec(label.trim());
  if (!m) return undefined;
  const kind = ({ '1': 'one', '0..1': 'zero-one', '1..n': 'many', '1..*': 'many', '0..n': 'zero-many', '0..*': 'zero-many', n: 'zero-many', '*': 'zero-many' } as Record<string, Cardinality>)[m[2].toLowerCase()];
  return { label: m[1].trim(), kind };
}

/** The `##` sections of a map that are not elements. */
export const RESERVED = ['context', 'open questions'];

/** The kind of the elements of a type, for their look: its first single enum property (the `Kind` of a user flow). */
export const kindSpecOf = (definition: Definition) => definition.properties.find((p) => p.kind === 'enum' && p.single);

/** A number written in a map, with its optional word after a comma (`-1, worried`). */
export function readNumber(text: string): ScaleValue | null {
  const m = /^(-?\d+(?:\.\d+)?)\s*(?:,\s*(.*))?$/.exec(text.trim());
  return m && { value: Number(m[1]), word: m[2] ?? '', raw: m[1] };
}

/** The elements of a map: every `##` section except the reserved ones. Arrows are read only in a `graph`, children
 *  only in a `tree`. */
export const elementsOf = (map: MapDoc, shape?: Shape): MapElement[] =>
  map.sections
    .filter((s) => !RESERVED.includes(s.name.toLowerCase()))
    .map((s) => readElement(s.name, readItems(s.lines, s.start), shape, s.src));

/** Names match ignoring case and punctuation, as heading anchors do. */
export const nameKey = (name: string) => name.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-');

// ---- Reading a type definition ----

const SHAPES: readonly string[] = ['cards', 'sequence', 'graph', 'tree'] satisfies Shape[];
const KINDS: readonly string[] = ['text', 'date', 'enum', 'number', 'link'] satisfies Kind[];

/** The definition of a type, from the text of `types/<type>.md`: itself a map of the type `type-definition`, where each
 *  `##` is a known property, in order. Throws with a readable message. `layoutText`, the text of `types/<type>.layout.md`
 *  when there is one, gives `layout`; a layout that cannot be read gives `layoutError` instead, and the cards are drawn
 *  without it. */
export function parseDefinition(type: string, text: string, layoutText?: string): Definition {
  const definition = readDefinition(type, text);
  if (layoutText === undefined) return definition;
  try {
    return { ...definition, layout: parseLayout(definition, layoutText) };
  } catch (e) {
    return { ...definition, layoutError: (e as Error).message };
  }
}

/** The settings of the drawing of a graph that a map may choose for itself, in its front matter (`direction: right`,
 *  `ends: no`, `returns: arrow`), over those of the main view of its layout, with their values. */
export const MAP_SETTINGS: Record<string, string[]> = { direction: ['down', 'right'], ends: ['yes', 'start', 'no'], returns: ['arrow', 'link'] };

/** The definition a map is drawn with: the main view of its layout with the settings its front matter chooses, when that
 *  view is a graph; a value not known is left out (the check says so). */
export function definitionFor(definition: Definition, meta: Record<string, string | undefined>): Definition {
  const main: Layout = definition.layout ?? { shape: definition.shape };
  if (main.shape !== 'graph') return definition;
  const chosen: Partial<Layout> = {};
  for (const [key, values] of Object.entries(MAP_SETTINGS)) {
    const value = meta[key]?.trim().toLowerCase();
    if (!value || !values.includes(value)) continue;
    if (key === 'ends') chosen.ends = value === 'no' ? false : (value as 'yes' | 'start');
    else chosen[key as 'direction' | 'returns'] = value;
  }
  return Object.keys(chosen).length ? { ...definition, layout: { ...main, ...chosen } } : definition;
}

function readDefinition(type: string, text: string): Definition {
  const file = `types/${type}.md`;
  const map = readMap(text);
  const fail: Fail = (message) => {
    throw new Error(`${file}: ${message}`);
  };
  if (map.meta.type !== 'type-definition') fail('its front matter must say "type: type-definition".');
  if (!SHAPES.includes(map.meta.shape!)) fail(`"shape" must be one of ${SHAPES.join(', ')}.`);
  // A property, or a field of one (`- Details:`, the details expected under each of its values, each a nested item
  // with the same attributes as a property).
  const specOf = (name: string, attributes: Map<string, Property>): PropertySpec => {
    const property = { name } as PropertySpec; // its kind: just below
    const value = (label: string) => attributes.get(label)?.raw;
    for (const label of attributes.keys()) {
      if (!['kind', 'min', 'max', 'single', 'note', 'values', 'meaning', 'default', 'details'].includes(label)) fail(`"${name}": unknown attribute "${attributes.get(label)!.label}".`);
    }
    property.kind = value('kind') as Kind; // checked on the next line
    if (!KINDS.includes(property.kind)) fail(`"${name}": "Kind" must be one of ${KINDS.join(', ')}.`);
    for (const bound of ['min', 'max'] as const) {
      if (value(bound) === undefined) continue;
      property[bound] = Number(value(bound));
      if (value(bound) === '' || Number.isNaN(property[bound])) fail(`"${name}": "${bound}" must be a number.`);
    }
    for (const flag of ['single', 'note'] as const) {
      if (value(flag) === undefined) continue;
      if (!/^(yes|no)$/i.test(value(flag)!)) fail(`"${name}": "${flag}" must be yes or no.`);
      if (/^yes$/i.test(value(flag)!)) property[flag] = true;
    }
    if (value('default')) property.default = value('default');
    const values = attributes.get('values')?.values;
    if (values?.length) property.values = values.map((v) => v.text);
    const details = attributes.get('details')?.values;
    if (details?.length) property.details = details.map((d) => specOf(`${name} › ${d.text.replace(/:$/, '').trim()}`, readElement(d.text, d.children).properties));
    if (property.details) for (const d of property.details) d.name = d.name.split(' › ').pop()!;
    if (property.default !== undefined && property.values && !property.values.includes(property.default)) fail(`"${name}": the default "${property.default}" is not one of its values.`);
    return property;
  };
  const properties = elementsOf(map).map(({ name, properties: attributes }) => specOf(name, attributes));
  if (!properties.length) fail('it has no property (a "##" heading per known property).');
  const lines = map.sections.find((section) => section.name.toLowerCase() === 'context')?.lines ?? [];
  const first = lines.findIndex((l) => l.trim());
  const end = lines.findIndex((l, k) => k > first && (!l.trim() || /^\s*[-*+]\s/.test(l)));
  const context = first < 0 ? undefined : lines.slice(first, end < 0 ? undefined : end).join(' ').trim();
  return { type, shape: map.meta.shape as Shape, element: map.meta.element, context, properties };
}

/** The plural of an English noun, as the element of a type ("dependency" → "dependencies"); no dictionary. */
export function pluralOf(noun: string) {
  if (/[^aeiou]y$/i.test(noun)) return `${noun.slice(0, -1)}ies`;
  return /(s|x|ch|sh)$/i.test(noun) ? `${noun}es` : `${noun}s`;
}

/** The header comment of a map, written by the check right after its front matter, from the definition of its type
 *  alone: what the type is for, how to read its shape and its values. For an AI that reads the map without the skill. */
export function headerOf(definition: Definition) {
  const element = definition.element ?? 'element';
  const a = /^[aeiou]/i.test(element) ? 'an' : 'a';
  const each = `Each ## is ${a} ${element}`;
  const except = '(except Context and Open questions)';
  const shape = {
    cards: `${each} ${except}; their order carries no meaning.`,
    sequence: `${each} ${except}, in order; all ${pluralOf(element)} share the same properties.`,
    graph: `${each} ${except}; "- label → [[#${element[0].toUpperCase()}${element.slice(1)}]]" is an arrow to another ${element}, with an optional label; "→ undefined" means the other ${element} is unknown.`,
    tree: `${each} of the first level ${except}, in order; under ${a} ${element}, an item "- Label: value" is a property, and any other item is ${a} ${element} under it, in order.`,
  }[definition.shape];
  const values = definition.properties.flatMap((p) => {
    const name = p.name === '*' ? 'Each other property' : p.name;
    if (p.kind === 'number' && p.min !== undefined && p.max !== undefined) return [`${name} goes from ${p.min} to ${p.max}${p.note ? ', with an optional word' : ''}.`];
    if (p.kind === 'enum' && p.values) return [`${name} is one of ${p.values.join(', ')}${p.default ? ` (default: ${p.default})` : ''}.`];
    return p.name === '*' ? [`Each other property is a ${p.kind}.`] : [];
  });
  const what = definition.context ? ` ${definition.context}` : '';
  return `<!-- ${definition.type}:${what} ${[shape, ...values].join(' ')} \`undefined\` means the source did not say. -->`;
}

// ---- Reading a layout ----

/** The layout of a type, from the text of `types/<type>.layout.md`, for the drawing only. Throws with a readable
 *  message. The items before the first `##` are the settings of the main view, drawn in the shape of the type; each
 *  `##` is another view, with its name, shown as a tab. Every view takes the settings of a view (`- Draw:`, `- Shows:`…:
 *  `viewLayout`), then the settings of its shape. Gives the main view with its other `views`. */
function parseLayout(definition: Definition, text: string): Layout {
  const lines = text.replace(/<!--[\s\S]*?-->/g, '').split('\n');
  const parts: { name?: string; lines: string[] }[] = [{ name: undefined, lines: [] }];
  for (const line of lines) {
    const heading = /^##\s+(.*?)\s*$/.exec(line);
    if (heading) parts.push({ name: heading[1], lines: [] });
    else parts.at(-1)!.lines.push(line);
  }
  const [main, ...views] = parts.map((part) => viewLayout(definition, part));
  // The colors of the main view hold for every view (and for the panel); another view adds its own.
  return { ...main, views: views.map((view) => ({ ...view, color: { ...main.color, ...view.color } })) };
}

/** One view: `- Draw: <shape>` the shape it is drawn in (default: the shape of the type; the main view takes it too);
 *  `- Color: <value> = <color>` a value of an enum of the type in one of the colors of the page (COLORS), wherever it
 *  is written, and for the box of an element that has it; `- Shows: <property>` (or one
 *  nested item per property) the properties shown: the rows of a sequence, the fields of a card, the text under the
 *  name in a box of a graph or a tree; `- Where: <property> = <value>` keeps the elements whose enum has this value;
 *  `- Arrows: <property>` (or one nested item per property) draws a graph whose arrows are the links of these
 *  properties, labeled by the text before each link; `- Description: <text>` a sentence above the drawing, that says
 *  what the view is for; `- Meta: <key>, <key>` the keys of the front matter of the map shown above the view, each
 *  with its value (the method and the date of a study); `- Name: <name>` (main view only) the name of its tab, "Map" without it; `- Board: <property>`
 *  (cards) a board, the cards in a column per value of the property: of its enum, in their order, or as written in the map; `- Matrix: yes` (cards) the
 *  cards on a grid by their first two enums. The other items are the settings of its shape. */
function viewLayout(definition: Definition, part: { name?: string; lines: string[] }): Layout {
  const fail: Fail = (message) => {
    throw new Error(`types/${definition.type}.layout.md${part.name ? `, view "${part.name}"` : ''}: ${message}`);
  };
  const specs = new Map(definition.properties.map((p) => [nameKey(p.name), p]));
  const property = (name: string) => specs.get(nameKey(name)) ?? fail(`no property "${name.trim()}" in ${definition.type}.`);
  const namesOf = (setting: Labeled) => (setting.value ? [setting.value] : setting.children.map((c) => c.text)).map((name) => property(name).name);
  const view: Layout = { name: part.name, shape: definition.shape, color: {} };
  const rest: Item[] = [];
  for (const item of readItems(part.lines)) {
    // `undefined` for an item that is not `Label: value`: its label then matches no setting below.
    const setting = readProperty(item) as Labeled;
    const label = setting?.label.toLowerCase();
    if (label === 'draw') {
      view.shape = setting.value.toLowerCase() as Shape; // checked on the next line
      if (!SHAPES.includes(view.shape)) fail(`"${item.text}": Draw is one of ${SHAPES.join(', ')}.`);
    } else if (label === 'shows') view.shows = namesOf(setting);
    else if (label === 'description') view.description = setting.value;
    else if (label === 'meta') view.meta = (setting.value ? setting.value.split(',') : setting.children.map((c) => c.text)).map((key) => key.trim().toLowerCase()).filter(Boolean);
    else if (label === 'name') {
      if (part.name) fail('Name is a setting of the main view: another view is named by its "##".');
      view.name = setting.value;
    }
    else if (label === 'arrows') {
      view.arrows = namesOf(setting);
      const notLink = view.arrows.find((name) => property(name).kind !== 'link');
      if (notLink) fail(`"${item.text}": "${notLink}" is not a link property.`);
    } else if (label === 'board') {
      const spec = property(setting.value);
      // An enum: a column per value, in the order of its values; any other property: a column per value written in
      // the map, in the order they first come (the themes of a study).
      view.board = { key: spec.name.toLowerCase(), values: spec.kind === 'enum' ? spec.values : undefined, default: spec.default };
    } else if (label === 'matrix') {
      if (!/^(yes|no)$/i.test(setting.value)) fail(`"${item.text}": Matrix is yes or no.`);
      view.matrix = /^yes$/i.test(setting.value);
    } else if (label === 'color') {
      // A value of an enum of the type in one of the colors of the page, wherever it is written.
      const m = /^(.+?)\s*=\s*(\S+)$/.exec(setting.value);
      if (!m) fail(`"${item.text}": write "- Color: <value> = <color>".`);
      if (!COLORS.includes(m[2].toLowerCase())) fail(`"${item.text}": the color is one of ${COLORS.join(', ')}.`);
      if (!definition.properties.some((p) => p.kind === 'enum' && p.values?.some((v) => v.toLowerCase() === m[1].toLowerCase()))) fail(`"${m[1]}" is not a value of an enum of ${definition.type}.`);
      (view.color ??= {})[m[1].toLowerCase()] = m[2].toLowerCase();
    } else if (label === 'where') {
      const m = /^(.+?)\s*=\s*(.+)$/.exec(setting.value);
      if (!m) fail(`"${item.text}": write "- Where: <property> = <value>".`);
      const spec = property(m[1]);
      const values = (spec.values ?? []).map((v) => v.toLowerCase());
      if (spec.kind !== 'enum' || !values.includes(m[2].toLowerCase())) fail(`"${item.text}": "${m[2]}" is not a value of the enum "${spec.name}".`);
      view.where = { key: spec.name.toLowerCase(), value: m[2].toLowerCase(), isDefault: spec.default?.toLowerCase() === m[2].toLowerCase() };
    } else rest.push(item);
  }
  return { ...view, ...shapeLayout(definition, view.shape, rest, fail) };
}

/** The settings of a shape, from the items of a view that are not view settings. */
function shapeLayout(definition: Definition, shape: Shape, items: Item[], fail: Fail): Partial<Layout> {
  if (shape === 'graph') return graphLayout(definition, items, fail);
  if (shape === 'sequence') return sequenceLayout(definition, items, fail);
  if (shape === 'tree') {
    // `- Stack: yes` lists the elements under the first level one under the other, indented, as a file tree;
    // `- Root: yes` draws the map itself above the first level (its title and its description), joined to it;
    // `- Lanes: <property>` draws a board, the first level as a header, the second as columns, the elements under them
    // as cards in a lane per value of the property (a story map).
    const settings: { stack: boolean; root: boolean; lanes?: string } = { stack: false, root: false };
    for (const item of items) {
      const setting = readProperty(item) as Labeled; // as in viewLayout
      const label = setting?.label.toLowerCase();
      if (label === 'lanes') {
        const spec = definition.properties.find((p) => nameKey(p.name) === nameKey(setting.value));
        if (!spec) fail(`"${item.text}": no property "${setting.value}" in ${definition.type}.`);
        settings.lanes = spec.name;
        continue;
      }
      if (!(label in settings)) fail(`"${item.text}" is not a setting of a tree (it knows "Draw", "Name", "Description", "Meta", "Shows", "Where", "Arrows", "Color", "Board", "Matrix", "Stack", "Root" and "Lanes").`);
      if (!['yes', 'no'].includes(setting.value.toLowerCase())) fail(`"${item.text}": ${setting.label} is yes or no.`);
      settings[label as 'stack' | 'root'] = setting.value.toLowerCase() === 'yes';
    }
    return settings;
  }
  return cardsLayout(definition, items, fail);
}

/** The poster of a card: each item is a row of property names separated by `|`: a row with fewer names gives each
 *  more width, and a name written in the same place on rows that follow each other spans them; gives the cells of a
 *  grid of `columns` columns. No item, no poster. */
function cardsLayout(definition: Definition, items: Item[], fail: Fail): Partial<Layout> {
  if (!items.length) return {};
  const names = new Map(definition.properties.map((p) => [nameKey(p.name), p.name]));
  const rows = items.map((item) =>
    item.text.split('|').map((cell) => names.get(nameKey(cell)) ?? fail(`no property "${cell.trim()}" in ${definition.type}.`)),
  );
  // The columns shared by all rows: the least common multiple of their lengths.
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const columns = rows.reduce((m, row) => (m * row.length) / gcd(m, row.length), 1);
  const cells = rows.map((row) => row.flatMap((name) => Array<string>(columns / row.length).fill(name)));
  for (const name of new Set(cells.flat())) {
    const at = cells.flatMap((row, y) => row.flatMap((n, x) => (n === name ? [[y, x]] : [])));
    const span = (k: number) => Math.max(...at.map((p) => p[k])) - Math.min(...at.map((p) => p[k])) + 1;
    if (span(0) * span(1) !== at.length) fail(`"${name}" must fill a rectangle: write it in the same place on rows that follow each other.`);
  }
  return { columns, cells };
}

/** The layout of a sequence, drawn as a grid: `- Elements: rows` draws one element per row and the properties as
 *  columns (default: `columns`, one element per column). With one element per column: `- Boxes: <property>` (or one
 *  nested item per property) draws the values of these rows as cards, the rows as lanes; `- Background: <property>`
 *  (or `= <color>`, default gray) gives each value of a row a light background, to tell it apart (the pain points in
 *  red); `- Line: <property> = <name>` draws a line with this name above a row
 *  (the lines of a service blueprint). */
function sequenceLayout(definition: Definition, items: Item[], fail: Fail): Partial<Layout> {
  let elements = 'columns';
  const boxes: string[] = [];
  const line: Record<string, string> = {};
  const background: Record<string, string> = {};
  let lifelines: Layout['lifelines'];
  let dots: string | undefined;
  const names = new Map(definition.properties.map((p) => [nameKey(p.name), p.name]));
  const property = (name: string, item: Item) => names.get(nameKey(name)) ?? fail(`"${item.text}": no property "${name.trim()}" in ${definition.type}.`);
  const pair = (setting: Labeled, item: Item, what: string) => {
    const m = /^(.+?)\s*=\s*(.+)$/.exec(setting.value);
    if (!m) fail(`"${item.text}": write "- ${setting.label}: <property> = <${what}>".`);
    return [nameKey(property(m[1], item)), m[2].trim()];
  };
  for (const item of items) {
    const setting = readProperty(item) as Labeled; // as in viewLayout
    const label = setting?.label.toLowerCase();
    if (label === 'elements') {
      elements = setting.value.toLowerCase();
      if (!['rows', 'columns'].includes(elements)) fail(`"${item.text}": Elements is rows or columns.`);
    } else if (label === 'boxes') {
      for (const name of setting.value ? [setting.value] : setting.children.map((c) => c.text.trim())) boxes.push(nameKey(property(name, item)));
    } else if (label === 'background') {
      const [name, color = 'gray'] = setting.value.split('=').map((s) => s.trim());
      if (!COLORS.includes(color.toLowerCase())) fail(`"${item.text}": the color is one of ${COLORS.join(', ')}.`);
      background[nameKey(property(name, item))] = color.toLowerCase();
    } else if (label === 'line') {
      const [key, value] = pair(setting, item, 'name');
      line[key] = value;
    } else if (label === 'lifelines') {
      const m = /^(.+?)\s*(?:→|->)\s*(.+)$/.exec(setting.value);
      if (!m) fail(`"${item.text}": write "- Lifelines: <property> → <property>".`);
      lifelines = { from: property(m[1], item).toLowerCase(), to: property(m[2], item).toLowerCase() }; // the keys of the properties of an element
    } else if (label === 'dots') {
      dots = nameKey(property(setting.value, item));
    } else fail(`"${item.text}" is not a setting of a sequence (it knows "Draw", "Shows", "Where", "Arrows", "Color", "Elements", "Boxes", "Background", "Line", "Lifelines", "Dots").`);
  }
  if (dots && elements !== 'rows') fail('"Dots" needs "- Elements: rows".');
  return { elements, boxes, background, line, lifelines, dots };
}

/** The colors a layout can give to a value: the tints of the page, light and dark. */
const COLORS = ['blue', 'amber', 'green', 'purple', 'red', 'gray', 'white'];

/** The layout of a graph: `- Diamond: <value>` (or one nested item per value) draws the elements of these values of
 *  the kind (the first single enum property) as diamonds, `- Thick: <value>` with a thick border (their color is a
 *  setting of every view, `- Color:`); `- Ends: yes` draws the starts (no arrow in) and the ends
 *  (no arrow out), for a type whose arrows are a path; `- Ends: start` the starts only, the elements with no arrow out
 *  drawn as final (a state machine); `- Lines: elbow` draws the arrows with right angles (default:
 *  curved); `- Direction: right` lays the graph out from left to right (default: down); the graph is placed by ELK
 *  (`elkPlace` in draw.ts); `- Returns: link` draws an arrow
 *  back to an earlier element as a link to it, beside the element it leaves (default: arrow); `- Heads: none` draws lines,
 *  not arrows, for a graph of relationships: a link and the link back between two elements are one line, each label at
 *  the end it reaches (default: arrow); `- Dashed: <word>` draws dashed an arrow whose label is this word or starts with it
 *  (`optional`: a step the person may skip); `- Labels: none` draws no label on the arrows, for a graph whose labels
 *  would take more room than its elements: the panel shows them (default: always). */
function graphLayout(definition: Definition, items: Item[], fail: Fail): Partial<Layout> {
  const kind = kindSpecOf(definition);
  const known = (kind?.values ?? []).map((v) => v.toLowerCase());
  const diamond: string[] = [];
  const cylinder: string[] = [];
  const person: string[] = [];
  const frame: string[] = [];
  const thick: string[] = [];
  let ends: false | 'yes' | 'start' = false;
  let lines = 'curved';
  let direction = 'down';
  let returns = 'arrow';
  let heads = 'arrow';
  let labels = 'always';
  const dashed: string[] = [];
  const choice = (setting: Labeled, item: Item, values: string[]) => {
    const value = setting.value.toLowerCase();
    if (!values.includes(value)) fail(`"${item.text}": ${setting.label} is ${values.join(' or ')}.`);
    return value;
  };
  for (const item of items) {
    const setting = readProperty(item) as Labeled; // as in viewLayout
    const label = setting?.label.toLowerCase();
    if (label === 'ends') {
      const value = setting.value.toLowerCase();
      if (!['yes', 'start', 'no'].includes(value)) fail(`"${item.text}": Ends is yes, start or no.`);
      ends = value === 'yes' || value === 'start' ? value : false;
      continue;
    }
    if (label === 'lines') {
      lines = choice(setting, item, ['curved', 'elbow']);
      continue;
    }
    if (label === 'returns') {
      returns = choice(setting, item, ['arrow', 'link']);
      continue;
    }
    if (label === 'heads') {
      heads = choice(setting, item, ['arrow', 'none', 'cardinality']);
      continue;
    }
    if (label === 'labels') {
      labels = choice(setting, item, ['always', 'none']);
      continue;
    }
    if (label === 'direction') {
      direction = choice(setting, item, ['down', 'right']);
      continue;
    }
    if (label === 'dashed') {
      dashed.push(...(setting.value ? setting.value.split(/\s*,\s*/) : setting.children.map((c) => c.text.trim())).map((w) => w.toLowerCase()));
      continue;
    }
    const isValue = (value: string) => known.includes(value.toLowerCase()) || fail(`"${value}" is not a value of ${kind ? `"${kind.name}"` : 'a single enum property'} in ${definition.type}.`);
    const lists: Record<string, string[]> = { diamond, cylinder, person, frame, thick };
    if (!lists[label]) fail(`"${item.text}" is not a setting of a graph layout (it knows "Draw", "Shows", "Where", "Arrows", "Color", "Diamond", "Cylinder", "Person", "Frame", "Thick", "Ends", "Lines", "Direction", "Returns", "Heads", "Labels" and "Dashed").`);
    for (const value of setting.value ? setting.value.split(/\s*,\s*/) : setting.children.map((c) => c.text.trim())) {
      isValue(value);
      lists[label].push(value);
    }
  }
  return { diamond, cylinder, person, frame, thick, ends, lines, direction, returns, heads, labels, dashed };
}
