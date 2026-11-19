// Exports the maps of one project of showcase/ in the four forms of the benchmark (PLAN.md), each in its own folder:
//   A/      the .md files of the maps, as is
//   A+def/  A, plus types/<type>.md, the definitions of their types
//   B/      each map drawn by drawMap() as an .html page, no CSS
//   B+css/  B, with renderer/style.css and the type's .css inlined
// The HTML of the renderer is one line: a line break is added between tags, so that a Read tool reads it in full.
// Run: npx tsx bench/context-format/export.ts showcase/1-courts <out-dir>

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { drawMap } from '../../renderer/draw.ts';
import { definitionOf, definitionTexts, markdownFiles } from '../../renderer/folder.ts';
import { buildIndex, linksOf } from '../../renderer/links.ts';

const [projectArg, outArg] = process.argv.slice(2);
if (!projectArg || !outArg) throw new Error('usage: export.ts <project folder> <out dir>');
const project = resolve(projectArg);
const out = resolve(outArg);
const pageCss = readFileSync(resolve('renderer/style.css'), 'utf8');

const write = (path: string, text: string) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
};
const page = (title: string, body: string, css = '') =>
  `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>${title}</title>\n${css ? `<style>\n${css}\n</style>\n` : ''}</head>\n<body>\n<main class="map">\n${body.replace(/></g, '>\n<')}\n</main>\n</body>\n</html>\n`;

const sources = markdownFiles(project).map((path) => ({ path: resolve(path), text: readFileSync(path, 'utf8') }));
const index = buildIndex(sources, { hrefOf: () => '#' });
const texts = definitionTexts(join(project, 'types'));
const sizes: Record<string, number> = { A: 0, 'A+def': 0, B: 0, 'B+css': 0 };
const types = new Set<string>();

for (const file of index.files.values()) {
  if (!file.isMap) continue;
  const source = sources.find((s) => s.text === file.text) ?? sources.find((s) => s.path.endsWith(`/${file.name}.md`))!;
  const rel = relative(project, source.path);
  const type = file.map.meta.type!;
  types.add(type);
  const html = await drawMap(file.map, definitionOf(texts, type), linksOf(index, file.key));
  const typeCssPath = join(project, 'types', `${type}.css`);
  const typeCss = existsSync(typeCssPath) ? readFileSync(typeCssPath, 'utf8') : '';
  const title = file.map.meta.title ?? file.name;
  const forms: Record<string, [string, string]> = {
    A: [rel, source.text],
    'A+def': [rel, source.text],
    B: [rel.replace(/\.md$/, '.html'), page(title, html)],
    'B+css': [rel.replace(/\.md$/, '.html'), page(title, html, `${pageCss}\n${typeCss}`)],
  };
  for (const [form, [path, text]] of Object.entries(forms)) {
    write(join(out, form, path), text);
    sizes[form] += text.length;
  }
}
for (const type of types) {
  const from = join(project, 'types', `${type}.md`);
  write(join(out, 'A+def', 'types', `${type}.md`), readFileSync(from, 'utf8'));
  sizes['A+def'] += readFileSync(from, 'utf8').length;
}
console.log(Object.entries(sizes).map(([form, n]) => `${form}\t${n} chars`).join('\n'));
