// Builds maps.html, one standalone page that opens a folder of maps and draws them, offline, with no install; and
// skills/maps/check.mjs, serve.mjs, shot.mjs and rename.mjs, each in one file.
// Run: npm run build. The page bundles the reading, the links and the drawing of renderer/, ELK, panzoom (the canvas),
// CodeMirror (the editor), the font, the styles and the behaviour of the pages; no type: it reads those of the folder.
// The sources of renderer/ are TypeScript (checked by `npm run check-types`); esbuild removes the types: what people
// run is plain JavaScript, committed, for Node 22. This script itself is run by tsx.

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const bundle = await build({
  entryPoints: [join(here, 'viewer.ts')],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  minify: true,
  write: false,
  legalComments: 'none',
  // tsconfig.json is for tsc only: read here, its `strict` would put the whole page, ELK included, in strict mode.
  tsconfigRaw: '{}',
  metafile: true,
});
// The notices of what the page bundles, which their licenses ask to keep with every copy (the build drops the comments
// of the sources): each package, its copyright and where its source is, then each text of license once.
const packages = new Map<string, string[]>();
for (const input of Object.keys(bundle.metafile.inputs)) {
  const m = input.match(/node_modules\/((?:@[^/]+\/)?[^/]+)\//);
  if (m) packages.set(m[1], [...(packages.get(m[1]) ?? []), input]);
}
const licenses = new Map<string, string[]>();
const packageNotices = [...packages].sort(([a], [b]) => a.localeCompare(b)).map(([name, inputs]) => {
  const dir = join(root, 'node_modules', name);
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  const file = readdirSync(dir).find((n) => /licen[cs]e/i.test(n));
  const text = file ? readFileSync(join(dir, file), 'utf8').trim() : '';
  if (!text) throw new Error(`No license file in ${name}: add its notice by hand.`);
  // The copyright is in the license (MIT), or else in the head of the bundled source (EPL-2.0 of ELK).
  const copyright = [text, ...inputs.map((i) => readFileSync(join(root, i), 'utf8').slice(0, 5000))]
    .map((t) => t.match(/Copyright[^\n]*/)?.[0].trim()).find(Boolean) ?? '';
  licenses.set(text, [...(licenses.get(text) ?? []), name]);
  const repository = String(pkg.repository?.url ?? pkg.repository ?? '').replace(/^git\+/, '');
  return `${name} ${pkg.version}, ${pkg.license}. ${copyright}\n  Source: ${repository}`;
});
const NOTICES = `maps.md, MIT license. Copyright (c) 2026 Florent Brimeux. https://github.com/florentbx/maps.md

This page bundles:
${packageNotices.join('\n')}
lucide-static 0.460.0 (the icons), ISC. Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2022.
  Source: https://github.com/lucide-icons/lucide

${[...licenses].map(([text, names]) => `The license of ${names.join(', ')}:\n\n${text}`).join('\n\n')}

The license of lucide-static:

ISC License

Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2022.

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.`.replace(/--/g, '- -');
const script = (text: string) => text.replace(/<\/script/gi, '<\\/script');
// The icons of the page: Lucide (lucide-static 0.460.0, ISC license, https://lucide.dev), copied as they are.
const ICONS = {
  'panel-left': '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/>',
  'square-pen': '<path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/>',
  'file-text': '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  share: '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  menu: '<line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>',
  'arrow-left': '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  'folder-open': '<path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/>',
  mouse: '<rect x="5" y="2" width="14" height="20" rx="7"/><path d="M12 6v4"/>',
  touchpad: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="M2 14h20"/><path d="M12 20v-6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  minus: '<path d="M5 12h14"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
};
// The icon of the page, in the tab of the browser: an M, in --color-accent and --font-sans of style.css (a favicon
// cannot read the tokens of the page; keep it in step with them).
const FAVICON = `<link rel="icon" href="data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#2b66e0"/><text x="16" y="23" text-anchor="middle" font-family="system-ui, sans-serif" font-size="20" font-weight="700" fill="#fff">M</text></svg>')}">`;
const icon = (name: keyof typeof ICONS, cls = '') => `<svg class="icon${cls && ` ${cls}`}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
const html = `<!doctype html>
<!-- maps.md: open a folder of maps and see them drawn, offline. Generated by renderer/build.ts (npm run build): do not edit.

${NOTICES}
-->
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>maps.md</title>${FAVICON}
<style>${readFileSync(join(here, 'style.css'), 'utf8')}</style></head>
<body>
<div class="workspace">
<main class="canvas"><div id="page"><p class="empty">Open a folder of maps to see them drawn. Nothing leaves your computer.</p>
<p class="empty-actions"><label class="button" for="folder" data-open="folder">Open a folder</label></p></div></main>
<nav class="files" id="files" aria-label="Files"><div class="files-head"><button class="button button--ghost button--icon" id="files-close" data-tip="Hide the files  ⌘B" aria-label="Hide the files">${icon('panel-left')}</button><strong id="files-name">maps.md</strong><span class="files-head-actions" id="files-head-actions" hidden><button class="button button--ghost button--icon" id="search-open" data-tip="Search (/)" aria-label="Search the maps" aria-expanded="false" aria-controls="files-search-box">${icon('search')}</button><label class="button button--ghost button--icon" data-open="folder" data-tip="Open a folder" aria-label="Open a folder">${icon('folder-open')}<input type="file" id="folder" webkitdirectory multiple hidden></label></span><button class="button button--ghost button--icon panel-close files-x" id="files-x" data-tip="Hide the files  ⌘B" aria-label="Hide the files">${icon('x')}</button></div>
<p class="files-path" id="folder-path" hidden>${icon('folder')}<span class="files-path-text"><span dir="ltr"></span></span></p>
<label class="files-search" id="files-search-box" hidden>${icon('search')}<input type="search" id="files-search" placeholder="Search" aria-label="Search the maps" autocomplete="off" spellcheck="false"><button type="button" class="files-search-clear" id="files-search-clear" aria-label="Clear the search" data-tip="Clear" hidden>${icon('x')}</button></label>
<div class="files-list" id="maps"></div></nav>
<div class="panel-edge" id="files-edge" role="separator" aria-orientation="vertical" aria-label="Drag to widen or narrow the files"></div>
<div class="center">
<div class="bar"><button class="button button--ghost button--icon files-open" id="files-open" data-tip="Show the files  ⌘B" aria-label="Show the files">${icon('panel-left')}${icon('menu')}</button>
<span class="map-head" id="map-head" hidden><strong id="map-title"></strong><span class="map-meta map-type" id="map-type"></span><span class="map-actions"><button class="bar-pill" id="about" aria-pressed="false">About this map</button><button class="bar-pill" id="questions" aria-pressed="false" hidden></button><button class="bar-pill" id="issues" aria-pressed="false" hidden></button></span></span>
<span class="bar-end" id="bar-end" hidden><button class="button button--ghost button--icon" id="export" data-tip="Export as PNG" aria-label="Export the map as a PNG image">${icon('share')}</button><button class="button button--ghost editor-open" id="editor-open" data-tip="Edit  ⌘⌥B" aria-label="Edit" aria-pressed="false">${icon('square-pen', 'when-writable')}${icon('file-text', 'when-read-only')}<span>Edit</span></button></span></div>
<div class="below"><div class="stage"><div class="views-bar" id="views-bar" hidden></div><div class="navigation" id="navigation" hidden><button class="button button--ghost button--icon" id="scroll-open" popovertarget="scroll-menu" data-tip="Mouse or trackpad" aria-label="Mouse or trackpad">${icon('mouse', 'when-mouse')}${icon('touchpad', 'when-trackpad')}</button><div class="menu" id="scroll-menu" popover role="menu" aria-label="Mouse or trackpad">${[['auto', 'Auto', 'Told from the way it scrolls'], ['mouse', 'Mouse', 'The wheel zooms'], ['trackpad', 'Trackpad', 'Two fingers move, a pinch zooms']].map(([value, name, hint]) => `<button class="menu-item" role="menuitemradio" data-scroll="${value}">${icon('check')}<span><strong>${name}</strong><small>${hint}</small></span></button>`).join('')}</div><button class="button button--ghost button--icon" id="zoom-out" data-tip="Zoom out" aria-label="Zoom out">${icon('minus')}</button><button class="button button--ghost zoom-level" id="zoom-fit" data-tip="Fit the map" aria-label="Fit the map"></button><button class="button button--ghost button--icon" id="zoom-in" data-tip="Zoom in" aria-label="Zoom in">${icon('plus')}</button></div></div>
<div class="panel-edge" id="editor-edge" hidden role="separator" aria-orientation="vertical" aria-label="Drag to widen or narrow the editor"></div><aside class="editor" id="editor" hidden aria-label="Panel" data-mode="markdown"><div class="editor-head"><button class="button button--ghost button--icon panel-back" id="panel-back" data-tip="Back to the details" aria-label="Back to the details" hidden>${icon('arrow-left')}</button><p class="editor-status" id="editor-status"></p><button class="button button--ghost button--icon panel-close" id="editor-close" data-tip="Close panel  ⌘⌥B" aria-label="Close panel">${icon('x')}</button></div><div class="editor-text" id="editor-text"></div><div class="details-body" id="details-body"></div></aside></div>
</div>
</div>
<script>${script(bundle.outputFiles[0].text)}</script>
</body></html>
`;
writeFileSync(join(root, 'maps.html'), html);
console.log(`maps.html written (${Math.round(html.length / 1024)} KB).`);

// The scripts below are copied into every project (.claude/skills/maps/): `/* eslint-disable */`, which ESLint and
// oxlint honour, keeps them out of the lint of the project (a bundle leaves duplicated and unused imports).

// The check, in one file with no dependency, in the folder of the skill, next to the catalog of types.
await build({
  entryPoints: [join(here, 'check.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: join(root, 'skills', 'maps', 'check.mjs'),
  legalComments: 'none',
  banner: { js: '// maps.md check: generated from renderer/check.ts by renderer/build.ts (npm run build): do not edit.\n/* eslint-disable */' },
});
console.log('skills/maps/check.mjs written.');

// The server of a folder of maps, which reloads the page when a map changes; no dependency.
await build({
  entryPoints: [join(here, 'serve.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: join(root, 'skills', 'maps', 'serve.mjs'),
  legalComments: 'none',
  banner: { js: '// maps.md serve: generated from renderer/serve.ts by renderer/build.ts (npm run build): do not edit.\n/* eslint-disable */' },
});
console.log('skills/maps/serve.mjs written.');

// The pictures of the maps, for an AI to look at what it made; it finds Playwright where it runs, and says so without it.
await build({
  entryPoints: [join(here, 'shot.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: join(root, 'skills', 'maps', 'shot.mjs'),
  legalComments: 'none',
  banner: { js: '// maps.md shot: generated from renderer/shot.ts by renderer/build.ts (npm run build): do not edit.\n/* eslint-disable */' },
});
console.log('skills/maps/shot.mjs written.');

// The renaming of an element or an item with its links; no dependency.
await build({
  entryPoints: [join(here, 'rename.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: join(root, 'skills', 'maps', 'rename.mjs'),
  legalComments: 'none',
  banner: { js: '// maps.md rename: generated from renderer/rename.ts by renderer/build.ts (npm run build): do not edit.\n/* eslint-disable */' },
});
console.log('skills/maps/rename.mjs written.');
