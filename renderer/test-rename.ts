// Test of the renaming, with no dependency: renames an element and an item
// in maps held in memory, and checks every link to them, however written, and nothing else; then a name edited in
// the page, whose links follow. Run: npm test.

import { followName, type NameLeft, rename } from './links.ts';
import type { Source } from './model.ts';

const site = `---
type: sitemap
title: Site
---
<!-- Sitemap: a link is written [[#Home#Search]]. -->

## Home
- Search
  - Description: Find a practice.
  - Profile

## Account
- Description: See [[#Home#Search|the search]] and [[#home]].
`;
const flow = `---
type: user-flow
title: Flow
---

## Look
- Page: [[Site#HOME#Search#Profile]]
- Leads to → [[site#Home#Description]]
- Next → [[#Look]]
`;
const sources = [
  { path: 'site.md', text: site },
  { path: 'flow.md', text: flow },
];

const failures: string[] = [];
const expect = (what: string, actual: unknown, expected: unknown) => actual !== expected && failures.push(`${what}:\n  expected ${JSON.stringify(expected)}\n  got      ${JSON.stringify(actual)}`);
const textOf = (changed: Source[], path: string) => changed.find((c) => c.path === path)?.text ?? '';

// An element: its heading, the links to it and under it, in its map and another one; not the header comment.
let changed = rename(sources, 'site#Home', 'Start');
expect('heading', textOf(changed, 'site.md').includes('## Start\n'), true);
expect('header comment kept', textOf(changed, 'site.md').includes('[[#Home#Search]]. -->'), true);
expect('own links, alias and case', textOf(changed, 'site.md').includes('See [[#Start#Search|the search]] and [[#Start]].'), true);
expect('link from another map', textOf(changed, 'flow.md').includes('- Page: [[Site#Start#Search#Profile]]'), true);
expect('link with a property', textOf(changed, 'flow.md').includes('[[site#Start#Description]]'), true);

// An item: its line, the links through it; the other names of a path kept as written.
changed = rename(sources, 'site#Home#Search', 'Results');
expect('item', textOf(changed, 'site.md').includes('\n- Results\n'), true);
expect('item link', textOf(changed, 'site.md').includes('[[#Home#Results|the search]]'), true);
expect('item link through', textOf(changed, 'flow.md').includes('[[Site#HOME#Results#Profile]]'), true);
expect('other links kept', textOf(changed, 'flow.md').includes('[[site#Home#Description]]'), true);

// Nothing to rename: an error, and no file changed.
for (const [target, name, error] of [
  ['site#Nope', 'X', 'no element "Nope" in site'],
  ['site#Home#Nope', 'X', 'no "Nope" under Home in site'],
  ['site#Home', 'account', 'site already has an element "account"'],
]) {
  let message = '';
  try {
    rename(sources, target, name);
  } catch (e) {
    message = (e as Error).message;
  }
  expect(`refused ${target}`, message, error);
}

// ---- A name edited in the page: its links follow ----

/** A folder as the page holds it: a file is typed, written with what follows (`followName`), and what is left to
 *  remember is kept for the next time. */
function folderOf(files: Source[]) {
  let folder = files.map((f) => ({ ...f }));
  let left: NameLeft | undefined;
  return {
    text: (path: string) => folder.find((f) => f.path === path)!.text,
    /** Types in `path`: `from` becomes `to`, wherever it is. */
    type(path: string, from: string, to: string) {
      const result = followName(folder, path, this.text(path).replace(from, to), left);
      left = result.left;
      folder = folder.map((f) => result.files.find((r) => r.path === f.path) ?? f);
      return result;
    },
  };
}

// The heading of an element: the links to it and under it, in its map and in another one.
let page = folderOf(sources);
let result = page.type('site.md', '## Home', '## Start');
expect('followed: what was renamed', JSON.stringify(result.renamed), JSON.stringify({ from: 'Home', to: 'Start', links: 4, maps: 2 }));
expect('followed: own links', page.text('site.md').includes('See [[#Start#Search|the search]] and [[#Start]].'), true);
expect('followed: the links of another map', page.text('flow.md').includes('[[Site#Start#Search#Profile]]') && page.text('flow.md').includes('[[site#Start#Description]]'), true);
// Undone, the links come back.
result = page.type('site.md', '## Start', '## Home');
expect('followed back', page.text('site.md').includes('and [[#Home]].') && page.text('flow.md').includes('[[Site#Home#Search#Profile]]'), true);

// An item, while other lines are typed at once; the line as it was typed.
page = folderOf(sources);
result = page.type('site.md', '- Search\n', '- Results  \n  - Kind: page\n');
expect('an item followed', page.text('flow.md').includes('[[Site#HOME#Results#Profile]]') && page.text('site.md').includes('[[#Home#Results|the search]]'), true);
expect('its line as typed', page.text('site.md').includes('- Results  \n  - Kind: page\n'), true);
expect('its count', `${result.renamed?.links} in ${result.renamed?.maps}`, '2 in 2');

// A name emptied, then typed after a pause, with lines added above in between: its links follow all the same.
page = folderOf(sources);
result = page.type('site.md', '## Home', '## ');
expect('emptied: nothing renamed', result.renamed, undefined);
expect('emptied: the links wait', page.text('flow.md'), flow);
page.type('site.md', 'title: Site\n', 'title: Site\nupdated: 2026-11-13\n');
result = page.type('site.md', '## \n', '## Start\n');
expect('typed again: renamed', `${result.renamed?.from} to ${result.renamed?.to}`, 'Home to Start');
expect('typed again: the links', page.text('flow.md').includes('[[Site#Start#Search#Profile]]') && page.text('site.md').includes('[[#Start]]'), true);

// A name already taken: the links do not follow, and do once the name is its own.
page = folderOf(sources);
result = page.type('site.md', '## Home', '## Account');
expect('a name taken', result.problem, 'site already has an element "Account"');
expect('a name taken: the links wait', page.text('flow.md'), flow);
result = page.type('site.md', '## Account\n- Search', '## Account page\n- Search');
expect('then its own name', page.text('flow.md').includes('[[Site#Account page#Search#Profile]]'), true);

// Nothing to follow: the same name for a link, a property, a line taken out, an arrow, two names at once, Context.
page = folderOf(sources);
for (const [what, path, from, to] of [
  ['the same name for a link', 'site.md', '## Home', '## HOME!'],
  ['a property', 'site.md', '- Description: Find a practice.', '- Summary: Find a practice.'],
  ['a line taken out', 'site.md', '  - Profile\n', ''],
  ['an arrow', 'flow.md', '- Next → [[#Look]]', '- Then → [[#Look]]'],
  ['two names at once', 'site.md', '## Home\n- Search', '## Start\n- Results'],
]) {
  result = page.type(path, from, to);
  expect(`not followed: ${what}`, result.renamed, undefined);
  expect(`not followed: ${what}, only its file`, result.files.length, 1);
}

if (failures.length) {
  console.log(failures.join('\n'));
  process.exit(1);
}
console.log('The renaming rewrites every link, and the links follow a name edited in the page.');
