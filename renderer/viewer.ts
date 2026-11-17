// The script of maps.html: open a folder of maps and see them drawn, with the links between them,
// and their files in an editor.
// Everything stays in the browser: nothing is sent anywhere. Bundled by build.ts. The types are those of the folder:
// each map takes its type in the types/ folder of its project (`projectsOf`).
// An element edited in the page is written back to its file: through serve.mjs when it serves the page, or by the
// browser when the folder was opened with write access (Chrome, Edge).

import Panzoom, { type PanzoomEventDetail } from '@panzoom/panzoom';
import { chipOf, drawMap, drawPlain, linksData, propOf, valueOf } from './draw.ts'; // the hooks of a style, in the panel as on the map
import { drawArrows } from './arrows.ts';
import { brokenLinkWhere, checkMap, type Issue } from './checks.ts';
import { addedLabels, propose } from './complete.ts';
import { createEditor } from './editor.ts';
import { anchorOf, buildIndex, escapeHtml, followName, linksOf, projectsOf, type NameLeft } from './links.ts';
import type { Definition, ElementLink, HrefOf, IndexedFile, IndexedMap, Item, LinkIndex, MapElement, Property, PropertySpec, Source } from './model.ts';
import { elementsOf, nameKey, parseDefinition, pluralOf, readProperty, RESERVED } from './read.ts';

// ---- The types of the page (those of a map, a definition and the links are in model.ts) ----

/** Something drawn in the page, in HTML or in an SVG: it has hooks (`dataset`) and classes. */
type Drawn = HTMLElement | SVGElement;

/** Writes a file of the folder, when the page can. `base` is the file as the page read it: a file changed since (by
 *  the AI) is not written over (`Not saved: the map changed meanwhile`); the artifact keeps its edits apart and ignores it. */
type Save = (path: string, text: string, base: string) => Promise<void>;

/** What the panel shows: `kicker` and `title` as HTML, its content, the line of the file where it is written, and
 *  what it selects on the canvas. */
interface Shown {
  kicker: string;
  title: string;
  html: string;
  line?: number;
  selected?: Iterable<Drawn>;
  /** What the open questions shown are about, brought out on the map, the rest faded (`asked`). */
  asked?: Element[][];
}

/** What gives the content of the panel, or nothing when there is nothing to show any more. */
type Details = () => Shown | undefined;

/** A folder in the list of the maps. */
interface Folder {
  folders: Map<string, Folder>;
  maps: IndexedFile[];
}

/** Where the browser can open a folder with write access (Chrome, Edge). */
declare global {
  interface Window {
    showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>;
    /** claude.ai, around a private artifact: its capabilities (`db`, `user`, `downloads`), or null where the page cannot
     *  use them. */
    claude?: { use: (name: string) => Promise<any> };
  }
}

/** An element of the page by its id: all of them are in the HTML that build.ts writes. */
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
let index: LinkIndex | undefined; // none before a folder is read
let definitions = new Map<string, string>(); // the type definitions, layouts and styles of the folder, by the folder of their project and their name (`showcase/1-courts/rules`, `….layout`, `….css`)
let projects = projectsOf([]); // the projects of the folder read
/** A text of a type (its definition, `<type>.layout`, `<type>.css`) in the project of a file. */
const typeText = (path: string, name: string) => definitions.get(`${projects.rootOf(path) ?? ''}${name}`);
let opened: Source[] = []; // the files read, `{ path, text }`
let save: Save | undefined; // writes a file, `(path, text) => Promise`, when the page can
let shownDefinition: Definition | undefined; // the definition of the map shown, with its layout
let shownAside: HTMLElement | undefined; // its context and its open questions, out of the canvas
let shownIssues: Issue[] = []; // what the check finds wrong in it, as it is now

// The whole map (header, context, drawing, open questions) on a canvas that fills the window: drag to move; on a
// trackpad, two fingers move it and a pinch zooms, as in Figma; the wheel of a mouse zooms.
const canvas = document.querySelector<HTMLElement>('.canvas')!;
const panzoom = Panzoom($('page'), { canvas: true, origin: '0 0', minScale: 0.1, maxScale: 4, cursor: 'grab' });
canvas.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 16 : 1; // lines, from some mice
    // Auto: a trackpad is given as wheelDeltaY = -3 × deltaY, rounded to a whole number when the page is scaled (as
    // in the preview of the Claude app); a wheel, in notches (120, or 83 scaled), is far from it. What is told wrong (a
    // Magic Mouse, a touchpad on Windows) is set in the menu of the bar.
    const { wheelDeltaY } = e as WheelEvent & { wheelDeltaY?: number }; // not in the standard
    const told = wheelDeltaY === undefined ? e.deltaMode === 0 : Math.abs(wheelDeltaY + 3 * e.deltaY) < 1.5;
    const trackpad = scrolling === 'auto' ? told : scrolling === 'trackpad';
    // What Auto told last; not from a pinch, which comes as a wheel with Ctrl, as Ctrl and the wheel of a mouse do
    if (scrolling === 'auto' && !e.ctrlKey) $('scroll-open').dataset.shows = told ? 'trackpad' : 'mouse';
    if (e.ctrlKey || e.metaKey || !trackpad) return zoomAt(panzoom.getScale() * Math.exp(-Math.max(-20, Math.min(20, e.deltaY * unit)) * 0.01), e);
    const scale = panzoom.getScale();
    panzoom.pan(-(e.deltaX * unit) / scale, -(e.deltaY * unit) / scale, { relative: true, animate: false });
  },
  { passive: false },
);
// − 65 % +, at the bottom right of the part seen, for whoever does not know the gestures: a step
// from the middle of the part seen; the percentage fits the map, as it opens.
const zoomBy = (factor: number) => {
  const view = seen();
  const c = canvas.getBoundingClientRect();
  zoomAt(panzoom.getScale() * factor, { clientX: c.left + view.left + view.width / 2, clientY: c.top + view.top + view.height / 2 } as MouseEvent);
};
$('zoom-in').addEventListener('click', () => zoomBy(1.25));
$('zoom-out').addEventListener('click', () => zoomBy(1 / 1.25));
$('zoom-fit').addEventListener('click', home);
// Mouse or trackpad, at the bottom right with the zoom, its icon the one in use: Auto tells them apart; the choice is kept by this browser.
let scrolling = 'auto';
try {
  scrolling = localStorage.getItem('maps.md:scrolling') ?? 'auto';
} catch {} // no storage (a private window): Auto
const scrollItems = document.querySelectorAll<HTMLElement>('[data-scroll]');
const showScrolling = () => {
  scrollItems.forEach((item) => item.setAttribute('aria-checked', String(item.dataset.scroll === scrolling)));
  if (scrolling !== 'auto') $('scroll-open').dataset.shows = scrolling; // Auto: what it told last
};
showScrolling();
scrollItems.forEach((item) =>
  item.addEventListener('click', () => {
    scrolling = item.dataset.scroll!;
    try {
      localStorage.setItem('maps.md:scrolling', scrolling);
    } catch {}
    showScrolling();
    $('scroll-menu').hidePopover();
  }),
);
// The menu opens above its button, right-aligned with it.
$('scroll-menu').addEventListener('beforetoggle', (e) => {
  if ((e as ToggleEvent).newState !== 'open') return;
  const button = $('scroll-open').getBoundingClientRect();
  Object.assign($('scroll-menu').style, { bottom: `${innerHeight - button.top}px`, right: `${innerWidth - button.right}px` });
});
// Dots behind the map, as in FigJam: they move with the canvas, and grow and shrink with its zoom; zoomed out, one in
// two is left out, so that they stay apart.
$('page').addEventListener('panzoomchange', (e) => {
  const { x, y, scale } = (e as CustomEvent<PanzoomEventDetail>).detail;
  const base = parseFloat(getComputedStyle(canvas).getPropertyValue('--size-dot-gap'));
  let gap = base * scale;
  while (gap < base / 2) gap *= 2;
  canvas.style.backgroundSize = `${gap}px ${gap}px`;
  canvas.style.setProperty('--zoom', String(scale));
  $('zoom-fit').textContent = `${Math.round(scale * 100)} %`;
  canvas.style.backgroundPosition = `${x * scale}px ${y * scale}px`;
});
// A drag is not a click: it opens no panel and follows no link.
let start: PanzoomEventDetail;
let dragged = false;
$('page').addEventListener('panzoomstart', (e) => ((start = (e as CustomEvent<PanzoomEventDetail>).detail), (dragged = false), document.getSelection()!.removeAllRanges()));
$('page').addEventListener('panzoomend', (e) => (dragged = Math.abs((e as CustomEvent<PanzoomEventDetail>).detail.x - start.x) + Math.abs((e as CustomEvent<PanzoomEventDetail>).detail.y - start.y) > 3 / (e as CustomEvent<PanzoomEventDetail>).detail.scale));
canvas.addEventListener('click', (e) => dragged && (e.stopPropagation(), e.preventDefault(), (dragged = false)), true);
// Text can be selected, to copy it: a drag that starts on a letter selects; anywhere else, it moves the canvas.
canvas.addEventListener('pointerdown', (e) => e.pointerType === 'mouse' && overText(e) && e.stopPropagation(), true);
/** Whether the pointer is on the text of the map, not on the room around it. */
function overText(e: MouseEvent) {
  if (!$('page').contains(e.target as Node)) return false;
  if ((e.target as Element).closest('svg text')) return true;
  const at: { offsetNode?: Node; startContainer?: Node } | null | undefined = document.caretPositionFromPoint?.(e.clientX, e.clientY) ?? document.caretRangeFromPoint?.(e.clientX, e.clientY);
  const node = at?.offsetNode ?? at?.startContainer;
  if (node?.nodeType !== Node.TEXT_NODE || !node.textContent!.trim()) return false;
  const range = document.createRange();
  range.selectNodeContents(node);
  // Its lines, with the room between them, so that a drag between two lines selects too.
  return [...range.getClientRects()].some((r) => e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top - 3 && e.clientY <= r.bottom + 3);
}

/** Zooms keeping the point under the pointer in place (panzoom's zoomToPoint expects an origin in the middle). */
function zoomAt(toScale: number, e: MouseEvent) {
  const scale = panzoom.getScale();
  const { x, y } = panzoom.getPan();
  const c = canvas.getBoundingClientRect();
  const px = e.clientX - c.left;
  const py = e.clientY - c.top;
  const to = panzoom.zoom(toScale, { animate: false }).scale;
  panzoom.pan(px / to - (px / scale - x), py / to - (py / scale - y), { animate: false });
}

// A pinch on a touch screen, done here: panzoom's own zooms around the wrong point with an origin at 0 0 (it counts
// one in the middle), which sent the map to the top left. Panzoom sees the first finger only, and none of the moves
// from the second finger down to the last finger up; the point of the map under the two fingers stays under them.
const touches = new Map<number, { x: number; y: number }>();
let pinch: { distance: number; scale: number; x: number; y: number } | undefined; // at its start: the distance, the scale, the point of the map under the fingers
const fingers = () => {
  const [a, b] = [...touches.values()];
  return { distance: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
};
canvas.addEventListener(
  'pointerdown',
  (e) => {
    if (e.pointerType !== 'touch') return;
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.size !== 2) return;
    e.stopPropagation();
    const { distance, mx, my } = fingers();
    const scale = panzoom.getScale();
    const { x, y } = panzoom.getPan();
    const c = canvas.getBoundingClientRect();
    pinch = { distance, scale, x: (mx - c.left) / scale - x, y: (my - c.top) / scale - y };
  },
  true,
);
window.addEventListener(
  'pointermove',
  (e) => {
    if (!touches.has(e.pointerId)) return;
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!pinch) return;
    e.stopPropagation();
    if (touches.size < 2) return;
    const { distance, mx, my } = fingers();
    const c = canvas.getBoundingClientRect();
    const to = panzoom.zoom(pinch.scale * (distance / pinch.distance), { animate: false }).scale;
    panzoom.pan((mx - c.left) / to - pinch.x, (my - c.top) / to - pinch.y, { animate: false });
  },
  true,
);
const lift = (e: PointerEvent) => {
  const first = touches.keys().next().value; // the finger panzoom sees: its lift ends panzoom's move
  if (!touches.delete(e.pointerId) || !pinch) return;
  if (e.pointerId !== first) e.stopPropagation();
  if (!touches.size) pinch = undefined;
};
window.addEventListener('pointerup', lift, true);
window.addEventListener('pointercancel', lift, true);

/** Whether a panel covers the whole canvas, as on a phone: the map is seen once it is closed. */
const covers = (panel: HTMLElement) => !panel.hidden && panel.offsetWidth >= canvas.clientWidth;

/** The part of the canvas that is seen: the canvas fills the window, and the bar and the panels are over it. The
 *  panels by their width, not where they are drawn: one that slides in (on a reload) is still on its way. A panel that
 *  covers the canvas is left out: what is seen is what shows when it is closed. */
function seen() {
  const width = (panel: HTMLElement) => (panel.hidden || covers(panel) ? 0 : panel.offsetWidth);
  const left = width($('files'));
  const right = canvas.clientWidth - width($('editor'));
  const top = ($('views-bar').hidden ? document.querySelector('.bar')! : $('views-bar')).getBoundingClientRect().bottom;
  return { left, top, width: right - left, height: canvas.clientHeight - top };
}

/** Shows the whole width of the map, from the top left corner of the part seen: at its size, or smaller when it is
 *  wider than the part seen, down to half its size so that it can still be read. */
function home() {
  const { left, top, width } = seen();
  const page = $('page');
  const wide = page.scrollWidth + parseFloat(getComputedStyle(page).paddingLeft); // a map wider than the page: its margin on the right too
  const scale = panzoom.zoom(Math.max(0.5, Math.min(1, width / wide)), { animate: false }).scale;
  panzoom.pan(left / scale, top / scale, { animate: false });
}

/** Moves the canvas so that an element is in the middle of the part seen, at the zoom it has (a link
 *  followed does not zoom). Panzoom draws on the next frame: the place of the element is read in the page itself,
 *  whatever the transform drawn now. */
function center(el: Element) {
  const page = $('page').getBoundingClientRect();
  const drawn = page.width / $('page').offsetWidth;
  const r = el.getBoundingClientRect();
  const scale = panzoom.getScale();
  const view = seen();
  const x = (view.left + view.width / 2) / scale - (r.left - page.left + r.width / 2) / drawn;
  const y = (view.top + view.height / 2) / scale - (r.top - page.top + r.height / 2) / drawn;
  panzoom.pan(x, y, { animate: false });
}

/** Addresses inside the page: `#/<file>` or `#/<file>/<anchor>`; the anchor of an item is the one of its element,
 *  then the lines of the file where its path is written (`el-home/12/14`). */
const hrefOf: HrefOf = (file, anchor) => `#/${encodeURIComponent(file.key)}${anchor ? `/${anchor}` : ''}`;
const route = () => {
  const m = /^#\/([^/]*)(?:\/(.*))?$/.exec(location.hash);
  return m && { name: decodeURIComponent(m[1]), anchor: m[2] };
};

/** Shows the folder opened, at the top of the files: its name in their head (the project's for its `maps/`, when the
 *  path says it), its path under it through serve. `name` when it is known apart (the artifact: no path). */
function folderPath(path?: string, name?: string) {
  const parts = (path ?? '').split(/[\\/]/).filter(Boolean);
  $('files-name').textContent = name || (parts.at(-1) === 'maps' && parts.length > 1 ? parts.at(-2) : parts.at(-1)) || 'maps.md';
  $('files-name').title = $('files-name').textContent!; // the whole name, when it is cut
  $('folder-path').hidden = !path;
  $('folder-path').title = path ?? '';
  // The folder itself in the color of the text, the folders above it muted.
  const at = (path ?? '').lastIndexOf('/') + 1;
  $('folder-path').querySelector('[dir]')!.innerHTML = `${escapeHtml((path ?? '').slice(0, at))}<span class="files-path-name">${escapeHtml((path ?? '').slice(at))}</span>`;
}

async function open(fileList: FileList) {
  const files = [...fileList].filter((f) => /\.md$/i.test(f.name) || isStyle(f.webkitRelativePath || f.name));
  folderPath(files[0]?.webkitRelativePath.split('/')[0] || undefined);
  editable(undefined); // files chosen this way can be read, not written
  load(await Promise.all(files.map(async (f) => ({ path: f.webkitRelativePath || f.name, text: await f.text() }))));
}

/** Opens a folder with write access, where the browser can (Chrome, Edge): its maps can then be edited in the page. */
async function openWritable() {
  let dir: FileSystemDirectoryHandle;
  try {
    dir = await window.showDirectoryPicker!({ mode: 'readwrite' });
  } catch {
    return; // cancelled
  }
  const handles = new Map<string, FileSystemFileHandle>();
  const files: Source[] = [];
  const read = async (folder: FileSystemDirectoryHandle, path: string) => {
    for await (const [name, handle] of folder.entries()) {
      if (name.startsWith('.') || name === 'node_modules') continue;
      if (handle.kind === 'directory') await read(handle, `${path}/${name}`);
      else if (/\.md$/i.test(name) || isStyle(`${path}/${name}`)) {
        handles.set(`${path}/${name}`, handle);
        files.push({ path: `${path}/${name}`, text: await (await handle.getFile()).text() });
      }
    }
  };
  await read(dir, dir.name);
  folderPath(dir.name);
  editable(async (path, text, base) => {
    if ((await (await handles.get(path)!.getFile()).text()) !== base) throw new Error('the map changed meanwhile');
    const out = await handles.get(path)!.createWritable();
    await out.write(text);
    await out.close();
  });
  load(files);
}

/** Says whether the maps can be edited: the editor then writes. */
function editable(write?: Save) {
  save = write;
  editor.lock(!write);
  editorStatus();
  // The button of the panel says what it does: Edit, or Markdown when nothing can be written.
  const button = $('editor-open');
  const name = write ? 'Edit' : 'Markdown';
  button.classList.toggle('is-read-only', !write);
  button.querySelector('span')!.textContent = name;
  button.setAttribute('aria-label', name);
  button.dataset.tip = editTip();
}
/** What the button of the panel does now, under the pointer: open or close, as the files. */
function editTip() {
  const open = !$('editor').hidden && $('editor').dataset.mode === 'markdown';
  return `${save ? (open ? 'Close the editor' : 'Edit') : open ? 'Hide the Markdown' : 'Show the Markdown'}  ⌘⌥B`;
}

// The editor, in the panel on the right, opened by its button in the bar: the file of the map shown. What is typed is written to
// the file after a pause (or on Cmd+S), and the map is drawn again; a click on an element of the map shows its line.
let editorPath: string | undefined; // the file in the editor
let typed: string | undefined; // its text not written yet
let editorBase: string | undefined; // the file as it was read or written last, what is typed starts from
let pause: ReturnType<typeof setTimeout> | undefined;
/** The file in the editor, when it is one of the maps of the folder (not a type definition). */
const edited = () => (index ? [...index.files.values()].find((f) => f.path === editorPath) : undefined);
/** The definition of a type, for the editor; none when it cannot be read (its page says why). */
function definitionOf(type: string) {
  try {
    const text = editorPath && typeText(editorPath, type);
    return text ? parseDefinition(type, text) : undefined;
  } catch {
    return undefined;
  }
}
const editor = createEditor($('editor-text'), {
  onEdit: (text) => {
    typed = text;
    clearTimeout(pause);
    pause = setTimeout(flush, 500);
    editorStatus('Saving…');
  },
  // What the list of the editor shows: from the maps of the folder, the definitions of the types and the file as it
  // is typed.
  propose: (text, line, at) => {
    const file = edited();
    return file ? propose({ index: index!, name: file.key, definitionOf }, text, line, at) : undefined;
  },
  // The labels the type of the map does not know, written in italics.
  added: (text, from, to) => (edited() ? addedLabels(definitionOf, text, from, to) : []),
});
editable(undefined); // read only until a folder that can be written is opened
/** The file in the editor, and whether what is typed is written: `Saved`, `Saving…`, `Not saved: …` or `Read only`. */
function editorStatus(state = save ? 'Saved' : 'Read only') {
  $('editor-status').innerHTML = editorPath ? `<span>${escapeHtml(editorPath)}</span><span>${escapeHtml(state)}</span>` : '';
}

let nameLeft: NameLeft | undefined; // a name emptied while it is retyped: its links follow once it is typed
let nameFirst: { path: string; from: string; to: string } | undefined; // the name before it was typed in several times
async function flush() {
  clearTimeout(pause);
  if (typed === undefined) return;
  const text = typed;
  typed = undefined;
  const file = [...index!.files.values()].find((f) => f.path === editorPath)!;
  // A name edited in place (the heading of an element, a value, an element under another): the links to it follow,
  // in every map of the folder. The file in the editor gets its own links at once, before anything else is typed.
  const followed = followName(opened.filter((s) => !/\.css$/i.test(s.path)), file.path, text, nameLeft);
  nameLeft = followed.left;
  if (followed.files[0].text !== text) editor.show(file.path, followed.files[0].text, !save);
  try {
    await write(file, followed.files[0].text, followed.files.slice(1));
    editorStatus('Saved');
    const { renamed, problem } = followed;
    if (renamed) {
      // A name typed with a pause is renamed twice: the notice says the name it had first.
      const from = nameFirst?.path === file.path && nameFirst.to === renamed.from ? nameFirst.from : renamed.from;
      nameFirst = { path: file.path, from, to: renamed.to };
      if (renamed.links) notice(`“${from}” renamed “${renamed.to}”: ${count(renamed.links, 'link')} updated in ${count(renamed.maps, 'map')}`);
    } else if (problem) notice(`The links did not follow: ${problem}`);
  } catch (error) {
    if (editorPath !== file.path) return; // another file is in the editor now: what was typed here is left
    typed ??= text; // kept in the editor, even when the map changed meanwhile: its new version shows once the page is reloaded
    editorStatus(`Not saved: ${(error as Error).message}`);
  }
}
const count = (n: number, what: string) => `${n} ${what}${n === 1 ? '' : 's'}`;
/** Says for a moment, at the bottom of the page, what the page did by itself. */
function notice(text: string) {
  document.querySelector('.notice')?.remove();
  const el = Object.assign(document.createElement('p'), { className: 'notice', textContent: text });
  el.setAttribute('role', 'status');
  el.addEventListener('animationend', () => el.remove());
  document.body.append(el);
}

/** Shows a file in the editor, unless what is typed there is not written yet. */
function toEditor(file: IndexedFile) {
  if (file.path !== editorPath) flush(); // what was typed in the file before is written first
  else if (typed !== undefined) return;
  editorPath = file.path;
  editorBase = file.text;
  editor.show(file.path, file.text.replace(/\r\n?/g, '\n'), !save);
  editorStatus();
}

$('editor').addEventListener('keydown', (e) => (e.metaKey || e.ctrlKey) && e.key === 's' && (e.preventDefault(), flush()));
// The Markdown open, a click on the map shows where it is written.
canvas.addEventListener('click', (e) => {
  if (!markdownOpen()) return;
  const target = e.target as Element;
  const element = target.closest('[data-el]') ?? target.closest('.node');
  const at = target.closest<Drawn>('[data-src]') ?? element?.querySelector<Drawn>('[data-src]');
  if (at) editor.goTo(Number(at.dataset.src!.split(':')[0]));
});

/** Writes a file, with its own line breaks, then the other files that changed with it (the links that followed a
 *  name), and draws the map again where it was. A file refused leaves the files as they were: those written before it
 *  are written back. */
async function write(file: IndexedFile, edited: string, others: Source[] = []) {
  const text = edited.replace(/\r\n|\r|\n/g, file.text.includes('\r\n') ? '\r\n' : '\n');
  const written = [{ path: file.path, text }, ...others];
  const done: Source[] = []; // the files written, as they were before
  for (const w of written) {
    const base = w.path === file.path ? editorBase! : opened.find((s) => s.path === w.path)!.text;
    try {
      await save!(w.path, w.text, base);
    } catch (error) {
      for (const d of done) await save!(d.path, d.text, written.find((x) => x.path === d.path)!.text).catch(() => {});
      if (done.length) editorBase = done[0].text; // the file of the editor, written first
      throw error;
    }
    done.push({ path: w.path, text: base });
    if (w.path === file.path) editorBase = w.text;
  }
  load(opened.map((s) => written.find((w) => w.path === s.path) ?? s), true);
}

/** A style of the folder (`theme`, `type-style`), after the styles of the page wherever they are (a host can move them
 *  out of the head: claude.ai, for a private artifact), so that it wins over them; the theme before the style of a type. */
function folderStyle(id: string) {
  const found = document.getElementById(id);
  if (found) return found;
  const style = Object.assign(document.createElement('style'), { id });
  const page = [...document.querySelectorAll('style:not(#theme, #type-style), link[rel="stylesheet"]')].pop();
  const after = (id === 'type-style' && document.getElementById('theme')) || page;
  if (after) after.after(style);
  else document.head.append(style);
  return style;
}
/** The theme of a folder of maps: `theme.css` at its root, which redefines design tokens of the page (style.css). */
const isTheme = (path?: string) => /^[^/]+\/theme\.css$/i.test(path ?? '');
function theme(css?: string) {
  if (!css) return document.getElementById('theme')?.remove();
  folderStyle('theme').textContent = css;
}
/** The style of a type: `types/<type>.css` in the project of the map, after the theme, while a map of the type is
 *  shown. It reaches the drawing through its hooks: data-view-name, data-el, data-prop, data-value. */
const typeCss = (path?: string) => /^(.*\/)?types\/([^/]+)\.css$/i.exec(path ?? '');
const isStyle = (path: string) => /^([^/]+\/)?theme\.css$/i.test(path) || typeCss(path) !== null;
function typeStyle(file?: IndexedFile) {
  const css = file?.isMap && typeText(file.path, `${file.map.meta.type}.css`);
  if (!css) return document.getElementById('type-style')?.remove();
  const style = folderStyle('type-style');
  if (style.textContent !== css) style.textContent = css;
}

/** The head of a box (`rect.node-head`) within the outline of its box, whatever the style of the type sets: the width
 *  of the stroke of the box and its radius, read once it is drawn, for the clip of the head (style.css). */
function fitHeads(page: HTMLElement) {
  for (const head of page.querySelectorAll<SVGRectElement>('rect.node-head')) {
    const box = head.parentElement!.querySelector('rect:not(.node-head)');
    if (!box) continue;
    const { strokeWidth, rx } = getComputedStyle(box);
    head.style.setProperty('--box-stroke', strokeWidth);
    head.style.setProperty('--box-radius', rx);
  }
}

/** Reads the files (`{ path, text }`) and shows the map of the address, or the first one. `keep` keeps the place in the
 *  page and the view shown, when the same files are read again. */
function load(files: Source[], keep = false) {
  if (!keep) typed = undefined; // a folder read again: the editor shows its files as they are
  $('files-head-actions').hidden = false; // the button of the empty canvas, now discreet in the head of the files
  theme(files.find((f) => isTheme(f.path))?.text);
  const sources = files.filter((f) => !/\.css$/i.test(f.path));
  opened = files; // with the theme, so that drawing a map again keeps it
  // The type definitions, their layouts and their styles: those of the `types/` folder of each project (as for the
  // check: a definition elsewhere in the folder is not read).
  projects = projectsOf(sources.map((s) => s.path));
  definitions = new Map();
  for (const s of sources) {
    const m = /^(.*\/)?types\/([^/]+)\.md$/i.exec(s.path);
    if (m) definitions.set(`${m[1] ?? ''}${m[2]}`, s.text);
  }
  for (const f of files) {
    const m = typeCss(f.path);
    if (m) definitions.set(`${m[1] ?? ''}${m[2]}.css`, f.text); // the style of a type
  }
  index = buildIndex(sources, { hrefOf });
  const maps = [...index.files.values()].filter((f) => f.isMap || f.error).sort((a, b) => a.title.localeCompare(b.title));
  $('maps').innerHTML = listOf(maps);
  for (const id of ['map-head', 'bar-end', 'navigation']) $(id).hidden = !maps.length;
  searchFiles();
  $('editor-edge').hidden = !maps.length;
  if (!maps.length) {
    showEditor(false);
    $('page').innerHTML = '<p class="empty">No map among these files: a map has a "type" in its front matter.</p>';
    return;
  }
  if (maps.length === 1 && !keep && covers($('files'))) showFiles(false); // on a phone, one map: nothing to choose, it is shown
  const wanted = route();
  if (wanted && index.files.has(wanted.name.toLowerCase())) return show(keep);
  location.hash = $('maps').querySelector<HTMLAnchorElement>('a.row')!.getAttribute('href')!; // the first map of the list
}

/** The maps as a list of their folders: in each folder, its sub-folders, then its maps; the folder that was opened is
 *  not a row. */
function listOf(maps: IndexedFile[]) {
  const root: Folder = { folders: new Map(), maps: [] };
  const opened = new Set(maps.map((f) => f.path.split('/')[0]));
  const skip = opened.size === 1 && maps.every((f) => f.path.includes('/')) ? 1 : 0;
  for (const f of maps) {
    let folder = root;
    for (const part of f.path.split('/').slice(skip, -1)) {
      if (!folder.folders.has(part)) folder.folders.set(part, { folders: new Map(), maps: [] });
      folder = folder.folders.get(part)!;
    }
    folder.maps.push(f);
  }
  const rows = (folder: Folder, depth: number): string =>
    [
      ...[...folder.folders]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, sub]) => `<li><details open><summary class="row" style="--depth: ${depth}">${escapeHtml(name)}</summary><ul>${rows(sub, depth + 1)}</ul></details></li>`),
      ...folder.maps.map(
        (f) => `<li><a class="row" style="--depth: ${depth}" href="${hrefOf(f, '')}" data-map="${escapeHtml(f.name)}" title="${escapeHtml(f.path)}"><span class="row-title">${escapeHtml(f.title)}</span>${f.isMap ? `<span class="row-caption">${escapeHtml(f.map.meta.type)}</span>` : ''}</a></li>`,
      ),
    ].join('');
  return `<ul>${rows(root, 0)}</ul>`;
}

/** The search of the files: keeps the maps whose title, type or path has every word typed, and their folders. The first
 *  map kept is marked; the arrows up and down move the mark, Enter opens the map marked. */
const found = () => [...$('maps').querySelectorAll<HTMLAnchorElement>('a.row')].filter((a) => !a.closest('li[hidden]'));
const firstFound = () => found()[0];
function searchFiles() {
  const words = $<HTMLInputElement>('files-search').value.toLowerCase().split(/\s+/).filter(Boolean);
  $('files-search-clear').hidden = !$<HTMLInputElement>('files-search').value;
  for (const a of $('maps').querySelectorAll<HTMLAnchorElement>('a.row')) {
    const text = `${a.textContent} ${a.title}`.toLowerCase();
    a.parentElement!.hidden = !words.every((w) => text.includes(w));
  }
  for (const li of [...$('maps').querySelectorAll<HTMLElement>('li:has(> details)')].reverse()) li.hidden = !li.querySelector('a.row') || ![...li.querySelectorAll<HTMLElement>('li:not(:has(> details))')].some((m) => !m.hidden);
  $('maps').querySelector('.is-next')?.classList.remove('is-next');
  if (words.length) firstFound()?.classList.add('is-next');
}
$<HTMLInputElement>('files-search').addEventListener('input', searchFiles);
// A cross at the end of the field, while it holds text, empties it and keeps it open to type again.
$('files-search-clear').addEventListener('click', (e) => {
  e.preventDefault();
  $<HTMLInputElement>('files-search').value = '';
  searchFiles();
  $<HTMLInputElement>('files-search').focus();
});
/** The search is an icon in the head of the files, as in Obsidian: its field shows under the folder, ready to type;
 *  Escape, or leaving it empty, hides it again. `/` opens it from anywhere but a text field. */
function showSearch(show: boolean) {
  $('files-search-box').hidden = !show;
  $('search-open').setAttribute('aria-expanded', String(show));
  if (show) $<HTMLInputElement>('files-search').focus();
  else if ($<HTMLInputElement>('files-search').value) (($<HTMLInputElement>('files-search').value = ''), searchFiles());
}
$('search-open').addEventListener('click', () => showSearch($('files-search-box').hidden as boolean));
$<HTMLInputElement>('files-search').addEventListener('keydown', (e) => {
  if (e.key === 'Escape') showSearch(false);
  if (e.key === 'Enter') (e.preventDefault(), (($('maps').querySelector('.is-next') ?? ($<HTMLInputElement>('files-search').value && firstFound())) as HTMLElement | undefined)?.click());
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    const rows = found();
    const marked = $('maps').querySelector<HTMLAnchorElement>('.is-next');
    // None marked: before the first one.
    const next = rows[Math.min(rows.length - 1, Math.max(0, rows.indexOf(marked!) + (e.key === 'ArrowDown' ? 1 : -1)))];
    marked?.classList.remove('is-next');
    next?.classList.add('is-next');
    next?.scrollIntoView({ block: 'nearest' });
  }
});
$<HTMLInputElement>('files-search').addEventListener('blur', () => !$<HTMLInputElement>('files-search').value && showSearch(false));
// While searching, one row chosen at a time: the one under the pointer, or the one the arrows went to, as in the
// searches of the panel.
$('maps').addEventListener('pointermove', (e) => {
  const row = (e.target as Element).closest<HTMLAnchorElement>('a.row');
  if (!row || $('files-search-box').hidden || !$<HTMLInputElement>('files-search').value || row.classList.contains('is-next') || !found().includes(row)) return;
  $('maps').querySelector('.is-next')?.classList.remove('is-next');
  row.classList.add('is-next');
});
document.addEventListener('keydown', (e) => {
  if (e.key !== '/' || e.metaKey || e.ctrlKey || (e.target as Element).closest?.('input, textarea, [contenteditable="true"], .cm-editor') || $('files-head-actions').hidden) return;
  e.preventDefault();
  if ($('files').hidden) showFiles(true);
  showSearch(true);
});

let shown = 0; // the latest page asked for: a drawing that comes back later is not shown
let shownName: string | undefined; // the file drawn last: a link to another map opens it at its zoom of opening

async function show(keep = false) {
  const asked = ++shown;
  const aside = document.createElement('div'); // the context and the open questions of the map, for the panel
  shownDefinition = undefined;
  const view = document.querySelector<HTMLElement>('[data-view][aria-selected="true"]')?.dataset.view;
  const wanted = route();
  if (!index || !wanted) return;
  const file = index.files.get(wanted.name.toLowerCase());
  typeStyle(file);
  const page = $('page');
  if (!file) {
    page.innerHTML = `<p class="error">No file "${escapeHtml(wanted.name)}" among the opened files.</p>`;
    return;
  }
  try {
    if (file.error) throw new Error(file.error);
    if (!file.isMap) page.innerHTML = drawPlain(file.text);
    else {
      const type = file.map.meta.type;
      const text = typeText(file.path, type);
      if (!text) throw new Error(`no definition for the type "${type}" in the types/ folder of the maps: ask your AI to copy it from the catalog of the skill.`);
      const definition = parseDefinition(type, text, typeText(file.path, `${type}.layout`));
      const html = await drawMap(file.map, definition, linksOf(index, file.key));
      if (asked !== shown) return;
      page.innerHTML = html;
      fitHeads(page);
      shownDefinition = definition;
      // The canvas holds the title and the drawing: the context and the open questions are in the panel, from the bar
      // (About this map, N open questions), with the links of the whole map.
      for (const section of page.querySelectorAll(':scope > .context, :scope > .open-questions')) aside.append(section);
    }
  } catch (e) {
    page.innerHTML = `<p class="error">${escapeHtml(file.path)}: ${escapeHtml((e as Error).message)}</p>`;
  }
  // The views of the map, as tabs in a bar of their own under the bar, out of the canvas.
  const tabs = page.querySelector('.views');
  $('views-bar').replaceChildren(...(tabs ? [tabs] : []));
  $('views-bar').hidden = !tabs;
  // The bar: the title of the map, its type, its date, and its context and open questions, in the panel.
  shownAside = aside;
  $('map-title').textContent = file.title;
  $('map-type').textContent = file.isMap ? file.map.meta.type : '';
  $('about').hidden = !file.isMap;
  const questions = aside.querySelectorAll('.open-questions > ul > li').length;
  $('questions').hidden = !questions;
  $('questions').textContent = `${questions} open question${questions === 1 ? '' : 's'}`;
  // What is still wrong in the map, checked each time it is drawn: as it is edited.
  shownIssues = file.isMap && shownDefinition ? issuesOf(file, shownDefinition) : [];
  const errors = shownIssues.filter((i) => i.level === 'error').length;
  $('issues').hidden = !shownIssues.length;
  $('issues').textContent = issuesTitle();
  $('issues').classList.toggle('bar-pill--error', errors > 0);
  fitBar();
  toEditor(file);
  if (detailsOpen()) panelShown(); // the same content, drawn again, or the panel closes
  $('maps').querySelectorAll<HTMLElement>('[data-map]').forEach((row) => (row.dataset.map === file.name ? row.setAttribute('aria-current', 'page') : row.removeAttribute('aria-current')));
  document.title = `${file.title} · maps.md`;
  const target = wanted.anchor && targetOf(wanted.anchor);
  if (keep) document.querySelector<HTMLElement>(`[data-view="${view}"]`)?.click(); // the canvas stays where it was
  else if (target) {
    // A link followed selects what it reaches, as a click on the map: the panel shows it. Another
    // map opens at its zoom of opening first, with the panel open.
    const reached = pointedAt(target);
    if (reached) reached.show();
    else target.classList.add('target');
    if (file.name !== shownName) home();
    center(target);
  } else home();
  shownName = file.name;
}

/** What a link reaches on the canvas: the item drawn where its path is written, the last one shown on screen, or its
 *  nearest parent drawn, or else its element. */
function targetOf(anchor: string) {
  const [id, ...lines] = anchor.split('/');
  for (const line of lines.reverse()) {
    const drawn = [...$('page').querySelectorAll(`[data-src^="${line}:"]`)].find((el) => el.getClientRects().length);
    if (drawn) return drawn;
  }
  return document.getElementById(id);
}

// A tab shows its view of the map and hides the others; chosen by the person, from the start (a click of the page
// itself, to keep the place, does not move it).
$('views-bar').addEventListener('click', (e) => {
  const tab = (e.target as Element).closest<HTMLElement>('[data-view]');
  if (!tab) return;
  document.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-selected', String(b === tab)));
  document.querySelectorAll<HTMLElement>('[data-view-panel]').forEach((panel) => (panel.hidden = panel.dataset.viewPanel !== tab.dataset.view));
  if (e.isTrusted) setTimeout(home);
});

$('folder').addEventListener('change', (e) => open((e.target as HTMLInputElement).files!));
if (window.showDirectoryPicker && !location.protocol.startsWith('http'))
  for (const button of document.querySelectorAll('[data-open="folder"]')) button.addEventListener('click', (e) => (e.preventDefault(), openWritable()));
setTimeout(home); // after the first pan of Panzoom, to its start (0, 0), which it makes in a timeout: the empty canvas stayed under the files and the bar

/** A panel at a side of the canvas (the files on the left, the editor on the right). Its edge is dragged to widen or
 *  narrow it; dragged on past its narrowest, it closes, as in the Claude app. Closed, its edge stays at the side of the
 *  window: the same gesture opens it again. Gives the function that opens or closes it. */
function panel(box: HTMLElement, edge: HTMLElement, side: 'left' | 'right', button?: HTMLElement, onShow: (open: boolean) => void = () => {}) {
  const showPanel = (open: boolean) => {
    if (open === !box.hidden) return;
    button?.setAttribute('aria-expanded', String(open));
    box.hidden = !open;
    onShow(open);
  };
  button?.addEventListener('click', () => showPanel(box.hidden as boolean));
  edge.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const around = box.parentElement!.getBoundingClientRect();
    const min = parseFloat(getComputedStyle(box).minWidth);
    edge.setPointerCapture(e.pointerId);
    edge.classList.add('dragged');
    box.classList.add('is-dragged');
    const end = () => {
      edge.classList.remove('dragged');
      box.classList.remove('is-dragged');
      edge.removeEventListener('pointermove', move);
      edge.removeEventListener('pointerup', end);
    };
    const move = (m: PointerEvent) => {
      const width = side === 'left' ? m.clientX - around.left : around.right - m.clientX;
      showPanel(width >= min / 2);
      if (width >= min / 2) box.style.setProperty('--panel-width', `${Math.max(min, width)}px`); // a variable: the width itself slides
    };
    edge.addEventListener('pointermove', move);
    edge.addEventListener('pointerup', end);
  });
  return showPanel;
}
// The files: their button is in their head when they are open, in the bar when they are closed.
const showFiles = panel($('files'), $('files-edge'), 'left');
for (const close of ['files-close', 'files-x']) $(close).addEventListener('click', () => showFiles(false)); // the cross at the top right, on a phone
$('files-open').addEventListener('click', () => showFiles(true));
$('maps').addEventListener('click', (e) => covers($('files')) && (e.target as Element).closest('a.row') && showFiles(false)); // on a phone, a map chosen is shown

// The panel on the right, under the bar, in one of two modes: the Markdown of the map, from the button "Edit" at the
// end of the bar (pressed while it shows; it keeps its place, as the panel opens under it); or the details of what was
// clicked (the context, the open questions, an element or a value, with the sources of its facts as links), from which "Edit"
// goes to its line in the Markdown. A cross at the end of its head closes it.
const showEditor = panel($('editor'), $('editor-edge'), 'right', undefined, (open) => {
  if (!open) unselect();
  pressed();
});
const markdownOpen = () => !$('editor').hidden && $('editor').dataset.mode === 'markdown';
const detailsOpen = () => !$('editor').hidden && $('editor').dataset.mode === 'details';
/** The buttons of the bar show what the panel shows. */
function pressed() {
  $('editor-open').setAttribute('aria-pressed', String(markdownOpen()));
  $('editor-open').dataset.tip = editTip();
  $('about').setAttribute('aria-pressed', String(detailsOpen() && lastDraw === aboutDetails));
  $('questions').setAttribute('aria-pressed', String(detailsOpen() && lastDraw === questionsDetails));
  $('issues').setAttribute('aria-pressed', String(detailsOpen() && lastDraw === issuesDetails));
}
function setMode(mode: 'markdown' | 'details') {
  $('editor').dataset.mode = mode;
  $('editor').setAttribute('aria-label', mode === 'markdown' ? 'Markdown' : 'Details');
  if (mode === 'markdown') unselect();
  showEditor(true);
  pressed();
}
/** The Markdown, at the line of what the panel showed; from the details, with a button back to them. */
let backTo: Details | undefined;
function toMarkdown() {
  const line = detailsOpen() ? panelLine : undefined;
  backTo = detailsOpen() ? lastDraw : undefined;
  $('panel-back').hidden = !backTo;
  setMode('markdown');
  if (line !== undefined) editor.goTo(line);
}
$('editor-close').addEventListener('click', () => showEditor(false));

/** On a phone, a swipe closes a panel that covers the canvas, as a drawer: the files to the left,
 *  the details to the right; not the Markdown, where a drag selects text. The cross stays: a swipe is not seen.
 *  Touch events, not pointers: a pointer is cancelled once the panel scrolls. Over a quarter of the panel, sideways. */
function swipe(box: HTMLElement, way: -1 | 1, close: () => void, when = () => true) {
  let from: Touch | undefined;
  box.addEventListener('touchstart', (e) => (from = e.touches.length === 1 && covers(box) && when() ? e.touches[0] : undefined), { passive: true });
  box.addEventListener(
    'touchend',
    (e) => {
      if (!from) return;
      const to = e.changedTouches[0];
      const dx = (to.clientX - from.clientX) * way;
      const dy = Math.abs(to.clientY - from.clientY);
      from = undefined;
      if (dx > box.offsetWidth / 4 && dx > 2 * dy) close();
    },
    { passive: true },
  );
}
swipe($('files'), -1, () => showFiles(false));
swipe($('editor'), 1, () => showEditor(false), detailsOpen);
$('editor-open').addEventListener('click', () => (markdownOpen() ? showEditor(false) : toMarkdown()));

// Shortcuts for the panels (as in VS Code): ⌘B / Ctrl+B for the files on the left; ⌘⌥B / Ctrl+Alt+B
// for the panel on the right, which closes whatever it shows, or opens the Markdown. They work while typing too.
// The map alone, as in Figma: @ (unless the text is being typed) or ⌘\ on an English keyboard hides
// the files, the bars and the panel; the same keys or Escape show them again. At once, both ways: the panels do not
// slide as drawers then (`no-slide`, for the frames that show them again).
document.addEventListener('keydown', (e) => {
  const hidden = document.body.classList.contains('ui-hidden');
  const typing = (e.target as HTMLElement).isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement).tagName);
  const toggle = (e.key === '@' && !e.metaKey && !e.ctrlKey && !typing) || ((e.metaKey || e.ctrlKey) && e.code === 'Backslash');
  if (!toggle && !(hidden && e.key === 'Escape')) return;
  document.body.classList.add('no-slide');
  document.body.classList.toggle('ui-hidden', !hidden);
  requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.remove('no-slide')));
  e.preventDefault();
  e.stopImmediatePropagation();
}, true);
document.addEventListener('keydown', (e) => {
  if (!(e.metaKey || e.ctrlKey) || e.shiftKey || e.code !== 'KeyB') return;
  if (!e.altKey) showFiles($('files').hidden as boolean);
  else if (!$('bar-end').hidden) $('editor').hidden ? toMarkdown() : showEditor(false);
  else return;
  e.preventDefault();
});
$('panel-back').addEventListener('click', () => showDetails(backTo!));

let lastDraw: Details | undefined; // what gives the content of the panel, called again when the map is drawn again
let panelLine: number | undefined; // where it is written
const panelShown = () => showDetails(lastDraw!);
const unselect = () => {
  document.querySelectorAll('.is-selected').forEach((el) => el.classList.remove('is-selected'));
  focusLinks();
  ask();
};
/** The open questions, in the panel, bring out on the map what they are about, the rest faded, so that a person sees
 *  where to look; a question under the pointer, only what it is about. */
let askedNow: Element[][] = [];
function ask(asked: Element[][] = [], only?: number) {
  document.querySelectorAll('#page .is-asked').forEach((el) => el.classList.remove('is-asked'));
  const shown = only === undefined ? asked.flat() : asked[only] ?? [];
  $('page').classList.toggle('has-asked', shown.length > 0);
  for (const el of shown) el.classList.add('is-asked');
}
$('details-body').addEventListener('mouseover', (e) => {
  const li = (e.target as Element).closest('.details-questions > ul > li');
  if (!askedNow.length || !li) return;
  ask(askedNow, [...li.parentElement!.children].indexOf(li));
});
$('details-body').addEventListener('mouseleave', () => askedNow.length && ask(askedNow));
/** Shows in the panel what `draw` gives, `{ kicker, title, html, line, selected }` (kicker and title as HTML); closes it
 *  when there is nothing to show. */
function showDetails(draw: Details) {
  const shown = draw();
  if (!shown) return detailsOpen() && showEditor(false);
  const scroll = draw === lastDraw && detailsOpen() ? $('details-body').scrollTop : 0;
  lastDraw = draw;
  panelLine = shown.line;
  $('details-body').innerHTML = `<p class="details-kicker">${shown.kicker}</p><h2 class="details-title">${shown.title}</h2>${shown.html}`;
  unselect();
  for (const el of shown.selected ?? []) el.classList.add('is-selected');
  focusLinks(shown.selected);
  askedNow = shown.asked ?? [];
  ask(askedNow);
  setMode('details');
  $('details-body').scrollTop = scroll;
}

/** In a graph, the element chosen is in focus: its arrows, in and out, and the elements at their other end stand out;
 *  the rest fades. In a sequence with arrows between its values, the value chosen and its chain stand out: the values
 *  it leads to, and those that lead to it, arrow after arrow. In lifelines, a message and its two participants, or a
 *  participant, its messages and the participants at their other end. */
function focusLinks(selected?: Iterable<Drawn>) {
  document.querySelectorAll('#page .has-focus').forEach((svg) => svg.classList.remove('has-focus'));
  document.querySelectorAll('#page .is-linked').forEach((el) => el.classList.remove('is-linked'));
  document.querySelectorAll('#page .has-column').forEach((grid) => grid.classList.remove('has-column'));
  for (const head of selected ?? []) {
    const grid = head.matches?.('th[scope="col"][data-prop]') && head.closest('.grid--rows');
    if (!grid) continue;
    grid.classList.add('has-column');
    grid.querySelectorAll(`td[data-prop="${CSS.escape(head.dataset.prop!)}"]`).forEach((td) => td.classList.add('is-linked'));
  }
  for (const grid of document.querySelectorAll<HTMLElement>('#page .has-chain')) {
    grid.classList.remove('has-chain');
    grid.querySelectorAll('.in-chain').forEach((li) => li.classList.remove('in-chain'));
    drawArrows(grid);
  }
  for (const li of selected ?? []) {
    const grid = li.matches?.('li[data-v]') && li.closest<HTMLElement>('.grid--arrows');
    if (!grid) continue;
    const pairs = [...grid.querySelectorAll<HTMLElement>('li[data-to]')].map((l) => [l.dataset.v, l.dataset.to]);
    const chain = new Set([li.dataset.v]);
    for (const [at, next] of [[0, 1], [1, 0]]) {
      const todo = [li.dataset.v];
      while (todo.length) {
        const key = todo.pop();
        for (const pair of pairs) if (pair[at] === key && !chain.has(pair[next])) (chain.add(pair[next]), todo.push(pair[next]));
      }
    }
    if (chain.size < 2) continue;
    grid.classList.add('has-chain');
    for (const key of chain) grid.querySelectorAll(`li[data-v="${CSS.escape(key!)}"]`).forEach((l) => l.classList.add('in-chain'));
    drawArrows(grid);
  }
  for (const el of selected ?? []) {
    const svg = el.matches?.('g.lifeline-arrow, g[data-participant]') && el.closest('svg');
    if (!svg) continue;
    svg.classList.add('has-focus');
    const key = el.dataset.participant;
    const messages = key ? svg.querySelectorAll<SVGElement>(`.lifeline-arrow[data-from="${key}"], .lifeline-arrow[data-to="${key}"]`) : [el];
    for (const m of messages) {
      m.classList.add('is-linked');
      for (const p of [m.dataset.from, m.dataset.to]) svg.querySelectorAll(`[data-participant="${p}"]`).forEach((n) => n.classList.add('is-linked'));
    }
  }
  for (const node of selected ?? []) {
    const svg = node.matches?.('g.node[data-node]') && node.closest('svg');
    if (!svg) continue;
    svg.classList.add('has-focus');
    const id = node.dataset.node;
    for (const edge of svg.querySelectorAll<SVGElement>(`.edge[data-from="${id}"], .edge[data-to="${id}"]`)) {
      edge.classList.add('is-linked');
      const other = edge.dataset.from === id ? edge.dataset.to : edge.dataset.from;
      svg.querySelector(`.node[data-node="${other}"]`)?.classList.add('is-linked');
    }
  }
}

function shownFile() {
  const name = route()?.name;
  const file = (name && index?.files.get(name.toLowerCase())) as IndexedFile | undefined; // no name: none
  return file?.isMap ? file : undefined;
}
const lineOf = (el?: Drawn | null) => (el?.dataset.src ? Number(el.dataset.src.split(':')[0]) : undefined);
const quoteOr = (link: (text: string) => string, t: string) => (/^["“«]/.test(t) ? `<blockquote>${link(t)}</blockquote>` : `<p>${link(t)}</p>`);
/** The spec of a property, or of a detail of a value, from its label: ` class="details-enum"` for a value in a list
 *  (an enum), drawn as a chip in the panel. */
const specOf = (label: string, specs = shownDefinition?.properties) => specs?.find((s) => nameKey(s.name) === nameKey(label)) ?? specs?.find((s) => s.name === '*');
const enumClass = (spec?: PropertySpec) => (spec?.kind === 'enum' ? ' class="details-enum"' : '');
/** A part of the details, under its title; `name`, a hook for what edits it (the arrows: `to`, `from`). */
const part = (title: string, html?: string | 0 | false, name?: string) => (html ? `<section class="details-part"${name ? ` data-part="${name}"` : ''}><h3>${escapeHtml(title)}</h3>${html}</section>` : '');
/** A link to another element, in this map or another one, as a card: the map above, the element, its property. */
const linkCard = (name: string, { map, property }: { map?: string; property?: string | null } = {}) =>
  `${map ? `<span class="details-link-map">${escapeHtml(map)}</span>` : ''}<span class="details-link-name" title="${escapeHtml(name)}">${escapeHtml(name)}</span>${property ? `<span class="details-link-prop">${escapeHtml(property)}</span>` : ''}`;
const citedHtml = (items: ReturnType<typeof linksData>['cited']) =>
  items.length ? `<ul class="details-links">${items.map((c) => `<li><a class="details-link" href="${escapeHtml(c.href)}">${linkCard(c.element, c)}</a></li>`).join('')}</ul>` : '';
/** The maps that cite this one, each once, with how many times (About this map is about the map;
 *  what cites an element is in its own panel). */
const citingMapsHtml = (items: ReturnType<typeof linksData>['cited']) => {
  const maps = new Map<string, { title: string; n: number }>();
  for (const c of items) maps.set(c.mapHref, { title: c.map, n: (maps.get(c.mapHref)?.n ?? 0) + 1 });
  return maps.size ? `<ul class="details-links">${[...maps].map(([href, m]) => `<li><a class="details-link" href="${escapeHtml(href)}">${linkCard(m.title, { property: `${m.n} link${m.n === 1 ? '' : 's'}` })}</a></li>`).join('')}</ul>` : '';
};
const brokenHtml = (items: ReturnType<typeof linksData>['broken'], where: boolean) =>
  items.length ? `<ul>${items.map((b) => `<li>${where ? `${escapeHtml(b.where)}: ` : ''}<code>${escapeHtml(b.link)}</code>, ${escapeHtml(b.problem!)}</li>`).join('')}</ul>` : '';

/** The context of the map, its properties (its front matter) and its links with other maps. */
function aboutDetails(): Shown | undefined {
  const file = shownFile();
  if (!file) return;
  const context = shownAside?.querySelector<HTMLElement>('.context');
  // Its type, its title and the date it was updated are said at the top of the panel, not again under Properties;
  // the bar says only its title and its type.
  const { type, updated } = file.map.meta;
  const properties = Object.entries(file.map.meta)
    .filter(([key]) => !['type', 'title', 'updated'].includes(key))
    .map(([key, value]) => `<div><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value!)}</dd></div>`);
  const data = linksData(file.map, linksOf(index!, file.key));
  return {
    line: lineOf(context) ?? 0,
    kicker: `About this map${type ? ` <span class="map-type">${escapeHtml(type)}</span>` : ''}`,
    title: escapeHtml(file.title),
    html:
      (updated ? `<p class="details-updated">Updated ${escapeHtml(updated)}</p>` : '') +
      (context ? `<div class="details-text">${context.innerHTML}</div>` : '<p class="details-empty">No context yet: write it under "## Context", in the Markdown.</p>') +
      part('Properties', properties.length && `<dl class="details-pairs">${properties.join('')}</dl>`, 'properties') +
      part('Cited in other maps', citingMapsHtml(data.cited)) +
      part('Broken links', brokenHtml(data.broken, true)),
  };
}

/** The open questions of the map, then the decisions taken. */
function questionsDetails(): Shown | undefined {
  const file = shownFile();
  const questions = shownAside?.querySelector<HTMLElement>('.open-questions');
  if (!file || !questions) return;
  const open = [...questions.querySelectorAll<HTMLElement>(':scope > ul > li')];
  const n = open.length;
  const copy = questions.cloneNode(true) as HTMLElement;
  // What each open question is about: the elements and values of this map it links to, as drawn.
  const here = `#/${encodeURIComponent(file.name)}/`;
  const asked = open.map((li) =>
    [...li.querySelectorAll<HTMLAnchorElement>(':scope > a[href], :scope > :not(ul) a[href]')]
      .map((a) => a.getAttribute('href')!)
      .filter((href) => href.startsWith(here))
      .flatMap((href) => {
        const target = targetOf(href.slice(here.length));
        if (!target) return [];
        if (target.matches('tbody th[data-el]')) return [target.parentElement!]; // an element drawn as a row: all its row
        if (target.matches('thead th[data-el]')) return [target, ...columnOf(target as HTMLElement)]; // as a column: all its column
        return pointedAt(target)?.drawn ?? [target];
      }),
  );
  return {
    asked,
    line: lineOf(questions),
    kicker: escapeHtml(file.title),
    title: `${n} open question${n === 1 ? '' : 's'}`,
    html: `<div class="details-text details-questions">${copy.innerHTML}</div>`,
  };
}

/** What the check finds wrong in a map, as the check reports it for a folder (checks.ts): the errors first, then the
 *  warnings, with its links that lead nowhere. */
function issuesOf(file: IndexedMap, definition: Definition): Issue[] {
  const missing = new Set<string>();
  const issues = checkMap(file, definition, missing);
  for (const link of linksOf(index!, file.key).broken) {
    const where = brokenLinkWhere(link, missing);
    if (where) issues.push({ level: 'warning', where, message: `a link leads nowhere: ${link.problem}`, at: link.from.element });
  }
  return [...issues.filter((i) => i.level === 'error'), ...issues.filter((i) => i.level !== 'error')];
}
/** "2 to fix" when the map has errors, "1 to check" when it has only warnings, which are for the person to judge. */
const issuesTitle = () => `${shownIssues.length} to ${shownIssues.some((i) => i.level === 'error') ? 'fix' : 'check'}`;

/** What is still wrong in the map, in the words of its type: each issue with where it is (the element, the property)
 *  as a card that opens its element. */
function issuesDetails(): Shown | undefined {
  const file = shownFile();
  if (!file || !shownIssues.length) return;
  const items = shownIssues.map((issue) => {
    const text = `<span class="details-link-name">${escapeHtml(issue.where)}</span><span class="details-issue${issue.level === 'error' ? ' details-issue--error' : ''}">${escapeHtml(issue.message)}</span>`;
    const opens = issue.at && !RESERVED.includes(issue.at.toLowerCase());
    return `<li>${opens ? `<button class="details-link" data-details-el="${anchorOf(issue.at!)}">${text}</button>` : `<span class="details-link details-link--none">${text}</span>`}</li>`;
  });
  return { kicker: escapeHtml(file.title), title: issuesTitle(), html: `<ul class="details-links details-issues">${items.join('')}</ul>` };
}

/** The items under an item, as a list, with their links. */
const sub = (item: Item, linkify: (text: string) => string) => (item.children.length ? `<ul>${item.children.map((c) => `<li>${linkify(c.text)}</li>`).join('')}</ul>` : '');

/** The open questions of the map about an element or a value (`about` tells if a resolved link reaches it), each with
 *  its assumption, for its panel. */
function questionsHtml(file: IndexedMap, about: (reached: ElementLink) => boolean) {
  const { questions, linkify } = linksOf(index!, file.key); // its links between parentheses as small marks
  const mine = questions.filter((q) => q.targets.some(about));
  return part('Open questions', mine.length && `<ul class="details-questions">${mine.map((q) => `<li>${linkify(q.item.text)}${sub(q.item, linkify)}</li>`).join('')}</ul>`);
}

/** A value without the arrow that ends it, to another value of the map (`→ [[#Phase#Value]]`): drawn on the map and
 *  said under its own Leads to. A link to another map (`→ [[sitemap#Home]]`, a screen) stays. */
const bare = (text: string) => text.replace(/\s*(?:→|->)\s*\[\[#[^\]]*\]\]\s*$/, '');

/** An element: all its properties, also those its view does not show, then its arrows, its children, the maps that
 *  cite it and its broken links. A value with details shows how many, and them on a click. */
const elementDetails = (anchor: string) => (): Shown | undefined => {
  const file = shownFile();
  // In a tree, an element may be under others: its path is kept, the elements above it.
  const all = (list: MapElement[], path: MapElement[]): { el: MapElement; path: MapElement[] }[] => list.flatMap((el) => [{ el, path }, ...all(el.children, [...path, el])]);
  const found = file && all(elementsOf(file.map, shownDefinition?.shape), []).find(({ el }) => anchorOf(el.name) === anchor);
  if (!found) return;
  const { el: element, path } = found;
  const { links: linkify } = linksOf(index!, file.key);
  // A value that leads to another (a service blueprint): its text alone; its arrow is on the map and in its panel.
  const value = (v: Item) =>
    v.children.length && v.src
      ? `<li class="details-more" data-details-line="${v.src.line}">${linkify(bare(v.text))}<span class="details-open" title="${v.children.length} detail${v.children.length === 1 ? '' : 's'}">›</span></li>`
      : `<li${valueOf(v.text)}${tintOf(v)}>${linkify(bare(v.text))}</li>`;
  // The color the layout gives a value of an enum (`- Color:`), as on the drawing.
  let colors: Record<string, string> | undefined;
  const tintOf = (v: Item) => (chipOf(colors, v.text) ? ` class="${chipOf(colors, v.text)}"` : '');
  const values = (p: Property) => {
    colors = specOf(p.label)?.kind === 'enum' ? shownDefinition?.layout?.color : undefined;
    return p.isUndefined
      ? `<p class="details-empty">Not said</p>`
      : p.values.length === 1 && !p.values[0].children.length
        ? quoteOr(linkify, bare(p.values[0].text)).replace(/^<(p|blockquote)>/, `<$1${valueOf(p.values[0].text)}${tintOf(p.values[0])}>`)
        : `<ul>${p.values.map(value).join('')}</ul>`;
  };
  const rows = [...element.properties.values()].map((p) => `<div${propOf(p.label)}${enumClass(specOf(p.label))}><dt>${escapeHtml(p.label)}</dt><dd>${values(p)}</dd></div>`);
  // An arrow: the element at its other end, as a card that opens it here when it is in this map, then its label.
  // The element first, then the label of the arrow.
  const arrowHtml = (label: string, name: string, file?: string) => {
    const tag = label ? `<span class="details-arrow-label">${escapeHtml(label)}</span>` : '';
    const known = name && name !== 'undefined' && !file;
    const card = known
      ? `<button class="details-link" data-details-el="${anchorOf(name)}">${linkCard(name)}${tag}</button>`
      : `<span class="details-link details-link--none">${linkCard(file ? `${file} › ${name}` : 'Not known')}${tag}</span>`;
    return `<li${valueOf(label)}>${card}</li>`;
  };
  const arrows = element.arrows.map((a) => arrowHtml(a.label, a.target, a.file)).join('');
  // The arrows that come to it, from the other elements of the map.
  const arrowsIn = elementsOf(file.map, shownDefinition?.shape)
    .flatMap((from) => from.arrows.filter((a) => !a.file && nameKey(a.target) === nameKey(element.name)).map((a) => arrowHtml(a.label, from.name)))
    .join('');
  const children = element.children.map((c) => `<li><button class="details-link" data-details-el="${anchorOf(c.name)}">${linkCard(c.name)}</button></li>`).join('');
  const up = path.map((p) => `<button class="details-up" data-details-el="${anchorOf(p.name)}" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</button>`).join(' › ');
  const data = linksData(file.map, linksOf(index!, file.key));
  const noun = shownDefinition?.element ?? shownDefinition?.type ?? '';
  return {
    line: element.src?.line,
    selected: [...document.querySelectorAll<Drawn>(`#page [data-el="${CSS.escape(anchor)}"]`)].flatMap((el) => [el, ...columnOf(el)]) as Drawn[],
    kicker: escapeHtml(noun.charAt(0).toUpperCase() + noun.slice(1)) + (up ? ` · ${up}` : ''),
    title: escapeHtml(element.name),
    html:
      (rows.length ? `<dl class="details-props">${rows.join('')}</dl>` : '<p class="details-empty">No property yet.</p>') +
      part('Reached from', arrowsIn && `<ul class="details-links">${arrowsIn}</ul>`, 'from') +
      part('Leads to', arrows && `<ul class="details-links">${arrows}</ul>`, 'to') +
      part('Children', children && `<ul class="details-links">${children}</ul>`) +
      part('Cited in other maps', citedHtml(data.cited.filter((c) => c.at === anchor))) +
      part('Broken links', brokenHtml(data.broken.filter((b) => b.at === anchor), false)) +
      questionsHtml(file, (r) => nameKey(r.path.at(-1)!) === nameKey(element.name)),
  };
};

/** A property drawn as a column (the CTO of a RACI): the value of each element in it, as in the column, each element a
 *  card that opens it. */
const columnDetails = (key: string) => (): Shown | undefined => {
  const file = shownFile();
  const head = document.querySelector<HTMLElement>(`#page .view:not([hidden]) th[scope="col"][data-prop="${CSS.escape(key)}"]`);
  if (!file || !head) return;
  const { links: linkify } = linksOf(index!, file.key);
  // The name of the column: the text of its header before the button of its filter, if it has one.
  const name = head.firstChild?.textContent ?? '';
  const spec = specOf(name);
  const items = elementsOf(file.map, shownDefinition?.shape).flatMap((el) => {
    const p = [...el.properties.values()].find((q) => nameKey(q.label) === key);
    if (!p || p.isUndefined || !p.values.length) return [];
    const tags = p.values.map((v) => `<span class="details-arrow-label"${valueOf(v.text)}>${linkify(v.text)}</span>`).join('');
    return [`<li><button class="details-link" data-details-el="${anchorOf(el.name)}">${linkCard(el.name)}${tags}</button></li>`];
  });
  const noun = shownDefinition?.element ?? 'element';
  return {
    selected: [head],
    kicker: escapeHtml(spec && spec.name !== '*' ? 'Property' : 'Column'),
    title: escapeHtml(name),
    html: part(pluralOf(noun.charAt(0).toUpperCase() + noun.slice(1)), items.length && `<ul class="details-links${spec?.kind === 'enum' ? ' details-enum' : ''}">${items.join('')}</ul>`) || '<p class="details-empty">No value in this column.</p>',
  };
};

/** A participant of lifelines (a service, a person): its messages, in order, each with the participant at its other
 *  end. Not an element of the map: a value of the messages, so nothing to show in the Markdown. */
const participantDetails = (key: string) => (): Shown | undefined => {
  const file = shownFile();
  const box = document.querySelector<SVGElement>(`#page .view:not([hidden]) g[data-participant="${CSS.escape(key)}"]`);
  if (!file || !box) return;
  const svg = box.closest('svg')!;
  const nameOf = (k?: string) => svg.querySelector(`g[data-participant="${CSS.escape(k!)}"]`)?.textContent ?? '?';
  const elements = elementsOf(file.map, shownDefinition?.shape);
  const messages = [...svg.querySelectorAll<SVGElement>(`.lifeline-arrow[data-from="${CSS.escape(key)}"], .lifeline-arrow[data-to="${CSS.escape(key)}"]`)].map((m) => {
    const name = elements.find((el) => anchorOf(el.name) === m.dataset.el)?.name ?? m.textContent;
    const other = m.dataset.from === m.dataset.to ? 'itself' : m.dataset.from === key ? `→ ${nameOf(m.dataset.to)}` : `← ${nameOf(m.dataset.from)}`;
    return `<li><button class="details-link" data-details-el="${m.dataset.el}">${linkCard(name)}<span class="details-arrow-label">${escapeHtml(other)}</span></button></li>`;
  });
  return {
    selected: svg.querySelectorAll<SVGElement>(`g[data-participant="${CSS.escape(key)}"]`),
    kicker: 'Participant',
    title: escapeHtml(box.textContent),
    html: part('Messages', messages.length && `<ul class="details-links">${messages.join('')}</ul>`),
  };
};

/** A value (a pain point, an action…): what it is, in which element, then the items written under it. */
function valueAt(file: IndexedMap, line: number) {
  const find = (values: Item[]): Item | undefined => {
    for (const v of values) {
      if (v.src?.line === line) return v;
      const child = find(v.children ?? []);
      if (child) return child;
    }
  };
  for (const element of elementsOf(file.map, shownDefinition?.shape))
    for (const property of element.properties.values()) {
      const value = find(property.values);
      if (value) return { element, property, value };
    }
}
const valueDetails = (line: number) => (): Shown | undefined => {
  const file = shownFile();
  const found = file && valueAt(file, line);
  if (!found) return;
  const { links: linkify } = linksOf(index!, file.key);
  const { element, property, value } = found;
  const rows = value.children.map((item) => {
    const p = readProperty(item);
    return p ? `<div${propOf(p.label)}${enumClass(specOf(p.label, specOf(property.label)?.details))}><dt>${escapeHtml(p.label)}</dt><dd${valueOf(p.value)}>${quoteOr(linkify, p.value)}${sub(item, linkify)}</dd></div>` : `<div><dd>${quoteOr(linkify, item.text)}${sub(item, linkify)}</dd></div>`;
  });
  // In a sequence with arrows between its values: the values that lead to this one, and those it leads to, as cards.
  const li = document.querySelector<HTMLElement>(`#page .view:not([hidden]) li[data-src^="${line}:"][data-v]`);
  const grid = li?.closest('.grid--arrows');
  const cardOf = (l: HTMLElement) => `<li><button class="details-link" data-details-line="${lineOf(l)}">${linkCard(l.textContent.trim(), { property: l.closest('tr')?.querySelector('th[scope="row"]')?.lastChild?.textContent })}</button></li>`;
  const cards = (list: HTMLElement[]) => list.length && `<ul class="details-links">${list.map(cardOf).join('')}</ul>`;
  const from = grid ? [...grid.querySelectorAll<HTMLElement>(`li[data-to="${CSS.escape(li!.dataset.v!)}"]`)] : [];
  const to = grid && li!.dataset.to ? [...grid.querySelectorAll<HTMLElement>(`li[data-v="${CSS.escape(li!.dataset.to)}"]`)] : [];
  const links = part('Reached from', cards(from), 'from') + part('Leads to', cards(to), 'to') + previewOf(value.text, file) + questionsHtml(file, (r) => r.lines.at(-1) === line);
  return {
    line,
    selected: document.querySelectorAll<HTMLElement>(`#page li[data-src^="${line}:"]`),
    kicker: `${escapeHtml(property.label)} · <button class="details-up" data-details-el="${anchorOf(element.name)}" title="${escapeHtml(element.name)}">${escapeHtml(element.name)}</button>`,
    // The arrow of the value is in Leads to, as in a graph: the title is the value alone.
    title: linkify(li?.dataset.to ? bare(value.text) : value.text),
    // No details: nothing more (the panel is not where the Markdown is taught).
    html: (rows.length ? `<dl class="details-props"${propOf(property.label)}>${rows.join('')}</dl>` : '') + links,
  };
};

/** A value that is a link alone (`[[insights#Cannot tell who is available]]`): what it reaches, shown under it, so that
 *  it can be read without leaving the map: the items written under the element or the item reached, as in its own
 *  panel. Generic: any link to an element or an item, whatever its type. */
function previewOf(text: string, file: IndexedMap) {
  const raw = /^\s*(\[\[[^\]]+\]\])\s*$/.exec(text)?.[1];
  // A link to an element or an item, checked on the next line; none without a link.
  const r = (raw && linksOf(index!, file.key).resolve(raw)) as ElementLink | undefined;
  if (!r?.element) return '';
  const find = (items: Item[], line?: number): Item | undefined => {
    for (const item of items) {
      if (item.src!.line === line) return item;
      const found = find(item.children, line);
      if (found) return found;
    }
  };
  const items = r.lines.length ? find(r.element.items, r.lines.at(-1))?.children ?? [] : r.element.items;
  const { links: linkify } = linksOf(index!, r.file.key);
  const list = (children: Item[]): string => (children.length ? `<ul>${children.map((c) => `<li>${linkify(c.text)}${list(c.children)}</li>`).join('')}</ul>` : '');
  const rows = items.map((item) => {
    const p = readProperty(item);
    return p ? `<div${propOf(p.label)}><dt>${escapeHtml(p.label)}</dt><dd>${p.value ? quoteOr(linkify, p.value) : ''}${list(p.children)}</dd></div>` : `<div><dd>${quoteOr(linkify, item.text)}${list(item.children)}</dd></div>`;
  });
  return part(r.file.title, rows.length ? `<dl class="details-props">${rows.join('')}</dl>` : '<p class="details-empty">Nothing written under it.</p>');
}

$('about').addEventListener('click', () => (detailsOpen() && lastDraw === aboutDetails ? showEditor(false) : showDetails(aboutDetails)));
$('questions').addEventListener('click', () => (detailsOpen() && lastDraw === questionsDetails ? showEditor(false) : showDetails(questionsDetails)));
$('issues').addEventListener('click', () => (detailsOpen() && lastDraw === issuesDetails ? showEditor(false) : showDetails(issuesDetails)));
/** The filters of a view of cards or of a table: a button of the bar, or a value of a card or a row
 *  that has one, presses it; the cards without a value pressed of each enum fade, so that the drawing does not move;
 *  the rows of a table are hidden, the table keeping its columns, and how many are shown is said; Clear all releases them. */
canvas.addEventListener('click', (e) => {
  const target = e.target as Element;
  const view = target.closest('.view');
  if (!view || markdownOpen()) return;
  const value = target.closest<HTMLElement>(':is(.card, .grid--rows td) li[data-value]');
  const prop = value?.closest<HTMLElement>('[data-prop]')?.dataset.prop;
  const opener = target.closest<HTMLElement>('.column-filter');
  if (opener || target.closest('.column-filter-menu')) e.stopImmediatePropagation();
  if (opener) return openColumnFilter(opener.getAttribute('aria-expanded') === 'true' ? null : opener);
  if (target.closest('.filters-clear')) {
    e.stopImmediatePropagation();
    view.querySelectorAll('.filter').forEach((b) => b.setAttribute('aria-pressed', 'false'));
    return filter(view);
  }
  const button =
    target.closest<HTMLElement>('.filter') ??
    (value && prop ? view.querySelector<HTMLElement>(`.filter[data-filter="${CSS.escape(prop)}"][data-value="${CSS.escape(value.dataset.value!)}"]`) : null);
  if (!button) return;
  e.stopImmediatePropagation();
  button.setAttribute('aria-pressed', String(button.getAttribute('aria-pressed') !== 'true'));
  filter(view);
});
/** Opens the list of the values of a column of a table, under its name, and closes any other. */
function openColumnFilter(opener: HTMLElement | null) {
  for (const other of canvas.querySelectorAll<HTMLElement>('.column-filter[aria-expanded="true"]')) {
    other.setAttribute('aria-expanded', 'false');
    (other.nextElementSibling as HTMLElement).hidden = true;
  }
  if (!opener) return;
  opener.setAttribute('aria-expanded', 'true');
  (opener.nextElementSibling as HTMLElement).hidden = false;
}
// A click elsewhere, or Escape, closes the list of a column.
document.addEventListener('click', (e) => { if (!(e.target as Element).closest('.column-filter, .column-filter-menu')) openColumnFilter(null); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') openColumnFilter(null); });
function filter(view: Element) {
  const pressed = new Map<string, string[]>();
  for (const b of view.querySelectorAll<HTMLElement>('.filter[aria-pressed="true"]')) pressed.set(b.dataset.filter!, [...(pressed.get(b.dataset.filter!) ?? []), b.dataset.value!]);
  const rows = [...view.querySelectorAll('.grid--rows tbody tr')];
  for (const card of [...view.querySelectorAll('.card'), ...rows]) {
    const kept = [...pressed].every(([p, values]) => values.some((v) => card.querySelector(`[data-prop="${CSS.escape(p)}"] li[data-value="${CSS.escape(v)}"]`)));
    card.classList.toggle('is-filtered', !kept);
    for (const point of view.querySelectorAll(`.matrix-point[data-el="${CSS.escape((card as HTMLElement).dataset.el!)}"]`)) point.classList.toggle('is-filtered', !kept);
  }
  view.querySelector<HTMLElement>('.filters-clear')!.hidden = !pressed.size;
  const count = view.querySelector<HTMLElement>('.filters-count')!;
  count.hidden = !pressed.size || !rows.length;
  count.textContent = `${rows.filter((row) => !row.classList.contains('is-filtered')).length} of ${rows.length} shown`;
}
canvas.addEventListener('click', (e) => {
  // A value that is a link alone shows what it reaches in the panel (previewOf), rather than leaving the map.
  const target = e.target as Element;
  const valueLink = !markdownOpen() && e.detail <= 1 && target.closest('a.link')?.closest<HTMLElement>('.view li[data-src]');
  // The text of the value clicked; with no map shown or no value there, none: not a link.
  if (valueLink && /^\s*\[\[[^\]]+\]\]\s*$/.test((shownFile() && valueAt(shownFile()!, lineOf(valueLink)!)?.value.text) as string)) {
    e.preventDefault();
    return showDetails(valueDetails(lineOf(valueLink)!));
  }
  if (markdownOpen() || e.detail > 1 || target.closest('a, input, textarea') || !document.getSelection()!.isCollapsed) return;
  pointedAt(target)?.show();
});

/** The cells under the head of a column of a table, an element drawn as a column (a phase): none for anything else. */
const columnOf = (el: Element): Element[] => (el.matches('thead th') ? [...el.closest('table')!.querySelectorAll(`tbody tr > :nth-child(${(el as HTMLTableCellElement).cellIndex + 1})`)] : []);
/** What a click on the map selects, and what shows it under the pointer before (`drawn`): the most precise thing
 *  under it. A value, on its text; in a cell of a table, beside its values, the element of its column (or of its row);
 *  an element, a participant, a column of properties. */
function pointedAt(target: Element): { drawn: Element[]; show: () => void } | undefined {
  const li = target.closest<HTMLElement>('.view li[data-src]');
  const who = target.closest<SVGElement>('.view g[data-participant]');
  const column = target.closest<HTMLElement>('.view .grid--rows th[scope="col"][data-prop]');
  const cell = target.closest<HTMLTableCellElement>('.view td');
  const file = shownFile();
  if (who) return { drawn: [who], show: () => showDetails(participantDetails(who.dataset.participant!)) };
  // An unknown next step ("?"): the element its arrow comes from.
  const unknown = target.closest<SVGElement>('.view g.node--unknown[data-from]');
  if (unknown) return { drawn: [unknown], show: () => showDetails(elementDetails(unknown.dataset.from!)) };
  if (column) return { drawn: [column], show: () => showDetails(columnDetails(column.dataset.prop!)) };
  if (li && file && valueAt(file, lineOf(li)!)) return { drawn: [li], show: () => showDetails(valueDetails(lineOf(li)!)) };
  // A cell: the element of its column, or of its row, with all its cells.
  const table = cell?.closest('table');
  const head = cell && (table?.querySelector<HTMLElement>(`thead tr > :nth-child(${cell.cellIndex + 1})[data-el]`) ?? cell.parentElement!.querySelector<HTMLElement>(':scope > th[data-el]'));
  const el = head ?? target.closest<Drawn>('.view [data-el]');
  if (!el) return;
  // In a matrix, an element is drawn twice, a point and its card in the key: both, under the pointer.
  const twins = el.closest('.matrix') ? [...el.closest('.matrix')!.querySelectorAll<Drawn>(`[data-el="${CSS.escape(el.dataset.el!)}"]`)] : [el];
  const cells = head && head.matches('thead *') ? [head, ...columnOf(head)] : head ? [head.parentElement!] : twins;
  return {
    drawn: cells,
    show: () => {
      showDetails(elementDetails(el.dataset.el!));
      // A return drawn as a link leads to the element it goes back to.
      const to = el.matches('[data-return]') && el.closest('svg')?.querySelector(`[data-el="${CSS.escape(el.dataset.el!)}"]:not([data-return])`);
      if (to) center(to);
    },
  };
}
// Under the pointer, what a click selects (what a click lands on was not clear).
let pointed: Element[] = [];
canvas.addEventListener('pointermove', (e) => {
  const now = markdownOpen() || e.buttons ? [] : (pointedAt(e.target as Element)?.drawn ?? []);
  if (now.length === pointed.length && now.every((n, k) => n === pointed[k])) return;
  pointed.forEach((n) => n.classList.remove('is-pointed'));
  (pointed = now).forEach((n) => n.classList.add('is-pointed'));
});
canvas.addEventListener('pointerleave', () => (pointed.forEach((n) => n.classList.remove('is-pointed')), (pointed = [])));
$('details-body').addEventListener('click', (e) => {
  const target = e.target as Element;
  const up = target.closest<HTMLElement>('[data-details-el]');
  const more = target.closest<HTMLElement>('[data-details-line]');
  if (up) {
    showDetails(elementDetails(up.dataset.detailsEl!));
    const shown = document.querySelector(`#page .view:not([hidden]) [data-el="${CSS.escape(up.dataset.detailsEl!)}"]`);
    if (shown && up.closest('.details-links')) center(shown); // an arrow followed: the canvas goes to its element
  }
  else if (more && !target.closest('a')) showDetails(valueDetails(Number(more.dataset.detailsLine)));
});
// Escape closes the panel, the details or the Markdown, even from inside the editor; not from a
// field (the search), nor when the editor used it already (to close its own search or completion).
document.addEventListener('keydown', (e) => e.key === 'Escape' && !e.defaultPrevented && !$('editor').hidden && !(e.target as Element).closest?.('input, textarea, select') && showEditor(false));

window.addEventListener('hashchange', () => show());

/** The bar keeps the title whole as long as it can: when it has to be cut, the date goes first, then the type; when
 *  the pills (About this map, the open questions) still do not fit, Markdown at its end is its icon alone, then the
 *  pills are cut. */
function fitBar() {
  const bar = document.querySelector('.bar')!;
  const over = () => $('map-head').scrollWidth > $('map-head').clientWidth;
  const cut = () => over() || $('map-title').scrollWidth > $('map-title').clientWidth;
  bar.classList.remove('is-tight');
  for (const id of ['map-type', 'editor-open']) $(id).classList.remove('is-left-out');
  if (cut()) $('map-type').classList.add('is-left-out');
  if (over()) $('editor-open').classList.add('is-left-out');
  if (over()) bar.classList.add('is-tight');
}
new ResizeObserver(fitBar).observe(document.querySelector('.bar')!);

// Export: the map alone, its title and the view shown, without the canvas, the bar or the panels, as a PNG
// image, drawn in the browser.

/** The map to export, in the page, out of sight: a copy of the view shown under the title of the map. */
function exported() {
  const box = document.createElement('div');
  box.className = 'export';
  box.style.cssText = 'position: fixed; left: -200vw; top: 0;';
  const title = document.createElement('h1');
  title.textContent = shownFile()?.title ?? '';
  box.append(title);
  for (const part of $('page').children as HTMLCollectionOf<HTMLElement>) if (!part.hidden) box.append(part.cloneNode(true));
  for (const el of box.querySelectorAll('.target')) el.classList.remove('target');
  document.body.append(box);
  return box;
}

/** The map as a PNG image, at twice its size: drawn as HTML in an SVG image, with the styles and the fonts of the page,
 *  then on a canvas. */
async function exportPng() {
  const box = exported();
  const width = Math.ceil(box.scrollWidth);
  const height = Math.ceil(box.scrollHeight);
  const copy = box.cloneNode(true) as HTMLElement;
  box.remove();
  copy.removeAttribute('style');
  const body = document.createElement('body');
  const styles = document.createElement('style');
  styles.textContent = [...document.querySelectorAll('style')].map((s) => s.textContent).join('\n');
  body.append(styles, copy);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%">${new XMLSerializer().serializeToString(body)}</foreignObject></svg>`;
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await image.decode();
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  const filename = `${shownFile()?.name ?? 'map'}.png`;
  const downloads = await artifactDownloads;
  // In an artifact, the viewer confirms the save; declined, nothing happens.
  if (downloads) {
    return downloads.save({ filename, data: blob }).catch((err: { code: string }) => err.code === 'declined' || Promise.reject(err));
  }
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob!);
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href));
}

$('export').addEventListener('click', () => exportPng().catch((err) => alert(`The image could not be made: ${err.message}`)));

// The maps in the page itself (`serve.mjs --out`: one file to send, or a private artifact): read only. Or served by
// serve.mjs: the maps of its folder, read again each time one of them changes.
const embedded = document.getElementById('maps-data');
/** A private artifact on claude.ai: the image is saved through its capability `downloads`, as the page cannot download
 *  a file there; the export is hidden until the capability answers (later, never at once), and stays hidden without it
 *  (an artifact published before). Anywhere else, undefined: a download link, shown at once. */
const artifactDownloads = embedded ? window.claude?.use('downloads').catch(() => null) : undefined;
if (artifactDownloads) {
  $('export').hidden = true;
  artifactDownloads.then((downloads) => ($('export').hidden = !downloads));
}
if (embedded) {
  const sources = JSON.parse(embedded.textContent ?? '[]') as Source[];
  folderPath(undefined, embedded.dataset.name || sources[0]?.path.split('/')[0]);
  load(sources);
  editsInArtifact();
} else if (location.protocol.startsWith('http')) {
  let served = false;
  const read = (keep: boolean) =>
    fetch('maps.json')
      .then((res) => {
        if (!res.ok) return undefined;
        served = res.headers.has('x-maps-folder');
        folderPath(decodeURIComponent(res.headers.get('x-maps-folder') ?? '') || undefined);
        return res.json();
      })
      .then((sources?: Source[]) => sources && load(sources, keep))
      .catch(() => {});
  read(false).then(() => {
    if (!index || !served) return;
    new EventSource('__maps/events').onmessage = () => read(true);
    editable(async (path, text, base) => {
      const res = await fetch('__maps/save', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path, text, base }) });
      if (!res.ok) throw new Error(await res.text());
    });
  });
}

/** A private artifact on claude.ai: what is edited in the page is kept in the artifact's database, one document per
 *  file (`edits`, `{ path, text }`), and drawn over the maps of the page, live: another view of the artifact shows an
 *  edit as it is saved, as `serve` does. The AI writes the edits into the `.md` files when it publishes the artifact
 *  again (the skill says how). Read only for a viewer who may not write, and anywhere else. */
async function editsInArtifact() {
  const db = await window.claude?.use('db').catch(() => null);
  if (!db) return;
  const published = opened;
  const edits = db.collection('edits');
  const first = await new Promise<boolean>((resolve) =>
    edits.onSnapshot(
      (snap: { docs: { data: () => Source }[] }) => {
        const found = snap.docs.map((d) => d.data());
        load(published.map((s) => found.find((e) => e.path === s.path) ?? s), true);
        resolve(true);
      },
      () => (editable(undefined), resolve(false)), // the database cannot be read, or no longer: read only
    ),
  );
  if (!first) return;
  const user = await window.claude!.use('user').catch(() => null);
  if ((await user?.can('data.write')) === false) return;
  // A document per file, named after its path: `/` as `:`, any other character a name cannot hold as `_`.
  editable((path, text) => edits.doc(path.replace(/\//g, ':').replace(/[^\w.~:@+-]/g, '_')).set({ path, text }));
}
