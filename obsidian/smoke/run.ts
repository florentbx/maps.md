// The smoke test of the Obsidian plugin, with no Obsidian: the plugin (obsidian/main.ts, as it is) runs in Chromium on
// a stand-in of the API of Obsidian (obsidian-stub.ts), on the maps of maps/ and showcase/ as a vault. It opens maps,
// clicks them, follows links, changes files, embeds a map, runs the check, and takes pictures in light and dark mode,
// for a person to look at. It fails on the first thing that does not happen as expected.
// Run: npm run smoke:obsidian [-- <folder for the pictures>]   (default: obsidian/smoke/out/). Needs Playwright.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { filesUnder } from '../../renderer/folder.ts';
import { bundle, pluginCss } from '../build.ts';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const out = process.argv[2] ?? join(here, 'out');
mkdirSync(out, { recursive: true });

// The vault: the maps of maps.md and the three projects of the examples, with their types.
const files: Record<string, string> = {};
for (const dir of ['maps', 'showcase'])
  for (const path of filesUnder(join(root, dir)).filter((p) => /\.(md|css)$/i.test(p))) files[`${dir}/${path}`] = readFileSync(join(root, dir, path), 'utf8');
// A map whose type is in no types folder, and a note that embeds a map.
files['notes/team.md'] = '---\ntype: raci\ntitle: Who does what\n---\n\n## Pick the courts\n- Responsible: Inès\n';
files['notes/embed.md'] = '# A note\n\n![[journey]]\n';

const harness = join(out, 'harness.js');
await bundle(join(here, 'harness.ts'), harness, { external: [], alias: { obsidian: join(here, 'obsidian-stub.ts') }, format: 'iife' });
const OBSIDIAN_CSS = `
.theme-light { --background-primary: #ffffff; --background-secondary: #f6f6f6; --background-modifier-border: #e3e3e3; --background-modifier-hover: rgba(0,0,0,.067); --background-modifier-active-hover: rgba(138,92,245,.15); --text-normal: #222222; --text-muted: #5c5c5c; --text-accent: #8a5cf5; --interactive-accent: #8a5cf5; --interactive-normal: #ffffff; --text-error: #e93147; --color-green: #08b94e; --code-background: #fafafa; --text-selection: rgba(138,92,245,.2); }
.theme-dark { --background-primary: #1e1e1e; --background-secondary: #262626; --background-modifier-border: #363636; --background-modifier-hover: rgba(255,255,255,.075); --background-modifier-active-hover: rgba(138,92,245,.25); --text-normal: #dadada; --text-muted: #b3b3b3; --text-accent: #a68af9; --interactive-accent: #8a5cf5; --interactive-normal: #2a2a2a; --text-error: #fb464c; --color-green: #44cf6e; --code-background: #2a2a2a; --text-selection: rgba(138,92,245,.35); color-scheme: dark; }
body { --font-interface: -apple-system, "Segoe UI", Inter, Ubuntu, sans-serif; --font-monospace: Menlo, "DejaVu Sans Mono", monospace; --input-height: 30px; margin: 0; font-family: var(--font-interface); font-size: 13px; background: var(--background-primary); color: var(--text-normal); }
/* Obsidian's own buttons, which the plugin must not take in its drawings */
button { height: var(--input-height); padding: 4px 12px; border: 0; border-radius: 4px; background: var(--interactive-normal); color: var(--text-normal); box-shadow: 0 1px 2px rgba(0,0,0,.25); font: inherit; cursor: pointer; }
.app-container { display: flex; flex-direction: column; height: 100vh; }
.workspace { flex: 1; display: flex; min-height: 0; }
.mod-root { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.mod-right-split { width: 380px; display: flex; flex-direction: column; border-left: 1px solid var(--background-modifier-border); background: var(--background-secondary); }
.workspace-leaf { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.workspace-leaf[hidden] { display: none; }
.workspace-leaf-content { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.view-header { flex: none; height: 36px; display: flex; align-items: center; justify-content: space-between; padding: 0 8px; border-bottom: 1px solid var(--background-modifier-border); }
.view-actions { display: flex; gap: 4px; }
.clickable-icon { height: auto; padding: 4px 8px; box-shadow: none; background: none; }
.workspace-leaf-content .view-content { flex: 1; min-height: 0; overflow: auto; padding: 16px; }
.markdown-source-view .line { font-family: var(--font-monospace); white-space: pre-wrap; }
.markdown-source-view .cursor-line { background: var(--text-selection); }
.status-bar { flex: none; height: 24px; display: flex; justify-content: flex-end; align-items: center; gap: 8px; padding: 0 12px; border-top: 1px solid var(--background-modifier-border); background: var(--background-secondary); color: var(--text-muted); }
`;
writeFileSync(join(out, 'index.html'), `<!doctype html><html><head><meta charset="utf-8"><style>${OBSIDIAN_CSS}</style><style id="plugin-styles">${pluginCss()}</style></head><body class="theme-light"><div class="app-container"></div><div class="status-bar"></div><script src="harness.js"></script></body></html>`);

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
const errors: string[] = [];
page.on('pageerror', (e: Error) => errors.push(e.message));
page.on('console', (m: any) => m.type() === 'error' && errors.push(m.text()));
await page.goto(pathToFileURL(join(out, 'index.html')).href);
const smoke = (name: string, ...args: unknown[]) => page.evaluate(([n, a]: [string, unknown[]]) => (window as any).smoke[n](...a), [name, args]);
const state = () => smoke('state') as Promise<any>;
let step = 0;
const pictures: string[] = [];
async function shot(name: string) {
  const file = join(out, `${String(++step).padStart(2, '0')}-${name}.png`);
  await page.screenshot({ path: file });
  pictures.push(relative(process.cwd(), file));
}
function check(ok: unknown, what: string, got?: unknown) {
  if (!ok) throw new Error(`${what}${got === undefined ? '' : `: ${JSON.stringify(got, null, 1)}`}`);
  console.log(`ok  ${what}`);
}
const active = '.workspace-leaf:not([hidden]) ';

try {
  await smoke('start', files);
  check(!(await smoke('leaks') as string[]).length, 'every rule of the plugin is scoped to its maps', await smoke('leaks'));

  // A map opens in the Map view, from a link, with its bar and its drawing.
  let s = await smoke('open', 'maps/journey');
  check(s.type === 'maps-md-map' && s.drawn > 5, 'a map opens in the Map view and is drawn', s);
  check(s.pills.includes('About this map (pressed)'), 'the bar has About this map, pressed', s.pills);
  await page.click(`${active}.bar-pill:has-text("About this map")`);
  await smoke('idle');
  s = await state();
  check(s.details?.kicker?.startsWith('About this map'), 'About this map opens the details panel', s.details);
  await shot('journey-light');
  await smoke('setTheme', true);
  await shot('journey-dark');
  await smoke('setTheme', false);

  // A click on an element shows its details in the side panel, and selects it.
  await page.click(`${active}.maps-page .view:not([hidden]) [data-el]`, { position: { x: 12, y: 8 } });
  await smoke('idle');
  s = await state();
  check(s.selected > 0 && s.details && !s.details.kicker.startsWith('About'), 'a click on an element shows its details and selects it', s.details);
  await shot('element-details');

  // The open questions, and what they are about, brought out.
  const questions = await page.$(`${active}.bar-pill:has-text("open question")`);
  if (questions) {
    await questions.click();
    await smoke('idle');
    s = await state();
    check(s.details?.title?.includes('open question'), 'the open questions show in the panel', s.details);
    console.log(`    ${s.asked} things asked about, brought out on the map`);
    await shot('open-questions');
  }

  // A map with several views: its tabs; the tab chosen stays when the map is drawn again.
  s = await smoke('open', 'showcase/2-spliit/3-operations/failures');
  check(s.type === 'maps-md-map' && s.drawn > 0, 'another project, another type: drawn', s);
  if (s.tabs.length > 1) {
    await page.click(`${active}.views [data-view="1"]`);
    await smoke('idle');
    s = await state();
    check(s.tabs[1].endsWith('(selected)'), 'a tab of the views is selected', s.tabs);
    await shot('second-view');
  }
  // Live redraw: the map changed, the tab and the place on the canvas stay.
  await smoke('pan', -40, -30, 0.8);
  const before = await state();
  await smoke('modify', 'showcase/2-spliit/3-operations/failures.md', 'title: ', 'title: Changed: ');
  s = await state();
  check(s.title?.startsWith('Changed: '), 'a change to the file draws the map again', s.title);
  check(!before.tabs.length || s.tabs.join() === before.tabs.join(), 'the tab chosen stays', s.tabs);
  check(Math.abs(s.place.scale - 0.8) < 0.01 && Math.abs(s.place.x + 40) < 1, 'the pan and the zoom stay', s.place);

  // A graph, with its arrows; a link to another map, followed.
  s = await smoke('open', 'showcase/2-spliit/2-behaviour/settle-up');
  check(s.drawn > 3, 'a graph is drawn', s);
  await shot('graph');
  // A link of the panel (a map that cites this one), followed: its map opens in the Map view.
  const cited = await page.$('.maps-md-details a.details-link[href^="#/"]');
  check(cited, 'the panel lists the maps that cite this one');
  const href = await cited!.getAttribute('href');
  await cited!.click();
  await smoke('idle');
  s = await state();
  check(s.type === 'maps-md-map' && href!.includes(encodeURIComponent(s.file)), 'a link of the panel opens its map, in the Map view', { href, file: s.file });
  await shot('link-followed');

  // A nested link (`[[map#Element#Item]]`), as Obsidian opens it: the item, under its element, is selected.
  s = await smoke('open', 'showcase/1-courts/2-product/story-map#The player plays#Before the game#Cancel a booking', 'showcase/1-courts/2-product/rules.md');
  check(s.type === 'maps-md-map' && s.selected > 0 && s.details?.title === 'Cancel a booking', 'a nested link selects its item in the Map view', { selected: s.selected, details: s.details });
  await shot('nested-link');
  s = await smoke('open', 'showcase/3-coop/2-synthesis/journey-week-changes');
  check(s.drawn > 0, 'a journey of another project is drawn', s.drawn);

  // The toggle: Markdown, then the map again, in the same leaf.
  await page.click(`${active}.view-action[aria-label="Open as Markdown"]`);
  await smoke('idle');
  s = await state();
  check(s.type === 'markdown' && s.headerActions.includes('Open as map'), 'the toggle shows the Markdown, with a toggle back', s);
  await page.click(`${active}.view-action[aria-label="Open as map"]`);
  await smoke('idle');
  s = await state();
  check(s.type === 'maps-md-map', 'and back to the map', s.type);
  await smoke('command', 'toggle-map-view');
  check((await state()).type === 'markdown', 'the command toggles too');
  await smoke('command', 'toggle-map-view');

  // A map whose type is missing: the message, and the type added from the catalog.
  s = await smoke('open', 'notes/team');
  check(s.type === 'markdown', 'a map whose type is not found opens as Markdown', s.type);
  await smoke('command', 'toggle-map-view');
  const missing = await page.textContent(`${active}.maps-md-missing`);
  check(missing?.includes('raci') && missing.includes('Add “raci” from the catalog'), 'a missing type is said, with the type of the catalog to add', missing);
  await shot('missing-type');
  await page.click(`${active}.maps-md-missing button.mod-cta`);
  await smoke('idle');
  const added = await smoke('exists', 'maps/types/raci.md');
  check(added, 'the type is copied into a types folder', added);
  s = await state();
  check(s.drawn > 0 && !s.error, 'and the map is drawn with it', s);
  await shot('type-added');

  // The check of the vault: its panel, its issues by file and line; a click opens the Markdown at the line.
  await smoke('modify', 'maps/value.md', '  - Turn an idea into an MVP with an AI', '  - Turn an idea into an MVP with an AI ([[nowhere]])\n- Kind : oops');
  await smoke('command', 'check-vault');
  const issues = (await smoke('issues')) as string[];
  check(issues.some((i) => i.startsWith('maps/value.md:')), 'the check lists the issues of the vault, with their lines', issues.slice(0, 5));
  await shot('check');
  const target = issues.find((i) => i.startsWith('maps/value.md:') && !i.endsWith(':'))!;
  await page.click(`.maps-md-issues .details-link[data-path="maps/value.md"][data-line="${target.split(':')[1]}"]`);
  await smoke('idle');
  s = await state();
  check(s.type === 'markdown' && s.file === 'maps/value.md' && s.cursor.line === Number(target.split(':')[1]) - 1, 'a click on an issue opens the Markdown at its line', s);
  await page.click(`${active}.view-action[aria-label="Open as map"]`);
  await smoke('idle');
  s = await state();
  check(/to (fix|check)/.test(s.status ?? ''), 'the status bar says what is to fix in the map shown', s.status);
  await shot('status-bar');

  // Embeds: in the reading view, and in Live Preview.
  const reading = (await smoke('readingEmbed', 'notes/embed.md', 'journey')) as any;
  check(reading.children === 1 && reading.drawn > 0 && reading.foreign === 0, 'a map embedded in a note is drawn there, and stays', reading);
  await shot('embed');
  await smoke('open', 'notes/embed');
  const live = (await smoke('livePreviewEmbed', 'architecture')) as any;
  check(live.drawn > 0, 'an embed added in Live Preview is drawn', live);

  await smoke('setTheme', true);
  s = await smoke('open', 'showcase/1-courts/1-frame/roadmap');
  check(s.details?.title === 'The roadmap', 'the panel follows the map shown in the leaf', s.details);
  await shot('roadmap-dark');
  await smoke('setTheme', false);
  await shot('roadmap-light');

  check(!errors.length, 'no error in the page', errors);
  console.log(`\nAll checks passed. Pictures:\n${pictures.join('\n')}`);
} catch (e) {
  await shot('failure').catch(() => {});
  console.error(`\nFAILED: ${(e as Error).message}\nErrors in the page: ${JSON.stringify(errors, null, 1)}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
