// Test of the drawing, with no browser: draws every map of showcase/, and checks
// two things in each drawing of boxes (a graph, a tree, a sequence diagram): nothing is drawn out of it (a line, a box,
// the point of a text), and no two boxes overlap. Needed by the showcase (an arrow of an entity to itself was drawn out
// of its drawing). Not checked: what the page draws once shown (the arrows between the values of a sequence).
// It also measures each graph, to judge a change of its layout by numbers (not a failure): its size, the arrows that
// cross, the labels that cover a box, a line or another label, those far from their arrow, and its longest arrow.
// Run: npm test. It fails when a map breaks a check, and says which and where.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { drawMap } from './draw.ts';
import { definitionOf, definitionTexts, markdownFiles } from './folder.ts';
import { buildIndex, linksOf } from './links.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SLACK = 2; // pixels: rounding

type Point = [number, number];
interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The points a path goes through: its commands M, L, H, V, C, Q, A and their lower-case forms; of a curve, its end points
 *  only (its control points pull it, and may lie out of the drawing). */
function pointsOf(d: string) {
  const points: Point[] = [];
  let [x, y] = [0, 0];
  for (const [, cmd, args] of d.matchAll(/([MLHVCQAmlhvcqa])([^MLHVCQAmlhvcqa]*)/g)) {
    const n = (args.match(/-?\d*\.?\d+(?:e-?\d+)?/g) ?? []).map(Number);
    const rel = cmd === cmd.toLowerCase();
    if ('Hh'.includes(cmd)) for (const v of n) points.push([(x = rel ? x + v : v), y]);
    else if ('Vv'.includes(cmd)) for (const v of n) points.push([x, (y = rel ? y + v : v)]);
    // An arc (the circle of a cardinality "0"): its end point, the last two of its seven numbers.
    else if ('Aa'.includes(cmd))
      for (let i = 0; i + 6 < n.length; i += 7) points.push(([x, y] = rel ? [x + n[i + 5], y + n[i + 6]] : [n[i + 5], n[i + 6]]));
    else
      for (let i = 0; i + 1 < n.length; i += 2) {
        const p: Point = rel ? [x + n[i], y + n[i + 1]] : [n[i], n[i + 1]];
        const end = 'CcQq'.includes(cmd) ? (i + 2) % ('Cc'.includes(cmd) ? 6 : 4) === 0 : true;
        if (end) points.push(p);
        if (end) [x, y] = p;
      }
  }
  return points;
}

const attr = (tag: string, name: string) => Number(new RegExp(`\\s${name}="(-?[\\d.]+)"`).exec(tag)?.[1]);

/** The problems of one drawing: an `<svg viewBox="0 0 W H">` and what is in it. */
function problemsOf(svg: string) {
  const [, w, h] = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg)!.map(Number);
  const out = (x: number, y: number) => x < -SLACK || y < -SLACK || x > w + SLACK || y > h + SLACK;
  const problems: string[] = [];
  // The lines: every path but the outline of a shape (a cylinder, a person), whose arcs are not points.
  for (const [, cls, d] of svg.matchAll(/<path(?: class="([^"]*)")?\sd="([^"]*)"/g)) {
    if (/node-(body|cap)/.test(cls ?? '')) continue;
    const p = pointsOf(d).find(([x, y]) => out(x, y));
    if (p && !d.includes('M0 0 L10 5')) problems.push(`a line goes out of the drawing, at ${p.map(Math.round).join(', ')}`);
  }
  for (const [text, content] of svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)) {
    if (out(attr(text, 'x'), attr(text, 'y'))) problems.push(`the text "${content}" is out of the drawing`);
  }
  const boxes: (Rect & { node: string })[] = [];
  for (const [, node, rect] of svg.matchAll(/<g class="(node[^"]*)"[^>]*>(?:<title>[^<]*<\/title>)?(<rect[^>]*>)/g)) {
    const b = { x: attr(rect, 'x'), y: attr(rect, 'y'), w: attr(rect, 'width'), h: attr(rect, 'height'), node };
    if (out(b.x, b.y) || out(b.x + b.w, b.y + b.h)) problems.push('a box is out of the drawing');
    boxes.push(b);
  }
  const names = [...svg.matchAll(/<g class="node[^"]*"[^>]*>(?:<title>[^<]*<\/title>)?<rect[^>]*>(?:<text[^>]*>([^<]*)<\/text>)?/g)].map((m) => m[1] ?? '?');
  boxes.forEach((a, i) =>
    boxes.slice(i + 1).forEach((b, j) => {
      const overlap = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > SLACK && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > SLACK;
      if (overlap) problems.push(`the boxes "${names[i]}" and "${names[i + 1 + j]}" overlap`);
    }),
  );
  return problems;
}

/** The boxes drawn inside the frame of a graph (`- Frame:`) whose kind is not one of `framed`: an element outside the
 *  system is drawn outside its frame (an external system that calls the system back was drawn in it). */
function outOfFrame(svg: string, framed: string[]) {
  const frame = /<g class="frame"><rect([^>]*)>/.exec(svg)?.[1];
  if (!frame) return [];
  const f = { x: attr(frame, 'x'), y: attr(frame, 'y'), w: attr(frame, 'width'), h: attr(frame, 'height') };
  const problems: string[] = [];
  for (const [, value, g] of svg.matchAll(/<g class="node[^"]*"[^>]*?data-value="([^"]*)"[^>]*>([\s\S]*?)<\/g>/g)) {
    if (framed.includes(value)) continue;
    const xs = [...g.matchAll(/\sx="(-?[\d.]+)"/g)].map((m) => Number(m[1]));
    const ys = [...g.matchAll(/\sy="(-?[\d.]+)"/g)].map((m) => Number(m[1]));
    const inside = xs.some((x) => x > f.x && x < f.x + f.w) && ys.some((y) => y > f.y && y < f.y + f.h);
    if (inside) problems.push(`a box "${/<text[^>]*>([^<]*)/.exec(g)?.[1]}" (${value}) is drawn inside the frame`);
  }
  return problems;
}

/** The measures of a graph: its size, the crossings of its arrows, the labels that cover something, its longest arrow. */
function measuresOf(svg: string) {
  const [, w, h] = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg)!.map(Number);
  const boxes: Rect[] = [];
  for (const [g] of svg.matchAll(/<g class="node[^"]*"[^>]*>[\s\S]*?<\/g>/g)) {
    const rect = /<rect[^>]*>/.exec(g)?.[0];
    const poly = /<polygon points="([^"]*)"/.exec(g)?.[1];
    const circle = /<circle[^>]*>/.exec(g)?.[0];
    if (rect) boxes.push({ x: attr(rect, 'x'), y: attr(rect, 'y'), w: attr(rect, 'width'), h: attr(rect, 'height') });
    else if (poly) {
      const ps = poly.split(' ').map((p) => p.split(',').map(Number));
      const xs = ps.map((p) => p[0]), ys = ps.map((p) => p[1]);
      boxes.push({ x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) });
    } else if (circle) boxes.push({ x: attr(circle, 'cx') - attr(circle, 'r'), y: attr(circle, 'cy') - attr(circle, 'r'), w: 2 * attr(circle, 'r'), h: 2 * attr(circle, 'r') });
  }
  const edges: Point[][] = [];
  const labels: (Rect & { edge: number })[] = [];
  const label = /<g class="edge-label[^"]*">(?:<rect[^>]*>)?<text ([^>]*)>([^<]*)<\/text><\/g>/g;
  for (const [g, d] of svg.matchAll(/<g class="edge[ "][^>]*><path d="([^"]*)"[^>]*>(?:<path class="edge-(?:card|head)"[^>]*>)?(?:<g class="edge-label[^"]*">(?:<rect[^>]*>)?<text [^>]*>[^<]*<\/text><\/g>)*<\/g>/g)) {
    const k = edges.length;
    edges.push(pointsOf(d));
    for (const [, attrs, text] of g.matchAll(label)) {
      const [x, y] = [attr(` ${attrs}`, 'x'), attr(` ${attrs}`, 'y')];
      const width = text.length * 7.2 * 0.95; // G.char of draw.ts
      const anchor = /text-anchor: (\w+)/.exec(attrs)?.[1] ?? 'middle';
      labels.push({ x: anchor === 'end' ? x - width : anchor === 'start' ? x : x - width / 2, y: y - 11, w: width, h: 13, edge: k });
    }
  }
  type Segment = { a: Point; b: Point; edge: number };
  const segments: Segment[] = edges.flatMap((ps, k) => ps.slice(1).map((p, i) => ({ a: ps[i], b: p, edge: k })));
  // Two segments of two arrows cross where each one has the ends of the other on both of its sides.
  const side = (a: Point, b: Point, c: Point) => Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
  const cross = (s: Segment, t: Segment) => side(s.a, s.b, t.a) * side(s.a, s.b, t.b) < 0 && side(t.a, t.b, s.a) * side(t.a, t.b, s.b) < 0;
  let crossings = 0;
  segments.forEach((s, i) => segments.slice(i + 1).forEach((t) => s.edge !== t.edge && cross(s, t) && crossings++));
  const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w - 1 && b.x < a.x + a.w - 1 && a.y < b.y + b.h - 1 && b.y < a.y + a.h - 1;
  const box = (s: Segment) => ({ x: Math.min(s.a[0], s.b[0]), y: Math.min(s.a[1], s.b[1]), w: Math.abs(s.a[0] - s.b[0]) || 1, h: Math.abs(s.a[1] - s.b[1]) || 1 });
  const covering = labels.filter((l, i) => boxes.some((b) => overlaps(l, b)) || labels.some((o, j) => j !== i && overlaps(l, o)) || segments.some((s) => s.edge !== l.edge && overlaps(l, box(s)))).length;
  // A label far from its arrow: more than 24 pixels from every segment of it.
  const gap = (l: Rect, s: Segment) => {
    const b = box(s);
    const dx = Math.max(b.x - (l.x + l.w), l.x - (b.x + b.w), 0), dy = Math.max(b.y - (l.y + l.h), l.y - (b.y + b.h), 0);
    return Math.hypot(dx, dy);
  };
  const far = labels.filter((l) => !segments.some((s) => s.edge === l.edge && gap(l, s) <= 24)).length;
  const length = (ps: Point[]) => ps.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - ps[i][0], p[1] - ps[i][1]), 0);
  return { w, h, crossings, covering, far, labels: labels.length, longest: Math.max(0, ...edges.map(length)) };
}

const measures: ({ map: string } & ReturnType<typeof measuresOf>)[] = [];
let failed = 0;
let drawings = 0;
// Each example of showcase/ is a project of its own: drawn with its types.
const examples = readdirSync(join(root, 'showcase')).filter((name) => existsSync(join(root, 'showcase', name, 'types'))).map((name) => `showcase/${name}`);
for (const folder of examples) {
  const dir = join(root, folder);
  const sources = markdownFiles(dir).map((path) => ({ path: resolve(path), text: readFileSync(path, 'utf8') }));
  const index = buildIndex(sources, { hrefOf: () => '#' });
  const texts = definitionTexts(join(dir, 'types'));
  for (const file of index.files.values()) {
    if (!file.isMap) continue;
    const body = await drawMap(file.map, definitionOf(texts, file.map.meta.type), linksOf(index, file.key));
    // The drawings of boxes; the small curve of a scale (preserveAspectRatio="none") is not one.
    for (const [svg] of body.matchAll(/<svg viewBox="0 0 [\d.]+ [\d.]+"(?![^>]*preserveAspectRatio)[\s\S]*?<\/svg>/g)) {
      drawings++;
      if (svg.includes('class="nodes"')) measures.push({ map: `${folder}/${file.name}`, ...measuresOf(svg) });
      const framed = (definitionOf(texts, file.map.meta.type).layout?.frame ?? []).map((v) => v.toLowerCase().replace(/\s+/g, '-'));
      for (const problem of new Set([...problemsOf(svg), ...outOfFrame(svg, framed)])) {
        console.error(`${folder}/${file.name}.md: ${problem}`);
        failed++;
      }
    }
  }
}
// Cases met in the examples, pinned on small maps.
const catalog = definitionTexts(join(root, 'skills', 'maps', 'types')); // the catalog
const expect = (what: string, ok: boolean) => {
  if (ok) return;
  console.error(`Pinned case: ${what}`);
  failed++;
};
{
  // Two links that read the same and lead to different places name their map; a link that reads alone stays short.
  const sources = [
    { path: 'flow.md', text: '---\ntype: user-flow\n---\n## Balances\n- Kind: screen\n' },
    { path: 'sitemap.md', text: '---\ntype: sitemap\n---\n## Group\n- Balances\n' },
    { path: 'rules.md', text: '---\ntype: business-rules\n---\n## Rule\n- Applies to:\n  - [[flow#Balances]]\n  - [[sitemap#Group#Balances]]\n  - [[sitemap#Group]]\n' },
  ];
  const html = linksOf(buildIndex(sources, { hrefOf: () => '#' }), 'rules').links('[[flow#Balances]] [[sitemap#Group#Balances]] [[sitemap#Group]] [[flow#Balances|the screen]]');
  const labels = [...html.matchAll(/>([^<]*)<\/a>/g)].map((m) => m[1]);
  expect(`two links to two Balances read ${labels.join(', ')}`, labels.join(' | ') === 'flow › Balances | sitemap › Balances | Group | the screen');
}
{
  // The lanes of a story map whose Release is an enum (a copy of the type): in the order of its values, not the order
  // they first come.
  const texts = new Map(catalog);
  texts.set('story-map', catalog.get('story-map')!.replace('## Release\n- Kind: text', '## Release\n- Kind: enum\n- Values:\n  - MVP\n  - Release 2\n  - Later'));
  const text = '---\ntype: story-map\n---\n## Find\n- Search\n  - Search by city\n    - Release: MVP\n  - See on a map\n    - Release: Later\n## Book\n- Pay\n  - Pay by card\n    - Release: MVP\n  - Pay with Apple Pay\n    - Release: Release 2\n';
  const index = buildIndex([{ path: 'story.md', text }], { hrefOf: () => '#' });
  const html = await drawMap(index.files.get('story')!.map!, definitionOf(texts, 'story-map'), linksOf(index, 'story'));
  const lanes = [...html.matchAll(/<tr class="board-lane" data-value="([^"]*)"/g)].map((m) => m[1]);
  expect(`the lanes of a story map are ${lanes.join(', ')}`, lanes.join(' ') === 'mvp release-2 later');
}
{
  // The lanes of a story map whose Release is text (the type of the catalog): in the order each step writes them, combined
  // across the steps ("Later" comes first in the file, but every step writes Release 2 before it); where the steps
  // disagree, in the order they first come.
  const lanesOf = async (text: string) => {
    const index = buildIndex([{ path: 'story.md', text }], { hrefOf: () => '#' });
    const html = await drawMap(index.files.get('story')!.map!, definitionOf(catalog, 'story-map'), linksOf(index, 'story'));
    return [...html.matchAll(/<tr class="board-lane" data-value="([^"]*)"/g)].map((m) => m[1]).join(' ');
  };
  const story = (name: string, release: string) => `  - ${name}\n    - Release: ${release}\n`;
  const ordered = `---\ntype: story-map\n---\n## Find\n- Search\n${story('Search by city', 'MVP')}${story('See on a map', 'Later')}- Choose\n${story('See a profile', 'Release 2')}${story('Read the reviews', 'Later')}\n## Book\n- Pay\n${story('Pay by card', 'MVP')}${story('Pay with Apple Pay', 'Release 2')}`;
  const ordering = await lanesOf(ordered);
  expect(`the lanes of a story map, Later first in the file, are ${ordering}`, ordering === 'mvp release-2 later');
  const conflict = `---\ntype: story-map\n---\n## Find\n- Search\n${story('Search by city', 'Later')}${story('See on a map', 'Release 2')}\n## Book\n- Pay\n${story('Pay by card', 'Release 2')}${story('Pay with Apple Pay', 'Later')}`;
  const conflicting = await lanesOf(conflict);
  expect(`the lanes of a story map whose steps disagree are ${conflicting}`, conflicting === 'later release-2');
}
{
  // `- Dots: Participants` (the view Participants of a study): a column per participant, in a natural order, a dot
  // where an observation has it.
  const text = '---\ntype: study\n---\n## Lost\n- Theme: Search\n- Participants:\n  - P10\n  - P2\n## Found\n- Theme: Search\n- Participants:\n  - P2\n';
  const index = buildIndex([{ path: 'study.md', text }], { hrefOf: () => '#' });
  const definition = definitionOf(catalog, 'study');
  const view = definition.layout!.views!.find((v) => v.name === 'Participants')!;
  const html = await drawMap(index.files.get('study')!.map!, { ...definition, layout: view }, linksOf(index, 'study'));
  const columns = [...html.matchAll(/<th scope="col" class="dot-column"[^>]*>([^<]*)</g)].map((m) => m[1]);
  const dots = (html.match(/class="dot"/g) ?? []).length;
  const totals = [...html.matchAll(/<td class="dot-total"[^>]*>([^<]*)</g)].map((m) => m[1]);
  expect(`the columns of the participants are ${columns.join(', ')}, with ${dots} dots, totals ${totals.join(', ')}`, columns.join(' ') === 'P2 P10' && dots === 3 && totals.join(' ') === '2/2 1/2');
}
{
  // The frame of a system architecture (`- Frame:`): no name in it (the page shows the title above); a person who asks
  // an AI agent, and an external system that fetches from another, outside the frame on one side, each a layer apart,
  // the arrow between them going down far enough for its head to show.
  const text = '---\ntype: system-architecture\ntitle: A long title that the arrows would cross\n---\n## Member\n- Kind: person\n- → [[#Agent]]\n## Agent\n- Kind: external system\n- → [[#Web app]]\n## Web app\n- Kind: application\n- → [[#Extraction]]\n- → [[#Bucket]]\n## Extraction\n- → [[#OpenAI]]\n## Bucket\n- Kind: external system\n## OpenAI\n- Kind: external system\n- fetches the photo → [[#Bucket]]\n';
  const index = buildIndex([{ path: 'system.md', text }], { hrefOf: () => '#' });
  const definition = definitionOf(catalog, 'system-architecture');
  const svg = /<svg viewBox[\s\S]*?<\/svg>/.exec(await drawMap(index.files.get('system')!.map!, definition, linksOf(index, 'system')))![0];
  expect('a frame has no name', /<g class="frame"><rect[^>]*><\/g>/.test(svg) && !svg.includes('A long title'));
  const framed = (definition.layout?.frame ?? []).map((v) => v.toLowerCase().replace(/\s+/g, '-'));
  for (const problem of outOfFrame(svg, framed)) expect(problem, false);
  const top = (node: string) => attr(new RegExp(`<g class="node[^"]*"[^>]*data-node="${node}"[^>]*>[\\s\\S]*?<(?:rect|polygon)[^>]*>`).exec(svg)![0].replace(/<title>[\s\S]*?<\/title>/, ''), 'y');
  const ids = Object.fromEntries([...svg.matchAll(/data-node="(n\d+)"[^>]*?>(?:<title>[\s\S]*?<\/title>)?[\s\S]*?<text[^>]*>([^<]*)</g)].map((m) => [m[2], m[1]]));
  for (const [from, to] of [['Member', 'Agent'], ['OpenAI', 'Bucket']]) {
    const d = new RegExp(`<g class="edge[^"]*" data-from="${ids[from]}" data-to="${ids[to]}"><path d="([^"]*)"`).exec(svg)?.[1] ?? '';
    const points = pointsOf(d);
    // The room between two layers of a tree (G.rankSep of draw.ts): the least an arrow goes down to show its head.
    const down = points.length ? points[points.length - 1][1] - points[0][1] : 0;
    expect(`${from} and ${to} are on one layer, the arrow between them goes down ${Math.round(down)}`, top(ids[to]) > top(ids[from]) && down >= 46);
  }
}
{
  // An element that the frame leads to through another outside it goes after the frame (it was put before it).
  const text = '---\ntype: system-architecture\n---\n## Web app\n- Kind: application\n- → [[#Gateway]]\n## Gateway\n- Kind: external system\n- → [[#Notifier]]\n## Notifier\n- Kind: external system\n- → [[#Mail]]\n## Mail\n- Kind: external system\n';
  const index = buildIndex([{ path: 'system.md', text }], { hrefOf: () => '#' });
  const svg = /<svg viewBox[\s\S]*?<\/svg>/.exec(await drawMap(index.files.get('system')!.map!, definitionOf(catalog, 'system-architecture'), linksOf(index, 'system')))![0];
  const frame = /<g class="frame"><rect([^>]*)>/.exec(svg)![1];
  const notifier = /<g class="node[^"]*"[^>]*>(?:<title>[^<]*<\/title>)?<rect([^>]*)><text[^>]*>Notifier</.exec(svg)?.[1] ?? '';
  expect('Notifier, after Gateway, is below the frame', attr(notifier, 'y') > attr(frame, 'y') + attr(frame, 'height'));
}

const pad = (v: unknown, n: number) => String(v).padStart(n);
console.log('Graphs: size, crossings of arrows, labels covering something, labels far from their arrow (of all), longest arrow');
for (const m of measures) console.log(`  ${m.map.padEnd(36)} ${pad(`${Math.round(m.w)}×${Math.round(m.h)}`, 10)} ${pad(m.crossings, 4)} ${pad(m.covering, 3)} ${pad(`${m.far}/${m.labels}`, 7)} ${pad(Math.round(m.longest), 6)}`);
console.log(failed ? `${failed} problems in ${drawings} drawings.` : `${drawings} drawings, no problem.`);
if (failed) process.exit(1);
