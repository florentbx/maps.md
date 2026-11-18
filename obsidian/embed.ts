// A map embedded in a note (`![[map]]`): drawn there, read only, at its size, in a box that scrolls; its tabs and
// links work. In the reading view through a Markdown post processor; in Live Preview, where Obsidian draws embeds in
// widgets of the editor, by watching the embeds it adds (best effort: see README.md).

import { MarkdownRenderChild, TFile, getLinkpath, type HoverPopover } from 'obsidian';
import { drawMap } from '../renderer/draw.ts';
import { escapeHtml, linksOf } from '../renderer/links.ts';
import { mount, selectTab, uid } from './canvas.ts';
import type MapsPlugin from './main.ts';
import { parseHref } from './store.ts';

export class MapEmbed extends MarkdownRenderChild {
  hoverPopover: HoverPopover | null = null;
  private id = uid();
  private unmount?: () => void;
  private box!: HTMLElement;
  private observer?: MutationObserver;

  constructor(
    containerEl: HTMLElement,
    private file: TFile,
    private sourcePath: string,
    private plugin: MapsPlugin,
  ) {
    super(containerEl);
  }

  onload() {
    const el = this.containerEl;
    el.empty();
    el.addClass('maps-md-embedded');
    this.box = el.createDiv({ cls: 'maps-md maps-md-embed' });
    this.box.style.maxHeight = `${this.plugin.settings.embedHeight}px`;
    // Obsidian may fill the embed with the note itself after this: what it adds is taken out again.
    this.observer = new MutationObserver(() => {
      for (const child of [...el.children]) if (child !== this.box) child.remove();
    });
    this.observer.observe(el, { childList: true });
    this.registerDomEvent(this.box, 'click', (e) => this.click(e));
    this.registerDomEvent(this.box, 'mouseover', (e) => {
      const link = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#/"]');
      if (link) this.plugin.hoverLink(e, link, this, this.sourcePath);
    });
    this.plugin.embeds.add(this);
    this.draw();
  }

  onunload() {
    this.observer?.disconnect();
    this.unmount?.();
    this.plugin.embeds.delete(this);
  }

  /** Whether a change to these files may change this drawing. */
  concerns(paths: Set<string>) {
    return this.plugin.concerns(this.file.path, paths);
  }

  /** Made by the plugin for Live Preview (no post processor owns it): unloaded once Obsidian takes it out. */
  managed = false;

  async draw() {
    await this.plugin.store.load();
    await this.plugin.serial(async () => {
      const store = this.plugin.store;
      const file = store.file(this.file.path);
      if (!file?.isMap) return void (this.box.innerHTML = `<p class="empty">${escapeHtml(this.file.basename)}: not a map.</p>`);
      const found = store.definitionOf(file);
      this.plugin.styles.apply(this.box, file);
      if (!found.definition) return void (this.box.innerHTML = `<p class="error">${escapeHtml(found.error)}</p>`);
      const tab = this.box.querySelector<HTMLElement>('.views [data-view][aria-selected="true"]')?.dataset.view;
      let html: string;
      try {
        html = await drawMap(file.map, found.definition, linksOf(store.index(), file.key), { host: this.box });
      } catch (e) {
        html = `<p class="error">${escapeHtml((e as Error).message)}</p>`;
      }
      this.unmount?.();
      const page = createDiv({ cls: 'maps-page' });
      page.id = 'maps-md-page';
      const title = createDiv({ cls: 'maps-md-embed-title' });
      title.createEl('a', { cls: 'internal-link', text: file.title, attr: { href: '#', 'data-href': this.file.path } });
      title.createSpan({ cls: 'map-type', text: file.map.meta.type });
      this.box.replaceChildren(title, page);
      this.unmount = mount(page, html, this.id);
      // The context and the open questions are in the Map view: here, the drawing alone.
      page.querySelectorAll(':scope > .context, :scope > .open-questions').forEach((s) => s.remove());
      if (tab !== undefined) selectTab(this.box, tab);
    });
  }

  private click(e: MouseEvent) {
    const target = e.target as Element;
    const tab = target.closest<HTMLElement>('[data-view]');
    if (tab) return void selectTab(this.box, tab.dataset.view);
    const title = target.closest('.maps-md-embed-title a');
    if (title) {
      e.preventDefault();
      return void this.plugin.openTarget(this.file.path, '', this.sourcePath, e.ctrlKey || e.metaKey);
    }
    const link = target.closest<HTMLAnchorElement>('a[href^="#/"]');
    const href = link && parseHref(link.getAttribute('href')!);
    if (!href) return;
    e.preventDefault();
    e.stopPropagation();
    this.plugin.openTarget(href.path, href.anchor, this.sourcePath, e.ctrlKey || e.metaKey);
  }
}

/** The file an embed shows (`<span class="internal-embed" src="…">`), when it is a map whose type is found. */
export function mapOfEmbed(plugin: MapsPlugin, el: Element, sourcePath: string) {
  const src = el.getAttribute('src');
  if (!src) return;
  const file = plugin.app.metadataCache.getFirstLinkpathDest(getLinkpath(src), sourcePath);
  if (!(file instanceof TFile) || file.extension !== 'md' || !plugin.isMap(file, true)) return;
  // An embed of a part of the map (`![[map#Element]]`) stays as Obsidian shows it.
  if (src.includes('#')) return;
  return file;
}
