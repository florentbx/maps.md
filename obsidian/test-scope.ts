// The test of scope-css.ts, with no browser: what the Obsidian plugin does to renderer/style.css and to the style of a
// type, so that they hold only inside its maps. Run by `npm test`.

import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import { scopeCss, selectorsOf } from './scope-css.ts';

const scope = (css: string) => scopeCss(css, { scope: '.m', dark: '.theme-dark', rename: { '#page': '#p', '.canvas': '.c' } }).replace(/\s+/g, ' ').trim();

assert.equal(scope(':root { --a: 1; }'), '.m { --a: 1; }');
assert.equal(scope('body, html { margin: 0; }'), '.m, .m { margin: 0; }');
assert.equal(scope('.a, :is(.b, .c) > d { x: y; }'), '.m .a, .m :is(.b, .c) > d { x: y; }');
assert.equal(scope('.canvas #page .x, .canvas-x { x: y; }'), '.m .c #p .x, .m .canvas-x { x: y; }');
assert.equal(scope('@media (prefers-color-scheme: dark) { :root { --a: 2; } .x { y: z; } }'), '.theme-dark .m { --a: 2; } .theme-dark .m .x { y: z; }');
assert.equal(scope('@media (hover: none) { .x { y: z; } }'), '@media (hover: none) { .m .x { y: z; } }');
assert.equal(scope('@keyframes k { 0% { a: b; } }'), '@keyframes k { 0% { a: b; } }');
assert.equal(scope('/* a { b } */ .x { content: "/* {not} */"; }'), '.m .x { content: "/* {not} */"; }');
assert.equal(scope('.x { background: url("data:image/svg+xml,%3Csvg%3E{}"); }'), '.m .x { background: url("data:image/svg+xml,%3Csvg%3E{}"); }');

// The whole style of the page: every rule scoped, none at the top of the document.
const page = scopeCss(readFileSync(new URL('../renderer/style.css', import.meta.url), 'utf8'), { scope: '.maps-md', dark: '.theme-dark', rename: { '#page': '#maps-md-page', '.canvas': '.maps-canvas' } });
const loose = selectorsOf(page).filter((sel) => !/^(\.theme-dark )?\.maps-md/.test(sel));
assert.deepEqual(loose, [], 'every selector of style.css is under .maps-md');
assert.ok(!/:root|#page\b|(^|[\s,}])body\b/.test(page), 'no :root, #page or body left');
console.log('The style of the page and of a type hold only inside the maps of the Obsidian plugin.');
