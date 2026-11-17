#!/usr/bin/env node
// Checks the maps of a folder against their type definitions, with no drawing: what an AI runs after writing a map,
// and what CI runs on a pull request (it fails when there is an error). Generic: every check comes from the
// definitions, never from a type. It cannot see an invented fact. It writes the header comment of each map, from the
// definition of its type (headerOf in read.ts): the only change it makes to a file.
// Usage: node check.mjs [folder]   (default: maps/ when it exists, else the current folder); one line per issue,
// `file:line: level: where: message`, with the closest name when a name is mistyped.
// The checks themselves are in checks.ts, shared with the page. Bundled by build.ts into skills/maps/check.mjs, next
// to the catalog of types, with no dependency. A map takes its type in the types/ folder of its project (the nearest
// one up, `projectsOf`); a type missing there, and in the catalog, is said with the files to copy.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { definitionOf, definitionTexts, markdownFiles } from './folder.ts';
import { buildIndex, projectsOf } from './links.ts';
import { brokenLinkWhere, checkMap, didYouMean, lineWith, type Issue } from './checks.ts';
import type { Meta } from './model.ts';
import { headerOf, nameKey, readMap } from './read.ts';

const here = dirname(fileURLToPath(import.meta.url));
// The catalog of types: next to this file in the skill, or that of the repository when run from renderer/.
const catalog = [join(here, 'types'), join(here, '..', 'skills', 'maps', 'types')].find((dir) => existsSync(dir))!;

/** The text of a map with its header comment (`headerOf`): the comment right after the front matter replaced, or
 *  added when there is none. The same text when it is already right, or when there is no front matter. */
function withHeader(text: string, header: string) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  return text.replace(/^(\uFEFF?---\r?\n[\s\S]*?\r?\n---[ \t]*\r?\n)(?:[ \t]*<!--[\s\S]*?-->[ \t]*(?:\r?\n|$))?/, (_, front) => `${front}${header}${eol}`);
}

if (process.argv[2]?.startsWith('-')) {
  console.log('Usage: node check.mjs [folder]   (default: maps/ when it exists, else the current folder)');
  console.log('Checks every map of the folder against its type, and writes the header comment of each map.');
  process.exit(process.argv[2] === '--help' || process.argv[2] === '-h' ? 0 : 1);
}
const dir = process.argv[2] ?? (existsSync('maps') ? 'maps' : '.');
const files = markdownFiles(dir);
const { rootOf } = projectsOf(files);
// The types of the project of a file: its types/ folder, read once.
const projects = new Map<string, Map<string, string>>();
const textsOf = (path: string) => {
  const root = rootOf(path) ?? `${dir}/`;
  if (!projects.has(root)) projects.set(root, definitionTexts(join(root, 'types')));
  return projects.get(root)!;
};
/** The definition of the type of a map, from its project; when it is missing there but in the catalog, the error says
 *  what to copy. */
const typeOf = (path: string, type: string) => {
  try {
    return definitionOf(textsOf(path), type);
  } catch (e) {
    const types = relative('.', join(rootOf(path) ?? dir, 'types')) || 'types';
    if (!textsOf(path).has(type) && existsSync(join(catalog, `${type}.md`))) throw new Error(`${(e as Error).message} Copy it from the catalog: ${relative('.', join(catalog, type))}.md, with its .layout.md and .css when they exist, into ${types}/.`);
    throw e;
  }
};
const written: string[] = []; // the maps whose header the check wrote
const sources = files.map((path) => {
  const text = readFileSync(path, 'utf8');
  try {
    const type = readMap(text).meta.type;
    if (!type || type === 'type-definition') return { path, text };
    const right = withHeader(text, headerOf(typeOf(path, type)));
    if (right !== text) {
      writeFileSync(path, right);
      written.push(path);
    }
    return { path, text: right };
  } catch {
    return { path, text }; // reported below: a file that cannot be read, a type with no definition
  }
});
const index = buildIndex(sources);
const report = new Map<string, Issue[]>(); // file path → issues
const missingArrows = new Set<string>(); // the arrows to a missing element, already errors: their links are not reported again as broken
const add = (path: string, issue: Issue) => report.set(path, [...(report.get(path) ?? []), issue]);

// The definitions of the folder, even those no map uses yet.
for (const { path, text } of sources) {
  let meta: Meta;
  try {
    meta = readMap(text).meta;
  } catch {
    continue; // reported below as a file that cannot be read
  }
  if (meta.type !== 'type-definition') continue;
  if (basename(dirname(path)) !== 'types') {
    add(path, { level: 'warning', where: 'definition', message: 'not read: a type definition goes in the types/ folder of the maps' });
    continue;
  }
  try {
    definitionOf(textsOf(path), basename(path).replace(/\.md$/i, ''));
  } catch (e) {
    add(path, { level: 'error', where: 'definition', message: (e as Error).message });
  }
}
let maps = 0;
for (const file of index.files.values()) {
  if (file.error) add(file.path, { level: 'error', where: 'file', message: file.error });
  if (!file.isMap) continue;
  maps++;
  try {
    for (const issue of checkMap(file, typeOf(file.path, file.map.meta.type), missingArrows)) add(file.path, issue);
  } catch (e) {
    add(file.path, { level: 'error', where: 'type', message: (e as Error).message });
  }
}
for (const link of index.links.filter((l) => l.problem)) {
  const where = brokenLinkWhere(link, missingArrows);
  if (!where) continue;
  // A name close to the one written: a file of the folder when none has its name, else an element of the file.
  const [, fileName, first] = /^\[\[([^\]#|]*)#?([^\]#|]*)/.exec(link.raw) ?? [];
  const hint = !link.file ? didYouMean(fileName, [...index.files.values()].map((f) => f.name)) : !link.element && first ? didYouMean(first, [...link.file.elements.values()].map((e) => e.name)) : '';
  const section = link.from.file.isMap ? link.from.file.map.sections.find((s) => nameKey(s.name) === nameKey(link.from.element.split(' › ')[0])) : undefined;
  add(link.from.file.path, { level: 'warning', where, message: `broken link ${link.raw}: ${link.problem}${hint}`, line: lineWith(link.from.file, section?.src.line, link.raw) });
}

for (const path of written) console.log(`${relative('.', path) || path}: header comment written, from the definition of its type`);
const all = [...report.values()].flat();
// One line per issue, `file:line`, as compilers write it, so that an editor opens the file at the line.
for (const [path, issues] of report) {
  for (const i of issues) console.log(`${relative('.', path) || path}${i.line ? `:${i.line}` : ''}: ${i.level}: ${i.where}: ${i.message}`);
}
const count = (level: Issue['level']) => all.filter((i) => i.level === level).length;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
if (!maps) console.log(`No map found in ${dir}: a map is a .md file with a type in its front matter.`);
console.log(`${plural(count('error'), 'error')}, ${plural(count('warning'), 'warning')} in ${plural(maps, 'map')}.`);
process.exit(count('error') ? 1 : 0);
