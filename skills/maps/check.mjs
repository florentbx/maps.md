#!/usr/bin/env node
// maps.md check: generated from renderer/check.ts by renderer/build.ts (npm run build): do not edit.
/* eslint-disable */

// renderer/check.ts
import { existsSync as existsSync2, readFileSync as readFileSync2, writeFileSync } from "node:fs";
import { basename, dirname, join as join2, relative } from "node:path";
import { fileURLToPath } from "node:url";

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
  const target = link ? link[1] ? `${link[1]}${link[2] ? `#${link[2]}` : ""}` : link[2] ?? "" : rest;
  return { label: text.slice(0, arrow.index).trim(), target: target.trim(), file: link?.[1] || void 0 };
}
function readElement(name, items, shape, src) {
  const properties = /* @__PURE__ */ new Map();
  const arrows = [];
  const children = [];
  for (const item of items) {
    const arrow = shape === "graph" ? readArrow(item.text) : void 0;
    if (arrow) {
      arrows.push(arrow);
      continue;
    }
    const p = readProperty(item);
    if (!p) {
      if (shape === "tree") children.push(readElement(item.text.trim(), item.children, shape, item.src));
      continue;
    }
    const isUndefined = p.value.toLowerCase() === "undefined" || !p.value && p.children.length === 1 && !p.children[0].children.length && p.children[0].text.trim().toLowerCase() === "undefined";
    const valueSrc = item.src && p.value ? { line: item.src.line, col: item.src.col + item.text.indexOf(p.value, p.label.length) } : void 0;
    const values = isUndefined ? [] : p.value ? [{ text: p.value, children: p.children, src: valueSrc }] : p.children;
    const key = p.label.toLowerCase();
    const known = properties.get(key);
    if (!known) {
      properties.set(key, { label: p.label, values, isUndefined, raw: p.value, src: valueSrc });
      continue;
    }
    known.values.push(...values);
    if (known.isUndefined && !isUndefined) known.raw = p.value;
    known.isUndefined = known.isUndefined && isUndefined;
  }
  return { name, src, properties, arrows, children };
}
function cardinalityOf(label) {
  const m = /^(.*?)\s*\b(0\.\.1|1\.\.[n*]|0\.\.[n*]|1|[n*])$/i.exec(label.trim());
  if (!m) return void 0;
  const kind = { "1": "one", "0..1": "zero-one", "1..n": "many", "1..*": "many", "0..n": "zero-many", "0..*": "zero-many", n: "zero-many", "*": "zero-many" }[m[2].toLowerCase()];
  return { label: m[1].trim(), kind };
}
var RESERVED = ["context", "open questions"];
var kindSpecOf = (definition) => definition.properties.find((p) => p.kind === "enum" && p.single);
function readNumber(text) {
  const m = /^(-?\d+(?:\.\d+)?)\s*(?:,\s*(.*))?$/.exec(text.trim());
  return m && { value: Number(m[1]), word: m[2] ?? "", raw: m[1] };
}
var elementsOf = (map, shape) => map.sections.filter((s) => !RESERVED.includes(s.name.toLowerCase())).map((s) => readElement(s.name, readItems(s.lines, s.start), shape, s.src));
var nameKey = (name) => name.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, "").trim().replace(/\s+/g, "-");
var SHAPES = ["cards", "sequence", "graph", "tree"];
var KINDS = ["text", "date", "enum", "number", "link"];
function parseDefinition(type, text, layoutText) {
  const definition = readDefinition(type, text);
  if (layoutText === void 0) return definition;
  try {
    return { ...definition, layout: parseLayout(definition, layoutText) };
  } catch (e) {
    return { ...definition, layoutError: e.message };
  }
}
var MAP_SETTINGS = { direction: ["down", "right"], ends: ["yes", "start", "no"], returns: ["arrow", "link"] };
function readDefinition(type, text) {
  const file = `types/${type}.md`;
  const map = readMap(text);
  const fail = (message) => {
    throw new Error(`${file}: ${message}`);
  };
  if (map.meta.type !== "type-definition") fail('its front matter must say "type: type-definition".');
  if (!SHAPES.includes(map.meta.shape)) fail(`"shape" must be one of ${SHAPES.join(", ")}.`);
  const specOf = (name, attributes) => {
    const property = { name };
    const value = (label) => attributes.get(label)?.raw;
    for (const label of attributes.keys()) {
      if (!["kind", "min", "max", "single", "note", "values", "meaning", "default", "details"].includes(label)) fail(`"${name}": unknown attribute "${attributes.get(label).label}".`);
    }
    property.kind = value("kind");
    if (!KINDS.includes(property.kind)) fail(`"${name}": "Kind" must be one of ${KINDS.join(", ")}.`);
    for (const bound of ["min", "max"]) {
      if (value(bound) === void 0) continue;
      property[bound] = Number(value(bound));
      if (value(bound) === "" || Number.isNaN(property[bound])) fail(`"${name}": "${bound}" must be a number.`);
    }
    for (const flag of ["single", "note"]) {
      if (value(flag) === void 0) continue;
      if (!/^(yes|no)$/i.test(value(flag))) fail(`"${name}": "${flag}" must be yes or no.`);
      if (/^yes$/i.test(value(flag))) property[flag] = true;
    }
    if (value("default")) property.default = value("default");
    const values = attributes.get("values")?.values;
    if (values?.length) property.values = values.map((v) => v.text);
    const details = attributes.get("details")?.values;
    if (details?.length) property.details = details.map((d) => specOf(`${name} \u203A ${d.text.replace(/:$/, "").trim()}`, readElement(d.text, d.children).properties));
    if (property.details) for (const d of property.details) d.name = d.name.split(" \u203A ").pop();
    if (property.default !== void 0 && property.values && !property.values.includes(property.default)) fail(`"${name}": the default "${property.default}" is not one of its values.`);
    return property;
  };
  const properties = elementsOf(map).map(({ name, properties: attributes }) => specOf(name, attributes));
  if (!properties.length) fail('it has no property (a "##" heading per known property).');
  const lines = map.sections.find((section) => section.name.toLowerCase() === "context")?.lines ?? [];
  const first = lines.findIndex((l) => l.trim());
  const end = lines.findIndex((l, k) => k > first && (!l.trim() || /^\s*[-*+]\s/.test(l)));
  const context = first < 0 ? void 0 : lines.slice(first, end < 0 ? void 0 : end).join(" ").trim();
  return { type, shape: map.meta.shape, element: map.meta.element, context, properties };
}
function pluralOf(noun) {
  if (/[^aeiou]y$/i.test(noun)) return `${noun.slice(0, -1)}ies`;
  return /(s|x|ch|sh)$/i.test(noun) ? `${noun}es` : `${noun}s`;
}
function headerOf(definition) {
  const element = definition.element ?? "element";
  const a = /^[aeiou]/i.test(element) ? "an" : "a";
  const each = `Each ## is ${a} ${element}`;
  const except = "(except Context and Open questions)";
  const shape = {
    cards: `${each} ${except}; their order carries no meaning.`,
    sequence: `${each} ${except}, in order; all ${pluralOf(element)} share the same properties.`,
    graph: `${each} ${except}; "- label \u2192 [[#${element[0].toUpperCase()}${element.slice(1)}]]" is an arrow to another ${element}, with an optional label; "\u2192 undefined" means the other ${element} is unknown.`,
    tree: `${each} of the first level ${except}, in order; under ${a} ${element}, an item "- Label: value" is a property, and any other item is ${a} ${element} under it, in order.`
  }[definition.shape];
  const values = definition.properties.flatMap((p) => {
    const name = p.name === "*" ? "Each other property" : p.name;
    if (p.kind === "number" && p.min !== void 0 && p.max !== void 0) return [`${name} goes from ${p.min} to ${p.max}${p.note ? ", with an optional word" : ""}.`];
    if (p.kind === "enum" && p.values) return [`${name} is one of ${p.values.join(", ")}${p.default ? ` (default: ${p.default})` : ""}.`];
    return p.name === "*" ? [`Each other property is a ${p.kind}.`] : [];
  });
  const what = definition.context ? ` ${definition.context}` : "";
  return `<!-- ${definition.type}:${what} ${[shape, ...values].join(" ")} \`undefined\` means the source did not say. -->`;
}
function parseLayout(definition, text) {
  const lines = text.replace(/<!--[\s\S]*?-->/g, "").split("\n");
  const parts = [{ name: void 0, lines: [] }];
  for (const line of lines) {
    const heading = /^##\s+(.*?)\s*$/.exec(line);
    if (heading) parts.push({ name: heading[1], lines: [] });
    else parts.at(-1).lines.push(line);
  }
  const [main, ...views] = parts.map((part) => viewLayout(definition, part));
  return { ...main, views: views.map((view) => ({ ...view, color: { ...main.color, ...view.color } })) };
}
function viewLayout(definition, part) {
  const fail = (message) => {
    throw new Error(`types/${definition.type}.layout.md${part.name ? `, view "${part.name}"` : ""}: ${message}`);
  };
  const specs = new Map(definition.properties.map((p) => [nameKey(p.name), p]));
  const property = (name) => specs.get(nameKey(name)) ?? fail(`no property "${name.trim()}" in ${definition.type}.`);
  const namesOf2 = (setting) => (setting.value ? [setting.value] : setting.children.map((c) => c.text)).map((name) => property(name).name);
  const view = { name: part.name, shape: definition.shape, color: {} };
  const rest = [];
  for (const item of readItems(part.lines)) {
    const setting = readProperty(item);
    const label = setting?.label.toLowerCase();
    if (label === "draw") {
      view.shape = setting.value.toLowerCase();
      if (!SHAPES.includes(view.shape)) fail(`"${item.text}": Draw is one of ${SHAPES.join(", ")}.`);
    } else if (label === "shows") view.shows = namesOf2(setting);
    else if (label === "description") view.description = setting.value;
    else if (label === "meta") view.meta = (setting.value ? setting.value.split(",") : setting.children.map((c) => c.text)).map((key) => key.trim().toLowerCase()).filter(Boolean);
    else if (label === "name") {
      if (part.name) fail('Name is a setting of the main view: another view is named by its "##".');
      view.name = setting.value;
    } else if (label === "arrows") {
      view.arrows = namesOf2(setting);
      const notLink = view.arrows.find((name) => property(name).kind !== "link");
      if (notLink) fail(`"${item.text}": "${notLink}" is not a link property.`);
    } else if (label === "board") {
      const spec = property(setting.value);
      view.board = { key: spec.name.toLowerCase(), values: spec.kind === "enum" ? spec.values : void 0, default: spec.default };
    } else if (label === "matrix") {
      if (!/^(yes|no)$/i.test(setting.value)) fail(`"${item.text}": Matrix is yes or no.`);
      view.matrix = /^yes$/i.test(setting.value);
    } else if (label === "color") {
      const m = /^(.+?)\s*=\s*(\S+)$/.exec(setting.value);
      if (!m) fail(`"${item.text}": write "- Color: <value> = <color>".`);
      if (!COLORS.includes(m[2].toLowerCase())) fail(`"${item.text}": the color is one of ${COLORS.join(", ")}.`);
      if (!definition.properties.some((p) => p.kind === "enum" && p.values?.some((v) => v.toLowerCase() === m[1].toLowerCase()))) fail(`"${m[1]}" is not a value of an enum of ${definition.type}.`);
      (view.color ??= {})[m[1].toLowerCase()] = m[2].toLowerCase();
    } else if (label === "where") {
      const m = /^(.+?)\s*=\s*(.+)$/.exec(setting.value);
      if (!m) fail(`"${item.text}": write "- Where: <property> = <value>".`);
      const spec = property(m[1]);
      const values = (spec.values ?? []).map((v) => v.toLowerCase());
      if (spec.kind !== "enum" || !values.includes(m[2].toLowerCase())) fail(`"${item.text}": "${m[2]}" is not a value of the enum "${spec.name}".`);
      view.where = { key: spec.name.toLowerCase(), value: m[2].toLowerCase(), isDefault: spec.default?.toLowerCase() === m[2].toLowerCase() };
    } else rest.push(item);
  }
  return { ...view, ...shapeLayout(definition, view.shape, rest, fail) };
}
function shapeLayout(definition, shape, items, fail) {
  if (shape === "graph") return graphLayout(definition, items, fail);
  if (shape === "sequence") return sequenceLayout(definition, items, fail);
  if (shape === "tree") {
    const settings = { stack: false, root: false };
    for (const item of items) {
      const setting = readProperty(item);
      const label = setting?.label.toLowerCase();
      if (label === "lanes") {
        const spec = definition.properties.find((p) => nameKey(p.name) === nameKey(setting.value));
        if (!spec) fail(`"${item.text}": no property "${setting.value}" in ${definition.type}.`);
        settings.lanes = spec.name;
        continue;
      }
      if (!(label in settings)) fail(`"${item.text}" is not a setting of a tree (it knows "Draw", "Name", "Description", "Meta", "Shows", "Where", "Arrows", "Color", "Board", "Matrix", "Stack", "Root" and "Lanes").`);
      if (!["yes", "no"].includes(setting.value.toLowerCase())) fail(`"${item.text}": ${setting.label} is yes or no.`);
      settings[label] = setting.value.toLowerCase() === "yes";
    }
    return settings;
  }
  return cardsLayout(definition, items, fail);
}
function cardsLayout(definition, items, fail) {
  if (!items.length) return {};
  const names = new Map(definition.properties.map((p) => [nameKey(p.name), p.name]));
  const rows = items.map(
    (item) => item.text.split("|").map((cell) => names.get(nameKey(cell)) ?? fail(`no property "${cell.trim()}" in ${definition.type}.`))
  );
  const gcd = (a, b) => b ? gcd(b, a % b) : a;
  const columns = rows.reduce((m, row) => m * row.length / gcd(m, row.length), 1);
  const cells = rows.map((row) => row.flatMap((name) => Array(columns / row.length).fill(name)));
  for (const name of new Set(cells.flat())) {
    const at = cells.flatMap((row, y) => row.flatMap((n, x) => n === name ? [[y, x]] : []));
    const span = (k) => Math.max(...at.map((p) => p[k])) - Math.min(...at.map((p) => p[k])) + 1;
    if (span(0) * span(1) !== at.length) fail(`"${name}" must fill a rectangle: write it in the same place on rows that follow each other.`);
  }
  return { columns, cells };
}
function sequenceLayout(definition, items, fail) {
  let elements = "columns";
  const boxes = [];
  const line = {};
  const background = {};
  let lifelines;
  let dots;
  const names = new Map(definition.properties.map((p) => [nameKey(p.name), p.name]));
  const property = (name, item) => names.get(nameKey(name)) ?? fail(`"${item.text}": no property "${name.trim()}" in ${definition.type}.`);
  const pair = (setting, item, what) => {
    const m = /^(.+?)\s*=\s*(.+)$/.exec(setting.value);
    if (!m) fail(`"${item.text}": write "- ${setting.label}: <property> = <${what}>".`);
    return [nameKey(property(m[1], item)), m[2].trim()];
  };
  for (const item of items) {
    const setting = readProperty(item);
    const label = setting?.label.toLowerCase();
    if (label === "elements") {
      elements = setting.value.toLowerCase();
      if (!["rows", "columns"].includes(elements)) fail(`"${item.text}": Elements is rows or columns.`);
    } else if (label === "boxes") {
      for (const name of setting.value ? [setting.value] : setting.children.map((c) => c.text.trim())) boxes.push(nameKey(property(name, item)));
    } else if (label === "background") {
      const [name, color = "gray"] = setting.value.split("=").map((s) => s.trim());
      if (!COLORS.includes(color.toLowerCase())) fail(`"${item.text}": the color is one of ${COLORS.join(", ")}.`);
      background[nameKey(property(name, item))] = color.toLowerCase();
    } else if (label === "line") {
      const [key, value] = pair(setting, item, "name");
      line[key] = value;
    } else if (label === "lifelines") {
      const m = /^(.+?)\s*(?:→|->)\s*(.+)$/.exec(setting.value);
      if (!m) fail(`"${item.text}": write "- Lifelines: <property> \u2192 <property>".`);
      lifelines = { from: property(m[1], item).toLowerCase(), to: property(m[2], item).toLowerCase() };
    } else if (label === "dots") {
      dots = nameKey(property(setting.value, item));
    } else fail(`"${item.text}" is not a setting of a sequence (it knows "Draw", "Shows", "Where", "Arrows", "Color", "Elements", "Boxes", "Background", "Line", "Lifelines", "Dots").`);
  }
  if (dots && elements !== "rows") fail('"Dots" needs "- Elements: rows".');
  return { elements, boxes, background, line, lifelines, dots };
}
var COLORS = ["blue", "amber", "green", "purple", "red", "gray", "white"];
function graphLayout(definition, items, fail) {
  const kind = kindSpecOf(definition);
  const known = (kind?.values ?? []).map((v) => v.toLowerCase());
  const diamond = [];
  const cylinder = [];
  const person = [];
  const frame = [];
  const thick = [];
  let ends = false;
  let lines = "curved";
  let direction = "down";
  let returns = "arrow";
  let heads = "arrow";
  let labels = "always";
  const dashed = [];
  const choice = (setting, item, values) => {
    const value = setting.value.toLowerCase();
    if (!values.includes(value)) fail(`"${item.text}": ${setting.label} is ${values.join(" or ")}.`);
    return value;
  };
  for (const item of items) {
    const setting = readProperty(item);
    const label = setting?.label.toLowerCase();
    if (label === "ends") {
      const value = setting.value.toLowerCase();
      if (!["yes", "start", "no"].includes(value)) fail(`"${item.text}": Ends is yes, start or no.`);
      ends = value === "yes" || value === "start" ? value : false;
      continue;
    }
    if (label === "lines") {
      lines = choice(setting, item, ["curved", "elbow"]);
      continue;
    }
    if (label === "returns") {
      returns = choice(setting, item, ["arrow", "link"]);
      continue;
    }
    if (label === "heads") {
      heads = choice(setting, item, ["arrow", "none", "cardinality"]);
      continue;
    }
    if (label === "labels") {
      labels = choice(setting, item, ["always", "none"]);
      continue;
    }
    if (label === "direction") {
      direction = choice(setting, item, ["down", "right"]);
      continue;
    }
    if (label === "dashed") {
      dashed.push(...(setting.value ? setting.value.split(/\s*,\s*/) : setting.children.map((c) => c.text.trim())).map((w) => w.toLowerCase()));
      continue;
    }
    const isValue = (value) => known.includes(value.toLowerCase()) || fail(`"${value}" is not a value of ${kind ? `"${kind.name}"` : "a single enum property"} in ${definition.type}.`);
    const lists = { diamond, cylinder, person, frame, thick };
    if (!lists[label]) fail(`"${item.text}" is not a setting of a graph layout (it knows "Draw", "Shows", "Where", "Arrows", "Color", "Diamond", "Cylinder", "Person", "Frame", "Thick", "Ends", "Lines", "Direction", "Returns", "Heads", "Labels" and "Dashed").`);
    for (const value of setting.value ? setting.value.split(/\s*,\s*/) : setting.children.map((c) => c.text.trim())) {
      isValue(value);
      lists[label].push(value);
    }
  }
  return { diamond, cylinder, person, frame, thick, ends, lines, direction, returns, heads, labels, dashed };
}

// renderer/folder.ts
function filesUnder(dir2) {
  return readdirSync(dir2, { recursive: true }).map((p) => String(p).split(/[\\/]/).join("/")).filter((p) => !p.split("/").some((part) => part.startsWith(".") || part === "node_modules"));
}
var markdownFiles = (dir2) => filesUnder(dir2).filter((p) => p.toLowerCase().endsWith(".md")).map((p) => join(dir2, p));
function definitionTexts(types) {
  const texts = /* @__PURE__ */ new Map();
  if (!existsSync(types)) return texts;
  for (const name of readdirSync(types).filter((n) => n.endsWith(".md"))) texts.set(name.slice(0, -3), readFileSync(join(types, name), "utf8"));
  return texts;
}
function definitionOf(texts, type) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(type)) throw new Error(`"${type}" is not a type name (kebab-case, like "user-flow").`);
  if (!texts.has(type)) throw new Error(`no definition for the type "${type}" in the types/ folder of the project.`);
  return parseDefinition(type, texts.get(type), texts.get(`${type}.layout`));
}

// renderer/links.ts
var WIKILINK = /\[\[([^\]|#]*)((?:#[^\]|#]*)*)(?:\|([^\]]*))?\]\]/g;
var anchorOf = (name) => `el-${nameKey(name)}`;
var fileKey = (name) => name.toLowerCase();
function projectsOf(paths) {
  const slash = (p) => p.replace(/\\/g, "/");
  const roots = [...new Set(paths.map((p) => /^(.*\/)?types\/[^/]+\.md$/i.exec(slash(p))).filter((m) => m).map((m) => m[1] ?? ""))].sort((a, b) => b.length - a.length);
  const rootOf2 = (path) => roots.find((r) => slash(path).startsWith(r)) ?? roots.at(-1);
  let common = roots.length > 1 ? roots.reduce((a, b) => {
    let k = 0;
    while (k < a.length && a[k] === b[k]) k++;
    return a.slice(0, k);
  }) : "";
  common = common.slice(0, common.lastIndexOf("/") + 1);
  const prefixOf = (path) => roots.length > 1 ? (roots.find((r) => slash(path).startsWith(r)) ?? common).slice(common.length) : "";
  return { rootOf: rootOf2, prefixOf };
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
  const files2 = /* @__PURE__ */ new Map();
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
    files2.set(fileKey(project + name), { name, project, key: project + name, path, text, map, error, isMap, title: map?.meta.title || name, elements });
  }
  const index2 = { files: files2, hrefOf, links: [] };
  for (const file of files2.values()) {
    if (!file.isMap) continue;
    for (const section of file.map.sections) {
      const free = RESERVED.includes(section.name.toLowerCase());
      let property = "";
      for (const line of section.lines) {
        const top = /^[-*+]\s+(.*)$/.exec(line);
        if (top && !free) property = readProperty({ text: top[1], children: [] })?.label ?? "";
        for (const m of line.matchAll(WIKILINK)) {
          index2.links.push({ from: { file, element: section.name, property }, ...resolve(index2, file, m[0]) });
        }
      }
    }
  }
  return index2;
}
function resolve(index2, fromFile, raw) {
  const m = new RegExp(`^${WIKILINK.source}$`).exec(raw);
  const [fileName, path, alias] = [m[1].trim(), m[2].split("#").slice(1).map((s) => s.trim()), m[3]?.trim()];
  const file = fileName ? index2.files.get(fileKey((fromFile?.project ?? "") + fileName)) : fromFile;
  const full = [file && file !== fromFile ? file.name : fileName, ...path].filter(Boolean).join(" \u203A ");
  const last = path.at(-1);
  const short = !last || /^context$/i.test(last) ? (file && file !== fromFile ? file.name : fileName) || full : last;
  const label = alias || short;
  if (!file) return { raw, label, full, problem: `no file "${fileName}" in the folder` };
  if (!path.length) return { raw, label, full, file, href: index2.hrefOf(file, "") };
  const element = file.elements.get(nameKey(path[0]));
  if (!element) return { raw, label, full, file, problem: `no element "${path[0]}" in ${file.name}` };
  const missing = path.slice(1).find((n) => !element.names.has(nameKey(n)));
  if (missing) return { raw, label, full, file, element, problem: `no "${missing}" under ${element.name} in ${file.name}` };
  const lines = linesOf(element.items, path.slice(1));
  return { raw, label, full, file, element, path, lines, href: index2.hrefOf(file, [anchorOf(element.name), ...lines].join("/")) };
}

// renderer/checks.ts
var lineOf = (src) => src ? src.line + 1 : void 0;
function didYouMean(word, candidates) {
  const a = nameKey(word);
  const distance = (b) => {
    let row = Array.from({ length: b.length + 1 }, (_, k) => k);
    for (let i = 1; i <= a.length; i++) {
      const next = [i];
      for (let j = 1; j <= b.length; j++) next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      row = next;
    }
    return row[b.length];
  };
  let best;
  for (const name of candidates) {
    const d = distance(nameKey(name));
    if (d > 0 && d <= Math.max(2, Math.floor(a.length / 3)) && (!best || d < best.d)) best = { name, d };
  }
  return best ? `, did you mean "${best.name}"?` : "";
}
function checkValues(where, property, spec, issues, at) {
  if (property.isUndefined) return;
  let line = lineOf(property.src ?? property.values[0]?.src);
  const error = (message) => issues.push({ level: "error", where, message, line, at });
  if (spec.single && property.values.length > 1) error(`one value only, ${property.values.length} written`);
  for (const { text, children, src } of property.values) {
    line = lineOf(src) ?? line;
    const value = text.trim();
    if (value.toLowerCase() === "none") continue;
    for (const detail of spec.details ? (children ?? []).map(readProperty).filter(Boolean) : []) {
      const d = spec.details.find((s) => s.name.toLowerCase() === detail.label.toLowerCase());
      const under = `${where} \u203A ${value} \u203A ${detail.label}`;
      if (!d) issues.push({ level: "warning", where: under, message: `not a detail of ${spec.name}${didYouMean(detail.label, spec.details.map((s) => s.name))}`, line, at });
      else checkValues(under, { isUndefined: detail.value.toLowerCase() === "undefined", values: detail.value ? [{ text: detail.value, children: detail.children, src }] : detail.children }, d, issues, at);
    }
    if (spec.kind === "number") {
      const number = readNumber(value);
      if (!number) error(`"${value}" is not a number`);
      else {
        const n = number.value;
        if (spec.min !== void 0 && n < spec.min || spec.max !== void 0 && n > spec.max) error(`${n} is out of the scale, from ${spec.min ?? "\u2026"} to ${spec.max ?? "\u2026"}`);
        if (number.word && !spec.note) error(`"${value}": no word after the number for this property`);
      }
    } else if (spec.kind === "enum" && spec.values && !spec.values.some((v) => v.toLowerCase() === value.toLowerCase())) {
      error(`"${value}" is not one of ${spec.values.join(", ")}${didYouMean(value, spec.values)}`);
    } else if (spec.kind === "date" && !/^\d{4}(?:-(?:0[1-9]|1[0-2])(?:-(?:0[1-9]|[12]\d|3[01]))?|-Q[1-4])?$/.test(value)) {
      error(`"${value}" is not a date (YYYY, YYYY-MM, YYYY-Qn or YYYY-MM-DD)`);
    } else if (spec.kind === "link" && !/\[\[[^\]]*\]\]/.test(value)) {
      error(`"${value}" is not a link ([[file#Name]])`);
    }
  }
}
function checkElements(elements, definition, issues, prefix = "", seen = /* @__PURE__ */ new Set()) {
  const specs = new Map(definition.properties.map((p) => [p.name.toLowerCase(), p]));
  for (const element of elements) {
    const where = `${prefix}${element.name}`;
    const at = element.name;
    if (seen.has(nameKey(element.name))) issues.push({ level: "error", where, message: `another ${definition.element ?? "element"} has this name`, line: lineOf(element.src), at });
    seen.add(nameKey(element.name));
    for (const [key, property] of element.properties) {
      const spec = specs.get(key) ?? specs.get("*");
      if (spec) checkValues(`${where} \u203A ${property.label}`, property, spec, issues, at);
      else issues.push({ level: "warning", where: `${where} \u203A ${property.label}`, message: `not a property of ${definition.type}${didYouMean(property.label, definition.properties.map((p) => p.name).filter((n) => n !== "*"))}`, line: lineOf(property.src ?? property.values[0]?.src) ?? lineOf(element.src), at });
    }
    checkElements(element.children ?? [], definition, issues, `${where} \u203A `, seen);
  }
}
function lineWith(file, from, ...texts) {
  const k = file.text.split(/\r\n|\r|\n/).findIndex((l, k2) => k2 >= (from ?? 0) && texts.every((t) => l.includes(t)));
  return k < 0 ? void 0 : k + 1;
}
var arrowKey = (path, element, target) => `${path}|${element}|${nameKey(target)}`;
function brokenLinkWhere(link, missingArrows2) {
  const own = /^\[\[#([^\]|#]*)\]\]$/.exec(link.raw);
  if (own && missingArrows2.has(arrowKey(link.from.file.path, link.from.element, own[1]))) return void 0;
  return `${link.from.element}${link.from.property ? ` \u203A ${link.from.property}` : ""}`;
}
function checkMap(file, definition, missingArrows2 = /* @__PURE__ */ new Set()) {
  const issues = [];
  const elements = elementsOf(file.map, definition.shape);
  checkElements(elements, definition, issues);
  if (definition.shape === "graph") {
    const names = new Set(elements.map((e) => nameKey(e.name)));
    for (const element of elements) {
      for (const arrow of element.arrows) {
        const line = lineWith(file, element.src?.line, "\u2192", arrow.target);
        if (definition.layout?.heads === "cardinality" && !cardinalityOf(arrow.label)) issues.push({ level: "warning", where: element.name, message: `the arrow to "${arrow.target}" has no cardinality at the end of its label (1, 0..1, 1..n, 0..n)`, line, at: element.name });
        if (arrow.file || arrow.target.toLowerCase() === "undefined") continue;
        if (!arrow.target) issues.push({ level: "error", where: element.name, message: "an arrow has no target", line, at: element.name });
        else if (!names.has(nameKey(arrow.target))) {
          const message = `arrow to "${arrow.target}": no ${definition.element ?? "element"} of this file has this name${didYouMean(arrow.target, elements.map((e) => e.name))}`;
          issues.push({ level: "error", where: element.name, message, line, at: element.name });
          missingArrows2.add(arrowKey(file.path, element.name, arrow.target));
        }
      }
    }
  }
  for (const section of file.map.sections) {
    if (RESERVED.includes(section.name.toLowerCase())) continue;
    const k = section.lines.findIndex((line) => line.trim() && !/^\s*[-*+]\s/.test(line) && !/^\s/.test(line));
    if (k < 0) continue;
    const heading = /^#{3,}\s/.test(section.lines[k]);
    const message = heading ? "a heading under an element: an element is a ## heading, and what is under it, list items" : "free text under an element: write it as a property";
    issues.push({ level: "warning", where: section.name, message, line: section.start + k + 1, at: section.name });
  }
  if (definition.shape !== "tree") {
    for (const section of file.map.sections) {
      if (RESERVED.includes(section.name.toLowerCase())) continue;
      section.lines.forEach((line, k) => {
        const item = /^[-*+]\s+(.*)$/.exec(line)?.[1];
        if (!item || readProperty({ text: item, children: [] }) || definition.shape === "graph" && readArrow(item)) return;
        const hint = / :/.test(item) ? ", with no space before the colon" : "";
        issues.push({ level: "warning", where: section.name, message: `"${item}" is neither a property${definition.shape === "graph" ? " nor an arrow" : ""}: write it \`Label: value\`${hint}`, line: section.start + k + 1, at: section.name });
      });
    }
  }
  if (definition.layoutError) issues.push({ level: "error", where: "layout", message: definition.layoutError });
  for (const [key, values] of Object.entries(MAP_SETTINGS)) {
    const value = file.map.meta[key]?.trim().toLowerCase();
    if (value === void 0) continue;
    if ((definition.layout?.shape ?? definition.shape) !== "graph") issues.push({ level: "warning", where: "front matter", message: `${key}: only for a map drawn as a graph` });
    else if (!values.includes(value)) issues.push({ level: "error", where: "front matter", message: `${key} is ${values.join(", ")}` });
  }
  const views = new Set((definition.layout?.views ?? []).map((view) => nameKey(view.name)));
  for (const name of file.map.meta.views?.split(",").map((n) => n.trim()).filter(Boolean) ?? [])
    if (!["none", "map"].includes(nameKey(name)) && !views.has(nameKey(name)))
      issues.push({ level: "warning", where: "front matter", message: `views: no view "${name}" in the layout of ${definition.type}` });
  return issues;
}

// renderer/check.ts
var here = dirname(fileURLToPath(import.meta.url));
var catalog = [join2(here, "types"), join2(here, "..", "skills", "maps", "types")].find((dir2) => existsSync2(dir2));
function withHeader(text, header) {
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  return text.replace(/^(\uFEFF?---\r?\n[\s\S]*?\r?\n---[ \t]*\r?\n)(?:[ \t]*<!--[\s\S]*?-->[ \t]*(?:\r?\n|$))?/, (_, front) => `${front}${header}${eol}`);
}
if (process.argv[2]?.startsWith("-")) {
  console.log("Usage: node check.mjs [folder]   (default: maps/ when it exists, else the current folder)");
  console.log("Checks every map of the folder against its type, and writes the header comment of each map.");
  process.exit(process.argv[2] === "--help" || process.argv[2] === "-h" ? 0 : 1);
}
var dir = process.argv[2] ?? (existsSync2("maps") ? "maps" : ".");
var files = markdownFiles(dir);
var { rootOf } = projectsOf(files);
var projects = /* @__PURE__ */ new Map();
var textsOf = (path) => {
  const root = rootOf(path) ?? `${dir}/`;
  if (!projects.has(root)) projects.set(root, definitionTexts(join2(root, "types")));
  return projects.get(root);
};
var typeOf = (path, type) => {
  try {
    return definitionOf(textsOf(path), type);
  } catch (e) {
    const types = relative(".", join2(rootOf(path) ?? dir, "types")) || "types";
    if (!textsOf(path).has(type) && existsSync2(join2(catalog, `${type}.md`))) throw new Error(`${e.message} Copy it from the catalog: ${relative(".", join2(catalog, type))}.md, with its .layout.md and .css when they exist, into ${types}/.`);
    throw e;
  }
};
var written = [];
var sources = files.map((path) => {
  const text = readFileSync2(path, "utf8");
  try {
    const type = readMap(text).meta.type;
    if (!type || type === "type-definition") return { path, text };
    const right = withHeader(text, headerOf(typeOf(path, type)));
    if (right !== text) {
      writeFileSync(path, right);
      written.push(path);
    }
    return { path, text: right };
  } catch {
    return { path, text };
  }
});
var index = buildIndex(sources);
var report = /* @__PURE__ */ new Map();
var missingArrows = /* @__PURE__ */ new Set();
var add = (path, issue) => report.set(path, [...report.get(path) ?? [], issue]);
for (const { path, text } of sources) {
  let meta;
  try {
    meta = readMap(text).meta;
  } catch {
    continue;
  }
  if (meta.type !== "type-definition") continue;
  if (basename(dirname(path)) !== "types") {
    add(path, { level: "warning", where: "definition", message: "not read: a type definition goes in the types/ folder of the maps" });
    continue;
  }
  try {
    definitionOf(textsOf(path), basename(path).replace(/\.md$/i, ""));
  } catch (e) {
    add(path, { level: "error", where: "definition", message: e.message });
  }
}
var maps = 0;
for (const file of index.files.values()) {
  if (file.error) add(file.path, { level: "error", where: "file", message: file.error });
  if (!file.isMap) continue;
  maps++;
  try {
    for (const issue of checkMap(file, typeOf(file.path, file.map.meta.type), missingArrows)) add(file.path, issue);
  } catch (e) {
    add(file.path, { level: "error", where: "type", message: e.message });
  }
}
for (const link of index.links.filter((l) => l.problem)) {
  const where = brokenLinkWhere(link, missingArrows);
  if (!where) continue;
  const [, fileName, first] = /^\[\[([^\]#|]*)#?([^\]#|]*)/.exec(link.raw) ?? [];
  const hint = !link.file ? didYouMean(fileName, [...index.files.values()].map((f) => f.name)) : !link.element && first ? didYouMean(first, [...link.file.elements.values()].map((e) => e.name)) : "";
  const section = link.from.file.isMap ? link.from.file.map.sections.find((s) => nameKey(s.name) === nameKey(link.from.element.split(" \u203A ")[0])) : void 0;
  add(link.from.file.path, { level: "warning", where, message: `broken link ${link.raw}: ${link.problem}${hint}`, line: lineWith(link.from.file, section?.src.line, link.raw) });
}
for (const path of written) console.log(`${relative(".", path) || path}: header comment written, from the definition of its type`);
var all = [...report.values()].flat();
for (const [path, issues] of report) {
  for (const i of issues) console.log(`${relative(".", path) || path}${i.line ? `:${i.line}` : ""}: ${i.level}: ${i.where}: ${i.message}`);
}
var count = (level) => all.filter((i) => i.level === level).length;
var plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
if (!maps) console.log(`No map found in ${dir}: a map is a .md file with a type in its front matter.`);
console.log(`${plural(count("error"), "error")}, ${plural(count("warning"), "warning")} in ${plural(maps, "map")}.`);
process.exit(count("error") ? 1 : 0);
