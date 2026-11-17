// The checks of a map against the definition of its type, with no file system: shared by the check (check.ts), which
// reports them for a folder, and the page (viewer.ts), which shows what is still wrong in the map shown, as it is
// edited. Generic: every check comes from the definition,
// never from a type.

import type { Definition, IndexedFile, IndexedLink, IndexedMap, Labeled, MapElement, Property, PropertySpec } from './model.ts';
import { cardinalityOf, elementsOf, MAP_SETTINGS, nameKey, readArrow, readNumber, readProperty, RESERVED } from './read.ts';

/** What the check reports: an error fails it, a warning does not; `line`, the line of the file (from 1), when known;
 *  `at`, the name of the element it is about, for the page to show it. */
export interface Issue {
  level: 'error' | 'warning';
  where: string;
  message: string;
  line?: number;
  at?: string;
}

/** The line of the file (from 1) of a place read (`src`, from 0). */
const lineOf = (src?: { line: number }) => (src ? src.line + 1 : undefined);

/** `, did you mean "…"?` with the candidate closest to a word mistyped (compared as names, by edit distance), or
 *  nothing when none is close. */
export function didYouMean(word: string, candidates: Iterable<string>) {
  const a = nameKey(word);
  const distance = (b: string) => {
    let row = Array.from({ length: b.length + 1 }, (_, k) => k);
    for (let i = 1; i <= a.length; i++) {
      const next = [i];
      for (let j = 1; j <= b.length; j++) next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      row = next;
    }
    return row[b.length];
  };
  let best: { name: string; d: number } | undefined;
  for (const name of candidates) {
    const d = distance(nameKey(name));
    if (d > 0 && d <= Math.max(2, Math.floor(a.length / 3)) && (!best || d < best.d)) best = { name, d };
  }
  return best ? `, did you mean "${best.name}"?` : '';
}

/** The errors of the values of one property, by the attributes of its kind. */
function checkValues(where: string, property: Pick<Property, 'isUndefined' | 'values' | 'src'>, spec: PropertySpec, issues: Issue[], at?: string) {
  if (property.isUndefined) return;
  let line = lineOf(property.src ?? property.values[0]?.src);
  const error = (message: string) => issues.push({ level: 'error', where, message, line, at });
  if (spec.single && property.values.length > 1) error(`one value only, ${property.values.length} written`);
  for (const { text, children, src } of property.values) {
    line = lineOf(src) ?? line;
    const value = text.trim();
    if (value.toLowerCase() === 'none') continue; // the source says there is none: valid for every kind, as `undefined`
    // The details of a value, when its property declares them (`- Details:` in the definition): each one checked as a
    // property; an unknown one is a warning, as an unknown property is.
    for (const detail of spec.details ? ((children ?? []).map(readProperty).filter(Boolean) as Labeled[]) : []) {
      const d = spec.details!.find((s) => s.name.toLowerCase() === detail.label.toLowerCase());
      const under = `${where} › ${value} › ${detail.label}`;
      if (!d) issues.push({ level: 'warning', where: under, message: `not a detail of ${spec.name}${didYouMean(detail.label, spec.details!.map((s) => s.name))}`, line, at });
      else checkValues(under, { isUndefined: detail.value.toLowerCase() === 'undefined', values: detail.value ? [{ text: detail.value, children: detail.children, src }] : detail.children }, d, issues, at);
    }
    if (spec.kind === 'number') {
      const number = readNumber(value);
      if (!number) error(`"${value}" is not a number`);
      else {
        const n = number.value;
        if ((spec.min !== undefined && n < spec.min) || (spec.max !== undefined && n > spec.max)) error(`${n} is out of the scale, from ${spec.min ?? '…'} to ${spec.max ?? '…'}`);
        if (number.word && !spec.note) error(`"${value}": no word after the number for this property`);
      }
    } else if (spec.kind === 'enum' && spec.values && !spec.values.some((v) => v.toLowerCase() === value.toLowerCase())) {
      error(`"${value}" is not one of ${spec.values.join(', ')}${didYouMean(value, spec.values)}`);
    } else if (spec.kind === 'date' && !/^\d{4}(?:-(?:0[1-9]|1[0-2])(?:-(?:0[1-9]|[12]\d|3[01]))?|-Q[1-4])?$/.test(value)) {
      error(`"${value}" is not a date (YYYY, YYYY-MM, YYYY-Qn or YYYY-MM-DD)`);
    } else if (spec.kind === 'link' && !/\[\[[^\]]*\]\]/.test(value)) {
      error(`"${value}" is not a link ([[file#Name]])`);
    }
  }
}

/** The issues of the elements of a map, and of the elements under them in a tree; a name is unique in the whole map. */
function checkElements(elements: MapElement[], definition: Definition, issues: Issue[], prefix = '', seen = new Set<string>()) {
  const specs = new Map(definition.properties.map((p) => [p.name.toLowerCase(), p]));
  for (const element of elements) {
    const where = `${prefix}${element.name}`;
    const at = element.name;
    if (seen.has(nameKey(element.name))) issues.push({ level: 'error', where, message: `another ${definition.element ?? 'element'} has this name`, line: lineOf(element.src), at });
    seen.add(nameKey(element.name));
    for (const [key, property] of element.properties) {
      const spec = specs.get(key) ?? specs.get('*'); // `## *`: any other property, with its kind
      if (spec) checkValues(`${where} › ${property.label}`, property, spec, issues, at);
      else issues.push({ level: 'warning', where: `${where} › ${property.label}`, message: `not a property of ${definition.type}${didYouMean(property.label, definition.properties.map((p) => p.name).filter((n) => n !== '*'))}`, line: lineOf(property.src ?? property.values[0]?.src) ?? lineOf(element.src), at });
    }
    checkElements(element.children ?? [], definition, issues, `${where} › `, seen);
  }
}

/** The first line of a file (from 1) at or after the line `from` (from 0) that holds every text given, if any. */
export function lineWith(file: IndexedFile, from: number | undefined, ...texts: string[]) {
  const k = file.text.split(/\r\n|\r|\n/).findIndex((l, k) => k >= (from ?? 0) && texts.every((t) => l.includes(t)));
  return k < 0 ? undefined : k + 1;
}

/** The key of an arrow to a missing element, already an error: its link is not reported again as broken. */
const arrowKey = (path: string, element: string, target: string) => `${path}|${element}|${nameKey(target)}`;

/** Where a broken link is (its element, and its property), for its issue; none for an arrow to a missing element, an
 *  error already (`missingArrows`, from checkMap). */
export function brokenLinkWhere(link: IndexedLink, missingArrows: Set<string>) {
  const own = /^\[\[#([^\]|#]*)\]\]$/.exec(link.raw);
  if (own && missingArrows.has(arrowKey(link.from.file.path, link.from.element, own[1]))) return undefined;
  return `${link.from.element}${link.from.property ? ` › ${link.from.property}` : ''}`;
}

/** The issues of one map; `missingArrows` gets the keys of its arrows to a missing element. */
export function checkMap(file: IndexedMap, definition: Definition, missingArrows = new Set<string>()) {
  const issues: Issue[] = [];
  const elements = elementsOf(file.map, definition.shape);
  checkElements(elements, definition, issues);
  if (definition.shape === 'graph') {
    const names = new Set(elements.map((e) => nameKey(e.name)));
    for (const element of elements) {
      for (const arrow of element.arrows) {
        // `- Heads: cardinality` in the layout: each label ends with a cardinality, drawn at the end of the line.
        const line = lineWith(file, element.src?.line, '→', arrow.target);
        if (definition.layout?.heads === 'cardinality' && !cardinalityOf(arrow.label)) issues.push({ level: 'warning', where: element.name, message: `the arrow to "${arrow.target}" has no cardinality at the end of its label (1, 0..1, 1..n, 0..n)`, line, at: element.name });
        if (arrow.file || arrow.target.toLowerCase() === 'undefined') continue; // another file: its link is checked below
        if (!arrow.target) issues.push({ level: 'error', where: element.name, message: 'an arrow has no target', line, at: element.name });
        else if (!names.has(nameKey(arrow.target))) {
          const message = `arrow to "${arrow.target}": no ${definition.element ?? 'element'} of this file has this name${didYouMean(arrow.target, elements.map((e) => e.name))}`;
          issues.push({ level: 'error', where: element.name, message, line, at: element.name });
          missingArrows.add(arrowKey(file.path, element.name, arrow.target));
        }
      }
    }
  }
  // An element holds list items only: a line that is not an item, nor the continuation of one, is free text; a `###`
  // heading is said apart, the mistake being then the level.
  for (const section of file.map.sections) {
    if (RESERVED.includes(section.name.toLowerCase())) continue;
    const k = section.lines.findIndex((line) => line.trim() && !/^\s*[-*+]\s/.test(line) && !/^\s/.test(line));
    if (k < 0) continue;
    const heading = /^#{3,}\s/.test(section.lines[k]);
    const message = heading ? 'a heading under an element: an element is a ## heading, and what is under it, list items' : 'free text under an element: write it as a property';
    issues.push({ level: 'warning', where: section.name, message, line: section.start + k + 1, at: section.name });
  }
  // An item right under an element, in a shape other than a tree (whose items are elements), is a property or, in a
  // graph, an arrow; else it is lost: `- Kind : screen`, its label followed by a space, is a sentence.
  if (definition.shape !== 'tree') {
    for (const section of file.map.sections) {
      if (RESERVED.includes(section.name.toLowerCase())) continue;
      section.lines.forEach((line, k) => {
        const item = /^[-*+]\s+(.*)$/.exec(line)?.[1];
        if (!item || readProperty({ text: item, children: [] }) || (definition.shape === 'graph' && readArrow(item))) return;
        const hint = / :/.test(item) ? ', with no space before the colon' : '';
        issues.push({ level: 'warning', where: section.name, message: `"${item}" is neither a property${definition.shape === 'graph' ? ' nor an arrow' : ''}: write it \`Label: value\`${hint}`, line: section.start + k + 1, at: section.name });
      });
    }
  }
  if (definition.layoutError) issues.push({ level: 'error', where: 'layout', message: definition.layoutError });
  // The settings of the drawing a map chooses for itself (`direction: right`), for a map drawn as a graph.
  for (const [key, values] of Object.entries(MAP_SETTINGS)) {
    const value = file.map.meta[key]?.trim().toLowerCase();
    if (value === undefined) continue;
    if ((definition.layout?.shape ?? definition.shape) !== 'graph') issues.push({ level: 'warning', where: 'front matter', message: `${key}: only for a map drawn as a graph` });
    else if (!values.includes(value)) issues.push({ level: 'error', where: 'front matter', message: `${key} is ${values.join(', ')}` });
  }
  // `views:` names views of the layout of the type (or `none`).
  const views = new Set((definition.layout?.views ?? []).map((view) => nameKey(view.name!)));
  for (const name of file.map.meta.views?.split(',').map((n) => n.trim()).filter(Boolean) ?? [])
    if (!['none', 'map'].includes(nameKey(name)) && !views.has(nameKey(name)))
      issues.push({ level: 'warning', where: 'front matter', message: `views: no view "${name}" in the layout of ${definition.type}` });
  return issues;
}
