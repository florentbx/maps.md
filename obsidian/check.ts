// The check of the maps of the vault, as `check.mjs` runs it on a folder (renderer/check.ts), with no file system and
// without writing anything: the issues of each map against its type (checks.ts), its broken links, the files that
// cannot be read, and the type definitions that cannot be read. Each issue with its line when it is known.

import { brokenLinkWhere, checkMap, didYouMean, lineWith, type Issue } from '../renderer/checks.ts';
import type { Definition, IndexedMap } from '../renderer/model.ts';
import { nameKey, parseDefinition, readMap } from '../renderer/read.ts';
import type { MapsStore } from './store.ts';

/** The issues of a file, for the panel of the check. */
export interface FileIssues {
  path: string;
  title: string;
  issues: Issue[];
}

/** The line (from 1) where an issue is, or else the one of the element it is about. */
function withLine(file: IndexedMap, issue: Issue): Issue {
  if (issue.line || !issue.at) return issue;
  const section = file.map.sections.find((s) => nameKey(s.name) === nameKey(issue.at!));
  return section ? { ...issue, line: section.src.line + 1 } : issue;
}

/** What is wrong in one map, the errors first: what checkMap finds, and its links that lead nowhere, with the closest
 *  name when one is mistyped. */
export function issuesOfMap(store: MapsStore, file: IndexedMap, definition: Definition): Issue[] {
  const index = store.index();
  const missing = new Set<string>();
  const issues = checkMap(file, definition, missing);
  for (const link of index.links.filter((l) => l.from.file === file && l.problem)) {
    const where = brokenLinkWhere(link, missing);
    if (!where) continue;
    const [, fileName, first] = /^\[\[([^\]#|]*)#?([^\]#|]*)/.exec(link.raw) ?? [];
    const hint = !link.file ? didYouMean(fileName, [...index.files.values()].map((f) => f.name)) : !link.element && first ? didYouMean(first, [...link.file.elements.values()].map((e) => e.name)) : '';
    const section = file.map.sections.find((s) => nameKey(s.name) === nameKey(link.from.element.split(' › ')[0]));
    issues.push({ level: 'warning', where, message: `broken link ${link.raw}: ${link.problem}${hint}`, line: lineWith(file, section?.src.line, link.raw), at: link.from.element });
  }
  const all = issues.map((i) => withLine(file, i));
  return [...all.filter((i) => i.level === 'error'), ...all.filter((i) => i.level !== 'error')];
}

/** Every map of the vault the plugin reads, checked: the files with an issue only. */
export function checkVault(store: MapsStore): { files: FileIssues[]; maps: number } {
  const index = store.index();
  const report = new Map<string, FileIssues>();
  const add = (path: string, title: string, issue: Issue) => {
    if (!report.has(path)) report.set(path, { path, title, issues: [] });
    report.get(path)!.issues.push(issue);
  };
  let maps = 0;
  for (const file of index.files.values()) {
    if (file.error) add(file.path, file.title, { level: 'error', where: 'file', message: file.error });
    if (!file.isMap) continue;
    maps++;
    const found = store.definitionOf(file);
    if (!found.definition) {
      add(file.path, file.title, { level: 'error', where: 'type', message: found.missing ? `${found.error} Add it with "maps.md: Add a type from the catalog".` : found.error });
      continue;
    }
    for (const issue of issuesOfMap(store, file, found.definition)) add(file.path, file.title, issue);
  }
  // The type definitions of the types folders, even those no map uses yet.
  const types = store.typesFolder.replace(/[.*+?^$()|[\]\\{}]/g, '\\$&');
  for (const { path, text } of store.sources()) {
    const m = new RegExp(`(^|/)${types}/([^/]+)\\.md$`, 'i').exec(path);
    if (!m || /\.layout$/i.test(m[2])) continue;
    try {
      if (readMap(text).meta.type !== 'type-definition') continue;
      parseDefinition(m[2], text, store.text(path.replace(/\.md$/i, '.layout.md')));
    } catch (e) {
      add(path, m[2], { level: 'error', where: 'definition', message: (e as Error).message });
    }
  }
  const files = [...report.values()].sort((a, b) => a.path.localeCompare(b.path));
  for (const f of files) f.issues.sort((a, b) => (a.level === b.level ? (a.line ?? 0) - (b.line ?? 0) : a.level === 'error' ? -1 : 1));
  return { files, maps };
}

/** "2 to fix" when there are errors, "1 to check" when there are only warnings, as maps.html says it. */
export const issuesTitle = (issues: Issue[]) => `${issues.length} to ${issues.some((i) => i.level === 'error') ? 'fix' : 'check'}`;
