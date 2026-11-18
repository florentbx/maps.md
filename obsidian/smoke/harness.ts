// The page of the smoke test (run.ts): the plugin, as it is, on the stand-in of Obsidian (obsidian-stub.ts), with the
// files of the vault given by the test. `window.smoke` is what the test calls.

import { App, notices, TFile } from 'obsidian';
import MapsPlugin from '../main.ts';
import { MapView } from '../map-view.ts';

let app: any;
let plugin: any;

const frames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

/** Waits until the drawings asked for are done. */
async function idle() {
  for (let k = 0; k < 3; k++) {
    await new Promise((r) => setTimeout(r, 350)); // the pause of the redraw after a change
    await plugin.serial(async () => {});
    await frames();
  }
}

const activeView = () => app.workspace.getMostRecentLeaf()?.view;

(window as any).smoke = {
  async start(files: Record<string, string>) {
    app = new App(document.querySelector('.app-container') as HTMLElement, files);
    plugin = new MapsPlugin(app, { id: 'maps-md', version: '0.1.0' });
    plugin._loaded = true;
    await plugin.onload();
    app.workspace.setLayoutReady();
    await plugin.store.load();
    await idle();
  },
  idle,
  /** Opens a file as Obsidian opens a link to it. */
  async open(linktext: string, source = '', newLeaf = false) {
    await app.workspace.openLinkText(linktext, source, newLeaf);
    await idle();
    return this.state();
  },
  state() {
    const view = activeView();
    const details = document.querySelector('.maps-md-details .details-body');
    return {
      type: view?.getViewType(),
      file: view?.file?.path,
      title: view?.contentEl.querySelector('.map-title')?.textContent,
      pills: [...(view?.contentEl.querySelectorAll('.bar-pill') ?? [])].map((b: any) => `${b.textContent}${b.getAttribute('aria-pressed') === 'true' ? ' (pressed)' : ''}`),
      tabs: [...(view?.contentEl.querySelectorAll('.views [data-view]') ?? [])].map((b: any) => `${b.textContent}${b.getAttribute('aria-selected') === 'true' ? ' (selected)' : ''}`),
      drawn: view?.contentEl.querySelectorAll('.maps-page [data-el]').length ?? 0,
      selected: view?.contentEl.querySelectorAll('.is-selected').length ?? 0,
      asked: view?.contentEl.querySelectorAll('.is-asked').length ?? 0,
      error: view?.contentEl.querySelector('.maps-page .error')?.textContent,
      details: details ? { kicker: details.querySelector('.details-kicker')?.textContent, title: details.querySelector('.details-title')?.textContent } : undefined,
      status: (document.querySelector('.maps-md-status') as HTMLElement | null)?.style.display === 'none' ? '' : document.querySelector('.maps-md-status')?.textContent,
      place: view instanceof MapView ? (view as any).pan.place() : undefined,
      cursor: view?.cursor,
      headerActions: [...(view?.containerEl.querySelectorAll('.view-action') ?? [])].map((a: any) => a.getAttribute('aria-label')),
      notices: [...notices],
    };
  },
  async command(id: string) {
    const c = plugin.commands.find((x: any) => x.id === id);
    if (c.checkCallback) c.checkCallback(false);
    else await c.callback();
    await idle();
  },
  async modify(path: string, from: string, to: string) {
    const file = app.vault.getAbstractFileByPath(path) as TFile;
    const text = await app.vault.read(file);
    if (!text.includes(from)) throw new Error(`"${from}" is not in ${path}`);
    await app.vault.modify(file, text.replace(from, to));
    await idle();
  },
  async create(path: string, text: string) {
    await app.vault.create(path, text);
    await idle();
  },
  exists: (path: string) => Boolean(app.vault.getAbstractFileByPath(path)),
  async pan(x: number, y: number, scale: number) {
    (activeView() as any).pan.restore({ x, y, scale });
    await frames();
  },
  /** A note in the reading view with a map embedded (`![[target]]`): the post processors of the plugin run on it, then
   *  Obsidian fills the embed with the note, as it does: the plugin keeps its drawing. */
  async readingEmbed(source: string, target: string) {
    const leaf = app.workspace.getLeaf(true);
    await leaf.setViewState({ type: 'reading-stub', active: true });
    const view = leaf.view;
    view.containerEl.dataset.type = 'markdown';
    const content = view.containerEl.createDiv({ cls: 'view-content markdown-reading-view' });
    const rendered = content.createDiv({ cls: 'markdown-preview-view markdown-rendered' });
    rendered.createEl('h1', { text: 'A note with a map in it' });
    rendered.createEl('p', { text: 'The map below is embedded with ![[…]] and drawn by the plugin.' });
    const p = rendered.createEl('p');
    const span = p.createSpan({ cls: 'internal-embed', attr: { src: target, alt: target } });
    const children: any[] = [];
    for (const pp of plugin.postProcessors) pp(rendered, { sourcePath: source, addChild: (c: any) => (children.push(c), c.load()) });
    span.createDiv({ cls: 'markdown-embed', text: 'Obsidian would show the note here' });
    await idle();
    return { children: children.length, drawn: span.querySelectorAll('[data-el]').length, foreign: span.querySelectorAll('.markdown-embed').length };
  },
  /** An embed added by the editor in Live Preview: the plugin sees it and draws it. */
  async livePreviewEmbed(target: string) {
    const view = activeView();
    const source = view.containerEl.querySelector('.markdown-source-view') ?? view.contentEl.createDiv({ cls: 'markdown-source-view' });
    const el = source.createDiv({ cls: 'internal-embed markdown-embed', attr: { src: target } });
    await idle();
    return { drawn: el.querySelectorAll('[data-el]').length };
  },
  async setTheme(dark: boolean) {
    document.body.classList.toggle('theme-dark', dark);
    document.body.classList.toggle('theme-light', !dark);
    await frames();
  },
  /** The issues of the check panel, as listed. */
  issues() {
    return [...document.querySelectorAll('.maps-md-issues .details-link')].map((b: any) => `${b.dataset.path}:${b.dataset.line}`);
  },
  /** Whether a style of the plugin reaches anything outside a map: every rule of the plugin's sheets is scoped. */
  leaks() {
    const bad: string[] = [];
    // The selectors of a list, split on its top-level commas only.
    const split = (list: string) => {
      const parts: string[] = [];
      let depth = 0;
      let start = 0;
      for (let i = 0; i < list.length; i++) {
        if (list[i] === '(') depth++;
        else if (list[i] === ')') depth--;
        else if (list[i] === ',' && !depth) (parts.push(list.slice(start, i)), (start = i + 1));
      }
      return [...parts, list.slice(start)];
    };
    for (const sheet of document.styleSheets) {
      const owner = sheet.ownerNode as HTMLElement | null;
      if (!owner || !(owner.dataset.mapsMd || owner.id === 'plugin-styles')) continue;
      const walk = (rules: CSSRuleList) => {
        for (const rule of rules) {
          if (rule instanceof CSSStyleRule) {
            for (const s of split(rule.selectorText)) if (!/\.maps-md|\.maps-md-|\.internal-embed\.maps-md-embedded|\.view-content\.maps-md/.test(s)) bad.push(s.trim());
          } else if ('cssRules' in rule && !(rule instanceof CSSKeyframesRule)) walk((rule as CSSGroupingRule).cssRules);
        }
      };
      walk(sheet.cssRules);
    }
    return bad;
  },
};
