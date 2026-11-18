// maps.md for Obsidian: the maps of the vault drawn, as maps.html draws them. A Markdown file whose front matter has a
// `type` that the types folder of its project defines opens in the Map view (map-view.ts), or in the Markdown view of
// Obsidian, a toggle apart; a click on the drawing shows its details in a side panel; a map embedded in a note is
// drawn there. The check of the maps runs on demand for the vault, and for the map shown as it changes. Obsidian does
// the rest: editing the Markdown, the files, the links in the editor.
//
// The plugin reads the maps with renderer/ as it is (read.ts, links.ts, checks.ts, draw.ts): the format, the types
// and the drawings are those of maps.html and the check.

import { debounce, FileView, MarkdownView, Notice, Plugin, TFile, WorkspaceLeaf, type HoverParent, type ViewState } from 'obsidian';
import { anchorOf } from '../renderer/links.ts';
import { headerOf } from '../renderer/read.ts';
import { Catalog, TypeModal } from './catalog.ts';
import { issuesTitle } from './check.ts';
import { issuesDetails, type Shown } from './details.ts';
import { MapEmbed, mapOfEmbed } from './embed.ts';
import { MAP_VIEW, MapView } from './map-view.ts';
import { DEFAULT_SETTINGS, MapsSettingTab, type MapsSettings } from './settings.ts';
import { DETAILS_VIEW, DetailsView, ISSUES_VIEW, IssuesView } from './side-views.ts';
import { MapsStore, parseHref } from './store.ts';
import { StyleRegistry } from './styles.ts';

/** The text of a map with its header comment: the comment right after the front matter replaced, or added (as
 *  renderer/check.ts writes it). */
function withHeader(text: string, header: string) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  return text.replace(/^(﻿?---\r?\n[\s\S]*?\r?\n---[ \t]*\r?\n)(?:[ \t]*<!--[\s\S]*?-->[ \t]*(?:\r?\n|$))?/, (_, front) => `${front}${header}${eol}`);
}

export default class MapsPlugin extends Plugin {
  settings: MapsSettings = { ...DEFAULT_SETTINGS };
  store!: MapsStore;
  styles!: StyleRegistry;
  catalog = new Catalog();
  embeds = new Set<MapEmbed>();
  private details?: DetailsView;
  /** The Map view used last: the side panel shows its details. */
  private lastMap?: MapView;
  private statusEl!: HTMLElement;
  private queue: Promise<unknown> = Promise.resolve();
  /** The leaves where a map is shown as Markdown, by the person's choice: the path of the map. */
  private forced = new WeakMap<WorkspaceLeaf, string>();
  private headerActions = new WeakMap<MarkdownView, HTMLElement>();
  private changedPaths = new Set<string>();
  private handledEmbeds = new WeakSet<Element>();

  async onload() {
    await this.loadSettings();
    this.store = new MapsStore(this.app, () => this.settings);
    this.styles = new StyleRegistry(this.store);
    this.registerView(MAP_VIEW, (leaf) => new MapView(leaf, this));
    this.registerView(DETAILS_VIEW, (leaf) => new DetailsView(leaf, this));
    this.registerView(ISSUES_VIEW, (leaf) => new IssuesView(leaf, this));
    this.registerHoverLinkSource(MAP_VIEW, { display: 'maps.md', defaultMod: true });
    this.addSettingTab(new MapsSettingTab(this.app, this));
    this.patchLeaves();
    this.addCommands();
    this.statusEl = this.addStatusBarItem();
    this.statusEl.addClass('maps-md-status', 'mod-clickable');
    this.statusEl.hide();
    this.registerDomEvent(this.statusEl, 'click', () => this.lastMap?.showDetails(issuesDetails));

    this.registerMarkdownPostProcessor((el, ctx) => {
      for (const span of el.querySelectorAll<HTMLElement>('.internal-embed')) {
        const file = mapOfEmbed(this, span, ctx.sourcePath);
        if (!file || this.handledEmbeds.has(span)) continue;
        this.handledEmbeds.add(span);
        ctx.addChild(new MapEmbed(span, file, ctx.sourcePath, this));
      }
    });

    this.registerEvent(
      this.app.workspace.on('file-menu', (menu, file, _source, leaf) => {
        if (!(file instanceof TFile) || !this.isMap(file)) return;
        const asMap = leaf?.view instanceof MapView;
        menu.addItem((item) =>
          item
            .setTitle(asMap ? 'Open as Markdown' : 'Open as map')
            .setIcon(asMap ? 'file-text' : 'map')
            .onClick(async () => (leaf && (leaf.view as FileView).file === file ? this.setMode(leaf, asMap ? 'markdown' : 'map') : this.openAs(file, 'map'))),
        );
      }),
    );
    this.registerEvent(this.app.workspace.on('active-leaf-change', (leaf) => this.activeChanged(leaf)));
    this.registerEvent(this.app.workspace.on('layout-change', () => this.syncHeaderActions()));
    this.registerEvent(this.app.workspace.on('file-open', () => this.syncHeaderActions()));
    this.registerEvent(this.app.metadataCache.on('changed', () => this.syncHeaderActions()));

    this.app.workspace.onLayoutReady(async () => {
      await this.store.load();
      const vault = this.app.vault;
      this.registerEvent(vault.on('create', (f) => this.touched(f.path, () => this.store.update(f))));
      this.registerEvent(vault.on('modify', (f) => this.touched(f.path, () => this.store.update(f))));
      this.registerEvent(vault.on('delete', (f) => this.touched(f.path, async () => this.store.remove(f.path))));
      this.registerEvent(vault.on('rename', (f, old) => (this.changedPaths.add(old), this.touched(f.path, () => this.store.rename(f, old)))));
      this.watchLivePreviewEmbeds();
      this.syncHeaderActions();
      this.redrawAll();
    });
  }

  onunload() {
    for (const embed of this.embeds) if (embed.managed) embed.unload();
    this.styles?.destroy();
  }

  async loadSettings() {
    this.settings = { ...DEFAULT_SETTINGS, ...(await this.loadData()) };
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.saveSoon();
  }

  /** The settings saved as they are typed: everything is read again after a pause. */
  private saveSoon = debounce(async () => {
    await this.store.reset();
    this.redrawAll();
  }, 600, true);

  /** One drawing at a time: drawMap measures the text in the element given to it. */
  serial<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task, task);
    this.queue = run.catch(() => {});
    return run;
  }

  // ---- What is a map ----

  /** Whether a file is a map the plugin reads: a `type` in its front matter; with `found`, its type is found too. */
  isMap(file: TFile, found = false) {
    if (file.extension !== 'md' || !this.store.reads(file.path)) return false;
    const type = this.app.metadataCache.getFileCache(file)?.frontmatter?.type;
    if (typeof type !== 'string' || !type || type === 'type-definition') return false;
    return !found || this.store.hasType(file.path, type);
  }

  // ---- The Map view and the Markdown view, in the same leaf ----

  /** A map opened as Markdown becomes a map, unless the person chose the Markdown in this leaf, as the Kanban plugin
   *  does: Obsidian opens every Markdown file through setViewState. */
  private patchLeaves() {
    const plugin = this;
    const original = WorkspaceLeaf.prototype.setViewState;
    WorkspaceLeaf.prototype.setViewState = function (this: WorkspaceLeaf, state: ViewState, eState?: unknown) {
      const path = state.state?.file;
      if (state.type === 'markdown' && typeof path === 'string') {
        const forced = plugin.forced.get(this);
        if (forced && forced !== path) plugin.forced.delete(this);
        const file = plugin.app.vault.getAbstractFileByPath(path);
        if (plugin.settings.openAsMap && forced !== path && file instanceof TFile && plugin.isMap(file, true)) return original.call(this, { ...state, type: MAP_VIEW }, eState);
      }
      return original.call(this, state, eState);
    };
    this.register(() => (WorkspaceLeaf.prototype.setViewState = original));
  }

  /** Shows the file of a leaf as a map or as Markdown; at a line of the file (from 0), when given. */
  async setMode(leaf: WorkspaceLeaf, mode: 'map' | 'markdown', line?: number) {
    const view = leaf.view;
    const file = view instanceof FileView ? view.file : null;
    if (!file) return;
    if (mode === 'markdown') {
      this.forced.set(leaf, file.path);
      await leaf.setViewState({ type: 'markdown', state: { file: file.path }, active: true });
      if (line !== undefined) this.goToLine(leaf, line);
    } else {
      const at = view instanceof MarkdownView ? view.editor.getCursor().line : undefined;
      this.forced.delete(leaf);
      await leaf.setViewState({ type: MAP_VIEW, state: { file: file.path }, active: true });
      const map = leaf.view;
      if (map instanceof MapView && at !== undefined && at > 0) {
        const anchor = map.elementAtLine(at);
        if (anchor) map.setEphemeralState({ mapsAnchor: anchor });
      }
    }
  }

  /** Opens a file as a map or as Markdown, in a leaf of its own. */
  async openAs(file: TFile, mode: 'map' | 'markdown') {
    const leaf = this.app.workspace.getLeaf(false);
    if (mode === 'markdown') this.forced.set(leaf, file.path);
    else this.forced.delete(leaf);
    await leaf.setViewState({ type: mode === 'map' ? MAP_VIEW : 'markdown', state: { file: file.path }, active: true });
  }

  /** The cursor of a Markdown view at a line of its file (from 0), in the middle of the view. */
  private goToLine(leaf: WorkspaceLeaf, line: number) {
    const view = leaf.view;
    if (!(view instanceof MarkdownView)) return;
    view.setEphemeralState({ line });
    if (view.getMode() !== 'source') return;
    const at = { line, ch: 0 };
    view.editor.setCursor(at);
    view.editor.scrollIntoView({ from: at, to: at }, true);
  }

  /** Opens a file of the vault at a line (from 1), in the Markdown view, from the check. */
  async openAtLine(path: string, line?: number) {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) return;
    const existing = this.app.workspace.getLeavesOfType('markdown').find((l) => (l.view as MarkdownView).file?.path === path);
    const leaf = existing ?? this.app.workspace.getLeavesOfType(MAP_VIEW).find((l) => (l.view as MapView).file?.path === path) ?? this.app.workspace.getLeaf(false);
    this.forced.set(leaf, path);
    if (!(leaf.view instanceof MarkdownView) || leaf.view.file?.path !== path) await leaf.setViewState({ type: 'markdown', state: { file: path }, active: true });
    this.app.workspace.setActiveLeaf(leaf, { focus: true });
    if (line) this.goToLine(leaf, line - 1);
  }

  /** The toggle in the header of a Markdown view of a map, as the one of the Map view: kept in step with the file. */
  private syncHeaderActions() {
    for (const leaf of this.app.workspace.getLeavesOfType('markdown')) {
      const view = leaf.view as MarkdownView;
      const file = view.file;
      const want = Boolean(file && this.isMap(file) && (this.store.hasType(file.path, this.app.metadataCache.getFileCache(file)?.frontmatter?.type) || this.store.projectOf(file.path) !== undefined));
      const action = this.headerActions.get(view);
      if (want && !action) this.headerActions.set(view, view.addAction('map', 'Open as map', () => this.setMode(leaf, 'map')));
      else if (!want && action) (action.remove(), this.headerActions.delete(view));
    }
  }

  // ---- Links ----

  /** Opens a link of a drawing: the file, at the element of its anchor (`el-name/12/14`), with Obsidian's
   *  openLinkText; then, in the Map view, what it reaches is selected, and in the Markdown view, the line of an item
   *  under an element (`#A#B`, which Obsidian cannot reach) is shown. */
  async openTarget(path: string, anchor: string, sourcePath: string, newLeaf: boolean | 'tab' | 'split' | 'window') {
    const file = this.store.file(path);
    const [id, ...lines] = anchor.split('/');
    const element = file && id ? [...file.elements.values()].find((e) => anchorOf(e.name) === id) : undefined;
    const linktext = `${path.replace(/\.md$/i, '')}${element ? `#${element.name}` : ''}`;
    await this.app.workspace.openLinkText(linktext, sourcePath, newLeaf);
    const view = this.app.workspace.getActiveViewOfType(MapView) ?? this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view || view.file?.path !== path) return;
    if (view instanceof MapView) {
      if (anchor) view.setEphemeralState({ mapsAnchor: anchor });
    } else if (lines.length) this.goToLine(view.leaf, Number(lines.at(-1)));
  }

  /** The preview of Obsidian for a link of a drawing (`#/<path>/<anchor>`), with Ctrl or Cmd held. */
  hoverLink(event: MouseEvent, link: HTMLElement, parent: HoverParent, sourcePath: string) {
    const href = parseHref(link.getAttribute('href') ?? '');
    if (!href) return;
    const file = this.store.file(href.path);
    const id = href.anchor.split('/')[0];
    const element = file && id ? [...file.elements.values()].find((e) => anchorOf(e.name) === id) : undefined;
    const linktext = `${href.path.replace(/\.md$/i, '')}${element ? `#${element.name}` : ''}`;
    this.app.workspace.trigger('hover-link', { event, source: MAP_VIEW, hoverParent: parent, targetEl: link, linktext, sourcePath });
  }

  // ---- The side panel and the status bar ----

  detailsOpened(view?: DetailsView) {
    this.details = view;
    if (view) this.lastMap?.publishDetails();
  }

  detailsClosed(view: MapView) {
    if (this.lastMap === view) this.lastMap = undefined;
    if (this.details?.ownedBy(view)) this.details.clear();
    this.updateStatus();
  }

  /** The details a Map view shows, in the side panel: when it is the map used last, or when it asks (`reveal`, a
   *  click), the panel opened if it is closed. */
  async publishDetails(view: MapView, shown: Shown, reveal: boolean) {
    if (reveal) this.lastMap = view;
    if (view !== this.lastMap) return;
    if (reveal && !this.details) await this.openSide(DETAILS_VIEW, false);
    if (reveal) this.revealSide(DETAILS_VIEW);
    this.details?.show(view, shown);
  }

  /** A Map view drawn: the status bar and the panel follow it when it is the one in use. */
  mapShown(view: MapView) {
    if (this.app.workspace.getActiveViewOfType(MapView) === view) this.lastMap = view;
    if (view === this.lastMap) this.updateStatus();
  }

  private activeChanged(leaf: WorkspaceLeaf | null) {
    const view = leaf?.view;
    if (view instanceof MapView) {
      this.lastMap = view;
      view.publishDetails();
    } else if (view && !(view instanceof DetailsView) && !(view instanceof IssuesView) && leaf?.getRoot() === this.app.workspace.rootSplit) this.lastMap = undefined;
    this.updateStatus();
  }

  /** "N to fix" for the map in use, in the status bar; a click shows them. */
  private updateStatus() {
    const issues = this.lastMap?.issues ?? [];
    if (!this.lastMap || !issues.length) return this.statusEl.hide();
    this.statusEl.setText(`maps.md: ${issuesTitle(issues)}`);
    this.statusEl.toggleClass('maps-md-status--error', issues.some((i) => i.level === 'error'));
    this.statusEl.show();
  }

  private async openSide(type: string, active: boolean) {
    let leaf = this.app.workspace.getLeavesOfType(type)[0];
    if (!leaf) {
      leaf = this.app.workspace.getRightLeaf(false)!;
      await leaf.setViewState({ type, active });
    }
    return leaf;
  }

  private revealSide(type: string) {
    const leaf = this.app.workspace.getLeavesOfType(type)[0];
    if (leaf) this.app.workspace.revealLeaf(leaf);
  }

  // ---- Types ----

  /** Adds a type of the catalog to the types folder of a map (or of the default folder). */
  async addType(name: string, mapPath?: string) {
    const folder = this.store.typesFolderOf(mapPath ?? this.app.workspace.getActiveFile()?.path ?? '');
    try {
      await this.catalog.add(this.app, name, folder);
    } catch (e) {
      new Notice(`maps.md: ${(e as Error).message}`);
    }
  }

  /** The list of the types of the catalog, to add one. */
  chooseType(mapPath?: string) {
    const path = mapPath ?? this.app.workspace.getActiveFile()?.path ?? '';
    new TypeModal(this.app, this.catalog, this.store.typesFolderOf(path), (type) => this.addType(type.name, path)).open();
  }

  // ---- Commands ----

  private addCommands() {
    this.addCommand({
      id: 'toggle-map-view',
      name: 'Toggle Map view and Markdown',
      checkCallback: (checking) => {
        const leaf = this.app.workspace.getMostRecentLeaf();
        const view = leaf?.view;
        const isMapView = view instanceof MapView;
        const file = view instanceof FileView ? view.file : null;
        if (!leaf || !file || (!isMapView && !(view instanceof MarkdownView && this.isMap(file)))) return false;
        if (!checking) this.setMode(leaf, isMapView ? 'markdown' : 'map');
        return true;
      },
    });
    this.addCommand({ id: 'add-type', name: 'Add a type from the catalog', callback: () => this.chooseType() });
    this.addCommand({
      id: 'check-vault',
      name: 'Check every map',
      callback: async () => {
        const leaf = await this.openSide(ISSUES_VIEW, true);
        this.app.workspace.revealLeaf(leaf);
        await (leaf.view as IssuesView).refresh?.();
      },
    });
    this.addCommand({
      id: 'show-details',
      name: 'Show the details panel',
      callback: async () => {
        await this.openSide(DETAILS_VIEW, false);
        this.revealSide(DETAILS_VIEW);
        this.lastMap?.publishDetails();
      },
    });
    this.addCommand({
      id: 'write-header',
      name: 'Write the header comment of this map',
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        const map = file && this.store.file(file.path);
        if (!file || !map?.isMap) return false;
        const found = this.store.definitionOf(map);
        if (!found.definition) return false;
        if (!checking) this.app.vault.process(file, (text) => withHeader(text, headerOf(found.definition!)));
        return true;
      },
    });
  }

  // ---- Changes ----

  /** A file of the vault created, changed, renamed or deleted: read again, and the drawings it concerns drawn again,
   *  after a pause. */
  private async touched(path: string, update: () => Promise<boolean>) {
    if (!(await update())) return;
    this.changedPaths.add(path);
    this.redrawSoon();
  }

  private redrawSoon = debounce(() => this.redrawChanged(), 300, true);

  /** Whether a change to these files may change the drawing of a map: the map itself, a map of its project (its
   *  backlinks, the targets of its links) or a file of its types. */
  concerns(mapPath: string, paths: Set<string>) {
    const { rootOf } = this.store.projects();
    const root = rootOf(mapPath);
    return [...paths].some((p) => p === mapPath || rootOf(p) === root || (this.store.isTypeFile(p) && rootOf(p) === undefined));
  }

  private redrawChanged() {
    const paths = new Set(this.changedPaths);
    this.changedPaths.clear();
    for (const leaf of this.app.workspace.getLeavesOfType(MAP_VIEW)) {
      const view = leaf.view as MapView;
      if (view.file && this.concerns(view.file.path, paths)) view.draw();
    }
    for (const embed of [...this.embeds]) {
      if (embed.managed && !embed.containerEl.isConnected) (embed.unload(), this.embeds.delete(embed));
      else if (embed.concerns(paths)) embed.draw();
    }
    for (const leaf of this.app.workspace.getLeavesOfType(ISSUES_VIEW)) (leaf.view as IssuesView).refresh();
    this.syncHeaderActions();
  }

  /** Every drawing again: after the settings changed, once the vault is read. */
  private redrawAll() {
    for (const leaf of this.app.workspace.getLeavesOfType(MAP_VIEW)) (leaf.view as MapView).draw(true);
    for (const embed of this.embeds) embed.draw();
  }

  /** In Live Preview, Obsidian draws an embed in a widget of the editor, where no post processor runs: the embeds it
   *  adds there are watched, and those of a map drawn as a map. */
  private watchLivePreviewEmbeds() {
    const handle = (el: HTMLElement) => {
      if (this.handledEmbeds.has(el) || !el.closest('.markdown-source-view')) return;
      const source = this.app.workspace.getActiveFile()?.path ?? '';
      const file = mapOfEmbed(this, el, source);
      if (!file) return;
      this.handledEmbeds.add(el);
      const embed = new MapEmbed(el, file, source, this);
      embed.managed = true;
      embed.load();
    };
    const observer = new MutationObserver((records) => {
      for (const r of records)
        for (const node of r.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          if (node.matches('.internal-embed[src]')) handle(node);
          node.querySelectorAll<HTMLElement>('.internal-embed[src]').forEach(handle);
        }
    });
    observer.observe(this.app.workspace.containerEl, { childList: true, subtree: true });
    this.register(() => observer.disconnect());
    this.app.workspace.containerEl.querySelectorAll<HTMLElement>('.markdown-source-view .internal-embed[src]').forEach(handle);
  }
}

