#!/usr/bin/env node
// maps.md serve: generated from renderer/serve.ts by renderer/build.ts (npm run build): do not edit.
/* eslint-disable */

// renderer/serve.ts
import { mkdirSync, readFileSync as readFileSync2, watch, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { homedir } from "node:os";
import { basename, join, resolve, sep } from "node:path";

// renderer/folder.ts
import { existsSync, readdirSync, readFileSync } from "node:fs";
function filesUnder(dir2) {
  return readdirSync(dir2, { recursive: true }).map((p) => String(p).split(/[\\/]/).join("/")).filter((p) => !p.split("/").some((part) => part.startsWith(".") || part === "node_modules"));
}

// renderer/serve.ts
var args = process.argv.slice(2);
var flag = (name) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 ? args.splice(at, 2)[1] : void 0;
};
var wantedPort = Number(flag("port") ?? process.env.PORT ?? 4321);
var pageFlag = flag("page");
var out = flag("out");
var dir = resolve(args[0] ?? "maps");
var page = resolve(pageFlag ?? join(dir, "maps.html"));
function sources() {
  return filesUnder(dir).filter((p) => p.toLowerCase().endsWith(".md") || /^(theme|(.*\/)?types\/[^/]+)\.css$/i.test(p)).map((p) => ({ path: `${basename(dir)}/${p}`, text: readFileSync2(join(dir, p), "utf8") }));
}
var clients = /* @__PURE__ */ new Set();
var server = createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  try {
    if (url.pathname === "/" || url.pathname === "/index.html") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      return res.end(readFileSync2(page));
    }
    if (url.pathname === "/maps.json") {
      const folder = dir.startsWith(homedir() + sep) ? `~${dir.slice(homedir().length)}` : dir;
      res.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-maps-folder": encodeURIComponent(folder) });
      return res.end(JSON.stringify(sources()));
    }
    if (url.pathname === "/__maps/events") {
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive" });
      res.write(": maps.md\n\n");
      clients.add(res);
      req.on("close", () => clients.delete(res));
      return;
    }
    if (url.pathname === "/__maps/save" && req.method === "POST") {
      const origin = req.headers.origin;
      if (req.headers["content-type"] !== "application/json" || origin && origin !== `http://${req.headers.host}`) {
        res.writeHead(403, { "content-type": "text/plain" });
        return res.end("Forbidden");
      }
      let body = "";
      req.on("data", (chunk) => body += chunk);
      req.on("end", () => {
        try {
          const { path, text, base } = JSON.parse(body);
          const file = resolve(dir, String(path).split("/").slice(1).join(sep));
          if (!file.startsWith(dir + sep) || !file.toLowerCase().endsWith(".md") || typeof text !== "string") throw new Error(`cannot write ${path}`);
          if (readFileSync2(file, "utf8") !== base) {
            res.writeHead(409, { "content-type": "text/plain" });
            return res.end("the map changed meanwhile");
          }
          writeFileSync(file, text);
          res.writeHead(204);
          res.end();
        } catch (e) {
          res.writeHead(400, { "content-type": "text/plain" });
          res.end(e.message);
        }
      });
      return;
    }
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("Not found");
  } catch (e) {
    res.writeHead(500, { "content-type": "text/plain" });
    res.end(e.message);
  }
});
var timer;
watch(dir, { recursive: true }, () => {
  clearTimeout(timer);
  timer = setTimeout(() => clients.forEach((res) => res.write("data: change\n\n")), 150);
});
setInterval(() => clients.forEach((res) => res.write(": ping\n\n")), 25e3).unref();
var port = wantedPort;
server.on("error", (e) => {
  if (e.code !== "EADDRINUSE" || port >= wantedPort + 10) throw e;
  server.listen(++port, "127.0.0.1");
});
server.on("listening", () => {
  console.log(`maps.md: http://127.0.0.1:${port}/`);
  console.log(`Maps of ${dir}, drawn by ${page}; the page reloads when a map changes. Ctrl+C to stop.`);
});
try {
  readFileSync2(page);
} catch {
  console.error(`No page at ${page}: give it with --page <maps.html>.`);
  process.exit(1);
}
if (out) {
  const shown = basename(dir) === "maps" ? basename(resolve(dir, "..")) : basename(dir);
  const data = `<script type="application/json" id="maps-data" data-name="${shown.replaceAll("&", "&amp;").replaceAll('"', "&quot;")}">${JSON.stringify(sources()).replaceAll("</", "<\\/")}</script>`;
  const name = `${shown}-maps.html`;
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, name), readFileSync2(page, "utf8").replace("<body>", () => `<body>
${data}`));
  console.log(`maps.md: ${join(resolve(out), name)}, one file with the maps of ${dir}.`);
  console.log('Publish it as a private artifact with the capabilities { db: {}, user: {}, downloads: true }: they let the person edit the maps there and export a map as a PNG (SKILL.md, "Showing the maps").');
  process.exit(0);
}
server.listen(port, "127.0.0.1");
