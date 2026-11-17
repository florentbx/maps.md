#!/usr/bin/env node
// Renames an element or an item of a map, and rewrites every link to it in the maps of the folder, so that no link
// breaks: what an AI runs instead of renaming by hand.
// Usage: node rename.mjs <folder> "<file>#<Element>[#<Item>…]" "<New name>"
// Bundled by build.ts into skills/maps/rename.mjs, next to the check, with no dependency.

import { readFileSync, writeFileSync } from 'node:fs';
import { relative } from 'node:path';
import { markdownFiles } from './folder.ts';
import { rename } from './links.ts';

const [folder, target, newName] = process.argv.slice(2);
if (!folder || !target || !newName?.trim()) {
  console.error('Usage: node rename.mjs <folder> "<file>#<Element>[#<Item>…]" "<New name>"');
  process.exit(1);
}
const sources = markdownFiles(folder).map((path) => ({ path, text: readFileSync(path, 'utf8') }));
try {
  const changed = rename(sources, target, newName.trim());
  for (const { path, text } of changed) writeFileSync(path, text);
  console.log(`Renamed ${target} to "${newName.trim()}": ${changed.length} file${changed.length === 1 ? '' : 's'} changed${changed.length ? `, ${changed.map((c) => relative(folder, c.path)).join(', ')}` : ''}.`);
} catch (e) {
  console.error(`Not renamed: ${(e as Error).message}.`);
  process.exit(1);
}
