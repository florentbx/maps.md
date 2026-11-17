// Drawing a map as HTML: plain functions with no file system, shared by the page (maps.html) and the test.
// Draws by shape: `cards`, `sequence` (as a grid), `graph` and `tree`.
// Source: the grid and graph drawings of a first implementation of maps.md, rewritten for the
// current format; the cards and the tree are new (as `FORMAT.md` describes the shapes; the tree reuses the boxes of the graph, placed in the order of the file).

import ELK from 'elkjs/lib/elk.bundled.js';
import { anchorOf, escapeHtml, typeset } from './links.ts';
import type { Arrow, Cardinality, Definition, IndexedLink, Item, Labeled, Layout, MapDoc, MapElement, PageLinks, Property, PropertySpec, Resolved, ScaleValue, Shape, Src } from './model.ts';
import { cardinalityOf, decided, definitionFor, elementsOf, kindSpecOf, nameKey, pluralOf, readArrow, readItems, readNumber, readProperty } from './read.ts';

const elk = new ELK();

// ---- The types of the drawing (those of a map, a definition and the links are in model.ts) ----

/** Turns the text of a value into HTML: escaped, or with its links (`linkify`, `links` of the page). */
type ToHtml = (text: string) => string;

/** A property as a row of a grid or a field of a card: its label, its key, and its spec when the type knows it. */
interface Row {
  spec?: PropertySpec;
  label: string;
  key: string;
}

/** The bounds of a scale: a number property with a `Min` and a `Max`. */
interface Scale {
  min: number;
  max: number;
}

/** A row whose property is an enum with its values: an axis of a matrix. */
type EnumRow = Row & { spec: PropertySpec & { values: string[] } };

interface Point {
  x: number;
  y: number;
}

/** A rectangle by its top left corner: something a label must not cover. */
interface Area {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The lines and the estimated size of a box: its name, the text a view shows under it (`details`), and the room
 *  above its text (`offset`: the top of a cylinder, the head of a person). */
interface Box {
  lines: string[];
  details: Detail[];
  offset?: number;
  width: number;
  height: number;
}

/** The head of a line: an arrow, or a cardinality. */
type Head = 'arrow' | Cardinality;

/** A node of a graph: an element of the map, or what stands for the target of an arrow that is not one (`missing`,
 *  `unknown`, `external`), or a start or an end (`dot`). `renderGraph` gives every node its `id`, its `kind`, its
 *  `shape` and its `box` before the placement; the room of its loops after. */
interface GraphNode {
  final?: boolean; // a step with no arrow out, with `- Ends: start`
  name: string;
  src?: Src;
  properties: Map<string, Property>;
  arrows: Arrow[];
  children?: MapElement[];
  id: string;
  kind?: string;
  shape: string;
  box: Box;
  problem?: string;
  missing?: boolean;
  unknown?: boolean;
  unknownOf?: string; // an unknown next step: the element its arrow comes from
  external?: boolean;
  dot?: boolean;
  end?: boolean;
  href?: string;
  loopRoom?: number;
  loopHeight?: number;
  loopSide?: 'left' | 'right';
}

/** A node as it is made, before it has its id, its shape and its box. */
type NewNode = Omit<GraphNode, 'id' | 'shape' | 'box'>;

/** An arrow of a graph, between two nodes. `pair` and `back`: one line for a link and the link back, with the label
 *  of the link back; `card`: the cardinality that ended its label; `returnTo` and `id`: a return drawn as a link. */
interface GraphEdge {
  from: GraphNode;
  to: GraphNode;
  label?: string;
  pair?: boolean;
  back?: string;
  card?: Cardinality;
  dashed?: boolean;
  returnTo?: GraphNode;
  id?: string;
}

/** What ELK gives back for a graph, as this file reads it: every place and every size set (the types of elkjs leave
 *  them all optional). */
interface Placed {
  width: number;
  height: number;
  children: (Point & { id: string; width: number; height: number })[];
  edges: { sections: { startPoint: Point; bendPoints?: Point[]; endPoint: Point }[]; labels?: (Point & { width: number; height: number })[] }[];
}

/** A node of a tree: an element with its level, its box, its children as nodes (`kids`), the width it takes with them
 *  (`span`) and its place. `renderTree` sets its box and its place after it is made. */
interface TreeNode extends MapElement {
  depth: number;
  top: boolean;
  shape: string;
  box: Box;
  kids: TreeNode[];
  span: number;
  kidsWidth: number;
  left: number;
  y: number;
}

/** A drawing of a shape: the definition with the layout of the view, the elements to draw, and what a shape may need
 *  besides: the links, the map (the title of a tree). */
type Draw = (definition: Definition, elements: MapElement[], of: { map: MapDoc; links: PageLinks }) => string | Promise<string>;

/** The `data-view-name` of the view drawn, as drawMap writes it: the name of its layout, `map` for a main view without one. */
const viewOf = (definition: Definition) => nameKey(definition.layout?.name ?? 'Map');


// ---- Drawing ----

/** Where a name or a value is written in the file, for the page to show it in the Markdown on a click: ` data-src="line:col"`. */
const srcOf = (src?: Src) => (src ? ` data-src="${src.line}:${src.col}"` : '');

/** A hook for a style: a short value as a key (`data-value="phone"`), so that a style can reach it (an icon per
 *  touchpoint); a long value has none. */
export const valueOf = (text?: string) => (text && text.length <= 48 ? ` data-value="${escapeHtml(nameKey(plain(text)))}"` : '');

/** A hook for a style: a property as a key (`data-prop="pain-points"`), on the map and in the panel. */
export const propOf = (label: string) => ` data-prop="${escapeHtml(nameKey(label))}"`;

/** The colors a layout gives to the values of the enums of the type (`- Color: <value> = <color>`): a value that has one
 *  is a chip in this color wherever it is written (a cell of a grid, a field of a card, the head of a column of a
 *  board, the panel), and the box of an element that has it, in a graph or a tree, takes it. */
type Colors = Record<string, string>;
const colorOf = (colors: Colors | undefined, text?: string) => (text ? colors?.[plain(text).trim().toLowerCase()] : undefined);
/** A value of an enum is a chip (`colors` given, from `colorsFor`): in the color its layout gives it, else gray; `none` stays
 *  a word. Elsewhere (`colors` not given), a value is a chip only when the layout gives it a color. */
export const chipOf = (colors: Colors | undefined, text?: string, isEnum = false) => {
  const color = colorOf(colors, text) ?? (isEnum && text && plain(text).trim().toLowerCase() !== 'none' ? 'gray' : undefined);
  return color ? `chip node--${color}` : '';
};
/** The colors for the values of a property: those of the layout when it is an enum, none otherwise (a text is not tinted
 *  because it reads as a value of an enum). */
const colorsFor = (definition: Definition, spec?: PropertySpec) => (spec?.kind === 'enum' ? (definition.layout?.color ?? {}) : undefined);
/** The color of the box of an element, in a graph or a tree: the one of the first of its single enums whose value has one. */
function boxColor(definition: Definition, properties?: Map<string, Property>) {
  for (const spec of definition.properties) {
    const p = spec.kind === 'enum' && spec.single ? properties?.get(spec.name.toLowerCase()) : undefined;
    const color = colorOf(definition.layout?.color, p?.isUndefined ? undefined : (p?.raw ?? spec.default));
    if (color) return color;
  }
}
/** The classes of a box that takes a color of its layout: `node--<color>`, and `node--tinted`, so that this color, which
 *  says something (a status, a risk), wins over the style of the type. */
function boxClasses(definition: Definition, properties?: Map<string, Property>) {
  const color = boxColor(definition, properties);
  return color ? `node--${color} node--tinted` : '';
}

/** The keys of a legend for the colors of the layout whose values are not those of `kind` (which has its own keys):
 *  a box may take the color of another enum (the status of a key result). */
function colorKeys(definition: Definition, kind?: PropertySpec) {
  const known = new Set((kind?.values ?? []).map((v) => v.toLowerCase()));
  const values = definition.properties.flatMap((spec) => (spec.kind === 'enum' && spec.single && spec !== kind ? (spec.values ?? []) : []));
  return values.filter((v) => !known.has(v.toLowerCase()) && colorOf(definition.layout?.color, v)).map((v) => `<span class="key node--${colorOf(definition.layout?.color, v)}"${valueOf(v)}></span> ${escapeHtml(v)}`);
}

/** Nested values as a list; `text` turns a value into HTML (with its links, on a page drawn with the folder). A detail
 *  (an item under a value) written `Label: value` has the hook of its name too, as in the panel: `data-prop="owner"`,
 *  and its name in a span (`.detail-label`), that a style can hide. */
function list(values: Item[], text: ToHtml = escapeHtml, nested = false, colors?: Colors): string {
  if (!values.length) return '';
  const li = (v: Item) => {
    const detail = (nested && readProperty(v)) as Labeled | undefined; // `false` when not nested: none
    const prop = detail ? propOf(detail.label) : '';
    const value = detail?.value?.toLowerCase() === 'undefined' ? `<span class="undefined" title="undefined: the source did not say">not said</span>` : detail?.value && text(detail.value); // as a property not said
    // A value written `situation → result` (the example of a rule, an action and where it leads): its two sides as hooks
    // for the style of a type, the arrow kept.
    const arrow = !value && /^(.+?)\s+→\s+(.+)$/.exec(v.text);
    const body = value
      ? `<span class="detail-label">${escapeHtml(detail!.label)}: </span>${value}`
      : arrow
        ? `<span class="value-from">${text(arrow[1])}</span><span class="value-arrow"> → </span><span class="value-to">${text(arrow[2])}</span>`
        : text(v.text);
    const chip = chipOf(colors, v.text, !!colors && !nested);
    return `<li${srcOf(v.src)}${prop}${valueOf(v.text)}${chip && ` class="${chip}"`}>${body}${v.children.length ? list(v.children, text, true) : ''}</li>`;
  };
  return `<ul>${values.map(li).join('')}</ul>`;
}

/** The level of an element of a tree drawn in another shape (a row, a card): a hook for a style (`data-depth`, `1` the
 *  first level), and the level itself for the page, which indents a row by it (`--depth`). */
const depthOf = (el: MapElement) => (el.depth ? ` data-depth="${el.depth}" style="--depth: ${el.depth}"` : '');

/** The values of a property; `undefined` is shown as "not said", so that it does not look like a missing row. */
const notSaid = (property: Property) => `<span class="undefined"${srcOf(property.src)} title="undefined: the source did not say">not said</span>`;
function valuesOf(property: Property | undefined, text?: ToHtml, colors?: Colors) {
  return property?.isUndefined ? notSaid(property) : list(property?.values ?? [], text, false, colors);
}

/** A number with an optional word after the first comma: `-1, worried`. */
function readScale(property?: Property): ScaleValue | undefined {
  return readNumber(property?.raw ?? '') ?? undefined;
}

/** A row drawn as a scale: a number with its bounds. */
const isScale = (row: Row): row is Row & { spec: PropertySpec & Scale } => row.spec?.kind === 'number' && row.spec.min !== undefined && row.spec.max !== undefined;
type ScaleRow = Row & { spec: PropertySpec & Scale };

/** Height of a value in a cell (0 at the top, 100 at the bottom). Values out of the bounds are drawn on the bound. */
function scaleY(v: number, { min, max }: Scale) {
  const clamped = Math.min(max, Math.max(min, v));
  const ratio = max === min ? 0.5 : (max - clamped) / (max - min);
  return Math.round((15 + ratio * 70) * 10) / 10;
}
const polarity = (v: number, { min, max }: Scale) => (v > (min + max) / 2 ? 'positive' : v < (min + max) / 2 ? 'negative' : 'neutral');

/** One cell of a curve: it draws from the middle of its left edge to its point, and from its point to the middle of
 *  its right edge, so that cells of any width join into one line. Rounded: between two points, a cubic curve level at
 *  both of them, cut in two halves at the edge of the cells, so that it still goes through every value. */
function curveCell(spec: Scale, previous: number | undefined, current: number | undefined, next: number | undefined) {
  let content = `<path class="curve-base" d="M0 50 L100 50" vector-effect="non-scaling-stroke"/>`;
  if (current !== undefined) {
    const y = scaleY(current, spec);
    const segments: string[] = [];
    if (previous !== undefined) {
      const p = scaleY(previous, spec);
      segments.push(`M0 ${r((p + y) / 2)} C12.5 ${r((p + 3 * y) / 4)} 25 ${y} 50 ${y}`);
    }
    if (next !== undefined) {
      const n = scaleY(next, spec);
      segments.push(`M50 ${y} C75 ${y} 87.5 ${r((3 * y + n) / 4)} 100 ${r((y + n) / 2)}`);
    }
    if (segments.length) content += `<path class="curve-line" d="${segments.join(' ')}" vector-effect="non-scaling-stroke"/>`;
    content += `<path class="curve-point curve-point--${polarity(current, spec)}" d="M50 ${y} L50 ${y}" vector-effect="non-scaling-stroke"/>`;
  }
  return `<svg class="curve" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${content}</svg>`;
}

/** The label under a point. A value that is not a number, or is out of the bounds, is shown as written and marked. */
function scaleLabel(property: Property | undefined, scale: ScaleValue | undefined, spec: Scale) {
  if (!property) return '';
  if (property.isUndefined) return `<div class="curve-value">${notSaid(property)}</div>`;
  if (property.raw?.trim().toLowerCase() === 'none') return `<div class="curve-value"${srcOf(property.src)} data-value="none">none</div>`; // the source says there is none
  if (!scale) {
    const written = property.raw ? escapeHtml(property.raw) : list(property.values);
    return written ? `<div class="curve-value invalid"${srcOf(property.src)} title="Not a number from ${spec.min} to ${spec.max}">${written}</div>` : '';
  }
  const out = scale.value < spec.min || scale.value > spec.max;
  const title = out ? ` title="Out of the scale, from ${spec.min} to ${spec.max}"` : '';
  return `<div class="curve-value${out ? ' invalid' : ''}"${srcOf(property.src)}${title} data-value="${escapeHtml(scale.raw)}"><b>${escapeHtml(scale.raw.replace(/^-/, '−'))}</b>${scale.word ? ` ${escapeHtml(scale.word)}` : ''}</div>`;
}

/** The arrows of a sequence: a value `text → [[#Element#Value]]` is an arrow from this value to another value of the
 *  map. Each value is known by its key, `element--value`; arrows.ts draws the arrows once the grid is laid out. */
const valueKey = (element: string, text: string) => `${nameKey(element)}--${nameKey(text)}`;
function sequenceArrows(elements: MapElement[]) {
  const arrows = new Map<Item, { label: string; to: string }>();
  for (const el of elements)
    for (const p of el.properties.values())
      for (const v of p.values ?? []) {
        const arrow = readArrow(v.text);
        const path = arrow && !arrow.file ? arrow.target.split('#') : [];
        if (path.length > 1) arrows.set(v, { label: arrow!.label, to: valueKey(path[0], path.at(-1)!) });
      }
  return { arrows, targets: new Set([...arrows.values()].map((a) => a.to)) };
}

/** The values of a cell of a sequence with arrows or boxes: each value with its key, a value with an arrow by its text
 *  and the key it points to; the values of a row of boxes are boxes, and elsewhere those an arrow leaves or reaches. */
function cellWithArrows(el: MapElement, property: Property | undefined, text: ToHtml, { arrows, targets }: ReturnType<typeof sequenceArrows>, boxed = false, colors?: Colors) {
  if ((!arrows.size && !boxed) || property?.isUndefined || !property?.values?.length) return valuesOf(property, text, colors);
  const li = (v: Item) => {
    const arrow = arrows.get(v);
    const label = arrow ? arrow.label : v.text;
    const key = valueKey(el.name, label);
    const classes = [boxed ? 'box' : (arrow || targets.has(key)) && 'step', chipOf(colors, label, !!colors)].filter(Boolean).join(' ');
    const step = classes && ` class="${classes}"`;
    return `<li${srcOf(v.src)}${valueOf(label)} data-v="${key}"${arrow ? ` data-to="${arrow.to}"` : ''}${step}>${text(label)}${v.children.length ? list(v.children, text) : ''}</li>`;
  };
  return `<ul>${property.values.map(li).join('')}</ul>`;
}

function renderGrid(definition: Definition, elements: MapElement[], { links }: { links: PageLinks }) {
  if (definition.layout?.lifelines) return renderLifelines(elements, definition);
  const arrows = sequenceArrows(elements);
  const withArrows = arrows.arrows.size ? ' grid--arrows' : '';
  const rows = rowsOf(elements, definition);
  const present = rows.filter((r) => elements.some((el) => el.properties.has(r.key)));
  if (definition.layout?.elements === 'rows') {
    // One element per row, the properties as columns; a scale is written, not drawn as a curve.
    const filters = present.map((row) => columnFilter(elements, row));
    // `- Dots: <property>`: a column per value of the property, in a natural order (P2 before P10), a dot where an
    // element has it, then their total (the participants of a study, as a rainbow spreadsheet).
    const isDots = (row: Row) => !!definition.layout?.dots && nameKey(row.label) === definition.layout.dots;
    const valuesIn = (p: Property | undefined) => (p?.isUndefined ? [] : (p?.values ?? []).map((v) => v.text.trim()));
    const dots = [...new Set(elements.flatMap((el) => valuesIn(el.properties.get(present.find(isDots)?.key ?? ''))))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const headOf = (row: Row, i: number) =>
      isDots(row)
        ? `${dots.map((v) => `<th scope="col" class="dot-column"${propOf(row.label)}${valueOf(v)}>${escapeHtml(v)}</th>`).join('')}<th scope="col" class="dot-total"${propOf(row.label)}>Total</th>`
        : `<th scope="col"${propOf(row.label)}${row.spec ? '' : ' class="added"'}>${escapeHtml(row.label)}${filters[i]}</th>`;
    const head = `<tr><th class="corner"></th>${present.map(headOf).join('')}</tr>`;
    const body = elements
      .map((el) => {
        const cells = present
          .map((row) => {
            const p = el.properties.get(row.key);
            const prop = `${propOf(row.label)}`;
            if (isDots(row)) {
              const has = new Set(valuesIn(p));
              const cells = dots.map((v) => `<td class="dot-cell"${prop}${valueOf(v)}>${has.has(v) ? `<span class="dot" title="${escapeHtml(v)}"></span>` : ''}</td>`).join('');
              // How many of all the values the element has: how many participants showed it, out of the whole study.
              return `${cells}<td class="dot-total"${prop}>${has.size}/${dots.length}</td>`;
            }
            return isScale(row) ? `<td class="scale"${prop}>${scaleLabel(p, readScale(p), row.spec)}</td>` : `<td${prop}>${cellWithArrows(el, p, links.linkify, arrows, false, colorsFor(definition, row.spec))}</td>`;
          })
          .join('');
        return `<tr${depthOf(el)}><th scope="row" id="${anchorOf(el.name)}" data-el="${anchorOf(el.name)}"${srcOf(el.src)}>${escapeHtml(el.name)}</th>${cells}</tr>`;
      })
      .join('');
    // The filters, in the headers of the columns; in a table, they hide the rows.
    const status = filters.some(Boolean) ? `<div class="filters filters--table">${filtersStatus}</div>` : '';
    return `${status}<div class="grid grid--rows${withArrows}"><table><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
  }

  const lanes = definition.layout?.boxes ?? [];
  const board = lanes.length ? ' grid--boxes' : '';
  const head = `<tr><th class="corner"></th>${elements.map((el) => `<th scope="col" id="${anchorOf(el.name)}" data-el="${anchorOf(el.name)}"${srcOf(el.src)}>${escapeHtml(el.name)}</th>`).join('')}</tr>`;
  const body = present
    .map((row) => {
      const scales = isScale(row) ? elements.map((el) => readScale(el.properties.get(row.key))) : [];
      const cells = elements
        .map((el, k) => {
          const p = el.properties.get(row.key);
          if (!isScale(row)) return `<td>${cellWithArrows(el, p, links.linkify, arrows, lanes.includes(nameKey(row.label)), colorsFor(definition, row.spec))}</td>`;
          const curve = curveCell(row.spec, scales[k - 1]?.value, scales[k]?.value, scales[k + 1]?.value);
          return `<td class="scale">${curve}${scaleLabel(p, scales[k], row.spec)}</td>`;
        })
        .join('');
      const key = nameKey(row.label);
      const line = definition.layout?.line?.[key];
      const tint = definition.layout?.background?.[key];
      const classes = [!row.spec && 'added', lanes.includes(key) && 'boxes-row', line && 'has-line', tint && `has-background node--${tint}`].filter(Boolean).join(' ');
      const lineName = line ? `<span class="line-name">${escapeHtml(line)}</span>` : '';
      return `<tr${classes ? ` class="${classes}"` : ''}${propOf(row.label)}><th scope="row">${lineName}${escapeHtml(row.label)}</th>${cells}</tr>`;
    })
    .join('');
  return `<div class="grid${withArrows}${board}"><table><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
}

/** The labels of the properties, known ones in the order of the definition, then the labels added by people. */
function rowsOf(elements: MapElement[], definition: Definition): Row[] {
  // A view that says which properties it shows shows those, in its order.
  const shows = definition.layout?.shows;
  if (shows) return shows.map((name) => ({ spec: definition.properties.find((p) => p.name === name), label: name, key: name.toLowerCase() }));
  // `## *` in a definition: any other property the map writes, with its kind (the people of a RACI), in the order the
  // map first writes them; without it, such a property is shown as added.
  const any = definition.properties.find((p) => p.name === '*');
  const rows: Row[] = definition.properties.filter((spec) => spec !== any).map((spec) => ({ spec, label: spec.name, key: spec.name.toLowerCase() }));
  for (const element of elements) {
    for (const [key, p] of element.properties) {
      if (!rows.some((r) => r.key === key)) rows.push({ spec: any, label: p.label, key });
    }
  }
  return rows;
}

// ---- Drawing cards ----

/** One card per element, in the order of the file (which carries no meaning); each card lists its properties. With a
 *  layout (`types/<type>.layout.md`), each card is a poster: its properties placed as the layout says, every one shown,
 *  even empty, and those the layout does not place listed above it. */
function renderCards(definition: Definition, shown: MapElement[], { links }: { links: PageLinks }) {
  const elements = shown;
  const rows = rowsOf(elements, definition);
  const { layout } = definition;
  const placed = new Set(layout?.cells?.flat().map((name) => name.toLowerCase()));
  const area = (row: Row) => `p${rows.indexOf(row)}`;
  const value = (el: MapElement, row: Row) => {
    const p = el.properties.get(row.key);
    return isScale(row) ? scaleLabel(p, readScale(p), row.spec) : valuesOf(p, links.linkify, colorsFor(definition, row.spec));
  };
  // One value alone is written as text, not as a list of one.
  const single = (el: MapElement, row: Row) => (el.properties.get(row.key)?.values.length ?? 0) <= 1;
  // `skip`: the properties the drawing already says (the axes of a matrix).
  const card = (el: MapElement, skip = new Set<string | undefined>(), before = '') => {
    const props = rows
      .filter((row) => el.properties.has(row.key) && !placed.has(row.key) && !skip.has(row.key))
      .map((row) => `<dt${propOf(row.label)}${row.spec ? '' : ' class="added"'}>${escapeHtml(row.label)}</dt><dd${propOf(row.label)}${single(el, row) ? ' class="single"' : ''}>${value(el, row)}</dd>`)
      .join('');
    const poster = layout?.cells
      ? `<div class="poster" style="grid-template-columns: repeat(${layout.columns}, 1fr); grid-template-areas: ${layout.cells
          .map((cells) => `'${cells.map((name) => area(rows.find((r) => r.label === name)!)).join(' ')}'`)
          .join(' ')}">${rows
          .filter((row) => placed.has(row.key))
          .map((row) => `<section style="grid-area: ${area(row)}"${propOf(row.label)}><h3>${escapeHtml(row.label)}</h3>${value(el, row)}</section>`)
          .join('')}</div>`
      : '';
    return `<article class="card" id="${anchorOf(el.name)}" data-el="${anchorOf(el.name)}"${depthOf(el)}>${el.parent ? `<p class="card-parent">${escapeHtml(el.parent)}</p>` : ''}${before}<h2${srcOf(el.src)}>${escapeHtml(el.name)}</h2>${props ? `<dl>${props}</dl>` : ''}${poster}</article>`;
  };
  // The filters: the values of the enums the drawing does not already say (the column of a board, the axes of a matrix).
  const said = layout?.matrix ? rows.filter((row) => row.spec?.kind === 'enum' && row.spec.values).slice(0, 2).map((row) => row.key) : [layout?.board?.key];
  const filters = filtersOf(elements, rows, new Set(said));
  if (layout?.matrix) return filters + renderMatrix(elements, rows, card);
  // A board whose property no element writes (business rules without areas) is drawn as plain cards.
  const boardKey = layout?.board?.key;
  const boarded = layout?.board && elements.some((el) => { const p = el.properties.get(boardKey!); return p && !p.isUndefined && p.values.length; });
  if (layout?.board && boarded) {
    // A board: a column per value of the enum, in the order of its values, or, for another property, per value written
    // in the map, in the order they first come; an element with no value goes to the default, or to a last column
    // "Not said". A card does not repeat the value of its column.
    const { key, default: fallback } = layout.board;
    const written = (el: MapElement) => {
      const p = el.properties.get(key);
      return p && !p.isUndefined ? p.values[0]?.text.trim() : undefined;
    };
    const values = layout.board.values ?? [...new Map((elements.map(written).filter(Boolean) as string[]).map((v): [string, string] => [v.toLowerCase(), v])).values()];
    // `none` (the source says there is none) is a column of its own, before "not said".
    const valueOf = (el: MapElement) => values.find((x) => x.toLowerCase() === written(el)?.toLowerCase()) ?? (written(el)?.toLowerCase() === 'none' ? 'none' : (fallback ?? 'not said'));
    const columns = [...values, ...['none', 'not said'].filter((rest) => !values.includes(rest) && elements.some((el) => valueOf(el) === rest))];
    return `${filters}<div class="board-columns">${columns
      .map((value) => {
        const mine = elements.filter((el) => valueOf(el) === value);
        const color = colorOf(layout.color, value);
        return `<section class="board-column${color ? ` tinted node--${color}` : ''}" data-value="${escapeHtml(nameKey(value))}"><h3>${escapeHtml(value)} <span class="board-count">${mine.length}</span></h3><div class="cards">${mine.map((el) => card(el, new Set([key]))).join('')}</div></section>`;
      })
      .join('')}</div>`;
  }
  return `${filters}<div class="cards${layout?.cells ? ' cards--poster' : ''}">${elements.map((el) => card(el)).join('')}</div>`;
}

/** A bar of filters above cards: for each enum, the values the cards have, a button each, when there
 *  are two or more; a button pressed fades the cards without it (viewer.ts); Clear all, once one is pressed. */
/** The values a filter offers for a property: an enum of the type (not one the map names, `## *`: the people of a RACI,
 *  the roles of permissions), with at least two values written, in the order of the enum. */
function filterValues(elements: MapElement[], row: Row) {
  if (row.spec?.kind !== 'enum' || row.spec.name === '*') return [];
  const written = new Map<string, string>();
  for (const el of elements) {
    const p = el.properties.get(row.key);
    for (const v of p && !p.isUndefined ? p.values : []) written.set(nameKey(plain(v.text)), plain(v.text));
  }
  const known = (row.spec.values ?? []).map(nameKey).filter((key) => written.has(key));
  const values = [...new Set([...known, ...written.keys()])];
  return values.length < 2 ? [] : values.map((key) => ({ key, text: written.get(key)! }));
}
const filterButton = (row: Row, v: { key: string; text: string }, cls = 'filter') =>
  `<button class="${cls}" data-filter="${escapeHtml(nameKey(row.label))}" data-value="${escapeHtml(v.key)}" aria-pressed="false">${escapeHtml(v.text)}</button>`;
/** How many rows a filter shows, and Clear all: shown once a filter is on. */
const filtersStatus = `<span class="filters-count" hidden></span><button class="filters-clear" hidden>Clear all</button>`;

function filtersOf(elements: MapElement[], rows: Row[], said: Set<string | undefined>) {
  const groups = rows
    .filter((row) => !said.has(row.key))
    .map((row) => {
      const values = filterValues(elements, row);
      if (!values.length) return '';
      return `<div class="filters-group" role="group" aria-label="${escapeHtml(row.label)}"><span class="filters-label">Filter by ${escapeHtml(row.label.toLowerCase())}</span>${values.map((v) => filterButton(row, v)).join('')}</div>`;
    })
    .join('');
  return groups && `<div class="filters">${groups}${filtersStatus}</div>`;
}

/** The filter of a column of a table, as in Google Sheets: the icon of a filter at the right of its
 *  header (three lines; a funnel once on) opens the list of its values, each pressed or not; the name of the column
 *  still selects it. */
const filterIcons =
  '<svg class="icon column-filter-icon" viewBox="0 0 16 16" aria-hidden="true"><path class="icon-off" d="M2.5 4.5h11M4.5 8h7M6.5 11.5h3"/><path class="icon-on" d="M2.5 3.5h11l-4.25 5v4l-2.5 1.25V8.5z"/></svg>';
function columnFilter(elements: MapElement[], row: Row) {
  const values = filterValues(elements, row);
  if (!values.length) return '';
  return `<button class="column-filter" aria-label="Filter by ${escapeHtml(row.label.toLowerCase())}" aria-expanded="false">${filterIcons}</button><div class="column-filter-menu" role="group" aria-label="${escapeHtml(row.label)}" hidden>${values.map((v) => filterButton(row, v, 'filter filter-option')).join('')}</div>`;
}

/** A matrix (`- Matrix: yes`, a view of cards): the elements on a grid by their first two enums, known ones first, then
 *  those the map writes (`## *`, the axes named by the map): the first across, its values from left to right; the
 *  second up, its values from bottom to top. Each element is a numbered point in its box, its name on hover, and a card
 *  in the key beside the grid, the boxes in the order they are read (top left first): the boxes keep their size however
 *  many elements there are, and the key keeps the names in the PNG. An element without a value on
 *  both is listed in the key, "Not placed". */
function renderMatrix(elements: MapElement[], rows: Row[], card: (el: MapElement, skip?: Set<string | undefined>, before?: string) => string) {
  const [sx, sy] = rows.filter(isScale);
  if (sy) return renderScored(elements, sx, sy, card);
  const [x, y] = rows.filter((row) => row.spec?.kind === 'enum' && row.spec.values) as EnumRow[];
  const axes = new Set([x?.key, y?.key]);
  if (!y) return `<p class="matrix-none">A matrix needs two enums: ${rows.filter((r) => r.spec?.kind === 'enum').length} found.</p><div class="cards">${elements.map((el) => card(el)).join('')}</div>`;
  const valueOf = (el: MapElement, row: EnumRow) => {
    const p = el.properties.get(row.key);
    const v = p && !p.isUndefined ? p.values[0]?.text.trim().toLowerCase() : undefined;
    return row.spec.values.find((value) => value.toLowerCase() === v);
  };
  const ups = [...y.spec.values].reverse();
  let number = 0;
  const key: string[] = [];
  const body = ups
    .map((up, i) => {
      const axis = i === 0 ? `<th class="matrix-axis matrix-axis--y" rowspan="${ups.length}" scope="rowgroup"${propOf(y.label)}><span>${escapeHtml(y.label)}</span></th>` : '';
      const cells = x.spec.values
        .map((across) => {
          const mine = elements.filter((el) => valueOf(el, x) === across && valueOf(el, y) === up).map((el) => ({ el, n: ++number }));
          const box = `${nameKey(across)} ${nameKey(up)}`;
          if (mine.length)
            key.push(
              `<section class="matrix-group" data-value="${escapeHtml(box)}"><h3>${escapeHtml(`${y.label}: ${up} · ${x.label}: ${across}`)}</h3><div class="cards">${mine
                .map(({ el, n }) => card(el, axes, `<span class="matrix-number">${n}</span>`))
                .join('')}</div></section>`,
            );
          const points = mine.map(({ el, n }) => `<span class="matrix-point" data-el="${anchorOf(el.name)}" data-tip="${escapeHtml(el.name)}">${n}</span>`).join('');
          return `<td class="matrix-cell" data-value="${escapeHtml(box)}">${points}</td>`;
        })
        .join('');
      return `<tr>${axis}<th class="matrix-value" scope="row" data-value="${escapeHtml(nameKey(up))}">${escapeHtml(up)}</th>${cells}</tr>`;
    })
    .join('');
  const foot = `<tr><td colspan="2"></td>${x.spec.values.map((across) => `<th class="matrix-value" scope="col" data-value="${escapeHtml(nameKey(across))}">${escapeHtml(across)}</th>`).join('')}</tr><tr><td colspan="2"></td><th class="matrix-axis matrix-axis--x" colspan="${x.spec.values.length}"${propOf(x.label)}>${escapeHtml(x.label)}</th></tr>`;
  const left = elements.filter((el) => !valueOf(el, x) || !valueOf(el, y));
  key.push(...notPlaced(left.map((el) => card(el, axes))));
  return `<div class="matrix"><table><tbody>${body}${foot}</tbody></table><div class="matrix-key">${key.join('')}</div></div>`;
}

/** The key of a matrix: the cards of the elements it could not place (a value missing), if any. */
const notPlaced = (cards: string[]) =>
  cards.length ? [`<section class="matrix-group matrix-rest"><h3>Not placed <span class="board-count">${cards.length}</span></h3><div class="cards">${cards.join('')}</div></section>`] : [];

/** A matrix whose axes are scores (a number with Min and Max): each element a numbered point at its
 *  scores, so that two in the same third differ; the nine boxes, thirds of each axis, stay as the ground. The points are
 *  numbered from the top left, as they are read, and the key lists them in that order. Several at the same scores
 *  overlap a little, as avatars, the group centered on their scores. An element without both scores
 *  is listed in the key, "Not placed". */
function renderScored(elements: MapElement[], x: ScaleRow, y: ScaleRow, card: (el: MapElement, skip?: Set<string | undefined>, before?: string) => string) {
  const axes = new Set([x.key, y.key]);
  const at = (el: MapElement, row: ScaleRow) => {
    const v = readScale(el.properties.get(row.key))?.value;
    return v === undefined ? undefined : Math.min(100, Math.max(0, ((v - row.spec.min) / (row.spec.max - row.spec.min)) * 100));
  };
  const placed = elements
    .map((el) => ({ el, px: at(el, x), py: at(el, y) }))
    .filter((p): p is { el: MapElement; px: number; py: number } => p.px !== undefined && p.py !== undefined)
    .sort((a, b) => b.py - a.py || a.px - b.px);
  const spot = (p: { px: number; py: number }) => `${p.px} ${p.py}`;
  const together = new Map<string, number>();
  for (const p of placed) together.set(spot(p), (together.get(spot(p)) ?? 0) + 1);
  const seen = new Map<string, number>();
  // The position of a point, in the grid less half a point on each side, and its shift in a group (--matrix-overlap of
  // a point apart): computed by the drawing, from --size-point.
  const points = placed
    .map((p, i) => {
      const side = seen.get(spot(p)) ?? 0;
      seen.set(spot(p), side + 1);
      const shift = side - ((together.get(spot(p)) ?? 1) - 1) / 2;
      return `<span class="matrix-point" data-el="${anchorOf(p.el.name)}" data-tip="${escapeHtml(p.el.name)}" style="left: calc(var(--size-point) * .5 + var(--matrix-overlap) * ${shift} + (100% - var(--size-point)) * ${(p.px / 100).toFixed(4)}); bottom: calc(var(--size-point) * .5 + (100% - var(--size-point)) * ${(p.py / 100).toFixed(4)})">${i + 1}</span>`;
    })
    .join('');
  const boxes = '<span class="matrix-box"></span>'.repeat(9);
  const tick = (v: number) => `<span>${escapeHtml(String(v))}</span>`;
  const chart = `<div class="matrix-chart"><div class="matrix-axis matrix-axis--y"${propOf(y.label)}><span>${escapeHtml(y.label)}</span></div><div class="matrix-ticks matrix-ticks--y">${tick(y.spec.max)}${tick(y.spec.min)}</div><div class="matrix-plot">${boxes}${points}</div><div class="matrix-ticks matrix-ticks--x">${tick(x.spec.min)}${tick(x.spec.max)}</div><div class="matrix-axis matrix-axis--x"${propOf(x.label)}>${escapeHtml(x.label)}</div></div>`;
  const key = placed.length ? [`<section class="matrix-group"><div class="cards">${placed.map(({ el }, i) => card(el, axes, `<span class="matrix-number">${i + 1}</span>`)).join('')}</div></section>`] : [];
  const left = elements.filter((el) => at(el, x) === undefined || at(el, y) === undefined);
  key.push(...notPlaced(left.map((el) => card(el, axes))));
  return `<div class="matrix">${chart}<div class="matrix-key">${key.join('')}</div></div>`;
}

// ---- Drawing a graph ----

// Text metrics used to size the nodes: the sizes of the text, which stand for the tokens --font-size-diagram (G.font)
// and --font-size-diagram-sm (G.small) of style.css, and the average width of a character of 13px text, for the
// tests, which have no page to measure the text in (textWidth).
const G = { detail: 16, font: 13, small: 12, char: 7.2, line: 18, wrap: 22, diamondWrap: 12, pad: 12, minWidth: 96, nodeSep: 36, rankSep: 46, loop: 22, terminal: 44 };

/** The tooltip of a box: every property of its element, as `Label: value`, whatever the type. A link shows its
 *  text, the last name of its path, or its alias. */
const plain = (text: string) => text.replace(/\[\[([^\]|]*)(?:\|([^\]]*))?\]\]/g, (_, path: string, alias?: string) => alias || path.split('#').filter(Boolean).pop() || path);

function tipOf(element: { properties: Map<string, Property> }) {
  return [...element.properties.values()]
    .filter((p) => p.isUndefined || p.values.length)
    .map((p) => `${p.label}: ${p.isUndefined ? 'not said' : p.values.map((v) => plain(v.text)).join('; ')}`)
    .join('\n');
}

/** The width of a text in a drawing, in pixels, so that a box fits the font of the theme: measured in the font of the
 *  page (--font-sans, and --font-weight-bold for a name in bold); with no page (the tests), estimated from G.char. */
const widths = new Map<string, number>();
let measurer: CanvasRenderingContext2D | null | undefined;
function textWidth(text: string, size = G.font, bold = false) {
  if (measurer === undefined) measurer = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d');
  if (!measurer) return text.length * G.char * (size / G.font);
  const style = getComputedStyle(document.body);
  const font = `${bold ? style.getPropertyValue('--font-weight-bold').trim() || 'bold' : 'normal'} ${size}px ${style.fontFamily}`;
  const key = `${font}\n${text}`;
  if (!widths.has(key)) {
    measurer.font = font;
    widths.set(key, measurer.measureText(text).width);
  }
  return widths.get(key)!;
}

function wrap(text: string, width: number) {
  const lines: string[] = [];
  let current = '';
  // Inline code (`npx github:florentbx/maps.md`) is never cut, and drawn without its backticks.
  const kept = typeset(text).replace(/`([^`]+)`/g, (_, code: string) => code.replace(/ /g, '\u00a0'));
  for (const word of kept.split(/[ \t\r\n]+/).filter(Boolean)) {
    if (current && current.length + 1 + word.length > width) {
      lines.push(current);
      current = word;
    } else current = current ? `${current} ${word}` : word;
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

/** A line of the text under the name of a box: its property, and, on the first line of a value, its label (`Kind: `),
 *  which a style can hide (`.detail-label`): then `hidden`, and the line is wrapped without it. */
interface Detail {
  line: string;
  prop: string;
  label?: string;
  hidden?: boolean;
}

/** Whether the style of the type hides the label of a line under the name of a box (`.detail-label`), in this view
 *  (its `data-view-name`), for this property and this box (`hooks`, the attributes of its `g`: its classes, its
 *  `data-value`): read in the page, on a hidden copy of the hooks of the box; with no page (the tests), shown. Read
 *  again for each map, whose type has its own style (drawMap). */
const hiddenLabels = new Map<string, boolean>();
function labelHidden(view: string, prop: string, hooks: string) {
  if (typeof document === 'undefined') return false;
  const key = `${view}\n${prop}\n${hooks}`;
  if (!hiddenLabels.has(key)) {
    const probe = document.createElement('section');
    probe.className = 'view';
    probe.dataset.viewName = view;
    probe.style.cssText = 'position: fixed; left: -200vw; top: 0; visibility: hidden;';
    probe.innerHTML = `<div class="graph"><svg><g ${hooks}><text class="node-detail"${propOf(prop)}><tspan class="detail-label">${escapeHtml(prop)}: </tspan></text></g></svg></div>`;
    document.body.append(probe);
    hiddenLabels.set(key, getComputedStyle(probe.querySelector('.detail-label')!).display === 'none');
    probe.remove();
  }
  return hiddenLabels.get(key)!;
}

/** The text a view shows under the name of a box (`- Shows:`): the values of these properties, with their label when
 *  there are several. */
function detailsOf(node: { properties?: Map<string, Property> }, shows?: string[]) {
  return (shows ?? []).flatMap((name) => {
    const p = node.properties?.get(name.toLowerCase());
    if (!p) return [];
    const values = p.isUndefined ? ['not said'] : p.values.map((v) => plain(v.text)); // its details are in the panel, as in a grid
    return values.map((text) => ({ prop: p.label, label: shows!.length > 1 ? `${p.label}: ` : undefined, text }));
  });
}

/** Lines and estimated size of a node: its name, then the text a view shows under it. A diamond holds its name when it
 *  is twice as wide and high, and shows nothing under it: its name is wrapped in short lines (G.diamondWrap), so that
 *  it stays about as wide as a box, as flowcharts do. */
function box(node: { name: string; shape: string; properties?: Map<string, Property> }, shows: string[] | undefined, view: string, hooks = 'class="node"'): Box {
  const lines = wrap(node.name, node.shape === 'diamond' ? G.diamondWrap : G.wrap);
  const nameWidth = Math.max(...lines.map((l) => textWidth(l, G.font, true)));
  const textHeight = lines.length * G.line;
  if (node.shape === 'diamond') {
    const width = Math.max(G.minWidth, nameWidth * 2 + G.pad);
    return { lines, details: [], width, height: Math.max(textHeight * 2 + G.pad, width * 0.4) };
  }
  // A label the style hides takes no room: the text is wrapped without it.
  const details = detailsOf(node, shows).flatMap(({ prop, label, text }) => {
    const hidden = label !== undefined && labelHidden(view, prop, hooks);
    return wrap(`${hidden ? '' : (label ?? '')}${text}`, G.wrap + 6).map((line, i): Detail => (i === 0 ? { line, prop, label, hidden } : { line, prop }));
  });
  const detailWidth = Math.max(0, ...details.map((d) => textWidth(d.line, G.small)));
  const detailHeight = details.length ? details.length * G.detail + G.pad : 0;
  // The room above the text: the top of a cylinder, the head of a person.
  const offset = SHAPE_TOP[node.shape] ?? 0;
  return { lines, details, offset, width: Math.max(G.minWidth, nameWidth + G.pad * 2, detailWidth + G.pad * 2), height: textHeight + G.pad * 2 + detailHeight + offset };
}

/** The text of a box whose top is at `top`: its name, centered, then, under a line, what the view shows. */
function boxText(n: { box: Box }, cx: number, top: number) {
  const { lines, details, width } = n.box;
  const title = details.length ? ' class="node-title"' : '';
  const name = lines.map((l, i) => `<text${title} x="${r(cx)}" y="${r(top + G.pad + G.line * (i + 0.72))}">${escapeHtml(l)}</text>`).join('');
  if (!details.length) return name;
  const y = top + G.pad * 1.5 + lines.length * G.line;
  // The head of the box, above the line, for a style to fill (the name of an entity in a band): none by default. Its
  // corners are the box's own (style.css), within its outline.
  const [x0, x1] = [cx - width / 2, cx + width / 2];
  const head = `<rect class="node-head" x="${r(x0)}" y="${r(top)}" width="${r(x1 - x0)}" height="${r(y - top)}"/>`;
  const rule = `<line class="node-rule" x1="${r(x0)}" x2="${r(x1)}" y1="${r(y)}" y2="${r(y)}"/>`;
  const text = ({ line, label, hidden }: Detail) => {
    const rest = !label ? undefined : hidden ? line : line.startsWith(label) ? line.slice(label.length) : undefined;
    return rest === undefined ? escapeHtml(line) : `<tspan class="detail-label">${escapeHtml(label!)}</tspan>${escapeHtml(rest)}`;
  };
  return head + name + rule + details.map((d, i) => `<text class="node-detail"${propOf(d.prop)} x="${r(cx - width / 2 + G.pad)}" y="${r(y + G.detail * (i + 0.95))}">${text(d)}</text>`).join('');
}

const r = (n: number) => Math.round(n * 10) / 10;

/** The shapes of a box beyond the plain one (`- Cylinder:` a database, `- Person:` someone): the room they take above
 *  the text, and their outline, as one path (`node-body`), with the front of the top of a cylinder apart (`node-cap`). */
const CAP = 7;
const HEAD_R = 11;
const SHAPE_TOP: Record<string, number> = { cylinder: CAP * 2, person: HEAD_R * 2 + 4 };
function shapePath(shape: string, x: number, y: number, w: number, h: number) {
  const [x0, x1, y0, y1] = [x - w / 2, x + w / 2, y - h / 2, y + h / 2];
  if (shape === 'cylinder') {
    const arc = (to: Point, sweep: number) => `A${r(w / 2)} ${CAP} 0 0 ${sweep} ${r(to.x)} ${r(to.y)}`;
    const body = `M${r(x0)} ${r(y0 + CAP)} ${arc({ x: x1, y: y0 + CAP }, 1)} V${r(y1 - CAP)} ${arc({ x: x0, y: y1 - CAP }, 1)} Z`;
    return `<path class="node-body" d="${body}"/><path class="node-cap" d="M${r(x0)} ${r(y0 + CAP)} ${arc({ x: x1, y: y0 + CAP }, 0)}"/>`;
  }
  // A person: a head over a rounded body.
  const top = y0 + HEAD_R * 2 + 4;
  const k = Math.min(14, (y1 - top) / 2);
  const body = `M${r(x0 + k)} ${r(top)} H${r(x1 - k)} Q${r(x1)} ${r(top)} ${r(x1)} ${r(top + k)} V${r(y1 - k)} Q${r(x1)} ${r(y1)} ${r(x1 - k)} ${r(y1)} H${r(x0 + k)} Q${r(x0)} ${r(y1)} ${r(x0)} ${r(y1 - k)} V${r(top + k)} Q${r(x0)} ${r(top)} ${r(x0 + k)} ${r(top)} Z`;
  const head = `M${r(x - HEAD_R)} ${r(y0 + HEAD_R)} A${HEAD_R} ${HEAD_R} 0 1 0 ${r(x + HEAD_R)} ${r(y0 + HEAD_R)} A${HEAD_R} ${HEAD_R} 0 1 0 ${r(x - HEAD_R)} ${r(y0 + HEAD_R)} Z`;
  return `<path class="node-body" d="${body} ${head}"/>`;
}

/** The head of an arrow, for a graph and a sequence diagram. */
const MARKER = `<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z"/></marker></defs>`;

/** The length of the end of a line that a cardinality takes, and that an arrow head takes. */
const CARD = 20;
const HEAD = 9;

/** The direction in which a line arrives at its end (a unit vector): along its last segment; on a curve placed by ELK
 *  (its start, then control points and ends by threes), from a point of its last curve just before the end, since its
 *  last control point may lie beyond the end. */
function arrival(points: Point[], curved: boolean): Point {
  const end = points.at(-1)!;
  let from = points.at(-2)!;
  if (curved && points.length >= 4 && (points.length - 1) % 3 === 0) {
    const [p0, p1, p2] = points.slice(-4);
    const t = 0.85;
    const u = 1 - t;
    from = { x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * end.x, y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * end.y };
  }
  const length = Math.hypot(end.x - from.x, end.y - from.y) || 1;
  return { x: (end.x - from.x) / length, y: (end.y - from.y) / length };
}

/** The head of a line at `end`, arriving in the direction `dir`: an arrow (a filled triangle), or a cardinality. */
function headPath(kind: Head, end: Point, dir: Point) {
  if (kind !== 'arrow') return `<path class="edge-card" d="${cardinalityPath(end, dir, kind)}"/>`;
  const at = (back: number, side: number) => `${r(end.x - dir.x * back - dir.y * side)} ${r(end.y - dir.y * back + dir.x * side)}`;
  return `<path class="edge-head" d="M${at(0, 0)} L${at(HEAD, -4.5)} L${at(HEAD, 4.5)} Z"/>`;
}

/** A cardinality at the end of a line, in crow's foot notation, as a path of the line itself (so that it takes its
 *  color, its weight and its fading): `end` the point where the line meets the box, `dir` the unit direction of the
 *  line there. The line stops `CARD` before the box; this path goes on to it. 1: two bars; 0..1: a circle and a bar;
 *  1..n: a bar and three prongs; 0..n: a circle and three prongs. */
function cardinalityPath(end: Point, dir: Point, kind: Cardinality) {
  const n = { x: -dir.y, y: dir.x };
  const at = (back: number, side = 0) => `${r(end.x - dir.x * back + n.x * side)} ${r(end.y - dir.y * back + n.y * side)}`;
  const bar = (back: number) => `M${at(back, -6)} L${at(back, 6)}`;
  const circle = `M${at(CARD)} A4 4 0 1 0 ${at(CARD - 8)} A4 4 0 1 0 ${at(CARD)}`; // from the far end of the line
  const prongs = `M${at(12)} L${at(0, -7)} M${at(12)} L${at(0)} M${at(12)} L${at(0, 7)}`;
  return {
    one: `M${at(CARD)} L${at(0)} ${bar(6)} ${bar(10)}`,
    'zero-one': `${circle} M${at(CARD - 8)} L${at(0)} ${bar(6)}`,
    many: `M${at(CARD)} L${at(12)} ${bar(16)} ${prongs}`,
    'zero-many': `${circle} M${at(CARD - 8)} L${at(12)} ${prongs}`,
  }[kind];
}

/** A curve from the points of a spline placed by ELK: its start, then its control points and its end, by threes
 *  (cubic Béziers). */
function spline(points: Point[]) {
  const [start, ...rest] = points;
  let d = `M${r(start.x)} ${r(start.y)}`;
  for (let i = 0; i + 2 < rest.length; i += 3) d += ` C${rest.slice(i, i + 3).map((p) => `${r(p.x)} ${r(p.y)}`).join(' ')}`;
  return rest.length % 3 ? `${d} L${r(rest[rest.length - 1].x)} ${r(rest[rest.length - 1].y)}` : d;
}

/** A path with right angles through points, turning halfway between two points along the main axis (`y` when the
 *  graph goes down, `x` when it goes right), with rounded corners. */
function elbow(points: Point[], axis: 'x' | 'y') {
  const cross = axis === 'y' ? 'x' : 'y';
  const at = (main: number, side: number) => (axis === 'y' ? { x: side, y: main } : { x: main, y: side });
  const route = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const [a, b] = [route[route.length - 1], points[i]];
    if (Math.abs(a[cross] - b[cross]) > 0.5) {
      const middle = (a[axis] + b[axis]) / 2;
      route.push(at(middle, a[cross]), at(middle, b[cross]));
    }
    route.push(b);
  }
  // Drop repeated points and the points that are not corners, then round each corner.
  const distinct = route.filter((p, i) => !i || Math.abs(p.x - route[i - 1].x) > 0.5 || Math.abs(p.y - route[i - 1].y) > 0.5);
  const corners = distinct.filter((p, i) => {
    if (i === 0 || i === distinct.length - 1) return true;
    const [a, c] = [distinct[i - 1], distinct[i + 1]];
    return !((Math.abs(a.x - p.x) < 0.5 && Math.abs(p.x - c.x) < 0.5) || (Math.abs(a.y - p.y) < 0.5 && Math.abs(p.y - c.y) < 0.5));
  });
  let d = `M${r(corners[0].x)} ${r(corners[0].y)}`;
  for (let i = 1; i < corners.length; i++) {
    const p = corners[i];
    const next = corners[i + 1];
    if (!next) {
      d += ` L${r(p.x)} ${r(p.y)}`;
      break;
    }
    const prev = corners[i - 1];
    const radius = Math.min(6, Math.hypot(p.x - prev.x, p.y - prev.y) / 2, Math.hypot(next.x - p.x, next.y - p.y) / 2);
    const toward = (q: Point, len: number) => {
      const dist = Math.hypot(q.x - p.x, q.y - p.y) || 1;
      return { x: p.x + ((q.x - p.x) / dist) * len, y: p.y + ((q.y - p.y) / dist) * len };
    };
    const [a, b] = [toward(prev, radius), toward(next, radius)];
    d += ` L${r(a.x)} ${r(a.y)} Q${r(p.x)} ${r(p.y)} ${r(b.x)} ${r(b.y)}`;
  }
  return d;
}

/** The placement of a graph, by ELK: layered, with right angles (`- Lines: elbow`) or curves. With right angles, by
 *  the logic of a flow: the first arrow of an element that goes on leaves by its bottom (its right when the graph goes
 *  right), its other arrows by its sides; an arrow enters by the top, a return by a side; every arrow has its own
 *  point, so that its label has room at its start. With curves (relations), ELK chooses where each arrow meets a box:
 *  fewer crossings. The ends of a line meet the outline of a diamond. Returns the center of each node, the points of
 *  each arrow and the room of its label (at its start), and the size. */
async function elkPlace(nodes: GraphNode[], edges: GraphEdge[], back: Set<number>, axis: 'x' | 'y', curved: boolean, ends: boolean, inFrame: Set<string>) {
  const down = axis === 'y';
  if (curved) return elkRun(nodes, edges, back, down, undefined, curved, ends, inFrame);
  const [ahead, sides, returns] = down ? ['SOUTH', ['EAST', 'WEST'], 'EAST'] : ['EAST', ['SOUTH', 'NORTH'], 'SOUTH'];
  const outSide = new Map<number, string>();
  for (const n of nodes) {
    const mine = edges.map((_, k) => k).filter((k) => edges[k].from === n);
    mine.filter((k) => !back.has(k)).forEach((k, i) => outSide.set(k, i === 0 ? ahead : sides[(i - 1) % 2]));
    mine.filter((k) => back.has(k)).forEach((k) => outSide.set(k, returns));
  }
  // A first placement, then a second one where each arrow leaves by the side that faces its target: the bottom for the
  // target most in line with the element, the left or the right for the others.
  const first = await elkRun(nodes, edges, back, down, outSide, curved, ends, inFrame);
  let moved = false;
  for (const n of nodes) {
    const mine = edges.map((_, k) => k).filter((k) => edges[k].from === n && !back.has(k));
    if (mine.length < 2) continue;
    const c = first.at.get(n.id)!;
    const offset = (k: number) => { const t = first.at.get(edges[k].to.id)!; return down ? t.x - c.x : t.y - c.y; };
    const ahead1 = mine.reduce((best, k) => (Math.abs(offset(k)) < Math.abs(offset(best)) ? k : best));
    for (const k of mine) {
      const side = k === ahead1 ? ahead : offset(k) < 0 ? sides[1] : sides[0];
      if (outSide.get(k) !== side) (outSide.set(k, side), (moved = true));
    }
  }
  return moved ? elkRun(nodes, edges, back, down, outSide, curved, ends, inFrame) : first;
}

/** One placement by ELK, the side each arrow leaves by given (`outSide`). */
async function elkRun(nodes: GraphNode[], edges: GraphEdge[], back: Set<number>, down: boolean, outSide: Map<number, string> | undefined, curved: boolean, ends: boolean, inFrame = new Set<string>()) {
  const [after, returns] = down ? ['NORTH', 'EAST'] : ['WEST', 'SOUTH'];
  const port = (id: string, side: string) => ({ id, width: 1, height: 1, layoutOptions: { 'elk.port.side': side } });
  // With a frame, three groups of layers, so that the frame never holds an element outside it: the elements before the
  // frame (a person, an AI agent that a person asks, and that calls the system), the frame, the elements after it (those
  // the frame leads to, through elements outside it, even one that calls it back; and those that no arrow leaves). In
  // its group, an element is placed by its arrows: two linked elements on one side sit a layer apart, the arrow between
  // them long.
  const reached = new Set(nodes.filter((n) => inFrame.has(n.id)));
  for (const n of reached) for (const e of edges) if (e.from === n && !inFrame.has(e.to.id)) reached.add(e.to);
  const frameGroup = (n: GraphNode) => (inFrame.has(n.id) ? 1 : reached.has(n) || !edges.some((e) => e.from === n) ? 2 : 0);
  // The loops of a node go on the side, right or left, with fewer arrows.
  for (const n of nodes.filter((n) => n.loopRoom && outSide)) {
    const at = (side: string) => edges.filter((e, k) => (e.from === n && outSide!.get(k) === side) || (e.to === n && (back.has(k) ? returns : after) === side)).length;
    n.loopSide = at('WEST') < at('EAST') ? 'left' : 'right';
  }
  const graph = (await elk.layout({
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': down ? 'DOWN' : 'RIGHT',
      'elk.edgeRouting': curved ? 'SPLINES' : 'ORTHOGONAL',
      // Straightens long arrows: the main path of a large flow goes straight down (the Caféo flow: 16 crossings to 7).
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
      // The arrows that go back are known (backEdges): only they are turned, in the order of the file.
      'elk.layered.cycleBreaking.strategy': 'DEPTH_FIRST',
      'elk.spacing.nodeNode': String(G.nodeSep),
      'elk.spacing.edgeNode': '16',
      'elk.spacing.edgeEdge': '10',
      'elk.spacing.portPort': '30', // room between the ends of two lines on one side of a box (crow's feet)
      // A straight end before a box, long enough for a cardinality (`ends`) and the turn before it.
      'elk.layered.spacing.edgeNodeBetweenLayers': String(ends ? CARD + 12 : 16),
      // A label at the start of its arrow (right angles: a flow), or in its middle, on the line (curves: relations).
      'elk.edgeLabels.placement': curved ? 'CENTER' : 'TAIL',
      // With a frame, room between the layers for its border, and the elements with no arrow placed with the others.
      'elk.layered.spacing.nodeNodeBetweenLayers': inFrame.size ? '64' : '40',
      // ELK takes a boolean here; its types only know strings.
      ...(inFrame.size ? ({ 'elk.separateConnectedComponents': false, 'elk.partitioning.activate': true } as unknown as Record<string, string>) : {}),
    },
    children: nodes.map((n) => ({
      id: n.id,
      width: n.box.width,
      height: n.box.height,
      layoutOptions: {
        ...(outSide ? { 'elk.portConstraints': 'FIXED_SIDE', 'elk.portAlignment.default': 'CENTER', 'elk.spacing.portPort': '30' } : {}),
        // With a frame (`- Frame:`), the elements outside it go after it (those it leads to, and those that no arrow
        // leaves) or before it.
        ...(inFrame.size ? { 'elk.partitioning.partition': String(frameGroup(n)) } : {}),
      },
      // The room of its loops, on its right: an outside label, which the placement keeps free.
      labels: n.loopRoom ? [{ text: ' ', width: n.loopRoom, height: n.loopHeight ?? G.line, layoutOptions: { 'elk.nodeLabels.placement': `OUTSIDE V_CENTER ${n.loopSide === 'left' ? 'H_LEFT' : 'H_RIGHT'}` } }] : [],
      ports: outSide
        ? edges.flatMap((e, k) => [...(e.from === n ? [port(`e${k}-out`, outSide.get(k)!)] : []), ...(e.to === n ? [port(`e${k}-in`, back.has(k) ? returns : after)] : [])])
        : [],
    })),
    edges: edges.map((e, k) => ({
      id: `e${k}`,
      sources: [outSide ? `e${k}-out` : e.from.id],
      targets: [outSide ? `e${k}-in` : e.to.id],
      labels: e.label ? [{ text: e.label, width: textWidth(e.label, G.small) + 12, height: G.line + 4 }] : [],
    })),
  })) as Placed;
  // The frame: around its elements, the arrows between them and their labels; the drawing grows to hold it.
  const insideEdges = graph.edges.filter((_, k) => inFrame.has(edges[k].from.id) && inFrame.has(edges[k].to.id));
  const inside = ([
    ...graph.children.filter((c) => inFrame.has(c.id)),
    ...insideEdges.flatMap((ge) => [...ge.sections.flatMap((s) => [s.startPoint, ...(s.bendPoints ?? []), s.endPoint]), ...(ge.labels ?? [])]),
  ] as (Point & { width?: number; height?: number })[]).map((c) => ({ x: c.x, y: c.y, width: c.width ?? 0, height: c.height ?? 0 }));
  const box = inFrame.size > 0 && {
    x0: Math.min(...inside.map((c) => c.x)) - G.pad * 2,
    y0: Math.min(...inside.map((c) => c.y)) - G.pad * 2,
    x1: Math.max(...inside.map((c) => c.x + c.width)) + G.pad * 2,
    y1: Math.max(...inside.map((c) => c.y + c.height)) + G.pad * 2,
  };
  const [dx, dy] = box ? [Math.max(0, -box.x0), Math.max(0, -box.y0)] : [0, 0];
  const frame = box && { x: box.x0 + dx + G.pad, y: box.y0 + dy + G.pad, width: box.x1 - box.x0, height: box.y1 - box.y0 };
  const at = new Map(graph.children.map((c) => [c.id, { x: c.x + c.width / 2 + G.pad + dx, y: c.y + c.height / 2 + G.pad + dy }]));
  const move = (p: Point) => ({ x: p.x + G.pad + dx, y: p.y + G.pad + dy });
  // Where a line that ELK ends on the box of a diamond meets its outline.
  const outline = (p: Point, n: GraphNode) => {
    const c = at.get(n.id)!;
    const [hw, hh] = [n.box.width / 2, n.box.height / 2];
    if (Math.abs(Math.abs(p.y - c.y) - hh) < 1) return { x: p.x, y: c.y + Math.sign(p.y - c.y) * hh * (1 - Math.abs(p.x - c.x) / hw) };
    return { x: c.x + Math.sign(p.x - c.x) * hw * (1 - Math.abs(p.y - c.y) / hh), y: p.y };
  };
  const routes = graph.edges.map((ge, k) => {
    const points = ge.sections.flatMap((sec) => [sec.startPoint, ...(sec.bendPoints ?? []), sec.endPoint]).map(move);
    const [from, to] = [edges[k].from, edges[k].to];
    if (from.shape === 'diamond') points.unshift(outline(points[0], from));
    if (to.shape === 'diamond') points.push(outline(points[points.length - 1], to));
    return points;
  });
  return {
    at,
    node: (n: GraphNode) => at.get(n.id)!,
    // The label where ELK kept room for it, at the start of the arrow.
    edge: (k: number) => ({ points: routes[k], start: true, room: graph.edges[k].labels?.[0] && move(graph.edges[k].labels![0]) }),
    width: Math.max(graph.width + dx, box ? box.x1 + dx : 0) + G.pad * 2,
    height: Math.max(graph.height + dy, box ? box.y1 + dy : 0) + G.pad * 2,
    frame,
  };
}

/** Indices of the edges that go back to a node still on the path (depth first, in the order of the file). */
function backEdges(nodes: GraphNode[], edges: GraphEdge[]) {
  const out = new Map(nodes.map((n): [GraphNode, number[]] => [n, []]));
  edges.forEach((e, k) => out.get(e.from)!.push(k));
  const back = new Set<number>();
  const state = new Map<GraphNode, string>();
  const visit = (node: GraphNode) => {
    state.set(node, 'open');
    for (const k of out.get(node)!) {
      if (state.get(edges[k].to) === 'open') back.add(k);
      else if (!state.has(edges[k].to)) visit(edges[k].to);
    }
    state.set(node, 'done');
  };
  for (const node of nodes) if (!state.has(node)) visit(node);
  return back;
}

/** The arrows of a graph, between its steps: an arrow to `undefined` gets its own "?" node; an arrow to a step that is
 *  not there, or to another file, gets a node of its own, marked or linking to its page. A later step with the same
 *  name as another is marked, and arrows go to the first one. */
function edgesOf(steps: GraphNode[], links: PageLinks, element: string) {
  const byName = new Map<string, GraphNode>();
  for (const s of steps) {
    if (byName.has(nameKey(s.name))) s.problem = `Another ${element} has the same name`;
    else byName.set(nameKey(s.name), s);
  }
  const missing = new Map<string, GraphNode>();
  const unknown: GraphNode[] = [];
  const edges: GraphEdge[] = steps.flatMap((from) =>
    from.arrows.map((a) => {
      // An arrow to `undefined`: the next step is unknown. Each one gets its own "?" node.
      if (a.target.toLowerCase() === 'undefined') {
        const to = { name: '?', properties: new Map(), arrows: [], unknown: true, unknownOf: anchorOf(from.name) } as NewNode as GraphNode;
        unknown.push(to);
        return { from, to, label: a.label };
      }
      // An arrow to another file is valid: its target is drawn apart and links to its page, or is marked when the
      // folder has no such element.
      const key = a.file ? `file:${a.target}` : nameKey(a.target);
      let to = a.file ? missing.get(key) : (byName.get(key) ?? missing.get(key));
      if (!to) {
        const name = a.target || '(no target)';
        const outside = (a.file && links.resolve(`[[${a.target}]]`)) as Resolved | undefined; // in this file: none
        to = { name, properties: new Map(), arrows: [], missing: !a.file || Boolean(outside?.problem), external: Boolean(a.file) } as NewNode as GraphNode;
        if (outside?.href) to.href = outside.href;
        if (outside?.problem) to.problem = `Broken link: ${outside.problem}`;
        missing.set(key, to);
      }
      return { from, to, label: a.label };
    }),
  );
  return { edges, missing, unknown };
}

/** `- Heads: none`: a link and the link back between the same two elements (a relationship written on both) are one
 *  line, the label of each at the end it reaches (`employs 1..n` beside the practitioners of a practice). */
function pairLines(edges: GraphEdge[]) {
  for (let k = edges.length - 1; k >= 0; k--) {
    const e = edges[k];
    const twin = edges.find((o, j) => j < k && !o.pair && o.from === e.to && o.to === e.from);
    if (twin && e.from !== e.to) {
      twin.pair = true;
      twin.back = e.label;
      edges.splice(k, 1);
    }
  }
}

async function renderGraph(definition: Definition, elements: MapElement[], { links }: { links: PageLinks }) {
  const steps = elements as GraphNode[]; // each gets its id, its kind, its shape and its box below
  const element = definition.element ?? 'element'; // the word of the type: a step, a state…
  // The node's kind is the value of the first single enum property of the definition (for a user flow, `Kind`). Each
  // value but the default gets a look by its place in `Values`; the layout of the type may draw some as diamonds.
  const kindSpec = kindSpecOf(definition);
  const values = (kindSpec?.values ?? []).map((v) => v.toLowerCase());
  const others = values.filter((v) => v !== kindSpec?.default?.toLowerCase());
  // The default value gets a neutral tint, so that every value has its own look.
  // A color given by the layout wins; a thick border adds to the look.
  const tint = (kind: string) => (colors[kind] ? `node--${colors[kind]}` : others.includes(kind) ? `node--v${(others.indexOf(kind) % 4) + 1}` : values.includes(kind) ? 'node--default' : '');
  const look = (kind: string) => [tint(kind), thick.includes(kind) && 'node--thick'].filter(Boolean).join(' ');
  const diamonds = (definition.layout?.diamond ?? []).map((v) => v.toLowerCase());
  const cylinders = (definition.layout?.cylinder ?? []).map((v) => v.toLowerCase());
  const persons = (definition.layout?.person ?? []).map((v) => v.toLowerCase());
  // `- Frame:` the elements of these kinds inside one dashed frame, with no name (the page shows the title of the map
  // above it): the system, the others outside.
  const framed = (definition.layout?.frame ?? []).map((v) => v.toLowerCase());
  const thick = (definition.layout?.thick ?? []).map((v) => v.toLowerCase());
  const colors = definition.layout?.color ?? {};
  // Starts and ends are drawn only when the layout of the type says that its arrows are a path (`- Ends: yes`).
  const marksEnds = Boolean(definition.layout?.ends);
  // Right angles and the direction, when the layout of the type asks for them.
  const elbows = definition.layout?.lines === 'elbow';
  const axis = definition.layout?.direction === 'right' ? 'x' : 'y';
  const { edges, missing, unknown } = edgesOf(steps, links, element);
  // `- Heads: none`: lines, not arrows (a graph of relationships). `- Heads: cardinality`: the cardinality that ends
  // a label (`has 0..n`) drawn at the end of the line, in crow's foot notation, and left out of the label.
  const headless = definition.layout?.heads === 'none';
  if (headless) pairLines(edges);
  if (definition.layout?.heads === 'cardinality')
    for (const e of edges) {
      const c = cardinalityOf(e.label ?? '');
      if (c) [e.label, e.card] = [c.label || undefined, c.kind];
    }
  const cardinal = definition.layout?.heads === 'cardinality';
  // `- Dashed: <word>`: an arrow whose label is this word, or starts with it, is drawn dashed; the word, a marker, is
  // not drawn before the rest of the label (`optional, edit them` reads "edit them", dashed).
  for (const e of edges) {
    const said = e.label?.trim() ?? '';
    const word = (definition.layout?.dashed ?? []).find((w) => said.toLowerCase() === w || said.toLowerCase().startsWith(`${w} `) || said.toLowerCase().startsWith(`${w},`));
    if (!word) continue;
    e.dashed = true;
    if (said.length > word.length) e.label = said.slice(word.length).replace(/^[\s,]+/, '') || said;
  }
  // `- Labels: none`: no label on the arrows, and no room kept for them; the panel shows them.
  if (definition.layout?.labels === 'none') for (const e of edges) [e.label, e.back] = [undefined, undefined];
  // The end of a line: its head (an arrow, a cardinality, or none), a path in the group of the line, so that it takes
  // its color, its weight and its fading; the line stops where the head starts.
  const kindOf = (e: GraphEdge): Head | undefined => (headless ? undefined : cardinal ? e.card : 'arrow');
  const endOf = (e: GraphEdge, points: Point[], curved: boolean) => {
    const kind = kindOf(e);
    if (!kind || points.length < 2) return '';
    const end = points.at(-1)!;
    const dir = arrival(points, curved);
    const cut = kind === 'arrow' ? HEAD : CARD;
    if (curved && points.length >= 4) points[points.length - 2] = { x: points.at(-2)!.x - dir.x * cut, y: points.at(-2)!.y - dir.y * cut };
    points[points.length - 1] = { x: end.x - dir.x * cut, y: end.y - dir.y * cut };
    return headPath(kind, end, dir);
  };
  const nodes = [...steps, ...missing.values(), ...unknown];
  const hasIn = new Set(edges.map((e) => e.to));
  const hasOut = new Set(edges.map((e) => e.from));
  const entries = new Set(steps.filter((s) => !hasIn.has(s)));
  if (!entries.size) entries.add(steps[0]);
  const isStep = (node: GraphNode) => !node.missing && !node.unknown && !node.external && !node.dot;
  /** The classes of a node, for the style of the type. */
  const classOf = (n: GraphNode) =>
    [
      'node',
      isStep(n) && boxColor(definition, n.properties) ? [boxClasses(definition, n.properties), thick.includes(n.kind ?? '') && 'node--thick'].filter(Boolean).join(' ') : n.kind && look(n.kind),
      n.missing && 'node--missing',
      n.unknown && 'node--unknown',
      n.external && !n.missing && 'node--external',
      n.problem && !n.missing && 'node--invalid',
      n.dot && (n.end ? 'node--end' : 'node--start'),
      n.final && 'node--final',
    ]
      .filter(Boolean)
      .join(' ');
  nodes.forEach((node, k) => {
    node.id = `n${k}`;
    // A step without a kind takes the default of the definition (for a user flow, an action); an explicit `undefined`
    // stays unknown; a value the definition does not list is marked.
    const written = kindSpec && node.properties.get(kindSpec.name.toLowerCase());
    const kind = written ? written.raw.toLowerCase() : isStep(node) ? kindSpec?.default : undefined;
    node.kind = kind && kind !== 'undefined' ? kind : undefined;
    if (node.kind && kindSpec?.values && !values.includes(node.kind)) {
      node.problem = `${kindSpec.name} "${written!.raw}" is not one of ${kindSpec.values.join(', ')}`;
      node.kind = undefined;
    }
    // No kind: none of these lists has it.
    node.shape = diamonds.includes(node.kind!) ? 'diamond' : cylinders.includes(node.kind!) ? 'cylinder' : persons.includes(node.kind!) ? 'person' : 'box';
    node.box = box(node, definition.layout?.shows, viewOf(definition), `class="${classOf(node)}"${node.kind ? valueOf(node.kind) : ''}`);
  });
  // A path starts at a round "Start", with an arrow to its first step, and each step with no arrow out leads to a
  // round "End", as in the usual flowcharts. The starts come first, so that the placement keeps them before the steps.
  if (marksEnds) {
    const terminal = (id: string, end: boolean): GraphNode => ({ id, name: end ? 'End' : 'Start', end, properties: new Map(), arrows: [], dot: true, shape: 'dot', box: { lines: [], details: [], width: G.terminal, height: G.terminal } });
    [...entries].reverse().forEach((entry, k) => {
      const dot = terminal(`start${k}`, false);
      nodes.unshift(dot);
      edges.unshift({ from: dot, to: entry });
    });
    // `- Ends: start`: no round End; a step with no arrow out is drawn as final (`node--final`), as the states of a
    // machine that end its life.
    steps.filter((step) => !hasOut.has(step)).forEach((step, k) => {
      if (definition.layout?.ends === 'start') return void (step.final = true);
      const dot = terminal(`end${k}`, true);
      nodes.push(dot);
      edges.push({ from: step, to: dot });
    });
  }

  // An arrow from an element to itself (a state that comes back to itself, an entity related to itself) is left out of
  // the placement, which draws it badly or out of the drawing: it is drawn apart, as a loop on the right of its box,
  // with its label, and the placement keeps room for it.
  const loops = edges.filter((e) => e.from === e.to);
  let flow = edges.filter((e) => e.from !== e.to);
  const back = backEdges(nodes, flow);
  // A return as a link (`- Returns: link`): an arrow back to an earlier element is drawn apart too, beside the element it
  // leaves, as a loop is: a short arrow, its label above it, to a small box that names the element it goes back to and
  // leads to it. No arrow goes back across the drawing any more.
  if (definition.layout?.returns === 'link') {
    for (const k of back) loops.push({ ...flow[k], returnTo: flow[k].to, id: `r${k}` });
    flow = flow.filter((_, k) => !back.has(k));
    back.clear();
  }
  const labelWidth = (e: GraphEdge) => (e.label ? textWidth(e.label, G.small) : 0);
  const linkBox = (e: GraphEdge) => ({ width: textWidth(`↩ ${e.returnTo!.name}`) + G.pad * 1.5, height: G.line + 8 });
  const loopOf = (e: GraphEdge) => G.loop + (e.card ? CARD : 0); // the width of a loop, longer with a cardinality
  const stubOf = (e: GraphEdge) => Math.max(G.loop, labelWidth(e) + 12);
  const loopGap = (n: GraphNode) => (loops.some((e) => e.from === n && e.returnTo) ? G.line + 14 : G.line + 4);
  for (const n of nodes) {
    const mine = loops.filter((e) => e.from === n);
    n.loopRoom = mine.length ? Math.max(...mine.map((e) => (e.returnTo ? stubOf(e) + linkBox(e).width + 4 : loopOf(e) + 6 + labelWidth(e)))) : 0;
    n.loopHeight = mine.length * loopGap(n);
  }

  const inFrame = new Set(nodes.filter((n) => isStep(n) && framed.includes(n.kind!)).map((n) => n.id));
  const placed = await elkPlace(nodes, flow, back, axis, !elbows, cardinal, inFrame);
  const { width, height } = placed;

  const linkSvg: string[] = [];
  const loopSvg = loops
    .map((e) => {
      const mine = loops.filter((l) => l.from === e.from);
      const i = mine.indexOf(e);
      const { x, y } = placed.node(e.from);
      const s = e.from.loopSide === 'left' ? -1 : 1; // the side of the box: right, or left
      const cy = y + (i - (mine.length - 1) / 2) * loopGap(e.from);
      // The side of a diamond comes in away from its middle.
      const inset = e.from.shape === 'diamond' ? 1 - Math.abs(cy - y) / (e.from.box.height / 2) : 1;
      const x1 = x + (s * e.from.box.width * inset) / 2;
      if (e.returnTo) {
        const x2 = x + s * (e.from.box.width / 2 + stubOf(e)); // beyond the widest point of the element, its label too
        const { width: w, height: h } = linkBox(e);
        const label = e.label ? `<g class="edge-label edge-label--plain"><text x="${r(x + s * (e.from.box.width / 2 + 6))}" y="${r(cy - 5)}" style="text-anchor: ${s > 0 ? 'start' : 'end'}">${escapeHtml(e.label)}</text></g>` : '';
        const to = e.returnTo;
        const hook = isStep(to) && !to.problem ? ` data-el="${anchorOf(to.name)}" data-return` : '';
        linkSvg.push(`<g class="node node--return" data-node="${e.id}"${hook}><title>${escapeHtml(`Back to ${to.name}`)}</title><rect x="${r(s > 0 ? x2 : x2 - w)}" y="${r(cy - h / 2)}" width="${r(w)}" height="${r(h)}" rx="${r(h / 2)}"/><text x="${r(x2 + (s * w) / 2)}" y="${r(cy + G.font * 0.35)}">${escapeHtml(`↩ ${to.name}`)}</text></g>`);
        return `<g class="edge edge--return" data-from="${e.from.id}" data-to="${e.id}"${e.label ? valueOf(e.label) : ''}><path d="M${r(x1)} ${r(cy)} H${r(x2 - s * HEAD)}"/>${headPath('arrow', { x: x2, y: cy }, { x: s, y: 0 })}${label}</g>`;
      }
      const label = e.label ? `<g class="edge-label edge-label--plain"><text x="${r(x1 + s * (loopOf(e) + 6))}" y="${r(cy + G.font * 0.35)}" style="text-anchor: ${s > 0 ? 'start' : 'end'}">${escapeHtml(e.label)}</text></g>` : '';
      return `<g class="edge edge--loop" data-from="${e.from.id}" data-to="${e.to.id}"${e.label ? valueOf(e.label) : ''}><path d="M${r(x1)} ${r(cy - 5)} H${r(x1 + s * loopOf(e))} V${r(cy + 5)} H${r(x1 + s * (kindOf(e) === 'arrow' ? HEAD : kindOf(e) ? CARD : 0))}"/>${kindOf(e) ? headPath(kindOf(e)!, { x: x1, y: cy + 5 }, { x: -s, y: 0 }) : ''}${label}</g>`;
    })
    .join('');
  // What a label at the start of an arrow must not cover: the boxes, the lines of the arrows, the labels already placed.
  const taken: Area[] = nodes.map((n) => { const { x, y } = placed.node(n); return { x: x - n.box.width / 2, y: y - n.box.height / 2, w: n.box.width, h: n.box.height }; });
  flow.forEach((_, k) => placed.edge(k).points.forEach((p, i, ps) => i && taken.push({ x: Math.min(p.x, ps[i - 1].x), y: Math.min(p.y, ps[i - 1].y), w: Math.abs(p.x - ps[i - 1].x) || 1, h: Math.abs(p.y - ps[i - 1].y) || 1 })));
  const overlaps = (a: Area, b: Area) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const edgeSvg = flow
    .map((e, k) => {
      const { points, room } = placed.edge(k);
      // The label is plain text at the start of the arrow, beside its first segment.
      const first = points.filter((p, i) => !i || Math.abs(p.x - points[i - 1].x) + Math.abs(p.y - points[i - 1].y) > 1);
      // A label as plain text beside the first segment of `pts`, which leaves `node`: by default, the start of the arrow.
      const beside = (text = e.label!, pts = first, node = e.from, alone = true) => {
        // From a diamond, a line that leaves by a side starts inside its box: the label goes where it leaves the box.
        const inLine = (a: Point, b: Point, c: Point) => (Math.abs(a.x - b.x) < 1 && Math.abs(b.x - c.x) < 1) || (Math.abs(a.y - b.y) < 1 && Math.abs(b.y - c.y) < 1);
        const [p0, p1] = pts.length > 2 && node.shape === 'diamond' && inLine(pts[0], pts[1], pts[2]) ? [pts[1], pts[2]] : [pts[0], pts[1]];
        const along = Math.abs(p0.x - p1.x) < 1;
        // Beside a vertical segment, the label goes on the side away from the element it leaves, so as not to cover it.
        const away = p0.x < placed.node(node).x - 1;
        let [x, y, anchor]: [number, number, string] = along ? [p0.x + (away ? -6 : 6), p0.y + (p1.y > p0.y ? 16 : -8), away ? 'end' : 'start'] : [p0.x + (p1.x > p0.x ? 8 : -8), p0.y - 6, p1.x > p0.x ? 'start' : 'end'];
        // Where it would cover a box or another label, it goes where ELK kept room for it, further along its arrow.
        const w = textWidth(text, G.small);
        const area = () => ({ x: anchor === 'end' ? x - w : x, y: y - G.font, w, h: G.font + 4 });
        const covers = () => taken.some((t) => overlaps(t, area()));
        if (alone && room && covers()) [x, y, anchor] = [room.x + 6, room.y + G.line * 0.72 + 2, 'start'];
        else if (!alone && covers()) {
          // A label at one end of a line (`- Heads: none`) has no room kept by ELK: it tries the other side of its
          // segment, then further along it (its start on the segment), on either side, and keeps the first place that
          // covers nothing.
          const length = Math.abs(p1.x - p0.x) + Math.abs(p1.y - p0.y);
          const dir = along ? Math.sign(p1.y - p0.y) : Math.sign(p1.x - p0.x);
          const flip: [number, string?] = along ? [p0.x + (away ? 6 : -6), anchor === 'end' ? 'start' : 'end'] : [p0.y + G.font + 2];
          const tries: [number, number, string][] = [];
          for (let step = 0; step * 14 + 24 <= length; step++)
            for (const flipped of [false, true]) {
              if (!step && !flipped) continue;
              const shift = step * 14 * dir;
              tries.push(along ? [flipped ? flip[0] : x, y + shift, flipped ? flip[1]! : anchor] : [x + shift, flipped ? flip[0] : y, anchor]);
            }
          const start: [number, number, string] = [x, y, anchor];
          const free = tries.find((t) => {
            [x, y, anchor] = t;
            return !covers();
          });
          [x, y, anchor] = free ?? start;
        }
        taken.push(area());
        return `<g class="edge-label edge-label--plain"><text x="${r(x)}" y="${r(y)}" style="text-anchor: ${anchor}">${escapeHtml(text)}</text></g>`;
      };
      // On a curve, the label sits beside the middle of the line, where ELK kept room for it, on a background.
      const onLine = () => {
        const [w, h] = [textWidth(e.label!, G.small) + 12, G.line + 4];
        const [cx, cy] = [room!.x + w / 2, room!.y + h / 2];
        return `<g class="edge-label"><rect x="${r(cx - w / 2)}" y="${r(cy - h / 2)}" width="${r(w)}" height="${r(h)}"/><text x="${r(cx)}" y="${r(cy + G.font * 0.35)}">${escapeHtml(e.label!)}</text></g>`;
      };
      const label = e.pair
        ? (e.back ? beside(e.back, first, e.from, false) : '') + (e.label ? beside(e.label, [...first].reverse(), e.to, false) : '')
        : e.label
          ? !elbows && room
            ? onLine()
            : beside()
          : '';
      const cls = (e.pair ? 'edge edge--pair' : back.has(k) && !headless ? 'edge edge--back' : 'edge') + (e.dashed ? ' edge--dashed' : '');
      const card = endOf(e, points, !elbows);
      const d = elbows ? elbow(points, axis) : spline(points);
      return `<g class="${cls}" data-from="${e.from.id}" data-to="${e.to.id}"${e.label ? valueOf(e.label) : ''}><path d="${d}"/>${card}${label}</g>`;
    })
    .join('');
  const nodeSvg = nodes
    .map((n) => {
      const { x, y } = placed.node(n);
      const { width: w, height: h, lines } = n.box;
      const shape = n.dot
        ? `<circle cx="${r(x)}" cy="${r(y)}" r="${r(w / 2)}"/><text x="${r(x)}" y="${r(y + 4)}">${n.name}</text>`
        : n.shape === 'diamond'
          ? `<polygon points="${r(x)},${r(y - h / 2)} ${r(x + w / 2)},${r(y)} ${r(x)},${r(y + h / 2)} ${r(x - w / 2)},${r(y)}"/>`
          : SHAPE_TOP[n.shape]
            ? shapePath(n.shape, x, y, w, h)
            : `<rect x="${r(x - w / 2)}" y="${r(y - h / 2)}" width="${r(w)}" height="${r(h)}"/>`;
      // The text in the part of the box under its top (a cylinder, a person).
      const off = n.box.offset ?? 0;
      const top = y + off / 2 - (lines.length * G.line) / 2 + G.line * 0.72;
      const text = n.box.details.length ? boxText(n, x, y - h / 2 + off) : lines.map((l, i) => `<text x="${r(x)}" y="${r(top + i * G.line)}">${escapeHtml(l)}</text>`).join('');
      const tip = n.dot
        ? n.name
        : n.unknown
        ? `Next ${element} not known`
        : n.external && !n.problem
          ? 'In another file'
          : n.missing && !n.problem
            ? `No ${element} with this name in the file`
            : (n.problem ?? tipOf(n));
      const cls = classOf(n);
      const id = isStep(n) && !n.problem ? ` id="${anchorOf(n.name)}" data-el="${anchorOf(n.name)}"` : '';
      // An unknown next step: where its arrow comes from, so that a click on it shows that element (maps.html).
      const of = n.unknownOf ? ` data-from="${n.unknownOf}"` : '';
      const node = `<g class="${cls}"${id}${of} data-node="${n.id}"${n.kind ? valueOf(n.kind) : ''}${isStep(n) ? srcOf(n.src) : ''}>${tip ? `<title>${escapeHtml(tip)}</title>` : ''}${shape}${text}</g>`;
      return n.href ? `<a href="${escapeHtml(n.href)}">${node}</a>` : node;
    })
    .join('');

  // The legend: the values of the kind, from the definition.
  const keys = (kindSpec?.values ?? [])
    .map((v) => `<span class="key ${look(v.toLowerCase())}${diamonds.includes(v.toLowerCase()) ? ' key--diamond' : cylinders.includes(v.toLowerCase()) ? ' key--cylinder' : persons.includes(v.toLowerCase()) ? ' key--person' : ''}"${valueOf(v)}></span> ${escapeHtml(v)}`)
    .concat(colorKeys(definition, kindSpec))
    .join(' ');
  const legend = keys ? `<p class="legend">${keys}</p>` : ''; // a start and an end say what they are
  const f = placed.frame;
  const frameSvg = f ? `<g class="frame"><rect x="${r(f.x)}" y="${r(f.y)}" width="${r(f.width)}" height="${r(f.height)}"/></g>` : '';
  return `${legend}<div class="graph"><svg viewBox="0 0 ${r(width)} ${r(height)}" width="${r(width)}" height="${r(height)}" role="img" aria-label="${escapeHtml(`${steps.length} ${pluralOf(element)}, ${edges.length} arrows`)}">${MARKER}${frameSvg}<g class="edges">${edgeSvg}${loopSvg}</g><g class="nodes">${nodeSvg}${linkSvg.join('')}</g></svg></div>`;
}

// ---- Drawing a sequence as lifelines ----

/** A sequence diagram: `- Lifelines: From → To` in the layout. The participants are the values of the two properties,
 *  in the order they first appear, side by side, each with a dashed line down; each element is an arrow from the line
 *  of its `From` to the line of its `To`, under the one before, labeled with its name. An arrow to itself is a loop; a
 *  participant not said is "?". */
function renderLifelines(messages: MapElement[], definition: Definition) {
  const { from, to } = definition.layout!.lifelines!;
  const ends = (m: MapElement) => [from, to].map((key) => {
    const p = m.properties.get(key);
    return p && !p.isUndefined && p.values.length ? plain(p.values[0].text) : '?';
  });
  const names = [...new Set(messages.flatMap(ends))];
  const W = Math.max(150, ...names.map((n) => textWidth(n, G.font, true) + G.pad * 2)) + G.nodeSep;
  const head = G.line + G.pad * 2;
  // Each message is numbered, in order, to be named (the 6th); it takes the value of its kind (a reply), for a style.
  const kindSpec = kindSpecOf(definition);
  const rows = messages.map((m) => {
    const [a, b] = ends(m).map((n) => names.indexOf(n));
    const lines = wrap(m.name, Math.max(G.wrap, Math.floor(((Math.abs(b - a) || 1) * W - G.pad * 2) / (textWidth(m.name) / Math.max(1, m.name.length)))));
    return { m, a, b, lines, height: lines.length * G.line + G.pad * (a === b ? 3.5 : 2) };
  });
  const width = names.length * W;
  const height = head + G.pad * 2 + rows.reduce((sum, row) => sum + row.height, 0) + head;
  const x = (k: number) => k * W + W / 2;
  // A participant, its boxes and its lifeline, keyed by its name (data-participant), and each message by the
  // participants it joins (data-from, data-to): what the page needs to bring them out on a click.
  const who = (n: string) => ` data-participant="${anchorOf(n)}"`;
  // A participant not known (`undefined`) is a "?", drawn as an element not known in a graph.
  const unknown = (n: string) => (n === '?' ? ' node--unknown' : '');
  const box = (n: string, k: number, y: number) => `<g class="node node--top${unknown(n)}"${who(n)}><rect x="${r(x(k) - (W - G.nodeSep) / 2)}" y="${r(y)}" width="${r(W - G.nodeSep)}" height="${r(head)}"/><text x="${r(x(k))}" y="${r(y + G.pad + G.line * 0.72)}">${escapeHtml(n)}</text></g>`;
  const lifelines = names.map((n, k) => `<line class="lifeline${unknown(n)}"${who(n)} x1="${r(x(k))}" x2="${r(x(k))}" y1="${r(head)}" y2="${r(height - head)}"/>${box(n, k, 0)}${box(n, k, height - head)}`).join('');
  let y = head + G.pad * 2;
  const arrows = rows
    .map(({ m, a, b, lines, height: h }, i) => {
      const textY = y + G.line * 0.72;
      const lineY = y + lines.length * G.line + G.pad / 2;
      const cx = a === b ? x(a) + G.pad : (x(a) + x(b)) / 2;
      const anchor = a === b ? 'start' : 'middle';
      const number = `${i + 1}.`;
      const text = lines.map((l, j) => `<text x="${r(cx)}" y="${r(textY + j * G.line)}" text-anchor="${anchor}">${j ? '' : `<tspan class="lifeline-number">${number}</tspan> `}${escapeHtml(l)}</text>`).join('');
      const kind = kindSpec && m.properties.get(kindSpec.name.toLowerCase());
      const path = a === b ? `M${r(x(a))} ${r(lineY)} h${G.pad * 3} v${G.pad * 1.5} h${-G.pad * 3}` : `M${r(x(a))} ${r(lineY)} H${r(x(b) + (b > a ? -2 : 2))}`;
      y += h;
      const tip = tipOf(m) && `<title>${escapeHtml(tipOf(m))}</title>`;
      return `<g class="lifeline-arrow" id="${anchorOf(m.name)}" data-el="${anchorOf(m.name)}" data-from="${anchorOf(names[a])}" data-to="${anchorOf(names[b])}"${kind && !kind.isUndefined ? valueOf(kind.raw) : ''}${srcOf(m.src)}>${tip}<path d="${path}" marker-end="url(#arrow)"/>${text}</g>`;
    })
    .join('');
  return `<div class="graph"><svg viewBox="0 0 ${r(width)} ${r(height)}" width="${r(width)}" height="${r(height)}" role="img" aria-label="${escapeHtml(`${names.length} participants, ${messages.length} ${pluralOf(definition.element ?? 'element')}`)}">${MARKER}${lifelines}${arrows}</svg></div>`;
}

// ---- Drawing a tree ----

/** Boxes from top to bottom, in the order of the file: each parent is centered above its children, and the elements
 *  of the first level stand side by side. Placed here rather than by a layout engine, which may reorder the children. With
 *  `- Stack: yes`, each element of the first level heads a column, and the elements under it are listed one under the
 *  other, indented by level, as a file tree: a wide level no longer widens the drawing. */
function renderTree(definition: Definition, elements: MapElement[], { map }: { map: MapDoc }) {
  const roots = elements;
  if (definition.layout?.lanes) return renderBoard(roots, definition);
  // The kind of a node, as in a graph: the value of the first single enum property (an outcome, an opportunity…), on
  // the node and in a legend, for a style.
  const kindSpec = kindSpecOf(definition);
  const kindOf = (n: TreeNode) => {
    const p = kindSpec && n.properties?.get(kindSpec.name.toLowerCase());
    return p && !p.isUndefined && p.raw ? valueOf(p.raw) : '';
  };
  // When the boxes take the colors of another enum (the status of a key result) and none of the kind, the legend gives those
  // colors only: the values of the kind, all alike, would say nothing.
  const others = colorKeys(definition, kindSpec);
  const kindColored = (kindSpec?.values ?? []).some((v) => colorOf(definition.layout?.color, v));
  const keys = [...(others.length && !kindColored ? [] : (kindSpec?.values ?? [])).map((v) => `<span class="key${colorOf(definition.layout?.color, v) ? ` node--${colorOf(definition.layout?.color, v)}` : ''}"${valueOf(v)}></span> ${escapeHtml(v)}`), ...others];
  const legend = keys.length ? `<p class="legend">${keys.join(' ')}</p>` : '';
  const gap = G.nodeSep / 2;
  const nodes: TreeNode[] = [];
  const rows: number[] = []; // the height of each level
  const measure = (element: MapElement, depth: number, top: boolean): TreeNode => {
    const node = { ...element, depth, top, shape: 'box' } as TreeNode; // its box, its kids and its place: below
    const color = boxClasses(definition, node.properties);
    node.box = box(node, definition.layout?.shows, viewOf(definition), `class="node${top ? ' node--top' : ''}${color ? ` ${color}` : ''}"${kindOf(node)}`);
    nodes.push(node);
    rows[depth] = Math.max(rows[depth] ?? 0, node.box.height);
    node.kids = element.children.map((child) => measure(child, depth + 1, false));
    const kidsWidth = node.kids.reduce((sum, kid) => sum + kid.span, 0) + gap * Math.max(0, node.kids.length - 1);
    node.span = Math.max(node.box.width, kidsWidth);
    node.kidsWidth = kidsWidth;
    return node;
  };
  const tops = roots.map((element) => measure(element, 0, true));
  // The map itself as the root (`- Root: yes`): its title and its description, above the first level. It is not an
  // element: it has no anchor and no source.
  let root: Pick<TreeNode, 'name' | 'properties' | 'shape' | 'box'> | undefined;
  if (definition.layout?.root) {
    const description = map.meta.description;
    // A property with what `box` reads of it only.
    const props = new Map<string, Property>(description ? [['description', { label: 'Description', values: [{ text: description }] } as Property]] : []);
    root = { name: map.meta.title ?? 'Map', properties: props, shape: 'box' } as NonNullable<typeof root>;
    root.box = box(root, description ? ['Description'] : [], viewOf(definition), 'class="node node--root"');
  }
  const top = G.pad + (root ? root.box.height + G.rankSep : 0); // the top of the first level
  const paths: string[] = []; // the lines, at right angles
  let width: number;
  let height: number;
  if (definition.layout?.stack) {
    const indent = 24;
    const step = 10; // between two elements of a column
    const first = Math.max(...tops.map((n) => n.box.height));
    let left = G.pad;
    let bottom = 0;
    for (const head of tops) {
      let y = top + first + G.rankSep / 2;
      let right = left + head.box.width;
      const list = (node: TreeNode) => {
        for (const kid of node.kids) {
          kid.left = node.left + indent;
          kid.y = y;
          y += kid.box.height + step;
          right = Math.max(right, kid.left + kid.box.width);
          list(kid);
        }
        // Down from the parent, near its left edge, then across to each child.
        if (!node.kids.length) return;
        const x = node.left + indent / 2;
        const mid = (kid: TreeNode) => kid.y + kid.box.height / 2;
        paths.push(`M${r(x)} ${r(node.y + node.box.height)} V${r(mid(node.kids.at(-1)!))}`, ...node.kids.map((kid) => `M${r(x)} ${r(mid(kid))} H${r(kid.left)}`));
      };
      head.left = left;
      head.y = top;
      list(head);
      bottom = Math.max(bottom, y - step);
      left = right + G.nodeSep;
    }
    width = left - G.nodeSep + G.pad;
    height = Math.max(bottom, top + first) + G.pad;
  } else {
    const place = (node: TreeNode, left: number) => {
      node.left = left + node.span / 2 - node.box.width / 2;
      let x = left + (node.span - node.kidsWidth) / 2;
      for (const kid of node.kids) {
        place(kid, x);
        x += kid.span + gap;
      }
    };
    let left = G.pad;
    for (const head of tops) {
      place(head, left);
      left += head.span + G.nodeSep;
    }
    const rowTop = rows.map((_, d) => top + rows.slice(0, d).reduce((sum, h) => sum + h, 0) + d * G.rankSep);
    for (const n of nodes) n.y = rowTop[n.depth];
    // Down from the parent, across, and down to the child.
    const cx = (n: TreeNode) => n.left + n.box.width / 2;
    for (const n of nodes)
      for (const kid of n.kids) {
        const middle = rowTop[n.depth] + rows[n.depth] + G.rankSep / 2;
        paths.push(`M${r(cx(n))} ${r(n.y + n.box.height)} V${r(middle)} H${r(cx(kid))} V${r(kid.y)}`);
      }
    width = left - G.nodeSep + G.pad;
    height = rowTop.at(-1)! + rows.at(-1)! + G.pad;
  }

  // The root, centered above the first level, joined to each of its elements.
  let rootEdges = '';
  let rootSvg = '';
  if (root) {
    const cx = (n: TreeNode) => n.left + n.box.width / 2;
    const center = (cx(tops[0]) + cx(tops.at(-1)!)) / 2;
    const left = Math.max(G.pad, center - root.box.width / 2);
    width = Math.max(width, left + root.box.width + G.pad);
    const middle = top - G.rankSep / 2;
    const bus = tops.length > 1 ? `M${r(cx(tops[0]))} ${r(middle)} H${r(cx(tops.at(-1)!))}` : '';
    const lines = [`M${r(left + root.box.width / 2)} ${r(G.pad + root.box.height)} V${r(middle)}`, bus, ...tops.map((t) => `M${r(cx(t))} ${r(middle)} V${r(top)}`)].filter(Boolean);
    rootEdges = lines.map((d) => `<g class="edge edge--root"><path d="${d}"/></g>`).join('');
    rootSvg = `<g class="node node--root" data-depth="0"><rect x="${r(left)}" y="${r(G.pad)}" width="${r(root.box.width)}" height="${r(root.box.height)}"/>${boxText(root, left + root.box.width / 2, G.pad)}</g>`;
  }

  const edgeSvg = paths.map((d) => `<g class="edge"><path d="${d}"/></g>`).join('');
  const nodeSvg = nodes
    .map((n) => {
      const { width: w, height: h } = n.box;
      const text = boxText(n, n.left + w / 2, n.y);
      const tip = tipOf(n) && `<title>${escapeHtml(tipOf(n))}</title>`;
      // Every element can be chosen (data-el); only the first level has an anchor; a link to an item reaches it by data-src.
      const id = `${n.top ? ` id="${anchorOf(n.name)}"` : ''} data-el="${anchorOf(n.name)}" data-depth="${n.depth + 1}"${kindOf(n)}`;
      const color = boxClasses(definition, n.properties);
      return `<g class="node${n.top ? ' node--top' : ''}${color ? ` ${color}` : ''}"${id}${srcOf(n.src)}>${tip}<rect x="${r(n.left)}" y="${r(n.y)}" width="${r(w)}" height="${r(h)}"/>${text}</g>`;
    })
    .join('');
  return `${legend}<div class="graph"><svg viewBox="0 0 ${r(width)} ${r(height)}" width="${r(width)}" height="${r(height)}" role="img" aria-label="${escapeHtml(`${nodes.length} ${pluralOf(definition.element ?? 'element')}`)}"><g class="edges">${rootEdges}${edgeSvg}</g><g class="nodes">${rootSvg}${nodeSvg}</g></svg></div>`;
}

/** A tree drawn as a board (`- Lanes: <property>`), as a story map: the first level as a header (the backbone), the
 *  second as columns under it, and each element under the second level as a card in its column, in a lane per value of
 *  the property (in the order the steps write them; a card without the value in a last lane). HTML, not SVG: the cards
 *  wrap their text. */
function renderBoard(roots: MapElement[], definition: Definition) {
  const key = definition.layout!.lanes!.toLowerCase();
  const label = definition.layout!.lanes!;
  const columns: { top: MapElement; step?: MapElement }[] = roots.flatMap((top) => (top.children.length ? top.children.map((step) => ({ top, step })) : [{ top }]));
  const cardsOf = (step?: MapElement) => (step ? step.children.flatMap(function all(c: MapElement): MapElement[] { return [c, ...c.children.flatMap(all)]; }) : []);
  const laneOf = (card: MapElement) => {
    const p = card.properties.get(key);
    return p && !p.isUndefined && p.raw ? p.raw : undefined;
  };
  // The lanes: for an enum, in the order of its values, as the columns of a board; else in the order of each step (its
  // cards written by lane: MVP, then Release 2), combined across the steps; where nothing orders two lanes, or the steps
  // disagree, in the order they first come.
  const values = definition.properties.find((p) => p.name.toLowerCase() === key && p.kind === 'enum')?.values;
  const rank = (v: string) => {
    const k = values!.findIndex((x) => x.toLowerCase() === v.toLowerCase());
    return k < 0 ? values!.length : k; // not one of its values: last
  };
  const inOrder = (cards: MapElement[]) => [...new Set(cards.map(laneOf).filter(Boolean))] as string[];
  const found = inOrder(columns.flatMap((c) => cardsOf(c.step)));
  const pairs = new Set(columns.flatMap(({ step }) => inOrder(cardsOf(step)).flatMap((a, i, order) => order.slice(i + 1).map((b) => `${a}\n${b}`))));
  const before = (a: string, b: string) => pairs.has(`${a}\n${b}`) && !pairs.has(`${b}\n${a}`); // a step puts a before b, none after
  const lanes: string[] = [];
  for (let left = found; left.length; ) {
    const next = left.find((b) => !left.some((a) => before(a, b))) ?? left[0]; // a loop across steps: the first to come
    lanes.push(next);
    left = left.filter((l) => l !== next);
  }
  if (values) lanes.sort((a, b) => rank(a) - rank(b));
  const rest = columns.some((c) => cardsOf(c.step).some((card) => !laneOf(card)));
  const el = (n: MapElement, depth: number) => ` data-el="${anchorOf(n.name)}" data-depth="${depth}"${srcOf(n.src)}`;
  const tip = (n: MapElement) => (tipOf(n) ? ` title="${escapeHtml(tipOf(n))}"` : '');
  const backbone = roots
    .map((top) => `<th colspan="${Math.max(1, top.children.length)}" id="${anchorOf(top.name)}"${el(top, 1)}${tip(top)}>${escapeHtml(top.name)}</th>`)
    .join('');
  const steps = columns.map(({ step }) => (step ? `<th${el(step, 2)}${tip(step)}>${escapeHtml(step.name)}</th>` : '<th class="board-none"></th>')).join('');
  const lane = (name: string | undefined, keeps: (card: MapElement) => unknown) => {
    const cells = columns
      .map(({ step }) => {
        const cards = cardsOf(step).filter(keeps);
        return `<td>${cards.length ? `<ul>${cards.map((c) => `<li class="board-card"${el(c, 3)}${tip(c)}>${escapeHtml(c.name)}</li>`).join('')}</ul>` : ''}</td>`;
      })
      .join('');
    const count = columns.reduce((sum, { step }) => sum + cardsOf(step).filter(keeps).length, 0);
    const value = name ? valueOf(name) : ' data-value="none"';
    return `<tr class="board-lane"${value}><th colspan="${columns.length}">${escapeHtml(name ?? `No ${label.toLowerCase()}`)} <span class="board-count">${count}</span></th></tr><tr class="board-cards"${value}>${cells}</tr>`;
  };
  const body = lanes.map((name) => lane(name, (c) => laneOf(c) === name)).join('') + (rest ? lane(undefined, (c) => !laneOf(c)) : '');
  return `<div class="board"><table><thead><tr class="board-backbone">${backbone}</tr><tr class="board-steps">${steps}</tr></thead><tbody>${body}</tbody></table></div>`;
}

/** The context, as paragraphs and lists. Links and inline Markdown are shown as written. */
function renderContext(map: MapDoc, links: PageLinks) {
  const section = map.sections.find((s) => s.name.toLowerCase() === 'context');
  if (!section) return '';
  const blocks = section.lines.join('\n').split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const html = blocks.map((block) => {
    const lines = block.split('\n');
    if (lines.every((l) => /^\s*[-*+]\s+/.test(l))) return `<ul>${lines.map((l) => `<li>${links.linkify(l.replace(/^\s*[-*+]\s+/, ''))}</li>`).join('')}</ul>`;
    return `<p>${lines.map(links.linkify).join('<br>')}</p>`;
  });
  return `<section class="context" id="${anchorOf(section.name)}"${srcOf(section.src)}>${html.join('')}</section>`;
}

/** The open questions, as a list, an assumption under its question; then, folded under them, the questions answered
 *  (those with a `Decision`), each with the date of its decision when it gives one, and its decision under it. */
function renderOpenQuestions(map: MapDoc, links: PageLinks) {
  const section = map.sections.find((s) => s.name.toLowerCase() === 'open questions');
  const items = section ? readItems(section.lines, section.start) : [];
  const open = items.filter((item) => !decided(item));
  const closed = items.filter(decided);
  const dateOf = (item: Item) => {
    const decision = item.children.find((c) => readProperty(c)?.label.toLowerCase() === 'decision');
    return /\b\d{4}-(?:Q[1-4]|\d{2}(?:-\d{2})?)\b/.exec(readProperty(decision!)!.value)?.[0];
  };
  const answered = closed
    .map((item) => `<li${srcOf(item.src)}>${links.linkify(item.text)}${dateOf(item) ? ` <time>${escapeHtml(dateOf(item)!)}</time>` : ''}${list(item.children, links.linkify)}</li>`)
    .join('');
  const count = `${closed.length} answered question${closed.length === 1 ? '' : 's'}`;
  const closedHtml = closed.length ? `<details class="decisions"><summary class="button button--ghost">${count}</summary><ul>${answered}</ul></details>` : '';
  if (!items.length) return '';
  return `<section class="open-questions" id="${anchorOf(section!.name)}"${srcOf(section!.src)}>${list(open, links.linkify)}${closedHtml}</section>`;
}

/** The drawings, by shape. */
const DRAW: Record<Shape, Draw> = { cards: renderCards, sequence: renderGrid, graph: renderGraph, tree: renderTree };

/** The links of a map, for the panel of the page: who cites each element, and the broken links written in each
 *  element (`at`, its anchor; empty for the map itself). */
export function linksData(map: MapDoc, links: PageLinks) {
  const own = new Set(elementsOf(map).map((e) => nameKey(e.name)));
  const sourceHref = (l: IndexedLink) => {
    const element = l.from.file.elements.get(nameKey(l.from.element));
    return links.hrefOf(l.from.file, element && anchorOf(element.name));
  };
  return {
    cited: links.backlinks.map((l) => ({
      at: l.element ? anchorOf(l.element.name) : '',
      map: l.from.file.title,
      element: l.from.element,
      property: l.from.property,
      href: sourceHref(l),
      mapHref: links.hrefOf(l.from.file, ''),
    })),
    broken: links.broken.map((l) => ({
      at: own.has(nameKey(l.from.element)) ? anchorOf(l.from.element) : '',
      where: `${l.from.element}${l.from.property ? ` (${l.from.property})` : ''}`,
      link: l.raw,
      problem: l.problem,
    })),
  };
}

/** A map as HTML: context, drawing, open questions. `definition` is the parsed type
 *  definition; `links` comes from the folder (`linksOf`). */
export async function drawMap(map: MapDoc, typeDefinition: Definition, links: PageLinks) {
  const definition = definitionFor(typeDefinition, map.meta); // with the settings its front matter chooses
  hiddenLabels.clear(); // the style of its type
  const layoutError = definition.layoutError ? `<p class="error">Layout not used: ${escapeHtml(definition.layoutError)}</p>` : '';
  const { views: all = [], ...main } = (definition.layout ?? { shape: definition.shape }) as Layout;
  // `views: <name>, <name>` in the front matter keeps only these views of the type (`views: none`, none of them).
  const asked = map.meta.views?.split(',').map(nameKey).filter(Boolean);
  const views = asked ? all.filter((view) => asked.includes(nameKey(view.name!))) : all;
  // A sentence above a view, that says what it is for: for the main view, the `description` of the map, else the one of
  // its layout; for another view, the one of its layout.
  // The keys of the front matter a view asks for (`- Meta:`), each with its value, as a line under its description.
  const metaOf = (view: Layout) => {
    const rows = (view.meta ?? []).filter((key) => map.meta[key]).map((key) => `<div><dt>${escapeHtml(key.charAt(0).toUpperCase() + key.slice(1))}</dt><dd>${escapeHtml(map.meta[key]!)}</dd></div>`);
    return rows.length ? `<dl class="view-meta">${rows.join('')}</dl>` : '';
  };
  const described = (text: string | undefined, html: string, view?: Layout) => `${text ? `<p class="view-description">${escapeHtml(text)}</p>` : ''}${view ? metaOf(view) : ''}${html}`;
  const mainName = main.name ?? 'Map'; // the main view: the whole map, named by its layout (`- Name:`) or "Map"
  // A root of a tree (`- Root: yes`) already shows the description of the map.
  let drawing = described(main.root ? main.description : (map.meta.description ?? main.description), await drawView(map, definition, main, links), main);
  if (!views.length) drawing = `<section class="view" data-view-name="${nameKey(mainName)}">${drawing}</section>`;
  else {
    // The other views of the type, as tabs; their elements keep no anchor, which belongs to the main view.
    const panels = [drawing, ...(await Promise.all(views.map(async (view) => described(view.description, await drawView(map, definition, view, links), view))))];
    const names = [mainName, ...views.map((view) => view.name!)];
    const tabs = `<div class="views" role="tablist">${names.map((name, k) => `<button role="tab" data-view="${k}" aria-selected="${k === 0}">${escapeHtml(name)}</button>`).join('')}</div>`;
    drawing = tabs + panels.map((html, k) => `<section class="view" data-view-panel="${k}" data-view-name="${nameKey(names[k])}"${k ? ' hidden' : ''}>${k ? html.replace(/ id="[^"]*"(?= data-el=)/g, '') : html}</section>`).join('');
  }
  return `${renderContext(map, links)}${layoutError}${drawing}${renderOpenQuestions(map, links)}`;
}

/** One view of a map (the main one or another, from the layout of the type): the elements it keeps (`where`), the
 *  arrows it draws (`arrows`, the links of these properties), drawn in its shape. The elements of a tree drawn in
 *  another shape are all its elements, in order, each with the name of its parent. */
async function drawView(map: MapDoc, definition: Definition, view: Layout, links: PageLinks) {
  const draw = DRAW[view.shape];
  if (!draw) throw new Error(`the shape "${view.shape}" is not drawn yet (only ${Object.keys(DRAW).join(', ')}).`);
  let elements = elementsOf(map, definition.shape);
  if (definition.shape === 'tree' && view.shape !== 'tree') {
    const all = (list: MapElement[], parent?: string, depth = 1): MapElement[] => list.flatMap((e) => [{ ...e, parent, depth, children: [] }, ...all(e.children, e.name, depth + 1)]);
    elements = all(elements);
  }
  if (view.where) {
    const { key, value, isDefault } = view.where;
    const keeps = (e: MapElement) => {
      const p = e.properties.get(key);
      return p ? p.values.some((v) => v.text.toLowerCase() === value) : isDefault;
    };
    const removed = new Set(elements.filter((e) => !keeps(e)).map((e) => nameKey(e.name)));
    elements = elements.filter(keeps).map((e) => ({ ...e, arrows: e.arrows.filter((a) => a.file || !removed.has(nameKey(a.target))) }));
  }
  if (view.arrows) {
    // An arrow for each link of these properties, labeled by the text before the link (`has 0..n [[#Relative]]`).
    const arrowsOf = (e: MapElement) =>
      view.arrows!.flatMap((name) =>
        (e.properties.get(name.toLowerCase())?.values ?? []).flatMap((v) =>
          [...v.text.matchAll(/\[\[[^\]]*\]\]/g)].map((m) => readArrow(`${v.text.slice(0, m.index).replace(/[→:]\s*$/, '').trim()} → ${m[0]}`)).filter(Boolean) as Arrow[],
        ),
      );
    elements = elements.map((e) => ({ ...e, arrows: arrowsOf(e) }));
  }
  if (!elements.length) return '<p class="empty">No elements yet.</p>';
  return draw({ ...definition, shape: view.shape, layout: view }, elements, { map, links });
}

/** A plain Markdown file (research notes, a PRD…), shown as written. */
export function drawPlain(text: string) {
  return `<pre class="plain">${escapeHtml(text)}</pre>`;
}
