#!/usr/bin/env node
// Takes pictures of the maps of a folder, as the page draws them: for an AI that creates a type or a style to look at
// what it made before it shows it (it writes the CSS without seeing it otherwise). One PNG per map, per view, in light
// and in dark: the whole map, as the page exports it (its button "Export as PNG"), at twice its size.
// It drives a browser with Playwright, which is not a dependency of maps.md: found in the project, where the command
// is run, or installed globally (it is in a cloud session of Claude); without it, it says so and stops.
// Usage: node shot.mjs [folder of the maps, default maps] [folder of the pictures, default a temporary folder]
//        [--map <file name of a map>] [--page <maps.html>, default in the folder]
// Copied into the folder of the skill by build.ts, as shot.mjs; `serve.mjs`, next to it, serves the maps to the page.

import { execSync, spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const flag = (name: string) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 ? args.splice(at, 2)[1] : undefined;
};
const pageFlag = flag('page');
const only = flag('map')?.replace(/\.md$/i, '').toLowerCase();
const dir = resolve(args[0] ?? 'maps');
const out = resolve(args[1] ?? join(tmpdir(), 'maps-shots', basename(dir) === 'maps' ? basename(resolve(dir, '..')) : basename(dir)));
const here = dirname(fileURLToPath(import.meta.url));

// What this file uses of Playwright (it has no types here: it is not a dependency).
interface Tabs { count(): Promise<number>; nth(k: number): { click(): Promise<void>; innerText(): Promise<string> } }
interface Page {
  goto(url: string): Promise<unknown>;
  reload(): Promise<unknown>;
  click(selector: string): Promise<void>;
  locator(selector: string): Tabs;
  waitForSelector(selector: string, options?: { timeout: number }): Promise<unknown>;
  waitForTimeout(ms: number): Promise<void>;
  waitForEvent(event: 'download'): Promise<{ saveAs(path: string): Promise<void> }>;
  $$eval<T>(selector: string, read: (links: Element[]) => T): Promise<T>;
}
interface Browser { newContext(options: object): Promise<{ newPage(): Promise<Page>; close(): Promise<void> }>; close(): Promise<void> }

/** Playwright, from the project, from where the command is run, or installed globally. */
function playwright(): { chromium: { launch(): Promise<Browser> } } | undefined {
  let global: string[] = [];
  try {
    global = [execSync('npm root -g', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()];
  } catch {
    // no npm: the project only
  }
  for (const from of [here, process.cwd(), ...global]) {
    try {
      return createRequire(join(from, 'x.js'))('playwright');
    } catch {
      // not there: the next place
    }
  }
}

const found = playwright();
if (!found) {
  console.error('shot needs Playwright to open the page in a browser, and it is not installed here. Install it (npm install -g playwright, then npx playwright install chromium), or look at the maps with what your session has: a preview that takes screenshots, a browser you drive.');
  process.exit(1);
}

// The maps served to the page, by `serve.mjs`, on a free port: its address is what it prints first.
const server = spawn(process.execPath, [join(here, 'serve.mjs'), dir, '--port', String(4400 + (process.pid % 500) * 10), ...(pageFlag ? ['--page', pageFlag] : [])], { stdio: ['ignore', 'pipe', 'inherit'] });
const address = await new Promise<string | undefined>((done) => {
  server.stdout.on('data', (data: Buffer) => done(/http:\/\/[\d.]+:\d+\//.exec(String(data))?.[0]));
  server.on('exit', () => done(undefined));
});
if (!address) process.exit(1); // `serve` said why (no page at this place)

const key = (name: string) => name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const browser = await found.chromium.launch();
let count = 0;
try {
  mkdirSync(out, { recursive: true });
  for (const scheme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: scheme, acceptDownloads: true });
    const page = await context.newPage();
    await page.goto(address);
    await page.waitForSelector('#maps a[href^="#/"]', { timeout: 10000 }).catch(() => undefined);
    const maps = (await page.$$eval('#maps a[href^="#/"]', (links) => [...new Set(links.map((a) => a.getAttribute('href')!))])).filter(
      (href) => !only || decodeURIComponent(href.slice(2)).toLowerCase() === only || decodeURIComponent(href.slice(2)).toLowerCase().endsWith(`/${only}`),
    );
    for (const href of maps) {
      await page.goto(address + href);
      await page.reload(); // a change of the address alone does not load the page again
      await page.waitForSelector('#page .view, #page .plain, #page .error', { timeout: 15000 }).catch(() => undefined);
      if (!(await page.$$eval('#page .view', (drawn) => drawn.length))) continue; // not a map (notes), or one that cannot be read
      await page.waitForTimeout(500); // the arrows of a grid are drawn once it is laid out
      const tabs = page.locator('.views [role="tab"]');
      const views = await tabs.count();
      for (let k = 0; k < Math.max(views, 1); k++) {
        let view = '';
        if (views) {
          await tabs.nth(k).click();
          await page.waitForTimeout(300);
          view = `--${key(await tabs.nth(k).innerText())}`;
        }
        const [download] = await Promise.all([page.waitForEvent('download'), page.click('#export')]);
        const file = join(out, `${key(decodeURIComponent(href.slice(2)))}${view}--${scheme}.png`);
        await download.saveAs(file);
        console.log(file);
        count++;
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
  server.kill();
}
if (!count) {
  console.error(only ? `No map "${only}" in ${dir}.` : `No map in ${dir}.`);
  process.exit(1);
}
