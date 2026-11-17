#!/usr/bin/env node
// Sets up maps.md in a project, or updates it: run again to get the latest skill and page.
// Usage, from the project folder: npx github:florentbx/maps.md [folder]
// - copies the skill and its catalog of types into .claude/skills/maps/ (replaced on each run);
// - copies maps.html into maps/, next to the maps (replaced on each run);
// - copies into maps/types/ the type of the catalog of each map that has none there yet, so that the maps of a project
//   made before the catalog keep their types (a type already in maps/types/ is never touched);
// - adds the preview `maps` to .claude/launch.json, so that the Claude desktop app shows the maps live;
// - adds one line about maps to CLAUDE.md and AGENTS.md, those that exist (both are created if none does), after asking
//   in a terminal; replaces it with the current one on each run.
// The maps of the project and its types already in maps/types/ are never touched.

import { appendFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const source = join(dirname(fileURLToPath(import.meta.url)), '..');
const project = resolve(process.argv[2] ?? '.');
const LINE =
  'Maps are diagrams written as Markdown files, in `maps/`. To write, correct or update one, or to create a type of map, its style or a theme, follow `.claude/skills/maps/SKILL.md`. To show them, live, start the preview `maps` of the Claude desktop app, or run `node .claude/skills/maps/serve.mjs maps/` and give the address it prints; in a cloud session, see "Showing the maps" in the skill. Before you build or change a feature, read the maps that cover it, as its specification: what they leave `undefined` or as an open question is asked, not invented. When a change you make contradicts a map, say so and offer to update the map; do not update it unless asked.';

console.log(`maps.md ${JSON.parse(readFileSync(join(source, 'package.json'), 'utf8')).version}`);

const skill = join(project, '.claude', 'skills', 'maps');
rmSync(skill, { recursive: true, force: true });
cpSync(join(source, 'skills', 'maps'), skill, { recursive: true });
console.log('Skill and its catalog of types: .claude/skills/maps/');

mkdirSync(join(project, 'maps'), { recursive: true });
cpSync(join(source, 'maps.html'), join(project, 'maps', 'maps.html'));
console.log('Page: maps/maps.html');

// The types the maps use, from the catalog, when maps/types/ does not have them: the type of a map is in the project.
const catalog = join(skill, 'types');
const types = join(project, 'maps', 'types');
const used = new Set(
  readdirSync(join(project, 'maps'), { recursive: true })
    .map(String)
    .filter((p) => p.endsWith('.md') && !p.split(/[\\/]/).some((part) => part.startsWith('.') || part === 'node_modules' || part === 'types'))
    .map((p) => /^type:\s*([a-z0-9-]+)\s*$/m.exec(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(join(project, 'maps', p), 'utf8'))?.[1] ?? '')?.[1])
    .filter((t) => t && t !== 'type-definition' && !existsSync(join(types, `${t}.md`)) && existsSync(join(catalog, `${t}.md`))),
);
for (const type of used) {
  mkdirSync(types, { recursive: true });
  for (const end of ['.md', '.layout.md', '.css']) if (existsSync(join(catalog, type + end))) cpSync(join(catalog, type + end), join(types, type + end));
}
if (used.size) console.log(`Types of your maps, copied from the catalog: maps/types/ (${[...used].join(', ')})`);

// The preview of the Claude desktop app: `serve` on the maps, shown in its pane, live. Added once to the configurations
// of the project, the others kept.
const launch = join(project, '.claude', 'launch.json');
// autoPort: the app gives a free port (PORT), so that the pane never shows the maps of another project on 4321.
const preview = { name: 'maps', program: '.claude/skills/maps/serve.mjs', args: ['maps'], port: 4321, autoPort: true };
try {
  const config = existsSync(launch) ? JSON.parse(readFileSync(launch, 'utf8')) : { version: '0.0.1', configurations: [] };
  config.configurations ??= [];
  if (config.configurations.some((/** @type {{ name?: string }} */ c) => c.name === 'maps')) console.log('.claude/launch.json: already has the preview "maps", kept as it is');
  else {
    config.configurations.push(preview);
    writeFileSync(launch, `${JSON.stringify(config, null, 2)}\n`);
    console.log('.claude/launch.json: preview "maps" added (the Claude desktop app shows the maps live)');
  }
} catch {
  console.log(`.claude/launch.json could not be read (comments?): add this configuration by hand: ${JSON.stringify(preview)}`);
}

// The line about maps, between two markers, so that each run replaces it with the current one and leaves the rest of
// the file as it is. A line written before the markers (it names the skill) is replaced the same way. The notes are
// committed: in a terminal, init asks before it adds the line; run by an AI, with no terminal, it adds it and says so.
const BLOCK = `<!-- maps.md -->\n${LINE}\n<!-- /maps.md -->`;
const OLD = /<!-- maps\.md -->[\s\S]*?<!-- \/maps\.md -->|^.*\.claude\/skills\/maps\/SKILL\.md.*$/m;
const NOTES = ['CLAUDE.md', 'AGENTS.md'];
const existing = NOTES.filter((name) => existsSync(join(project, name)));
const toAdd = [];
for (const name of existing) {
  const text = readFileSync(join(project, name), 'utf8');
  if (!OLD.test(text)) toAdd.push(name);
  else if (text.replace(OLD, () => BLOCK) === text) console.log(`${name}: line about maps up to date`);
  else {
    writeFileSync(join(project, name), text.replace(OLD, () => BLOCK));
    console.log(`${name}: line about maps updated`);
  }
}
const create = existing.length ? [] : NOTES; // neither exists: both are created
if (toAdd.length || create.length) {
  const files = [...toAdd, ...create].join(' and ');
  let yes = true;
  if (process.stdin.isTTY && process.stdout.isTTY) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question(`Add a line about maps to ${files}${create.length ? ' (created)' : ''}, so that your AI knows how to write them? (Y/n) `);
    rl.close();
    yes = !/^n/i.test(answer.trim());
  }
  if (!yes) console.log(`${files}: not changed; to add it later, run init again or add this line:\n${LINE}`);
  else {
    for (const name of create) {
      writeFileSync(join(project, name), `# Notes for AI agents\n\n${BLOCK}\n`);
      console.log(`${name}: created, with the line about maps`);
    }
    for (const name of toAdd) {
      const text = readFileSync(join(project, name), 'utf8');
      appendFileSync(join(project, name), `${text.endsWith('\n') ? '' : '\n'}\n## Maps\n\n${BLOCK}\n`);
      console.log(`${name}: line about maps added`);
    }
  }
}
console.log('Done. Ask your AI for a map, for example: "Make a journey map of these interview notes", or "Map what this code does".');
console.log('Then ask it to show them: it opens them where you work (the preview "maps" of the Claude desktop app, a page in your');
console.log('browser, or, in a cloud session, a private page on claude.ai).');
console.log('maps.md is new: tell us what works and what does not, https://github.com/florentbx/maps.md/issues');
