// Test of what the editor proposes, with no browser: the list as a
// function of the maps, of the types and of the place of the cursor (complete.ts). Step 1, a link: on two small maps
// held in memory, case by case; then every link of the showcase is written again with `[[`, a few letters and the
// rows accepted, and must reach the same place. Step 2, what the type allows: case by case; then every value of an
// enum or of a scale, every property and every detail the showcase writes is proposed where it is written.
// Run: npm test.

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { addedLabels, type Change, propose, proposeLink } from './complete.ts';
import { definitionTexts, markdownFiles } from './folder.ts';
import { buildIndex, linksOf } from './links.ts';
import type { Definition } from './model.ts';
import { nameKey, parseDefinition } from './read.ts';

const failures: string[] = [];
const expect = (what: string, actual: unknown, expected: unknown) =>
  JSON.stringify(actual) !== JSON.stringify(expected) && failures.push(`${what}:\n  expected ${JSON.stringify(expected)}\n  got      ${JSON.stringify(actual)}`);

const blueprint = `---
type: service-blueprint
title: A visit
---

## Context
- A note of the context.

## Book
- Description: The patient books.
- Customer actions:
  - Chooses a slot → [[#Book#Confirms]]
  - Confirms
    - Severity: high
- Support processes:
  - [[site#Home]]
  - Calendar #2 [beta]

## Pay
- Description: undefined

## Open questions
- Who pays?
`;
const site = `---
type: sitemap
title: The site
---

## Home
- Description: The first page.
- Search
  - Results
- → [[#Account]]

## Account
`;
const index = buildIndex([
  { path: 'maps/visit.md', text: blueprint },
  { path: 'maps/site.md', text: site },
  { path: 'maps/notes.md', text: 'Not a map.\n' },
]);
/** The list for a line of `visit.md`, the cursor at `¦` (at its end without one). */
const at = (line: string, text = blueprint) => proposeLink(index, 'visit', text, line.replace('¦', ''), line.includes('¦') ? line.indexOf('¦') : line.length);
const rows = (line: string, text?: string) => at(line, text)?.rows.map((r) => `${r.name}${r.detail ? ` (${r.detail})` : ''}`);
const apply = (line: string, change: Change) => line.slice(0, change.from) + change.insert + line.slice(change.to);
/** The line once the row `name` is accepted (Enter) or gone down from (`#`). */
const after = (line: string, name: string, key: 'Enter' | '#') => {
  const row = at(line)!.rows.find((r) => r.name === name)!;
  return apply(line.replace('¦', ''), key === '#' ? row.down! : row.accept);
};

// Where the list opens: in the path of a link being written, and nowhere else.
expect('no link', rows('- Description: The patient books.'), undefined);
expect('a link closed before the cursor', rows('see [[site]] and'), undefined);
expect('after the text of a link', rows('see [[site|the '), undefined);
expect('a path that leads nowhere', rows('[[nope#'), undefined);
expect('no row left', rows('[[#zzz'), undefined);

// The levels. A plain Markdown file is not listed; nor a property, a detail, an arrow of a graph, a value that holds a
// link. Context and Open questions come after the elements.
expect('the maps', rows('→ [['), ['This map (A visit)', 'site (The site)']);
expect('the elements of this map', rows('[[#'), ['Book', 'Pay', 'Context', 'Open questions']);
expect('the elements of another map', rows('[[site#'), ['Home', 'Account']);
expect('this map by its name', rows('[[Visit#'), ['Book', 'Pay', 'Context', 'Open questions']);
expect('under an element, its values', rows('[[#Book#'), ['Chooses a slot (Customer actions)', 'Confirms (Customer actions)', 'Calendar #2 [beta] (Support processes)']);
expect('under an element, its elements', rows('[[site#home#'), ['Search']);
expect('deeper', rows('[[site#Home#Search#'), ['Results']);
expect('this map as it is typed', rows('[[#', `${blueprint}\n## Leave\n`), ['Book', 'Pay', 'Leave', 'Context', 'Open questions']);

// Filtered by what is typed: the name typed whole, then those that start with it, then the others.
expect('filtered', rows('[[#Book#c'), ['Chooses a slot (Customer actions)', 'Confirms (Customer actions)', 'Calendar #2 [beta] (Support processes)']);
expect('filtered, ignoring case', rows('[[#Book#CON'), ['Confirms (Customer actions)']);
expect('starts with it first', rows('[[#Book#s'), ['Chooses a slot (Customer actions)', 'Confirms (Customer actions)']);
expect('the name whole first', rows('[[#', blueprint.replace('## Pay', '## Booking\n\n## Pay')), ['Book', 'Booking', 'Pay', 'Context', 'Open questions']);
expect('the name whole first', rows('[[#booking', blueprint.replace('## Book\n', '## Booking it\n\n## Booking\n')), ['Booking', 'Booking it']);

// Accepting closes the link there; `#` goes down a level; the row of this map writes `#` alone.
expect('accept a map', after('see [[si', 'site', 'Enter'), 'see [[site]]');
expect('accept an element', after('- → [[#bo', 'Book', 'Enter'), '- → [[#Book]]');
expect('accept a value', after('[[#Book#con', 'Confirms', 'Enter'), '[[#Book#Confirms]]');
expect('accept before a text', after('see [[si¦ and more', 'site', 'Enter'), 'see [[site]] and more');
expect('go down from a map', after('[[si', 'site', '#'), '[[site#');
expect('go down from an element', after('[[#bo', 'Book', '#'), '[[#Book#');
expect('this map, accepted', after('[[', 'This map', 'Enter'), '[[#');
expect('this map, #', after('[[th', 'This map', '#'), '[[#');
expect('no letter yet: # is itself', at('[[')!.rows.some((r) => r.down), false);
expect('the list goes on after this map only', at('[[')!.rows.map((r) => Boolean(r.again)), [true, false]);
expect('a name without what a link cannot hold', after('[[#Book#cal', 'Calendar #2 [beta]', 'Enter'), '[[#Book#Calendar 2 beta]]');
// In a link already closed: the rest of the link is replaced, its text after `|` kept.
expect('accept in a closed link', after('a [[#Bo¦k#Confirms]] b', 'Book', 'Enter'), 'a [[#Book]] b');
expect('go down in a closed link', after('a [[#Bo¦k#Confirms]] b', 'Book', '#'), 'a [[#Book#]] b');
expect('accept in a link with a text', after('a [[#Book#Con¦x|here]] b', 'Confirms', 'Enter'), 'a [[#Book#Confirms|here]] b');
expect('the next link of the line is not this one', after('a [[si¦ b [[#Book]]', 'site', 'Enter'), 'a [[site]] b [[#Book]]');
expect('what is written resolves', linksOf(index, 'visit').resolve('[[#Book#Calendar 2 beta]]').problem, undefined);

// The showcase: every link is written again with the list alone. Each name of its path is found among the rows after
// a few of its letters, never typed whole; the link written reaches the same place. A broken link cannot be written.
// Each example is a folder of maps of its own, read alone: two examples can have a map of the same name.
const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'showcase');
const examples = readdirSync(root, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => join(root, e.name));
const indexes = examples.map((dir) => ({ dir, showcase: buildIndex(markdownFiles(dir).map((path) => ({ path, text: readFileSync(path, 'utf8') })), { hrefOf: (file, anchor) => `${file.name}/${anchor ?? ''}` }) }));
let count = 0;
for (const { showcase } of indexes) {
  for (const link of showcase.links) {
    const from = link.from.file;
    const names = /^\[\[([^\]|]*)/.exec(link.raw)![1].split('#').map((n) => n.trim());
    if (names[0] && showcase.files.get(names[0].toLowerCase())?.isMap === false) continue; // a note: the list proposes maps only
    let line = '- [[';
    let missing = '';
    for (const [k, name] of names.entries()) {
      if (k === 0 && !name) {
        line += '#'; // this map, as the format writes it
        continue;
      }
      line += name.slice(0, Math.min(3, name.length - 1));
      const p = proposeLink(showcase, from.name, from.text, line, line.length);
      const row = p?.rows.find((r) => nameKey(r.name) === nameKey(name));
      if (!p || !row) {
        missing = name;
        break;
      }
      line = apply(line, k < names.length - 1 ? row.down! : row.accept);
    }
    if (link.problem) {
      if (!missing) failures.push(`${from.name}: the broken link ${link.raw} could be written`);
      continue;
    }
    count++;
    if (missing) {
      failures.push(`${from.name}: ${link.raw} cannot be written, "${missing}" is not proposed after "${line}"`);
      continue;
    }
    const resolved = linksOf(showcase, from.name).resolve(line.slice(2));
    if (resolved.problem || resolved.href !== link.href) failures.push(`${from.name}: ${link.raw} written as ${line.slice(2)} reaches ${resolved.href ?? resolved.problem}, not ${link.href}`);
  }
}
if (count < 200) failures.push(`only ${count} links of the showcase were read`);

// ---- Step 2: what the type allows ----

const catalog = join(dirname(fileURLToPath(import.meta.url)), '..', 'skills', 'maps', 'types');
const texts = definitionTexts(catalog); // the types of the catalog
const definitions = new Map<string, Definition>();
const definitionOf = (type: string) => {
  if (!definitions.has(type) && texts.has(type)) definitions.set(type, parseDefinition(type, texts.get(type)!));
  return definitions.get(type);
};
/** The list in a map of `type` whose lines are `body`, the cursor at `¦`. */
const typeAt = (type: string, body: string) => {
  const text = `---\ntype: ${type}\n---\n\n${body}`;
  const lines = text.slice(0, text.indexOf('¦')).split('\n');
  return propose({ index, name: 'visit', definitionOf }, text.replace('¦', ''), lines.length - 1, lines.at(-1)!.length);
};
const names = (type: string, body: string) => typeAt(type, body)?.rows.map((r) => r.name);
/** The line of the cursor once the row `name` is accepted. */
const written = (type: string, body: string, name: string) => {
  const line = body.split('\n').find((l) => l.includes('¦'))!.replace('¦', '');
  return apply(line, typeAt(type, body)!.rows.find((r) => r.name === name)!.accept);
};
const phase = `## Search
- Description: She searches.
- Emotion: -1, lost
- Pain points:
  - Cannot tell who is available
    - Severity: high
    - Quote: "None of them said when."
  - Mixed results
`;

// The values of a property: an enum, a scale; those that start with what is typed; none once one is typed whole.
expect('a scale', names('journey-map', `${phase}- Emotion: ¦`), ['-3', '-2', '-1', '0', '1', '2', '3']);
expect('a scale, filtered', names('journey-map', `${phase}- Emotion: -¦`), ['-3', '-2', '-1']);
expect('a value typed whole', names('journey-map', phase.replace('-1, lost', '-1¦, lost')), undefined);
expect('the note of a number is kept', written('journey-map', phase.replace('-1, lost', '-¦1, lost'), '-2'), '- Emotion: -2, lost');
expect('an enum of a detail', names('journey-map', phase.replace('Severity: high', 'Severity: ¦')), ['low', 'medium', 'high']);
expect('an enum, filtered ignoring case', names('journey-map', phase.replace('Severity: high', 'Severity: H¦')), ['high']);
expect('an enum typed whole', names('journey-map', phase.replace('Severity: high', 'Severity: High¦')), undefined);
expect('the value of the line is replaced', written('journey-map', phase.replace('Severity: high', 'Severity: m¦igh'), 'medium'), '    - Severity: medium');
expect('a text has no values', names('journey-map', `${phase}- Touchpoints: ¦`), undefined);
expect('an enum of an element', names('user-flow', '## Pay\n- Kind: ¦'), ['screen', 'decision', 'action']);
expect('an enum of an element under an element', names('opportunity-solution-tree', '## Book more\n- Kind: outcome\n- Cannot compare\n  - Kind: ¦'), ['outcome', 'opportunity', 'solution', 'assumption']);
expect('any other property of the type', names('raci', '## Choose the provider\n- Marc: ¦'), ['R', 'A', 'C', 'I', 'A/R']);
expect('a property the type does not know', names('journey-map', `${phase}- Mood: ¦`), undefined);
expect('a type that is not known', names('nope', `${phase}- Emotion: ¦`), undefined);
expect('a link wins', names('journey-map', `${phase}- Touchpoints: [[¦`), ['This map', 'site']);

// The properties not written yet, while a label is typed: those that start with it; none on an empty item.
expect('an empty item', names('journey-map', `${phase}- ¦`), undefined);
expect('a first letter', names('journey-map', `${phase}- o¦`), ['Opportunities']);
// The first item of an element that has no other: every property, and before them a row that writes them all.
expect('a new element', names('user-flow', '## Context\nA flow.\n\n## Pay\n- ¦\n\n## Leave\n- Kind: action'), ['All 2 properties', 'Description', 'Kind']);
expect('all its properties', written('user-flow', '## Pay\n- ¦', 'All 2 properties'), '- Description: \n- Kind: ');
expect('the cursor at the first value', typeAt('user-flow', '## Pay\n- ¦')!.rows[0].accept.cursor, 'Description: '.length);
expect('one property: no row for all', names('sitemap', '## Home\n- ¦'), ['Description']);
expect('a letter typed: no row for all', names('user-flow', '## Pay\n- d¦'), ['Description']);
expect('an element with an item', names('user-flow', '## Pay\n- Kind: action\n- ¦'), undefined);
expect('an element with an item under it', names('sitemap', '## Home\n- ¦\n- Search'), undefined);
expect('a label typed', names('journey-map', `${phase}- t¦`), ['Touchpoints', 'Thoughts']);
expect('a label written, ignoring case', names('journey-map', `${phase}- touchpoints: web\n- T¦`), ['Thoughts']);
expect('a property accepted', written('journey-map', `${phase}- to¦`, 'Touchpoints'), '- Touchpoints: ');
expect('the list goes on after a property', typeAt('journey-map', `${phase}- to¦`)!.rows[0].again, true);
expect('not in the middle of a line', names('journey-map', phase.replace('Emotion: -1', 'E¦motion: -1')), undefined);
expect('the details of a value', names('journey-map', `${phase}    - s¦`), ['Severity', 'Source', 'Seen in']);
expect('the details not written yet', names('journey-map', phase.replace('    - Quote', '    - s¦\n    - Quote')), ['Source', 'Seen in']);
expect('a value is free', names('journey-map', `${phase}  - s¦`), undefined);
// A value written on the line of its property has its details right under it.
expect('the details of a value on the line of its property', names('journey-map', '## Test\n- Touchpoints:\n- Pain points: test\n  - s¦'), ['Severity', 'Source', 'Seen in']);
expect('their values', names('journey-map', '## Test\n- Pain points: test\n  - Severity: ¦'), ['low', 'medium', 'high']);
expect('no details under a property without them', names('journey-map', '## Test\n- Touchpoints: web\n  - s¦'), undefined);
expect('the details of a value, before another element', names('journey-map', '## Test\n- Pain points:\n  - Nanina\n    - s¦\n\n## Open questions\n- Who?'), ['Severity', 'Source', 'Seen in']);
// Right under a property with no value, an item is a value whatever it holds, `: ` included (rule 7): its details are
// proposed under it; the value itself is free.
const evidence = '## Swaps\n- Evidence:\n  - Forgot the email once; the swap was counted as a missed shift: "I had to argue"\n';
expect('the details of a value that holds `: `', names('study', `${evidence}    - p¦`), ['Participant']);
expect('a value that holds `: ` is free', names('study', `${evidence}  - Lost: twice¦`), undefined);
const attribute = '## Settlement\n- Attributes:\n  - expenseId (not a relation: the expense may be deleted since)\n';
expect('a detail of an attribute that holds `: `', names('erd', `${attribute}    - t¦`), ['Type']);
// A label stays a label: a detail under a value, with its values; a property of an element under an element (a tree);
// a property whose value is on its line.
expect('the values of a detail under a value that holds `: `', names('erd', `${attribute}    - Type: text\n    - Required: ¦`), ['yes', 'no']);
expect('a property of a story', names('story-map', '## Find\n- Search\n  - Search by city\n    - Release: MVP\n    - d¦'), ['Description']);
expect('a property whose value is on its line', names('user-flow', '## Pay\n- Kind: screen\n- d¦'), ['Description']);
expect('an element under an element, with no colon', names('story-map', '## Find\n- Search\n  - r¦'), ['Release']);
expect('a property the type does not have has no details',names('service-blueprint', '## Test\n- Pain points:\n  - Nanina\n    - s¦'), undefined);
expect('an arrow of a graph', names('user-flow', '## Pay\n- k → ¦'), undefined);
expect('a property of a graph', names('user-flow', '## Pay\n- k¦'), ['Kind']);
expect('a property of an element under an element', names('opportunity-solution-tree', '## Book more\n- Kind: outcome\n- Cannot compare\n  - k¦'), ['Kind']);
expect('no name for any other property', names('raci', '## Choose the provider\n- m¦'), undefined);
expect('not in Context', names('journey-map', '## Context\n- d¦'), undefined);
expect('not in Open questions', names('journey-map', `${phase}\n## Open questions\n- Who?\n  - d¦`), undefined);

// The labels the type does not know, for the editor to write them in italics: a property of an element, a detail of
// a value; not an arrow, nor what is under a property with no details, nor in Context, nor any name where the type
// takes any other property.
const marked = (type: string, body: string) => {
  const text = `---\ntype: ${type}\n---\n\n${body}`;
  const lines = text.split('\n');
  return addedLabels(definitionOf, text, 0, lines.length - 1).map((a) => lines[a.line].slice(a.from, a.to));
};
expect('labels the type does not know', marked('journey-map', `## Context\n- Source: notes\n\n${phase}- Touchpoint: web\n- Pain points:\n  - Lost\n    - Severty: high\n    - Source: notes\n- Thoughts:\n  - Note: free`), ['Touchpoint', 'Severty']);
expect('not an arrow', marked('user-flow', '## Pay\n- Kind: action\n- if ok: yes → [[#Pay]]\n- yes → [[#Pay]]\n- Owner: Tom'), ['if ok', 'Owner']);
expect('a detail under a value that holds `: `', marked('study', `${evidence}    - Participant: P4\n    - Participnt: P4`), ['Participnt']);
expect('labels of a tree', marked('story-map', '## Find\n- Search\n  - Search by city\n    - Release: MVP\n    - Owner: Tom'), ['Owner']);
expect('any other property', marked('raci', '## Choose\n- Marc: R'), []);
expect('a type that is not known', marked('nope', '## Choose\n- Marc: R'), []);

// The showcase: where a value of an enum or of a scale is written, it is among the values proposed; a property of an
// element, or a detail of a value, is proposed from its first letter once its line no longer writes it.
let values = 0;
let labels = 0;
for (const { dir, showcase } of indexes) {
  const own = definitionTexts(join(dir, 'types')); // the types of the example
  const parsed = new Map<string, Definition>();
  const definitionOf = (type: string) => {
    if (!parsed.has(type) && own.has(type)) parsed.set(type, parseDefinition(type, own.get(type)!, own.get(`${type}.layout`)));
    return parsed.get(type);
  };
  for (const file of showcase.files.values()) {
    if (!file.isMap) continue;
    const definition = definitionOf(file.map.meta.type);
    if (!definition) continue;
    const folder = { index: showcase, name: file.name, definitionOf };
    const lines = file.text.split('\n');
    const body = lines.findIndex((l) => l.startsWith('## '));
    let free = false; // in Context or Open questions, which are not elements
    for (let k = body; k >= 0 && k < lines.length; k++) {
      if (lines[k].startsWith('## ')) free = /^## (context|open questions)\s*$/i.test(lines[k]);
      const item = /^(\s*)- ([^:]+): ?(.*)$/.exec(lines[k]);
      if (!item || free) continue;
      const [, indent, label, value] = item;
      const at = `${indent}- ${label}: `.length;
      if (value) {
        const proposed = propose(folder, file.text, k, at)?.rows.map((r) => r.name.toLowerCase());
        const said = value.split(',')[0].trim().toLowerCase();
        if (proposed) values++;
        if (proposed && said !== 'undefined' && !proposed.includes(said)) failures.push(`${file.name}, line ${k + 1}: "${value}" is not among the values proposed (${proposed.join(', ')})`);
      }
      // What the type says of this place, read by the test on its own: a property of the type on an element (not
      // indented), a detail of a property under one of its values (its property two levels above).
      const up = (n: number) => lines.slice(0, k).findLast((l) => /^\s*- /.test(l) && l.search(/\S/) === indent.length - n)?.trim().replace(/^- |:.*$/g, '');
      const known = indent.length === 0 ? definition.properties : indent.length === 4 ? definition.properties.find((p) => p.name.toLowerCase() === up(4)?.toLowerCase())?.details : undefined;
      if (!known?.some((p) => p.name.toLowerCase() === label.toLowerCase())) continue;
      const text = [...lines.slice(0, k), `${indent}- ${label[0]}`, ...lines.slice(k + 1)].join('\n');
      const proposed = propose(folder, text, k, indent.length + 3)?.rows.map((r) => r.name.toLowerCase()) ?? [];
      labels++;
      if (!proposed.includes(label.toLowerCase())) failures.push(`${file.name}, line ${k + 1}: "${label}" is not proposed (${proposed.join(', ')})`);
    }
  }
}
if (values < 50 || labels < 300) failures.push(`only ${values} values and ${labels} properties of the showcase were read`);

if (failures.length) {
  console.log(failures.join('\n'));
  process.exit(1);
}
console.log(`The completion writes the ${count} links of the showcase, and proposes its ${values} values of an enum or a scale and its ${labels} properties.`);
