#!/usr/bin/env node
// maps.md shot: generated from renderer/shot.ts by renderer/build.ts (npm run build): do not edit.
/* eslint-disable */

// renderer/shot.ts
import { execSync, spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
var args = process.argv.slice(2);
var flag = (name) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 ? args.splice(at, 2)[1] : void 0;
};
var pageFlag = flag("page");
var only = flag("map")?.replace(/\.md$/i, "").toLowerCase();
var dir = resolve(args[0] ?? "maps");
var out = resolve(args[1] ?? join(tmpdir(), "maps-shots", basename(dir) === "maps" ? basename(resolve(dir, "..")) : basename(dir)));
var here = dirname(fileURLToPath(import.meta.url));
function playwright() {
  let global = [];
  try {
    global = [execSync("npm root -g", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim()];
  } catch {
  }
  for (const from of [here, process.cwd(), ...global]) {
    try {
      return createRequire(join(from, "x.js"))("playwright");
    } catch {
    }
  }
}
var found = playwright();
if (!found) {
  console.error("shot needs Playwright to open the page in a browser, and it is not installed here. Install it (npm install -g playwright, then npx playwright install chromium), or look at the maps with what your session has: a preview that takes screenshots, a browser you drive.");
  process.exit(1);
}
var server = spawn(process.execPath, [join(here, "serve.mjs"), dir, "--port", String(4400 + process.pid % 500 * 10), ...pageFlag ? ["--page", pageFlag] : []], { stdio: ["ignore", "pipe", "inherit"] });
var address = await new Promise((done) => {
  server.stdout.on("data", (data) => done(/http:\/\/[\d.]+:\d+\//.exec(String(data))?.[0]));
  server.on("exit", () => done(void 0));
});
if (!address) process.exit(1);
var key = (name) => name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
var browser = await found.chromium.launch();
var count = 0;
try {
  mkdirSync(out, { recursive: true });
  for (const scheme of ["light", "dark"]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: scheme, acceptDownloads: true });
    const page = await context.newPage();
    await page.goto(address);
    await page.waitForSelector('#maps a[href^="#/"]', { timeout: 1e4 }).catch(() => void 0);
    const maps = (await page.$$eval('#maps a[href^="#/"]', (links) => [...new Set(links.map((a) => a.getAttribute("href")))])).filter(
      (href) => !only || decodeURIComponent(href.slice(2)).toLowerCase() === only || decodeURIComponent(href.slice(2)).toLowerCase().endsWith(`/${only}`)
    );
    for (const href of maps) {
      await page.goto(address + href);
      await page.reload();
      await page.waitForSelector("#page .view, #page .plain, #page .error", { timeout: 15e3 }).catch(() => void 0);
      if (!await page.$$eval("#page .view", (drawn) => drawn.length)) continue;
      await page.waitForTimeout(500);
      const tabs = page.locator('.views [role="tab"]');
      const views = await tabs.count();
      for (let k = 0; k < Math.max(views, 1); k++) {
        let view = "";
        if (views) {
          await tabs.nth(k).click();
          await page.waitForTimeout(300);
          view = `--${key(await tabs.nth(k).innerText())}`;
        }
        const [download] = await Promise.all([page.waitForEvent("download"), page.click("#export")]);
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
