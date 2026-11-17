// Reading a folder of maps from the disk: its files and the type definitions. Shared by the check (check.ts), the
// server (serve.ts) and the test (test-render.ts).

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Definition } from './model.ts';
import { parseDefinition } from './read.ts';

/** The files under a folder, as paths relative to it with `/`; dot folders and `node_modules` are left out. */
export function filesUnder(dir: string) {
  return readdirSync(dir, { recursive: true })
    .map((p) => String(p).split(/[\\/]/).join('/'))
    .filter((p) => !p.split('/').some((part) => part.startsWith('.') || part === 'node_modules'));
}

/** The `.md` files under a folder. */
export const markdownFiles = (dir: string) => filesUnder(dir).filter((p) => p.toLowerCase().endsWith('.md')).map((p) => join(dir, p));

/** The texts of the type definitions and their layouts of a `types/` folder, by name: those of a project, or the
 *  catalog of the skill. */
export function definitionTexts(types: string) {
  const texts = new Map<string, string>();
  if (!existsSync(types)) return texts;
  for (const name of readdirSync(types).filter((n) => n.endsWith('.md'))) texts.set(name.slice(0, -3), readFileSync(join(types, name), 'utf8'));
  return texts;
}

/** The parsed definition of a type, with its layout when there is one. Throws with a readable message. */
export function definitionOf(texts: Map<string, string>, type: string): Definition {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(type)) throw new Error(`"${type}" is not a type name (kebab-case, like "user-flow").`);
  if (!texts.has(type)) throw new Error(`no definition for the type "${type}" in the types/ folder of the project.`);
  return parseDefinition(type, texts.get(type)!, texts.get(`${type}.layout`));
}
