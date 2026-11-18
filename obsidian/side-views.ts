// The two panels of the plugin, in the right sidebar: the details of what is clicked on a map (as the panel of
// maps.html), and the check of the maps of the vault.

import { ItemView, setIcon, type HoverPopover, type WorkspaceLeaf } from 'obsidian';
import { escapeHtml } from '../renderer/links.ts';
import { checkVault, type FileIssues } from './check.ts';
import type { Shown } from './details.ts';
import type MapsPlugin from './main.ts';
import type { MapView } from './map-view.ts';

export const DETAILS_VIEW = 'maps-md-details';
export const ISSUES_VIEW = 'maps-md-issues';

/** The details of the map shown last: what its Map view gives (`show`), with its links and cards, which act on it. */
export class DetailsView extends ItemView {
  hoverPopover: HoverPopover | null = null;
  private owner?: MapView;
  private head!: HTMLElement;
  private body!: HTMLElement;
  private line?: number;

  constructor(
    leaf: WorkspaceLeaf,
    private plugin: MapsPlugin,
  ) {
    super(leaf);
  }

  getViewType() {
    return DETAILS_VIEW;
  }

  getDisplayText() {
    return 'Map details';
  }

  getIcon() {
    return 'map-pin';
  }

  async onOpen() {
    const root = this.contentEl;
    root.empty();
    root.addClass('maps-md', 'maps-md-details');
    this.head = root.createDiv({ cls: 'maps-md-details-head' });
    this.body = root.createDiv({ cls: 'details-body' });
    this.registerDomEvent(this.body, 'click', (e) => this.owner?.detailsClick(e));
    this.registerDomEvent(this.body, 'mouseover', (e) => {
      this.owner?.detailsHover(e);
      const link = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#/"]');
      if (link && this.owner?.file) this.plugin.hoverLink(e, link, this, this.owner.file.path);
    });
    this.registerDomEvent(this.body, 'mouseleave', () => this.owner?.detailsHover(null));
    this.clear();
    this.plugin.detailsOpened(this);
  }

  async onClose() {
    this.plugin.detailsOpened(undefined);
  }

  /** Nothing to show: no map is open. */
  clear() {
    this.owner = undefined;
    this.head?.empty();
    if (this.body) this.body.innerHTML = '<p class="details-empty">Open a map in the Map view: a click on what it draws shows its details here.</p>';
  }

  /** Shows the details of a map: `shown`, from its Map view; the style of its type applies (`styleOf`). */
  show(owner: MapView, shown: Shown) {
    this.owner = owner;
    this.line = shown.line;
    this.plugin.styles.copy(owner.contentEl, this.contentEl);
    this.head.empty();
    if (this.line !== undefined) {
      const b = this.head.createEl('button', { cls: 'clickable-icon', attr: { 'aria-label': 'Show in the Markdown' } });
      setIcon(b, 'file-text');
      b.addEventListener('click', () => owner.showInMarkdown(this.line));
    }
    const scroll = this.body.scrollTop;
    this.body.innerHTML = `<p class="details-kicker">${shown.kicker}</p><h2 class="details-title">${shown.title}</h2>${shown.html}`;
    this.body.scrollTop = scroll;
  }

  ownedBy(view: MapView) {
    return this.owner === view;
  }
}

/** The check of the maps of the vault: every issue, by file, with its line; a click opens the Markdown there. */
export class IssuesView extends ItemView {
  private result?: { files: FileIssues[]; maps: number };

  constructor(
    leaf: WorkspaceLeaf,
    private plugin: MapsPlugin,
  ) {
    super(leaf);
  }

  getViewType() {
    return ISSUES_VIEW;
  }

  getDisplayText() {
    return 'Maps check';
  }

  getIcon() {
    return 'list-checks';
  }

  async onOpen() {
    this.contentEl.addClass('maps-md', 'maps-md-issues');
    this.registerDomEvent(this.contentEl, 'click', (e) => {
      const row = (e.target as Element).closest<HTMLElement>('[data-path]');
      if (row) this.plugin.openAtLine(row.dataset.path!, Number(row.dataset.line) || undefined);
      if ((e.target as Element).closest('.maps-md-recheck')) this.refresh();
    });
    await this.refresh();
  }

  /** Checks the vault again and shows it. */
  async refresh() {
    await this.plugin.store.load();
    this.result = checkVault(this.plugin.store);
    this.render();
  }

  private render() {
    const { files, maps } = this.result!;
    const all = files.flatMap((f) => f.issues);
    const errors = all.filter((i) => i.level === 'error').length;
    const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
    const rows = files
      .map(
        (f) =>
          `<section class="maps-md-check-file"><h3 title="${escapeHtml(f.path)}">${escapeHtml(f.title)} <span class="maps-md-path">${escapeHtml(f.path)}</span></h3><ul class="details-links details-issues">${f.issues
            .map(
              (i) =>
                `<li><button class="details-link" data-path="${escapeHtml(f.path)}" data-line="${i.line ?? ''}"><span class="details-link-name">${escapeHtml(i.where)}${i.line ? ` <span class="maps-md-line">line ${i.line}</span>` : ''}</span><span class="details-issue${i.level === 'error' ? ' details-issue--error' : ''}">${escapeHtml(i.message)}</span></button></li>`,
            )
            .join('')}</ul></section>`,
      )
      .join('');
    this.contentEl.innerHTML = `<div class="details-body"><p class="details-kicker">Check</p><h2 class="details-title">${plural(errors, 'error')}, ${plural(all.length - errors, 'warning')}</h2><p class="details-updated">In ${plural(maps, 'map')}. <button class="maps-md-recheck">Check again</button></p>${rows || '<p class="details-empty">Nothing to fix.</p>'}</div>`;
  }
}
