// The details of what is clicked on a map, as the panel of maps.html shows them (renderer/viewer.ts): the map itself
// (About this map), its open questions, what the check finds wrong, an element, a column, a participant, a value. Ported
// from viewer.ts with the map, its index and its drawing passed in (`DetailsContext`) rather than read from the page:
// several maps can be open at once in Obsidian. The HTML and its classes are those of maps.html, so that style.css and the
// style of a type (`.details-body …`) apply as they do there.

import { chipOf, linksData, propOf, valueOf } from '../renderer/draw.ts';
import type { Issue } from '../renderer/checks.ts';
import { anchorOf, escapeHtml, linksOf } from '../renderer/links.ts';
import type { Definition, ElementLink, IndexedMap, Item, LinkIndex, MapElement, Property, PropertySpec } from '../renderer/model.ts';
import { elementsOf, nameKey, pluralOf, readProperty, RESERVED } from '../renderer/read.ts';
import { arrowsOf } from './canvas.ts';
import { hrefOf } from './store.ts';
import { issuesTitle } from './check.ts';

/** Something drawn, in HTML or in an SVG. */
export type Drawn = HTMLElement | SVGElement;

/** What a panel of details needs: the map, the index of the vault, the definition of its type, its context and open
 *  questions as drawn (`aside`), its drawing (`page`, to find what to select), and its issues. */
export interface DetailsContext {
  file: IndexedMap;
  index: LinkIndex;
  definition?: Definition;
  aside?: HTMLElement;
  page: HTMLElement;
  issues: Issue[];
  /** The id of the drawing, for the markers of its arrows. */
  id: string;
}

/** What the panel shows: `kicker` and `title` as HTML, its content, the line of the file (from 0), what it selects. */
export interface Shown {
  kicker: string;
  title: string;
  html: string;
  line?: number;
  selected?: Iterable<Drawn>;
  /** What the open questions shown are about, brought out on the map. */
  asked?: Element[][];
}

export type Details = (ctx: DetailsContext) => Shown | undefined;

const lineOf = (el?: Drawn | null) => (el?.dataset.src ? Number(el.dataset.src.split(':')[0]) : undefined);
const quoteOr = (link: (text: string) => string, t: string) => (/^["“«]/.test(t) ? `<blockquote>${link(t)}</blockquote>` : `<p>${link(t)}</p>`);
const specOf = (ctx: DetailsContext, label: string, specs = ctx.definition?.properties) => specs?.find((s) => nameKey(s.name) === nameKey(label)) ?? specs?.find((s) => s.name === '*');
const enumClass = (spec?: PropertySpec) => (spec?.kind === 'enum' ? ' class="details-enum"' : '');
const part = (title: string, html?: string | 0 | false, name?: string) => (html ? `<section class="details-part"${name ? ` data-part="${name}"` : ''}><h3>${escapeHtml(title)}</h3>${html}</section>` : '');
const linkCard = (name: string, { map, property }: { map?: string; property?: string | null } = {}) =>
  `${map ? `<span class="details-link-map">${escapeHtml(map)}</span>` : ''}<span class="details-link-name" title="${escapeHtml(name)}">${escapeHtml(name)}</span>${property ? `<span class="details-link-prop">${escapeHtml(property)}</span>` : ''}`;
type Cited = ReturnType<typeof linksData>['cited'];
const citedHtml = (items: Cited) => (items.length ? `<ul class="details-links">${items.map((c) => `<li><a class="details-link" href="${escapeHtml(c.href)}">${linkCard(c.element, c)}</a></li>`).join('')}</ul>` : '');
const citingMapsHtml = (items: Cited) => {
  const maps = new Map<string, { title: string; n: number }>();
  for (const c of items) maps.set(c.mapHref, { title: c.map, n: (maps.get(c.mapHref)?.n ?? 0) + 1 });
  return maps.size ? `<ul class="details-links">${[...maps].map(([href, m]) => `<li><a class="details-link" href="${escapeHtml(href)}">${linkCard(m.title, { property: `${m.n} link${m.n === 1 ? '' : 's'}` })}</a></li>`).join('')}</ul>` : '';
};
const brokenHtml = (items: ReturnType<typeof linksData>['broken'], where: boolean) =>
  items.length ? `<ul>${items.map((b) => `<li>${where ? `${escapeHtml(b.where)}: ` : ''}<code>${escapeHtml(b.link)}</code>, ${escapeHtml(b.problem!)}</li>`).join('')}</ul>` : '';
const sub = (item: Item, linkify: (text: string) => string) => (item.children.length ? `<ul>${item.children.map((c) => `<li>${linkify(c.text)}</li>`).join('')}</ul>` : '');
/** A value without the arrow that ends it, to another value of the map. */
const bare = (text: string) => text.replace(/\s*(?:→|->)\s*\[\[#[^\]]*\]\]\s*$/, '');
/** The view shown: what is selected and looked for is in it. */
const shownView = (page: HTMLElement) => page.querySelector<HTMLElement>('.view:not([hidden])') ?? page;

/** The context of the map, its properties (its front matter) and its links with other maps. */
export const aboutDetails: Details = (ctx) => {
  const { file } = ctx;
  const context = ctx.aside?.querySelector<HTMLElement>('.context');
  const { type, updated } = file.map.meta;
  const properties = Object.entries(file.map.meta)
    .filter(([key]) => !['type', 'title', 'updated'].includes(key))
    .map(([key, value]) => `<div><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value!)}</dd></div>`);
  const data = linksData(file.map, linksOf(ctx.index, file.key));
  return {
    line: lineOf(context) ?? 0,
    kicker: `About this map${type ? ` <span class="map-type">${escapeHtml(type)}</span>` : ''}`,
    title: escapeHtml(file.title),
    html:
      (updated ? `<p class="details-updated">Updated ${escapeHtml(updated)}</p>` : '') +
      (context ? `<div class="details-text">${context.innerHTML}</div>` : '<p class="details-empty">No context yet: write it under "## Context", in the Markdown.</p>') +
      part('Properties', properties.length && `<dl class="details-pairs">${properties.join('')}</dl>`, 'properties') +
      part('Cited in other maps', citingMapsHtml(data.cited)) +
      part('Broken links', brokenHtml(data.broken, true)),
  };
};

/** The open questions of the map, then the decisions taken; what each is about, brought out on the map. */
export const questionsDetails: Details = (ctx) => {
  const { file, page } = ctx;
  const questions = ctx.aside?.querySelector<HTMLElement>('.open-questions');
  if (!questions) return;
  const open = [...questions.querySelectorAll<HTMLElement>(':scope > ul > li')];
  const n = open.length;
  const copy = questions.cloneNode(true) as HTMLElement;
  const here = `${hrefOf(file, '')}/`;
  const asked = open.map((li) =>
    [...li.querySelectorAll<HTMLAnchorElement>(':scope > a[href], :scope > :not(ul) a[href]')]
      .map((a) => a.getAttribute('href')!)
      .filter((href) => href.startsWith(here))
      .flatMap((href) => {
        const target = targetOf(page, href.slice(here.length));
        if (!target) return [];
        if (target.matches('tbody th[data-el]')) return [target.parentElement!];
        if (target.matches('thead th[data-el]')) return [target, ...columnOf(target)];
        return pointedAt(ctx, target)?.drawn ?? [target];
      }),
  );
  return {
    asked,
    line: lineOf(questions),
    kicker: escapeHtml(file.title),
    title: `${n} open question${n === 1 ? '' : 's'}`,
    html: `<div class="details-text details-questions">${copy.innerHTML}</div>`,
  };
};

/** What is still wrong in the map: each issue with where it is, a card that opens its element, and its line. */
export const issuesDetails: Details = (ctx) => {
  if (!ctx.issues.length) return;
  const items = ctx.issues.map((issue) => {
    const text = `<span class="details-link-name">${escapeHtml(issue.where)}${issue.line ? ` <span class="maps-md-line">line ${issue.line}</span>` : ''}</span><span class="details-issue${issue.level === 'error' ? ' details-issue--error' : ''}">${escapeHtml(issue.message)}</span>`;
    const opens = issue.at && !RESERVED.includes(issue.at.toLowerCase());
    const line = issue.line ? ` data-source-line="${issue.line}"` : '';
    return `<li>${opens ? `<button class="details-link" data-details-el="${anchorOf(issue.at!)}"${line}>${text}</button>` : `<button class="details-link"${line}>${text}</button>`}</li>`;
  });
  return { kicker: escapeHtml(ctx.file.title), title: issuesTitle(ctx.issues), html: `<ul class="details-links details-issues">${items.join('')}</ul>` };
};

/** The open questions about an element or a value, each with its assumption. */
function questionsHtml(ctx: DetailsContext, about: (reached: ElementLink) => boolean) {
  const { questions, linkify } = linksOf(ctx.index, ctx.file.key);
  const mine = questions.filter((q) => q.targets.some(about));
  return part('Open questions', mine.length && `<ul class="details-questions">${mine.map((q) => `<li>${linkify(q.item.text)}${sub(q.item, linkify)}</li>`).join('')}</ul>`);
}

/** An element: its properties, its arrows in and out, its children, the maps that cite it, its broken links. */
export const elementDetails =
  (anchor: string): Details =>
  (ctx) => {
    const { file, page, definition } = ctx;
    const all = (list: MapElement[], path: MapElement[]): { el: MapElement; path: MapElement[] }[] => list.flatMap((el) => [{ el, path }, ...all(el.children, [...path, el])]);
    const found = all(elementsOf(file.map, definition?.shape), []).find(({ el }) => anchorOf(el.name) === anchor);
    if (!found) return;
    const { el: element, path } = found;
    const { links: linkify } = linksOf(ctx.index, file.key);
    let colors: Record<string, string> | undefined;
    const tintOf = (v: Item) => (chipOf(colors, v.text) ? ` class="${chipOf(colors, v.text)}"` : '');
    const value = (v: Item) =>
      v.children.length && v.src
        ? `<li class="details-more" data-details-line="${v.src.line}">${linkify(bare(v.text))}<span class="details-open" title="${v.children.length} detail${v.children.length === 1 ? '' : 's'}">›</span></li>`
        : `<li${valueOf(v.text)}${tintOf(v)}>${linkify(bare(v.text))}</li>`;
    const values = (p: Property) => {
      colors = specOf(ctx, p.label)?.kind === 'enum' ? definition?.layout?.color : undefined;
      return p.isUndefined
        ? `<p class="details-empty">Not said</p>`
        : p.values.length === 1 && !p.values[0].children.length
          ? quoteOr(linkify, bare(p.values[0].text)).replace(/^<(p|blockquote)>/, `<$1${valueOf(p.values[0].text)}${tintOf(p.values[0])}>`)
          : `<ul>${p.values.map(value).join('')}</ul>`;
    };
    const rows = [...element.properties.values()].map((p) => `<div${propOf(p.label)}${enumClass(specOf(ctx, p.label))}><dt>${escapeHtml(p.label)}</dt><dd>${values(p)}</dd></div>`);
    const arrowHtml = (label: string, name: string, other?: string) => {
      const tag = label ? `<span class="details-arrow-label">${escapeHtml(label)}</span>` : '';
      const known = name && name !== 'undefined' && !other;
      const card = known
        ? `<button class="details-link" data-details-el="${anchorOf(name)}">${linkCard(name)}${tag}</button>`
        : `<span class="details-link details-link--none">${linkCard(other ? `${other} › ${name}` : 'Not known')}${tag}</span>`;
      return `<li${valueOf(label)}>${card}</li>`;
    };
    const arrows = element.arrows.map((a) => arrowHtml(a.label, a.target, a.file)).join('');
    const arrowsIn = elementsOf(file.map, definition?.shape)
      .flatMap((from) => from.arrows.filter((a) => !a.file && nameKey(a.target) === nameKey(element.name)).map((a) => arrowHtml(a.label, from.name)))
      .join('');
    const children = element.children.map((c) => `<li><button class="details-link" data-details-el="${anchorOf(c.name)}">${linkCard(c.name)}</button></li>`).join('');
    const up = path.map((p) => `<button class="details-up" data-details-el="${anchorOf(p.name)}" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</button>`).join(' › ');
    const data = linksData(file.map, linksOf(ctx.index, file.key));
    const noun = definition?.element ?? definition?.type ?? '';
    return {
      line: element.src?.line,
      selected: [...page.querySelectorAll<Drawn>(`[data-el="${CSS.escape(anchor)}"]`)].flatMap((el) => [el, ...columnOf(el)]) as Drawn[],
      kicker: escapeHtml(noun.charAt(0).toUpperCase() + noun.slice(1)) + (up ? ` · ${up}` : ''),
      title: escapeHtml(element.name),
      html:
        (rows.length ? `<dl class="details-props">${rows.join('')}</dl>` : '<p class="details-empty">No property yet.</p>') +
        part('Reached from', arrowsIn && `<ul class="details-links">${arrowsIn}</ul>`, 'from') +
        part('Leads to', arrows && `<ul class="details-links">${arrows}</ul>`, 'to') +
        part('Children', children && `<ul class="details-links">${children}</ul>`) +
        part('Cited in other maps', citedHtml(data.cited.filter((c) => c.at === anchor))) +
        part('Broken links', brokenHtml(data.broken.filter((b) => b.at === anchor), false)) +
        questionsHtml(ctx, (r) => nameKey(r.path.at(-1)!) === nameKey(element.name)),
    };
  };

/** A property drawn as a column: the value of each element in it. */
export const columnDetails =
  (key: string): Details =>
  (ctx) => {
    const { file, definition } = ctx;
    const head = shownView(ctx.page).querySelector<HTMLElement>(`th[scope="col"][data-prop="${CSS.escape(key)}"]`);
    if (!head) return;
    const { links: linkify } = linksOf(ctx.index, file.key);
    const name = head.firstChild?.textContent ?? '';
    const spec = specOf(ctx, name);
    const items = elementsOf(file.map, definition?.shape).flatMap((el) => {
      const p = [...el.properties.values()].find((q) => nameKey(q.label) === key);
      if (!p || p.isUndefined || !p.values.length) return [];
      const tags = p.values.map((v) => `<span class="details-arrow-label"${valueOf(v.text)}>${linkify(v.text)}</span>`).join('');
      return [`<li><button class="details-link" data-details-el="${anchorOf(el.name)}">${linkCard(el.name)}${tags}</button></li>`];
    });
    const noun = definition?.element ?? 'element';
    return {
      selected: [head],
      kicker: escapeHtml(spec && spec.name !== '*' ? 'Property' : 'Column'),
      title: escapeHtml(name),
      html: part(pluralOf(noun.charAt(0).toUpperCase() + noun.slice(1)), items.length && `<ul class="details-links${spec?.kind === 'enum' ? ' details-enum' : ''}">${items.join('')}</ul>`) || '<p class="details-empty">No value in this column.</p>',
    };
  };

/** A participant of lifelines: its messages, in order, each with the participant at its other end. */
export const participantDetails =
  (key: string): Details =>
  (ctx) => {
    const box = shownView(ctx.page).querySelector<SVGElement>(`g[data-participant="${CSS.escape(key)}"]`);
    if (!box) return;
    const svg = box.closest('svg')!;
    const nameOf = (k?: string) => svg.querySelector(`g[data-participant="${CSS.escape(k!)}"]`)?.textContent ?? '?';
    const elements = elementsOf(ctx.file.map, ctx.definition?.shape);
    const messages = [...svg.querySelectorAll<SVGElement>(`.lifeline-arrow[data-from="${CSS.escape(key)}"], .lifeline-arrow[data-to="${CSS.escape(key)}"]`)].map((m) => {
      const name = elements.find((el) => anchorOf(el.name) === m.dataset.el)?.name ?? m.textContent ?? '';
      const other = m.dataset.from === m.dataset.to ? 'itself' : m.dataset.from === key ? `→ ${nameOf(m.dataset.to)}` : `← ${nameOf(m.dataset.from)}`;
      return `<li><button class="details-link" data-details-el="${m.dataset.el}">${linkCard(name)}<span class="details-arrow-label">${escapeHtml(other)}</span></button></li>`;
    });
    return {
      selected: svg.querySelectorAll<SVGElement>(`g[data-participant="${CSS.escape(key)}"]`),
      kicker: 'Participant',
      title: escapeHtml(box.textContent ?? ''),
      html: part('Messages', messages.length && `<ul class="details-links">${messages.join('')}</ul>`),
    };
  };

/** The value written at a line of the map (from 0): its element, its property and itself. */
export function valueAt(ctx: Pick<DetailsContext, 'file' | 'definition'>, line: number) {
  const find = (values: Item[]): Item | undefined => {
    for (const v of values) {
      if (v.src?.line === line) return v;
      const child = find(v.children ?? []);
      if (child) return child;
    }
  };
  for (const element of elementsOf(ctx.file.map, ctx.definition?.shape))
    for (const property of element.properties.values()) {
      const value = find(property.values);
      if (value) return { element, property, value };
    }
}

/** A value: what it is, in which element, the items written under it, the values it leads to and from. */
export const valueDetails =
  (line: number): Details =>
  (ctx) => {
    const { file, page } = ctx;
    const found = valueAt(ctx, line);
    if (!found) return;
    const { links: linkify } = linksOf(ctx.index, file.key);
    const { element, property, value } = found;
    const rows = value.children.map((item) => {
      const p = readProperty(item);
      return p ? `<div${propOf(p.label)}${enumClass(specOf(ctx, p.label, specOf(ctx, property.label)?.details))}><dt>${escapeHtml(p.label)}</dt><dd${valueOf(p.value)}>${quoteOr(linkify, p.value)}${sub(item, linkify)}</dd></div>` : `<div><dd>${quoteOr(linkify, item.text)}${sub(item, linkify)}</dd></div>`;
    });
    const li = shownView(page).querySelector<HTMLElement>(`li[data-src^="${line}:"][data-v]`);
    const grid = li?.closest('.grid--arrows');
    const cardOf = (l: HTMLElement) => `<li><button class="details-link" data-details-line="${lineOf(l)}">${linkCard(l.textContent!.trim(), { property: l.closest('tr')?.querySelector('th[scope="row"]')?.lastChild?.textContent })}</button></li>`;
    const cards = (list: HTMLElement[]) => list.length && `<ul class="details-links">${list.map(cardOf).join('')}</ul>`;
    const from = grid ? [...grid.querySelectorAll<HTMLElement>(`li[data-to="${CSS.escape(li!.dataset.v!)}"]`)] : [];
    const to = grid && li!.dataset.to ? [...grid.querySelectorAll<HTMLElement>(`li[data-v="${CSS.escape(li!.dataset.to)}"]`)] : [];
    const links = part('Reached from', cards(from), 'from') + part('Leads to', cards(to), 'to') + previewOf(ctx, value.text) + questionsHtml(ctx, (r) => r.lines.at(-1) === line);
    return {
      line,
      selected: page.querySelectorAll<HTMLElement>(`li[data-src^="${line}:"]`),
      kicker: `${escapeHtml(property.label)} · <button class="details-up" data-details-el="${anchorOf(element.name)}" title="${escapeHtml(element.name)}">${escapeHtml(element.name)}</button>`,
      title: linkify(li?.dataset.to ? bare(value.text) : value.text),
      html: (rows.length ? `<dl class="details-props"${propOf(property.label)}>${rows.join('')}</dl>` : '') + links,
    };
  };

/** A value that is a link alone: what it reaches, shown under it, so that it can be read without leaving the map. */
function previewOf(ctx: DetailsContext, text: string) {
  const raw = /^\s*(\[\[[^\]]+\]\])\s*$/.exec(text)?.[1];
  const r = (raw && linksOf(ctx.index, ctx.file.key).resolve(raw)) as ElementLink | undefined;
  if (!r?.element) return '';
  const find = (items: Item[], line?: number): Item | undefined => {
    for (const item of items) {
      if (item.src!.line === line) return item;
      const found = find(item.children, line);
      if (found) return found;
    }
  };
  const items = r.lines.length ? (find(r.element.items, r.lines.at(-1))?.children ?? []) : r.element.items;
  const { links: linkify } = linksOf(ctx.index, r.file.key);
  const list = (children: Item[]): string => (children.length ? `<ul>${children.map((c) => `<li>${linkify(c.text)}${list(c.children)}</li>`).join('')}</ul>` : '');
  const rows = items.map((item) => {
    const p = readProperty(item);
    return p ? `<div${propOf(p.label)}><dt>${escapeHtml(p.label)}</dt><dd>${p.value ? quoteOr(linkify, p.value) : ''}${list(p.children)}</dd></div>` : `<div><dd>${quoteOr(linkify, item.text)}${list(item.children)}</dd></div>`;
  });
  return part(r.file.title, rows.length ? `<dl class="details-props">${rows.join('')}</dl>` : '<p class="details-empty">Nothing written under it.</p>');
}

/** The cells under the head of a column of a table, an element drawn as a column. */
export const columnOf = (el: Element): Element[] => (el.matches('thead th') ? [...el.closest('table')!.querySelectorAll(`tbody tr > :nth-child(${(el as HTMLTableCellElement).cellIndex + 1})`)] : []);

/** What a link reaches on the drawing (its anchor, `el-name/12/14`): the item drawn where its path is written, the last
 *  one shown, or its nearest parent drawn, or else its element. */
export function targetOf(page: HTMLElement, anchor: string): Element | undefined {
  const [id, ...lines] = anchor.split('/');
  for (const line of lines.reverse()) {
    const drawn = [...page.querySelectorAll(`[data-src^="${line}:"]`)].find((el) => el.getClientRects().length);
    if (drawn) return drawn;
  }
  if (!id) return;
  const all = [...page.querySelectorAll(`#${CSS.escape(id)}`)];
  return all.find((el) => el.getClientRects().length) ?? all[0];
}

/** What a click on the drawing selects, and what shows it under the pointer before (`drawn`): the most precise thing
 *  under it (a value, a cell's element, an element, a participant, a column). */
export function pointedAt(ctx: Pick<DetailsContext, 'file' | 'definition'>, target: Element): { drawn: Element[]; details: Details; center?: Element } | undefined {
  const li = target.closest<HTMLElement>('.view li[data-src]');
  const who = target.closest<SVGElement>('.view g[data-participant]');
  const column = target.closest<HTMLElement>('.view .grid--rows th[scope="col"][data-prop]');
  const cell = target.closest<HTMLTableCellElement>('.view td');
  if (who) return { drawn: [who], details: participantDetails(who.dataset.participant!) };
  const unknown = target.closest<SVGElement>('.view g.node--unknown[data-from]');
  if (unknown) return { drawn: [unknown], details: elementDetails(unknown.dataset.from!) };
  if (column) return { drawn: [column], details: columnDetails(column.dataset.prop!) };
  if (li && valueAt(ctx, lineOf(li)!)) return { drawn: [li], details: valueDetails(lineOf(li)!) };
  const table = cell?.closest('table');
  const head = cell && (table?.querySelector<HTMLElement>(`thead tr > :nth-child(${cell.cellIndex + 1})[data-el]`) ?? cell.parentElement!.querySelector<HTMLElement>(':scope > th[data-el]'));
  const el = head ?? target.closest<Drawn>('.view [data-el]');
  if (!el) return;
  const twins = el.closest('.matrix') ? [...el.closest('.matrix')!.querySelectorAll<Drawn>(`[data-el="${CSS.escape(el.dataset.el!)}"]`)] : [el];
  const cells = head && head.matches('thead *') ? [head, ...columnOf(head)] : head ? [head.parentElement!] : twins;
  // A return drawn as a link leads to the element it goes back to.
  const to = el.matches('[data-return]') ? (el.closest('svg')?.querySelector(`[data-el="${CSS.escape(el.dataset.el!)}"]:not([data-return])`) ?? undefined) : undefined;
  return { drawn: cells, details: elementDetails(el.dataset.el!), center: to };
}

/** In a graph, the element chosen is in focus: its arrows and the elements at their other end; in a sequence with
 *  arrows between its values, the chain of the value chosen; in lifelines, a message and its participants. */
export function focusLinks(page: HTMLElement, id: string, selected?: Iterable<Drawn>) {
  const chosen = [...(selected ?? [])];
  page.querySelectorAll('.has-focus').forEach((svg) => svg.classList.remove('has-focus'));
  page.querySelectorAll('.is-linked').forEach((el) => el.classList.remove('is-linked'));
  page.querySelectorAll('.has-column').forEach((grid) => grid.classList.remove('has-column'));
  for (const head of chosen) {
    const grid = head.matches?.('th[scope="col"][data-prop]') && head.closest('.grid--rows');
    if (!grid) continue;
    grid.classList.add('has-column');
    grid.querySelectorAll(`td[data-prop="${CSS.escape(head.dataset.prop!)}"]`).forEach((td) => td.classList.add('is-linked'));
  }
  for (const grid of page.querySelectorAll<HTMLElement>('.has-chain')) {
    grid.classList.remove('has-chain');
    grid.querySelectorAll('.in-chain').forEach((li) => li.classList.remove('in-chain'));
    arrowsOf(grid, id);
  }
  for (const li of chosen) {
    const grid = li.matches?.('li[data-v]') && li.closest<HTMLElement>('.grid--arrows');
    if (!grid) continue;
    const pairs = [...grid.querySelectorAll<HTMLElement>('li[data-to]')].map((l) => [l.dataset.v, l.dataset.to]);
    const chain = new Set([li.dataset.v]);
    for (const [at, next] of [[0, 1], [1, 0]]) {
      const todo = [li.dataset.v];
      while (todo.length) {
        const key = todo.pop();
        for (const pair of pairs) if (pair[at] === key && !chain.has(pair[next])) (chain.add(pair[next]), todo.push(pair[next]));
      }
    }
    if (chain.size < 2) continue;
    grid.classList.add('has-chain');
    for (const key of chain) grid.querySelectorAll(`li[data-v="${CSS.escape(key!)}"]`).forEach((l) => l.classList.add('in-chain'));
    arrowsOf(grid, id);
  }
  for (const el of chosen) {
    const svg = el.matches?.('g.lifeline-arrow, g[data-participant]') && el.closest('svg');
    if (!svg) continue;
    svg.classList.add('has-focus');
    const key = el.dataset.participant;
    const messages = key ? svg.querySelectorAll<SVGElement>(`.lifeline-arrow[data-from="${key}"], .lifeline-arrow[data-to="${key}"]`) : [el];
    for (const m of messages) {
      m.classList.add('is-linked');
      for (const p of [m.dataset.from, m.dataset.to]) svg.querySelectorAll(`[data-participant="${p}"]`).forEach((n) => n.classList.add('is-linked'));
    }
  }
  for (const node of chosen) {
    const svg = node.matches?.('g.node[data-node]') && node.closest('svg');
    if (!svg) continue;
    svg.classList.add('has-focus');
    const nodeId = node.dataset.node;
    for (const edge of svg.querySelectorAll<SVGElement>(`.edge[data-from="${nodeId}"], .edge[data-to="${nodeId}"]`)) {
      edge.classList.add('is-linked');
      const other = edge.dataset.from === nodeId ? edge.dataset.to : edge.dataset.from;
      svg.querySelector(`.node[data-node="${other}"]`)?.classList.add('is-linked');
    }
  }
}

/** The open questions shown bring out on the map what they are about, the rest faded; one question under the pointer,
 *  only what it is about. */
export function ask(page: HTMLElement, asked: Element[][] = [], only?: number) {
  page.querySelectorAll('.is-asked').forEach((el) => el.classList.remove('is-asked'));
  const shown = only === undefined ? asked.flat() : (asked[only] ?? []);
  page.classList.toggle('has-asked', shown.length > 0);
  for (const el of shown) el.classList.add('is-asked');
}

/** The filters of a view of cards or of a table (as maps.html): the buttons pressed keep the cards and rows that have
 *  their values. */
export function filter(view: Element) {
  const pressed = new Map<string, string[]>();
  for (const b of view.querySelectorAll<HTMLElement>('.filter[aria-pressed="true"]')) pressed.set(b.dataset.filter!, [...(pressed.get(b.dataset.filter!) ?? []), b.dataset.value!]);
  const rows = [...view.querySelectorAll('.grid--rows tbody tr')];
  for (const card of [...view.querySelectorAll('.card'), ...rows]) {
    const kept = [...pressed].every(([p, values]) => values.some((v) => card.querySelector(`[data-prop="${CSS.escape(p)}"] li[data-value="${CSS.escape(v)}"]`)));
    card.classList.toggle('is-filtered', !kept);
    for (const point of view.querySelectorAll(`.matrix-point[data-el="${CSS.escape((card as HTMLElement).dataset.el!)}"]`)) point.classList.toggle('is-filtered', !kept);
  }
  const clear = view.querySelector<HTMLElement>('.filters-clear');
  if (clear) clear.hidden = !pressed.size;
  const count = view.querySelector<HTMLElement>('.filters-count');
  if (count) {
    count.hidden = !pressed.size || !rows.length;
    count.textContent = `${rows.filter((row) => !row.classList.contains('is-filtered')).length} of ${rows.length} shown`;
  }
}

/** Opens the list of the values of a column of a table, under its name, and closes any other. */
export function openColumnFilter(root: Element, opener: HTMLElement | null) {
  for (const other of root.querySelectorAll<HTMLElement>('.column-filter[aria-expanded="true"]')) {
    other.setAttribute('aria-expanded', 'false');
    (other.nextElementSibling as HTMLElement).hidden = true;
  }
  if (!opener) return;
  opener.setAttribute('aria-expanded', 'true');
  (opener.nextElementSibling as HTMLElement).hidden = false;
}

/** A click in a view that presses a filter: handled here, and true; else false. */
export function filterClick(e: MouseEvent) {
  const target = e.target as Element;
  const view = target.closest('.view');
  if (!view) return false;
  const value = target.closest<HTMLElement>(':is(.card, .grid--rows td) li[data-value]');
  const prop = value?.closest<HTMLElement>('[data-prop]')?.dataset.prop;
  const opener = target.closest<HTMLElement>('.column-filter');
  if (opener) {
    openColumnFilter(view, opener.getAttribute('aria-expanded') === 'true' ? null : opener);
    return true;
  }
  if (target.closest('.column-filter-menu')) {
    const option = target.closest<HTMLElement>('.filter');
    if (option) (option.setAttribute('aria-pressed', String(option.getAttribute('aria-pressed') !== 'true')), filter(view));
    return true;
  }
  if (target.closest('.filters-clear')) {
    view.querySelectorAll('.filter').forEach((b) => b.setAttribute('aria-pressed', 'false'));
    filter(view);
    return true;
  }
  const button = target.closest<HTMLElement>('.filter') ?? (value && prop ? view.querySelector<HTMLElement>(`.filter[data-filter="${CSS.escape(prop)}"][data-value="${CSS.escape(value.dataset.value!)}"]`) : null);
  if (!button) return false;
  button.setAttribute('aria-pressed', String(button.getAttribute('aria-pressed') !== 'true'));
  filter(view);
  return true;
}
