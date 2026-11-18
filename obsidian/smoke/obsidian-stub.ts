// A minimal stand-in for the API of Obsidian, for the smoke test only (run.ts): enough of the workspace, the vault, the
// metadata cache, the views and the DOM helpers for the plugin (obsidian/main.ts) to run as it is in a browser page,
// on files given to it. It is not Obsidian: what it does is what the plugin needs, as Obsidian documents it, simplified.
// Not type-checked against the real API (tsconfig.json leaves obsidian/smoke out); bundled by esbuild for the test.

// ---- The DOM helpers Obsidian adds to every element ----

type ElInfo = { cls?: string | string[]; text?: string; attr?: Record<string, string | number | boolean | null>; title?: string; type?: string; href?: string; value?: string };
function apply(el: HTMLElement, o?: ElInfo | string) {
  if (typeof o === 'string') o = { cls: o };
  if (!o) return el;
  if (o.cls) el.className = Array.isArray(o.cls) ? o.cls.join(' ') : o.cls;
  if (o.text !== undefined) el.textContent = o.text;
  for (const [k, v] of Object.entries(o.attr ?? {})) if (v !== null && v !== false) el.setAttribute(k, String(v));
  if (o.title) el.title = o.title;
  if (o.href) el.setAttribute('href', o.href);
  return el;
}
const P = HTMLElement.prototype as any;
P.createEl = function (tag: string, o?: ElInfo, cb?: (el: HTMLElement) => void) {
  const el = apply(document.createElement(tag), o);
  this.append(el);
  cb?.(el);
  return el;
};
P.createDiv = function (o?: ElInfo) { return this.createEl('div', typeof o === 'string' ? { cls: o } : o); };
P.createSpan = function (o?: ElInfo) { return this.createEl('span', typeof o === 'string' ? { cls: o } : o); };
P.empty = function () { this.replaceChildren(); };
P.addClass = function (...c: string[]) { this.classList.add(...c); };
P.removeClass = function (...c: string[]) { this.classList.remove(...c); };
P.toggleClass = function (c: string, on: boolean) { this.classList.toggle(c, on); };
P.setText = function (t: string) { this.textContent = t; };
P.show = function () { this.style.display = ''; };
P.hide = function () { this.style.display = 'none'; };
Object.defineProperty(P, 'doc', { get() { return this.ownerDocument; } });
Object.defineProperty(P, 'win', { get() { return this.ownerDocument.defaultView; } });
(globalThis as any).createDiv = (o?: ElInfo) => apply(document.createElement('div'), o);
(globalThis as any).createEl = (tag: string, o?: ElInfo) => apply(document.createElement(tag), o);
(globalThis as any).createSpan = (o?: ElInfo) => apply(document.createElement('span'), o);

// ---- Small helpers ----

export function setIcon(el: HTMLElement, name: string) {
  const glyphs: Record<string, string> = { minus: '−', plus: '+', 'file-text': '¶', map: '◫', 'map-pin': '•', 'list-checks': '✓' };
  el.textContent = glyphs[name] ?? '·';
  el.dataset.icon = name;
}
export function normalizePath(p: string) {
  return p.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
}
export const getLinkpath = (linktext: string) => linktext.replace(/#.*$/, '');
export function debounce(fn: (...a: any[]) => any, ms = 0, _reset = false) {
  let t: any;
  return (...a: any[]) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}
export const Keymap = { isModEvent: (e: MouseEvent) => Boolean(e?.ctrlKey || e?.metaKey) };
export const Platform = { isMobile: false, isDesktop: true };
export const notices: string[] = [];
export class Notice {
  constructor(message: string) {
    notices.push(message);
  }
}

// ---- Events and components ----

export class Events {
  private handlers = new Map<string, Set<(...a: any[]) => any>>();
  on(name: string, cb: (...a: any[]) => any) {
    if (!this.handlers.has(name)) this.handlers.set(name, new Set());
    this.handlers.get(name)!.add(cb);
    return { e: this, name, cb };
  }
  offref(ref: { name: string; cb: any }) {
    this.handlers.get(ref.name)?.delete(ref.cb);
  }
  trigger(name: string, ...args: any[]) {
    for (const cb of [...(this.handlers.get(name) ?? [])]) cb(...args);
  }
}

export class Component {
  private cleanups: (() => void)[] = [];
  private children: Component[] = [];
  _loaded = false;
  load() {
    if (this._loaded) return;
    this._loaded = true;
    this.onload();
    this.children.forEach((c) => c.load());
  }
  unload() {
    if (!this._loaded) return;
    this._loaded = false;
    this.children.forEach((c) => c.unload());
    this.cleanups.splice(0).forEach((c) => c());
    this.onunload();
  }
  onload() {}
  onunload() {}
  addChild<T extends Component>(c: T) {
    this.children.push(c);
    if (this._loaded) c.load();
    return c;
  }
  register(cb: () => void) {
    this.cleanups.push(cb);
  }
  registerEvent(ref: { e: Events; name: string; cb: any }) {
    this.cleanups.push(() => ref.e.offref(ref));
  }
  registerDomEvent(el: EventTarget, type: string, cb: any, opts?: any) {
    el.addEventListener(type, cb, opts);
    this.cleanups.push(() => el.removeEventListener(type, cb, opts));
  }
  registerInterval(id: number) {
    this.cleanups.push(() => clearInterval(id));
    return id;
  }
}

// ---- Files ----

export class TAbstractFile {
  constructor(
    public vault: Vault,
    public path: string,
  ) {}
  get name() {
    return this.path.split('/').pop()!;
  }
  get parent() {
    const dir = this.path.split('/').slice(0, -1).join('/');
    return (this.vault.getAbstractFileByPath(dir) as TFolder) ?? null;
  }
}
export class TFile extends TAbstractFile {
  get extension() {
    return this.name.includes('.') ? this.name.split('.').pop()! : '';
  }
  get basename() {
    return this.name.replace(/\.[^.]*$/, '');
  }
}
export class TFolder extends TAbstractFile {}

export class Vault extends Events {
  files = new Map<string, { file: TFile; text: string }>();
  folders = new Map<string, TFolder>();
  constructor(texts: Record<string, string>) {
    super();
    for (const [path, text] of Object.entries(texts)) this.put(path, text);
  }
  private put(path: string, text: string) {
    const file = this.files.get(path)?.file ?? new TFile(this, path);
    this.files.set(path, { file, text });
    const parts = path.split('/');
    for (let k = 1; k < parts.length; k++) {
      const dir = parts.slice(0, k).join('/');
      if (!this.folders.has(dir)) this.folders.set(dir, new TFolder(this, dir));
    }
    return file;
  }
  getFiles() {
    return [...this.files.values()].map((f) => f.file);
  }
  getMarkdownFiles() {
    return this.getFiles().filter((f) => f.extension === 'md');
  }
  getAbstractFileByPath(path: string): TAbstractFile | null {
    return this.files.get(path)?.file ?? this.folders.get(path) ?? null;
  }
  async cachedRead(file: TFile) {
    return this.files.get(file.path)!.text;
  }
  async read(file: TFile) {
    return this.cachedRead(file);
  }
  async modify(file: TFile, text: string) {
    this.files.get(file.path)!.text = text;
    app.metadataCache.update(file);
    this.trigger('modify', file);
  }
  async process(file: TFile, fn: (t: string) => string) {
    await this.modify(file, fn(this.files.get(file.path)!.text));
  }
  async create(path: string, text: string) {
    if (this.files.has(path)) throw new Error(`exists: ${path}`);
    const file = this.put(path, text);
    app.metadataCache.update(file);
    this.trigger('create', file);
    return file;
  }
  async createFolder(path: string) {
    if (this.folders.has(path)) throw new Error('Folder already exists.');
    this.folders.set(path, new TFolder(this, path));
  }
}

/** The front matter of a Markdown text, `key: value` per line, as Obsidian's metadata cache gives it. */
function frontmatterOf(text: string) {
  const m = /^﻿?---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!m) return undefined;
  const fm: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([\w-]+):\s*(.*)$/.exec(line);
    if (kv) fm[kv[1]] = kv[2].trim();
  }
  return fm;
}

export class MetadataCache extends Events {
  private caches = new Map<string, { frontmatter?: Record<string, string> }>();
  constructor(private vault: Vault) {
    super();
    for (const f of vault.getMarkdownFiles()) this.update(f, false);
  }
  update(file: TFile, notify = true) {
    if (file.extension !== 'md') return;
    this.caches.set(file.path, { frontmatter: frontmatterOf(this.vault.files.get(file.path)!.text) });
    if (notify) this.trigger('changed', file);
  }
  getFileCache(file: TFile) {
    return this.caches.get(file.path) ?? null;
  }
  getFirstLinkpathDest(linkpath: string, source: string): TFile | null {
    const files = this.vault.getMarkdownFiles();
    const exact = files.find((f) => f.path === `${linkpath}.md` || f.path === linkpath);
    if (exact) return exact;
    const name = linkpath.split('/').pop()!.toLowerCase();
    const candidates = files.filter((f) => f.basename.toLowerCase() === name);
    const dir = source.split('/').slice(0, -1).join('/');
    return candidates.sort((a, b) => Number(b.path.startsWith(dir)) - Number(a.path.startsWith(dir)))[0] ?? null;
  }
}

// ---- Views and leaves ----

export class View extends Component {
  app: App;
  containerEl: HTMLElement;
  contentEl!: HTMLElement;
  navigation = false;
  constructor(public leaf: WorkspaceLeaf) {
    super();
    this.app = leaf.app;
    this.containerEl = createDiv({ cls: 'workspace-leaf-content' }) as HTMLElement;
    this.containerEl.dataset.type = 'pending';
  }
  getViewType() {
    return 'empty';
  }
  getDisplayText() {
    return '';
  }
  getIcon() {
    return '';
  }
  getState(): Record<string, unknown> {
    return {};
  }
  async setState(_state: any, _result?: any) {}
  setEphemeralState(_state: any) {}
  async onOpen() {}
  async onClose() {}
}

export class ItemView extends View {
  private actionsEl: HTMLElement;
  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
    const header = (this.containerEl as any).createDiv({ cls: 'view-header' });
    header.createDiv({ cls: 'view-header-title', text: '' });
    this.actionsEl = header.createDiv({ cls: 'view-actions' });
    this.contentEl = (this.containerEl as any).createDiv({ cls: 'view-content' });
  }
  addAction(icon: string, title: string, cb: (e: MouseEvent) => any) {
    const el = (this.actionsEl as any).createEl('button', { cls: 'clickable-icon view-action', attr: { 'aria-label': title } });
    setIcon(el, icon);
    el.addEventListener('click', cb);
    return el;
  }
}

export class FileView extends ItemView {
  file: TFile | null = null;
  allowNoFile = false;
  navigation = true;
  getState() {
    return { file: this.file?.path };
  }
  async setState(state: any) {
    const file = state?.file && this.app.vault.getAbstractFileByPath(state.file);
    if (!(file instanceof TFile) || file === this.file) return;
    if (this.file) await this.onUnloadFile(this.file);
    this.file = file;
    (this.containerEl.querySelector('.view-header-title') as HTMLElement).textContent = file.basename;
    await this.onLoadFile(file);
  }
  async onLoadFile(_file: TFile) {}
  async onUnloadFile(_file: TFile) {}
}

/** The Markdown view, reduced to its text and a cursor: the plugin only switches to it and moves its cursor. */
export class MarkdownView extends FileView {
  cursor = { line: 0, ch: 0 };
  editor = {
    getCursor: () => this.cursor,
    setCursor: (at: { line: number; ch: number }) => {
      this.cursor = at;
      this.contentEl.querySelectorAll('.line').forEach((l, k) => l.classList.toggle('cursor-line', k === at.line));
    },
    scrollIntoView: () => this.contentEl.querySelector('.cursor-line')?.scrollIntoView({ block: 'center' }),
  };
  getViewType() {
    return 'markdown';
  }
  getMode() {
    return 'source';
  }
  async onLoadFile(file: TFile) {
    const text = await this.app.vault.cachedRead(file);
    this.contentEl.empty();
    const pre = (this.contentEl as any).createDiv({ cls: 'markdown-source-view cm-s-obsidian' });
    text.split('\n').forEach((l: string) => pre.createDiv({ cls: 'line', text: l || ' ' }));
  }
  setEphemeralState(state: any) {
    if (typeof state?.line === 'number') this.editor.setCursor({ line: state.line, ch: 0 });
  }
}

export class WorkspaceLeaf extends Events {
  view: View;
  containerEl: HTMLElement;
  constructor(
    public app: App,
    public parentEl: HTMLElement,
    public side: 'main' | 'right',
  ) {
    super();
    this.containerEl = (parentEl as any).createDiv({ cls: 'workspace-leaf' });
    this.view = new View(this);
  }
  getRoot() {
    return this.side === 'main' ? this.app.workspace.rootSplit : this.app.workspace.rightSplit;
  }
  getViewState() {
    return { type: this.view.getViewType(), state: this.view.getState() };
  }
  async setViewState(state: { type: string; state?: any; active?: boolean }, eState?: any) {
    if (this.view.getViewType() !== state.type) {
      await this.view.onClose();
      this.view.unload();
      this.view.containerEl.remove();
      const factory = this.app.viewRegistry.get(state.type);
      this.view = state.type === 'markdown' ? new MarkdownView(this) : factory ? factory(this) : new View(this);
      this.view.containerEl.dataset.type = state.type;
      this.containerEl.append(this.view.containerEl);
      this.view.load();
      await this.view.onOpen();
    }
    await this.view.setState(state.state ?? {});
    if (eState) this.view.setEphemeralState(eState);
    if (state.active) this.app.workspace.setActiveLeaf(this);
    this.app.workspace.trigger('layout-change');
  }
  async openFile(file: TFile, openState: { eState?: any; active?: boolean } = {}) {
    await this.setViewState({ type: 'markdown', state: { file: file.path }, active: openState.active ?? true }, openState.eState);
    this.app.workspace.trigger('file-open', file);
  }
  detach() {
    this.view.onClose();
    this.view.unload();
    this.containerEl.remove();
    this.app.workspace.leaves.splice(this.app.workspace.leaves.indexOf(this), 1);
  }
}

export class Workspace extends Events {
  leaves: WorkspaceLeaf[] = [];
  activeLeaf: WorkspaceLeaf | null = null;
  rootSplit = { side: 'main' };
  rightSplit = { side: 'right' };
  containerEl: HTMLElement;
  mainEl: HTMLElement;
  rightEl: HTMLElement;
  private ready: (() => void)[] = [];
  layoutReady = false;
  constructor(public app: App, root: HTMLElement) {
    super();
    this.containerEl = (root as any).createDiv({ cls: 'workspace' });
    this.mainEl = (this.containerEl as any).createDiv({ cls: 'workspace-split mod-root' });
    this.rightEl = (this.containerEl as any).createDiv({ cls: 'workspace-split mod-right-split' });
  }
  onLayoutReady(cb: () => void) {
    if (this.layoutReady) cb();
    else this.ready.push(cb);
  }
  setLayoutReady() {
    this.layoutReady = true;
    this.ready.splice(0).forEach((cb) => cb());
  }
  private newLeaf(side: 'main' | 'right') {
    const leaf = new WorkspaceLeaf(this.app, side === 'main' ? this.mainEl : this.rightEl, side);
    this.leaves.push(leaf);
    return leaf;
  }
  getLeaf(newLeaf?: boolean | string) {
    if (!newLeaf) {
      const current = this.activeLeaf?.side === 'main' ? this.activeLeaf : this.leaves.find((l) => l.side === 'main');
      if (current) return current;
    }
    return this.newLeaf('main');
  }
  getRightLeaf(_split: boolean) {
    return this.newLeaf('right');
  }
  getMostRecentLeaf() {
    return this.activeLeaf?.side === 'main' ? this.activeLeaf : (this.leaves.find((l) => l.side === 'main') ?? null);
  }
  getLeavesOfType(type: string) {
    return this.leaves.filter((l) => l.view.getViewType() === type);
  }
  getActiveViewOfType(cls: any) {
    const view = this.getMostRecentLeaf()?.view;
    return view instanceof cls ? view : null;
  }
  getActiveFile() {
    const view = this.getMostRecentLeaf()?.view as any;
    return view?.file ?? null;
  }
  setActiveLeaf(leaf: WorkspaceLeaf, _o?: any) {
    if (this.activeLeaf === leaf) return;
    this.activeLeaf = leaf;
    for (const l of this.leaves) l.containerEl.classList.toggle('mod-active', l === leaf);
    // One leaf of the main area shown at a time, as tabs.
    if (leaf.side === 'main') for (const l of this.leaves) if (l.side === 'main') l.containerEl.hidden = l !== leaf;
    this.trigger('active-leaf-change', leaf);
  }
  async revealLeaf(leaf: WorkspaceLeaf) {
    leaf.containerEl.hidden = false;
  }
  async openLinkText(linktext: string, sourcePath: string, newLeaf?: boolean | string, openViewState: any = {}) {
    const [path, ...rest] = linktext.split('#');
    const file = this.app.metadataCache.getFirstLinkpathDest(path, sourcePath);
    if (!file) throw new Error(`no file for ${linktext}`);
    const leaf = this.getLeaf(newLeaf);
    await leaf.openFile(file, { ...openViewState, eState: { ...(openViewState.eState ?? {}), subpath: rest.length ? `#${rest.join('#')}` : undefined } });
    this.setActiveLeaf(leaf);
  }
}

export class App {
  vault: Vault;
  metadataCache: MetadataCache;
  workspace: Workspace;
  viewRegistry = new Map<string, (leaf: WorkspaceLeaf) => View>();
  constructor(root: HTMLElement, texts: Record<string, string>) {
    app = this;
    this.vault = new Vault(texts);
    this.metadataCache = new MetadataCache(this.vault);
    this.workspace = new Workspace(this, root);
  }
}
let app: App;

// ---- Plugins ----

export class Plugin extends Component {
  commands: any[] = [];
  postProcessors: ((el: HTMLElement, ctx: any) => void)[] = [];
  data: any = null;
  constructor(
    public app: App,
    public manifest: any,
  ) {
    super();
  }
  registerView(type: string, factory: (leaf: WorkspaceLeaf) => View) {
    this.app.viewRegistry.set(type, factory);
  }
  registerHoverLinkSource() {}
  addSettingTab() {}
  addCommand(c: any) {
    this.commands.push(c);
    return c;
  }
  addStatusBarItem() {
    return (document.querySelector('.status-bar') as any).createDiv({ cls: 'status-bar-item' });
  }
  registerMarkdownPostProcessor(p: (el: HTMLElement, ctx: any) => void) {
    this.postProcessors.push(p);
    return p;
  }
  async loadData() {
    return this.data;
  }
  async saveData(d: any) {
    this.data = d;
  }
}

export class PluginSettingTab {
  containerEl = createDiv();
  constructor(
    public app: App,
    public plugin: Plugin,
  ) {}
}
export class Setting {
  constructor(_el: HTMLElement) {}
  setName() { return this; }
  setDesc() { return this; }
  addToggle() { return this; }
  addText() { return this; }
}
export class Modal {
  constructor(public app: App) {}
  open() {}
  close() {}
}
export class SuggestModal<T> extends Modal {
  setPlaceholder(_t: string) {}
  getSuggestions(_q: string): T[] {
    return [];
  }
}
export class MarkdownRenderChild extends Component {
  constructor(public containerEl: HTMLElement) {
    super();
  }
}
