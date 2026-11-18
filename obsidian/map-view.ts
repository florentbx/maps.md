// The Map view: a map of the vault drawn, as maps.html draws it, in a tab of Obsidian. Its bar says the title and the
// type of the map, with About this map, its open questions and what the check finds wrong; the tabs of the views of its
// type are under it; the drawing is on a canvas that moves and zooms. A click on the drawing shows the details in the
// side panel (details-view.ts); a link is followed in Obsidian. Read only: the Markdown is edited in Obsidian's own
// Markdown view, a click away (the toggle in the header).

import { FileView, Keymap, setIcon, TFile, type HoverPopover, type WorkspaceLeaf } from 'obsidian';
import type { Issue } from '../renderer/checks.ts';
import { drawMap } from '../renderer/draw.ts';
import { anchorOf, escapeHtml, linksOf } from '../renderer/links.ts';
import type { Definition, IndexedFile, IndexedMap } from '../renderer/model.ts';
import { mount, PanCanvas, selectTab, uid } from './canvas.ts';
import { issuesOfMap, issuesTitle } from './check.ts';
import { aboutDetails, ask, elementDetails, focusLinks, issuesDetails, pointedAt, questionsDetails, targetOf, valueAt, valueDetails, type Details, type DetailsContext, filterClick, openColumnFilter } from './details.ts';
import type MapsPlugin from './main.ts';
import { parseHref } from './store.ts';

export const MAP_VIEW = 'maps-md-map';

export class MapView extends FileView {
  hoverPopover: HoverPopover | null = null;
  navigation = true;
  allowNoFile = false;
  private bar!: HTMLElement;
  private viewsBar!: HTMLElement;
  private canvasEl!: HTMLElement;
  private page!: HTMLElement;
  private zoomLabel!: HTMLElement;
  private navigationEl!: HTMLElement;
  private pan!: PanCanvas;
  private id = uid();
  private unmount?: () => void;
  /** What the side panel shows for this map, called again when the map is drawn again. */
  private lastDraw: Details = aboutDetails;
  private ctx?: DetailsContext;
  private askedNow: Element[][] = [];
  private pointed: Element[] = [];
  /** The pills of the bar, each with what it shows in the panel. */
  private pills: { button: HTMLElement; details: Details }[] = [];
  private drawnVersion = -1;
  private drawnPath?: string;
  /** A link followed to this map before it was drawn: shown once it is. */
  private pendingAnchor?: string;
  issues: Issue[] = [];

  constructor(
    leaf: WorkspaceLeaf,
    private plugin: MapsPlugin,
  ) {
    super(leaf);
  }

  getViewType() {
    return MAP_VIEW;
  }

  getIcon() {
    return 'map';
  }

  getDisplayText() {
    return this.file?.basename ?? 'Map';
  }

  canAcceptExtension(extension: string) {
    return extension === 'md';
  }

  async onOpen() {
    const root = this.contentEl;
    root.empty();
    root.addClass('maps-md', 'maps-md-view');
    this.bar = root.createDiv({ cls: 'bar maps-md-bar' });
    this.viewsBar = root.createDiv({ cls: 'views-bar' });
    this.viewsBar.hidden = true;
    const stage = root.createDiv({ cls: 'maps-md-stage' });
    this.canvasEl = stage.createEl('main', { cls: 'maps-canvas' });
    this.page = this.canvasEl.createDiv({ cls: 'maps-page' });
    this.page.id = 'maps-md-page'; // the page of style.css (#page, renamed): every map view has its own, the id keeps its weight in the cascade
    this.navigationEl = stage.createDiv({ cls: 'navigation' });
    const button = (icon: string, label: string, onClick: () => void) => {
      const b = this.navigationEl.createEl('button', { cls: 'button button--ghost button--icon', attr: { 'aria-label': label } });
      setIcon(b, icon);
      b.addEventListener('click', onClick);
      return b;
    };
    button('minus', 'Zoom out', () => this.pan.zoomBy(1 / 1.25));
    this.zoomLabel = this.navigationEl.createEl('button', { cls: 'button button--ghost zoom-level', attr: { 'aria-label': 'Fit the map' } });
    this.zoomLabel.addEventListener('click', () => this.pan.home());
    button('plus', 'Zoom in', () => this.pan.zoomBy(1.25));
    this.pan = new PanCanvas(this.canvasEl, this.page, { wheelZooms: () => this.plugin.settings.wheelZooms, onZoom: (scale) => (this.zoomLabel.textContent = `${Math.round(scale * 100)} %`) });
    this.addAction('file-text', 'Open as Markdown', () => this.plugin.setMode(this.leaf, 'markdown'));
    this.registerDomEvent(this.canvasEl, 'click', (e) => this.click(e));
    this.registerDomEvent(this.canvasEl, 'mouseover', (e) => this.hover(e));
    this.registerDomEvent(this.canvasEl, 'pointermove', (e) => this.point(e));
    this.registerDomEvent(this.canvasEl, 'pointerleave', () => this.unpoint());
    this.registerDomEvent(this.viewsBar, 'click', (e) => {
      const tab = (e.target as Element).closest<HTMLElement>('[data-view]');
      if (tab && selectTab(this.contentEl, tab.dataset.view)) setTimeout(() => this.pan.home());
    });
    this.registerDomEvent(root.doc, 'click', (e) => !(e.target as Element).closest?.('.column-filter, .column-filter-menu') && openColumnFilter(this.page, null));
  }

  async onClose() {
    this.unmount?.();
    this.pan?.destroy();
    this.plugin.detailsClosed(this);
  }

  async onLoadFile(file: TFile) {
    this.lastDraw = aboutDetails;
    this.drawnPath = undefined;
    await this.draw();
  }

  async onUnloadFile() {
    this.unmount?.();
    this.unmount = undefined;
  }

  /** A link followed into this map (`[[map#Element#Item]]`, from Obsidian or from a drawing): what it reaches is
   *  selected, once the map is drawn. */
  setEphemeralState(state: unknown) {
    super.setEphemeralState(state);
    const s = (state ?? {}) as { subpath?: string; mapsAnchor?: string };
    const anchor = s.mapsAnchor ?? (s.subpath ? this.anchorOfSubpath(s.subpath) : undefined);
    if (!anchor) return;
    if (this.ctx && this.drawnVersion === this.plugin.store.version) this.reveal(anchor);
    else this.pendingAnchor = anchor;
  }

  /** The anchor of a subpath of Obsidian (`#Element#Item`), resolved as maps.md resolves links. */
  private anchorOfSubpath(subpath: string) {
    const file = this.mapFile();
    if (!file) return;
    const r = linksOf(this.plugin.store.index(), file.key).resolve(`[[${file.name}${subpath}]]`);
    if (!r.element) return;
    return [anchorOf(r.element.name), ...(r.lines ?? [])].join('/');
  }

  private mapFile(): IndexedMap | undefined {
    const file = this.file && this.plugin.store.file(this.file.path);
    return file?.isMap ? file : undefined;
  }

  /** Draws the map again when it, a map of its project or a file of its types changed; `force`, always. */
  async draw(force = false) {
    if (!this.file || !this.page) return;
    await this.plugin.store.load();
    const version = this.plugin.store.version;
    if (!force && version === this.drawnVersion && this.drawnPath === this.file.path) return;
    await this.plugin.serial(() => this.drawNow());
  }

  private async drawNow() {
    const store = this.plugin.store;
    const tfile = this.file;
    if (!tfile) return;
    const version = store.version;
    const same = this.drawnPath === tfile.path;
    const place = same ? this.pan.place() : undefined;
    const tab = same ? this.contentEl.querySelector<HTMLElement>('.views [data-view][aria-selected="true"]')?.dataset.view : undefined;
    const file = store.file(tfile.path);
    this.issues = [];
    this.ctx = undefined;
    let definition: Definition | undefined;
    let html: string;
    let notice = '';
    if (!file) html = `<p class="error">${escapeHtml(tfile.path)} is not read by maps.md: it is out of the folder of the settings.</p>`;
    else if (file.error) html = `<p class="error">${escapeHtml(file.path)}: ${escapeHtml(file.error)}</p>`;
    else if (!file.isMap) html = '<p class="empty">Not a map: a map has a "type" in its front matter.</p>';
    else {
      const found = store.definitionOf(file);
      this.plugin.styles.apply(this.contentEl, file);
      if (!found.definition) {
        html = '';
        notice = found.error;
        this.missingType(found.error, found.missing);
      } else {
        definition = found.definition;
        try {
          html = await drawMap(file.map, definition, linksOf(store.index(), file.key), { host: this.contentEl });
        } catch (e) {
          html = `<p class="error">${escapeHtml(file.path)}: ${escapeHtml((e as Error).message)}</p>`;
        }
      }
    }
    if (this.file !== tfile) return; // another file was opened meanwhile
    this.drawnVersion = version;
    this.drawnPath = tfile.path;
    if (notice) {
      this.renderBar(file, undefined);
      this.viewsBar.hidden = true;
      this.navigationEl.hidden = true;
      return this.plugin.mapShown(this);
    }
    this.unmount?.();
    this.unmount = mount(this.page, html!, this.id);
    this.navigationEl.hidden = false;
    const aside = createDiv();
    for (const section of this.page.querySelectorAll(':scope > .context, :scope > .open-questions')) aside.append(section);
    const tabs = this.page.querySelector('.views');
    this.viewsBar.replaceChildren(...(tabs ? [tabs] : []));
    this.viewsBar.hidden = !tabs;
    if (file?.isMap && definition) {
      this.issues = issuesOfMap(store, file, definition);
      this.ctx = { file, index: store.index(), definition, aside, page: this.page, issues: this.issues, id: this.id };
    }
    this.renderBar(file, aside);
    if (tab !== undefined) selectTab(this.contentEl, tab);
    if (place) this.pan.restore(place);
    else this.pan.home();
    if (this.pendingAnchor && this.ctx) {
      const anchor = this.pendingAnchor;
      this.pendingAnchor = undefined;
      requestAnimationFrame(() => this.reveal(anchor));
    } else this.publishDetails();
    this.plugin.mapShown(this);
  }

  /** The bar: the title and the type of the map, About this map, its open questions, what the check finds wrong. */
  private renderBar(file: IndexedFile | undefined, aside?: HTMLElement) {
    const bar = this.bar;
    bar.empty();
    this.pills = [];
    const head = bar.createSpan({ cls: 'map-head' });
    head.createEl('strong', { cls: 'map-title', text: file?.title ?? this.file?.basename ?? '' });
    if (file?.isMap) head.createSpan({ cls: 'map-meta map-type', text: file.map.meta.type });
    const actions = head.createSpan({ cls: 'map-actions' });
    if (!this.ctx) return;
    const pill = (text: string, details: Details, cls = '') => {
      const b = actions.createEl('button', { cls: `bar-pill ${cls}`, text });
      b.setAttribute('aria-pressed', String(this.lastDraw === details));
      b.addEventListener('click', () => this.showDetails(details, true));
      this.pills.push({ button: b, details });
    };
    pill('About this map', aboutDetails);
    const questions = aside?.querySelectorAll('.open-questions > ul > li').length ?? 0;
    if (questions) pill(`${questions} open question${questions === 1 ? '' : 's'}`, questionsDetails);
    if (this.issues.length) pill(issuesTitle(this.issues), issuesDetails, this.issues.some((i) => i.level === 'error') ? 'bar-pill--error' : '');
  }

  /** The message of a map whose type is not found, with what adds it. */
  private missingType(error: string, type?: string) {
    this.unmount?.();
    this.unmount = undefined;
    this.page.empty();
    const box = this.page.createDiv({ cls: 'maps-md-missing' });
    box.createEl('p', { cls: 'error', text: error });
    const known = type && this.plugin.catalog.has(type);
    box.createEl('p', {
      cls: 'empty',
      text: known ? `The catalog of maps.md has a type "${type}": add it to the types folder of this map to draw it.` : 'Add a type from the catalog of maps.md, or write its definition in the types folder.',
    });
    const actions = box.createDiv({ cls: 'maps-md-actions' });
    if (known) actions.createEl('button', { cls: 'mod-cta', text: `Add “${type}” from the catalog` }).addEventListener('click', () => this.plugin.addType(type!, this.file!.path));
    actions.createEl('button', { text: 'Choose a type from the catalog…' }).addEventListener('click', () => this.plugin.chooseType(this.file?.path));
    actions.createEl('button', { text: 'Open as Markdown' }).addEventListener('click', () => this.plugin.setMode(this.leaf, 'markdown'));
    this.pan.panzoom.reset({ animate: false });
  }

  // ---- The details, in the side panel ----

  /** Shows what `draw` gives in the side panel, and selects it on the map; `toggle`, a pill pressed again shows About. */
  showDetails(draw: Details, toggle = false) {
    if (toggle && this.lastDraw === draw && draw !== aboutDetails) draw = aboutDetails;
    this.lastDraw = draw;
    this.publishDetails(true);
  }

  /** The details of this map, drawn again: in the side panel, and on the map what they select. `reveal`, the panel is
   *  opened when it is closed. */
  publishDetails(reveal = false) {
    if (!this.ctx) return;
    let shown = this.lastDraw(this.ctx);
    if (!shown) ((this.lastDraw = aboutDetails), (shown = aboutDetails(this.ctx)!));
    this.unselect();
    for (const el of shown.selected ?? []) el.classList.add('is-selected');
    focusLinks(this.page, this.id, shown.selected);
    this.askedNow = shown.asked ?? [];
    ask(this.page, this.askedNow);
    for (const { button, details } of this.pills) button.setAttribute('aria-pressed', String(details === this.lastDraw));
    this.plugin.publishDetails(this, shown, reveal);
  }

  private unselect() {
    this.page.querySelectorAll('.is-selected').forEach((el) => el.classList.remove('is-selected'));
    focusLinks(this.page, this.id);
    ask(this.page);
  }

  /** A click in the side panel, on what it shows of this map. */
  detailsClick(e: MouseEvent) {
    const target = e.target as Element;
    const link = target.closest<HTMLAnchorElement>('a[href]');
    if (link) return this.followLink(link, e);
    if (!this.ctx) return;
    const line = target.closest<HTMLElement>('[data-source-line]');
    const up = target.closest<HTMLElement>('[data-details-el]');
    const more = target.closest<HTMLElement>('[data-details-line]');
    if (up) {
      this.showDetails(elementDetails(up.dataset.detailsEl!));
      const shown = this.page.querySelector(`.view:not([hidden]) [data-el="${CSS.escape(up.dataset.detailsEl!)}"]`);
      if (shown && up.closest('.details-links')) this.pan.center(shown);
    } else if (more) this.showDetails(valueDetails(Number(more.dataset.detailsLine)));
    else if (line && this.file) this.plugin.openAtLine(this.file.path, Number(line.dataset.sourceLine));
  }

  /** The open question under the pointer, in the side panel: only what it is about stands out. */
  detailsHover(e: MouseEvent | null) {
    if (!this.askedNow.length) return;
    const li = (e?.target as Element | undefined)?.closest('.details-questions > ul > li');
    ask(this.page, this.askedNow, li ? [...li.parentElement!.children].indexOf(li) : undefined);
  }

  /** Shows the line of the details in the Markdown. */
  showInMarkdown(line?: number) {
    this.plugin.setMode(this.leaf, 'markdown', line);
  }

  // ---- The drawing ----

  private click(e: MouseEvent) {
    const target = e.target as Element;
    if (filterClick(e)) return e.stopPropagation();
    const link = target.closest<HTMLAnchorElement>('a[href]');
    if (!this.ctx) {
      if (link) this.followLink(link, e);
      return;
    }
    // A value that is a link alone shows what it reaches in the panel, rather than leaving the map.
    const valueLink = e.detail <= 1 && link?.matches('a.link') ? link.closest<HTMLElement>('.view li[data-src]') : null;
    const line = valueLink ? Number(valueLink.dataset.src!.split(':')[0]) : undefined;
    if (valueLink && line !== undefined && /^\s*\[\[[^\]]+\]\]\s*$/.test(valueAt(this.ctx, line)?.value.text ?? '') && !Keymap.isModEvent(e)) {
      e.preventDefault();
      return this.showDetails(valueDetails(line));
    }
    if (link) return this.followLink(link, e);
    if (e.detail > 1 || target.closest('input, textarea') || !this.contentEl.doc.getSelection()?.isCollapsed) return;
    const pointed = pointedAt(this.ctx, target);
    if (!pointed) return;
    this.showDetails(pointed.details, false);
    if (pointed.center) this.pan.center(pointed.center);
  }

  /** Under the pointer, what a click selects. */
  private point(e: PointerEvent) {
    const now = e.buttons || !this.ctx ? [] : (pointedAt(this.ctx, e.target as Element)?.drawn ?? []);
    if (now.length === this.pointed.length && now.every((n, k) => n === this.pointed[k])) return;
    this.pointed.forEach((n) => n.classList.remove('is-pointed'));
    (this.pointed = now).forEach((n) => n.classList.add('is-pointed'));
  }

  private unpoint() {
    this.pointed.forEach((n) => n.classList.remove('is-pointed'));
    this.pointed = [];
  }

  /** A link of the drawing under the pointer: the preview of Obsidian, with Ctrl or Cmd. */
  private hover(e: MouseEvent) {
    const link = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#/"]');
    if (link && this.file) this.plugin.hoverLink(e, link, this, this.file.path);
  }

  /** Follows a link of the drawing or of the panel: in this map, it selects what it reaches; to another map, it opens
   *  it in Obsidian (`openLinkText`), at what it reaches. */
  followLink(link: HTMLAnchorElement, e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const href = parseHref(link.getAttribute('href') ?? '');
    if (!href) return;
    if (href.path === this.file?.path && !Keymap.isModEvent(e)) return href.anchor ? this.reveal(href.anchor) : this.showDetails(aboutDetails);
    this.plugin.openTarget(href.path, href.anchor, this.file?.path ?? '', Keymap.isModEvent(e));
  }

  /** Selects what an anchor reaches (`el-name/12/14`) and brings it to the middle of the canvas. */
  reveal(anchor: string) {
    if (!this.ctx) return void (this.pendingAnchor = anchor);
    // An element drawn in another view than the one shown: the main view, where every element has its anchor.
    let target = targetOf(this.page, anchor);
    if (target && !target.getClientRects().length && target.closest('[data-view-panel]')) {
      selectTab(this.contentEl, (target.closest('[data-view-panel]') as HTMLElement).dataset.viewPanel);
      target = targetOf(this.page, anchor);
    }
    if (!target) return;
    const pointed = pointedAt(this.ctx, target);
    if (pointed) this.showDetails(pointed.details);
    else target.classList.add('target');
    this.pan.center(target);
  }

  /** The element whose line (from 0) is the nearest above a line of the file: what the Markdown shows, on the map. */
  elementAtLine(line: number) {
    const file = this.mapFile();
    if (!file) return;
    const section = [...file.map.sections].reverse().find((s) => s.src.line <= line);
    return section && anchorOf(section.name);
  }
}
