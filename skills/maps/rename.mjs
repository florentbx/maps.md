#!/usr/bin/env node
// maps.md rename: generated from renderer/rename.ts by renderer/build.ts (npm run build): do not edit.
/* eslint-disable */

// renderer/rename.ts
import { readFileSync as readFileSync2, writeFileSync } from "node:fs";
import { relative } from "node:path";

// renderer/folder.ts
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// renderer/read.ts
function readMap(text) {
  let lines = text.replace(/^﻿/, "").split(/\r\n|\r|\n/).map((l) => l.trimEnd());
  let offset = 0;
  const meta = {};
  if (lines[0]?.trim() === "---") {
    const end = lines.findIndex((l, k) => k > 0 && l.trim() === "---");
    if (end < 0) throw new Error('the front matter is not closed: add a "---" line after it.');
    for (const line of lines.slice(1, end)) {
      const m = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line);
      if (m) meta[m[1].toLowerCase()] = m[2].replace(/^"(.*)"$/, "$1");
    }
    lines = lines.slice(end + 1);
    offset = end + 1;
  }
  lines = lines.join("\n").replace(/<!--[\s\S]*?-->/g, (c) => c.replace(/[^\n]/g, "")).split("\n");
  const sections = [];
  for (const [k, line] of lines.entries()) {
    const heading = /^##\s+(.*?)\s*$/.exec(line);
    if (heading) sections.push({ name: heading[1], lines: [], src: { line: offset + k, col: line.indexOf(heading[1], 2) }, start: offset + k + 1 });
    else sections.at(-1)?.lines.push(line);
  }
  return { meta, sections };
}
function readItems(lines, start) {
  const root = { children: [] };
  const stack = [{ indent: -1, node: root }];
  for (const [k, line] of lines.entries()) {
    const m = /^(\s*)[-*+]\s+(.*)$/.exec(line);
    if (!m) {
      const indent = line.length - line.trimStart().length;
      if (line.trim() && indent > 0 && stack.length > 1) stack.at(-1).node.text += ` ${line.trim()}`;
      continue;
    }
    const node = { text: m[2], children: [], src: start === void 0 ? void 0 : { line: start + k, col: line.length - m[2].length } };
    while (stack.at(-1).indent >= m[1].length) stack.pop();
    stack.at(-1).node.children.push(node);
    stack.push({ indent: m[1].length, node });
  }
  return root.children;
}
var labelEnd = (text) => /(?<=\S): /.exec(text)?.index ?? -1;
function readProperty(item) {
  const at = labelEnd(item.text);
  if (at >= 0) return { label: item.text.slice(0, at).trim(), value: item.text.slice(at + 2).trim(), children: item.children };
  if (/\S:$/.test(item.text)) return { label: item.text.slice(0, -1).trim(), value: "", children: item.children };
  return void 0;
}
function readArrow(text) {
  const arrow = /→|->/.exec(text);
  if (!arrow) return void 0;
  const colon = labelEnd(text);
  if (colon >= 0 && colon < arrow.index) return void 0;
  const rest = text.slice(arrow.index + arrow[0].length).trim();
  const link = /^\[\[([^\]|#]*)(?:#([^\]|]*))?(?:\|[^\]]*)?\]\]/.exec(rest);
  const target2 = link ? link[1] ? `${link[1]}${link[2] ? `#${link[2]}` : ""}` : link[2] ?? "" : rest;
  return { label: text.slice(0, arrow.index).trim(), target: target2.trim(), file: link?.[1] || void 0 };
}
var RESERVED = ["context", "open questions"];
var nameKey = (name) => name.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, "").trim().replace(/\s+/g, "-");

// renderer/folder.ts
function filesUnder(dir) {
  return readdirSync(dir, { recursive: true }).map((p) => String(p).split(/[\\/]/).join("/")).filter((p) => !p.split("/").some((part) => part.startsWith(".") || part === "node_modules"));
}
var markdownFiles = (dir) => filesUnder(dir).filter((p) => p.toLowerCase().endsWith(".md")).map((p) => join(dir, p));

// renderer/links.ts
var WIKILINK = /\[\[([^\]|#]*)((?:#[^\]|#]*)*)(?:\|([^\]]*))?\]\]/g;
var anchorOf = (name) => `el-${nameKey(name)}`;
var fileKey = (name) => name.toLowerCase();
function projectsOf(paths) {
  const slash = (p) => p.replace(/\\/g, "/");
  const roots = [...new Set(paths.map((p) => /^(.*\/)?types\/[^/]+\.md$/i.exec(slash(p))).filter((m) => m).map((m) => m[1] ?? ""))].sort((a, b) => b.length - a.length);
  const rootOf = (path) => roots.find((r) => slash(path).startsWith(r)) ?? roots.at(-1);
  let common = roots.length > 1 ? roots.reduce((a, b) => {
    let k = 0;
    while (k < a.length && a[k] === b[k]) k++;
    return a.slice(0, k);
  }) : "";
  common = common.slice(0, common.lastIndexOf("/") + 1);
  const prefixOf = (path) => roots.length > 1 ? (roots.find((r) => slash(path).startsWith(r)) ?? common).slice(common.length) : "";
  return { rootOf, prefixOf };
}
function nameOf(item) {
  const property = readProperty(item);
  const arrow = !property && readArrow(item.text);
  return nameKey(property ? property.label : arrow ? arrow.label : item.text);
}
function namesOf(items) {
  const names = /* @__PURE__ */ new Set();
  const walk = (list) => list.forEach((item) => (names.add(nameOf(item)), walk(item.children)));
  walk(items);
  return names;
}
function linesOf(items, path) {
  const lines = [];
  const find = (list2, key) => {
    for (const item of list2) {
      if (nameOf(item) === key) return item;
      const found = find(item.children, key);
      if (found) return found;
    }
  };
  let list = items;
  for (const name of path) {
    const item = find(list, nameKey(name));
    if (!item) break;
    lines.push(item.src.line);
    list = item.children;
  }
  return lines;
}
function buildIndex(sources2, { hrefOf = () => "" } = {}) {
  const files = /* @__PURE__ */ new Map();
  const { prefixOf } = projectsOf(sources2.map((s) => s.path));
  for (const { path, text } of sources2) {
    const name = path.split(/[\\/]/).pop().replace(/\.md$/i, "");
    let map;
    let error;
    try {
      map = readMap(text);
    } catch (e) {
      error = e.message;
    }
    if (map?.meta.type === "type-definition" || /\.layout$/i.test(name)) continue;
    const isMap = Boolean(map?.meta.type);
    const elements = /* @__PURE__ */ new Map();
    for (const section of isMap ? map.sections : []) {
      const items = readItems(section.lines, section.start);
      elements.set(nameKey(section.name), { name: section.name, items, names: namesOf(items) });
    }
    const project = prefixOf(path);
    files.set(fileKey(project + name), { name, project, key: project + name, path, text, map, error, isMap, title: map?.meta.title || name, elements });
  }
  const index = { files, hrefOf, links: [] };
  for (const file of files.values()) {
    if (!file.isMap) continue;
    for (const section of file.map.sections) {
      const free = RESERVED.includes(section.name.toLowerCase());
      let property = "";
      for (const line of section.lines) {
        const top = /^[-*+]\s+(.*)$/.exec(line);
        if (top && !free) property = readProperty({ text: top[1], children: [] })?.label ?? "";
        for (const m of line.matchAll(WIKILINK)) {
          index.links.push({ from: { file, element: section.name, property }, ...resolve(index, file, m[0]) });
        }
      }
    }
  }
  return index;
}
function resolve(index, fromFile, raw) {
  const m = new RegExp(`^${WIKILINK.source}$`).exec(raw);
  const [fileName, path, alias] = [m[1].trim(), m[2].split("#").slice(1).map((s) => s.trim()), m[3]?.trim()];
  const file = fileName ? index.files.get(fileKey((fromFile?.project ?? "") + fileName)) : fromFile;
  const full = [file && file !== fromFile ? file.name : fileName, ...path].filter(Boolean).join(" \u203A ");
  const last = path.at(-1);
  const short = !last || /^context$/i.test(last) ? (file && file !== fromFile ? file.name : fileName) || full : last;
  const label = alias || short;
  if (!file) return { raw, label, full, problem: `no file "${fileName}" in the folder` };
  if (!path.length) return { raw, label, full, file, href: index.hrefOf(file, "") };
  const element = file.elements.get(nameKey(path[0]));
  if (!element) return { raw, label, full, file, problem: `no element "${path[0]}" in ${file.name}` };
  const missing = path.slice(1).find((n) => !element.names.has(nameKey(n)));
  if (missing) return { raw, label, full, file, element, problem: `no "${missing}" under ${element.name} in ${file.name}` };
  const lines = linesOf(element.items, path.slice(1));
  return { raw, label, full, file, element, path, lines, href: index.hrefOf(file, [anchorOf(element.name), ...lines].join("/")) };
}
function rename(sources2, target2, newName2) {
  const index = buildIndex(sources2);
  const [fileName, ...path] = target2.split("#").map((s) => s.trim());
  const file = index.files.get(fileKey(fileName));
  if (!file?.isMap) throw new Error(`no map "${fileName}" in the folder`);
  if (!path.length) throw new Error("give an element: file#Element, or an item: file#Element#Item");
  const element = file.elements.get(nameKey(path[0]));
  if (!element) throw new Error(`no element "${path[0]}" in ${file.name}`);
  const lines = linesOf(element.items, path.slice(1));
  if (lines.length < path.length - 1) throw new Error(`no "${path[lines.length + 1]}" under ${element.name} in ${file.name}`);
  const texts = new Map([...index.files.values()].map((f) => [f, f.text.split("\n")]));
  const own = texts.get(file);
  if (path.length === 1) {
    if (nameKey(newName2) !== nameKey(element.name) && file.elements.has(nameKey(newName2))) throw new Error(`${file.name} already has an element "${newName2}"`);
    const section = file.map.sections.find((s) => nameKey(s.name) === nameKey(element.name));
    own[section.src.line] = own[section.src.line].slice(0, section.src.col) + newName2 + own[section.src.line].slice(section.src.col + section.name.length);
  } else {
    const at = lines.at(-1);
    const item = /^(\s*[-*+]\s+)(.*)$/.exec(own[at]);
    const property = readProperty({ text: item[2], children: [] });
    const arrow = !property && readArrow(item[2]);
    const name = property ? property.label : arrow ? arrow.label : item[2];
    const from = item[1].length + item[2].indexOf(name);
    own[at] = own[at].slice(0, from) + newName2 + own[at].slice(from + name.length);
  }
  for (const f of index.files.values()) {
    if (!f.isMap) continue;
    const text = texts.get(f);
    for (const section of f.map.sections) {
      for (let k = section.start; k < section.start + section.lines.length; k++) {
        text[k] = text[k].replace(WIKILINK, (raw, linkFile, linkPath, alias) => {
          const r = resolve(index, f, raw);
          if (r.problem || r.file !== file || r.element !== element) return raw;
          const at = path.length === 1 ? 0 : r.lines.indexOf(lines.at(-1)) + 1;
          if (at < 0 || path.length > 1 && at === 0) return raw;
          const names = linkPath.split("#").slice(1);
          names[at] = names[at].replace(names[at].trim(), newName2.replace(/[#|[\]]/g, "").replace(/\s+/g, " ").trim());
          return `[[${linkFile}${names.map((n) => `#${n}`).join("")}${alias === void 0 ? "" : `|${alias}`}]]`;
        });
      }
    }
  }
  return [...texts].filter(([f, t]) => t.join("\n") !== f.text).map(([f, t]) => ({ path: f.path, text: t.join("\n") }));
}

// renderer/rename.ts
var [folder, target, newName] = process.argv.slice(2);
if (!folder || !target || !newName?.trim()) {
  console.error('Usage: node rename.mjs <folder> "<file>#<Element>[#<Item>\u2026]" "<New name>"');
  process.exit(1);
}
var sources = markdownFiles(folder).map((path) => ({ path, text: readFileSync2(path, "utf8") }));
try {
  const changed = rename(sources, target, newName.trim());
  for (const { path, text } of changed) writeFileSync(path, text);
  console.log(`Renamed ${target} to "${newName.trim()}": ${changed.length} file${changed.length === 1 ? "" : "s"} changed${changed.length ? `, ${changed.map((c) => relative(folder, c.path)).join(", ")}` : ""}.`);
} catch (e) {
  console.error(`Not renamed: ${e.message}.`);
  process.exit(1);
}
