#!/usr/bin/env node
// Serves a folder of maps to the page, on this computer only, and reloads the page when a map changes: to see the
// maps drawn while an AI writes them. The maps stay files in the folder; nothing is stored here. The page may write
// back a map edited in it.
// Usage: node serve.mjs [folder of the maps, default maps] [--port 4321, or the PORT variable] [--page <maps.html>, default in the folder]
//        [--out <folder>]: writes there <name>-maps.html (the folder of the maps, or the project for its maps/), one file
//        with the page and the maps in it, then stops: what the AI publishes as a private artifact, in a cloud session.
// Copied into the folder of the skill by build.ts, as serve.mjs; no dependency.

import { mkdirSync, readFileSync, watch, writeFileSync } from 'node:fs';
import { createServer, type ServerResponse } from 'node:http';
import { homedir } from 'node:os';
import { basename, join, resolve, sep } from 'node:path';
import { filesUnder } from './folder.ts';

const args = process.argv.slice(2);
const flag = (name: string) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 ? args.splice(at, 2)[1] : undefined;
};
const wantedPort = Number(flag('port') ?? process.env.PORT ?? 4321); // PORT: given by the preview of the Claude desktop app
const pageFlag = flag('page');
const out = flag('out');
const dir = resolve(args[0] ?? 'maps');
const page = resolve(pageFlag ?? join(dir, 'maps.html'));

/** The `.md` files of the folder, its `theme.css` and the `.css` of the types of its projects (`types/<type>.css`), as the page reads them when a folder is chosen:
 *  `{ path, text }`, the path starting with the name of the folder. Dot folders and `node_modules` are left out. */
function sources() {
  return filesUnder(dir)
    .filter((p) => p.toLowerCase().endsWith('.md') || /^(theme|(.*\/)?types\/[^/]+)\.css$/i.test(p))
    .map((p) => ({ path: `${basename(dir)}/${p}`, text: readFileSync(join(dir, p), 'utf8') }));
}

const clients = new Set<ServerResponse>();
const server = createServer((req, res) => {
  const url = new URL(req.url!, 'http://localhost');
  try {
    if (url.pathname === '/' || url.pathname === '/index.html') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      return res.end(readFileSync(page));
    }
    if (url.pathname === '/maps.json') {
      // The maps of the folder; saved as a file next to a copy of the page, it shows them with no server (a private
      // artifact, in a cloud session; its name cannot start with `_`). The folder, for the page to show where the maps come from: `~` for the home folder, encoded for a header.
      const folder = dir.startsWith(homedir() + sep) ? `~${dir.slice(homedir().length)}` : dir;
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-maps-folder': encodeURIComponent(folder) });
      return res.end(JSON.stringify(sources()));
    }
    if (url.pathname === '/__maps/events') {
      // Server-sent events: one message each time a file of the folder changes.
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' });
      res.write(': maps.md\n\n');
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }
    if (url.pathname === '/__maps/save' && req.method === 'POST') {
      // A map edited in the page, `{ path, text, base }`, path as in sources(), base the text the page read: a file
      // changed since (by the AI) is not written over. Only the page itself may write: JSON from the same origin (a
      // request of another site would need a preflight, which is not answered).
      const origin = req.headers.origin;
      if (req.headers['content-type'] !== 'application/json' || (origin && origin !== `http://${req.headers.host}`)) {
        res.writeHead(403, { 'content-type': 'text/plain' });
        return res.end('Forbidden');
      }
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        try {
          const { path, text, base } = JSON.parse(body) as { path: unknown; text: unknown; base: unknown };
          const file = resolve(dir, String(path).split('/').slice(1).join(sep));
          if (!file.startsWith(dir + sep) || !file.toLowerCase().endsWith('.md') || typeof text !== 'string') throw new Error(`cannot write ${path}`);
          if (readFileSync(file, 'utf8') !== base) {
            res.writeHead(409, { 'content-type': 'text/plain' });
            return res.end('the map changed meanwhile');
          }
          writeFileSync(file, text);
          res.writeHead(204);
          res.end();
        } catch (e) {
          res.writeHead(400, { 'content-type': 'text/plain' });
          res.end((e as Error).message);
        }
      });
      return;
    }
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Not found');
  } catch (e) {
    res.writeHead(500, { 'content-type': 'text/plain' });
    res.end((e as Error).message);
  }
});

// A save often writes a file in several steps: the page is told once they are done.
let timer: ReturnType<typeof setTimeout> | undefined;
watch(dir, { recursive: true }, () => {
  clearTimeout(timer);
  timer = setTimeout(() => clients.forEach((res) => res.write('data: change\n\n')), 150);
});
// Keeps the connections open through proxies.
setInterval(() => clients.forEach((res) => res.write(': ping\n\n')), 25000).unref();

// The first free port from the one asked for, on this computer only.
let port = wantedPort;
server.on('error', (e: NodeJS.ErrnoException) => {
  if (e.code !== 'EADDRINUSE' || port >= wantedPort + 10) throw e;
  server.listen(++port, '127.0.0.1');
});
server.on('listening', () => {
  console.log(`maps.md: http://127.0.0.1:${port}/`);
  console.log(`Maps of ${dir}, drawn by ${page}; the page reloads when a map changes. Ctrl+C to stop.`);
});
try {
  readFileSync(page);
} catch {
  console.error(`No page at ${page}: give it with --page <maps.html>.`);
  process.exit(1);
}
if (out) {
  // The maps in the page, as data the page reads when it opens (`maps-data`); `<\/` so that no text of a map closes the
  // script. No folder to write back to: the page says `Read only`.
  // Its name, at the top of the files: the folder, or the project for its `maps/`.
  const shown = basename(dir) === 'maps' ? basename(resolve(dir, '..')) : basename(dir);
  const data = `<script type="application/json" id="maps-data" data-name="${shown.replaceAll('&', '&amp;').replaceAll('"', '&quot;')}">${JSON.stringify(sources()).replaceAll('</', '<\\/')}</script>`;
  // Named as the head of the files, never `maps.html`, the page alone: `courts-maps.html`, `my-app-maps.html`.
  const name = `${shown}-maps.html`;
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, name), readFileSync(page, 'utf8').replace('<body>', () => `<body>\n${data}`));
  console.log(`maps.md: ${join(resolve(out), name)}, one file with the maps of ${dir}.`);
  // What an AI publishes it with, said where it reads it: without them, the artifact is read only.
  console.log('Publish it as a private artifact with the capabilities { db: {}, user: {}, downloads: true }: they let the person edit the maps there and export a map as a PNG (SKILL.md, "Showing the maps").');
  process.exit(0);
}
server.listen(port, '127.0.0.1');
