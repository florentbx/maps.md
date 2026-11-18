// The styles of the types and the themes of the projects, in the page of Obsidian: each one scoped to the maps that
// use it (scope-css.ts), so that it never reaches the rest of Obsidian, nor a map of another type or project. A map's
// container names its style and its theme (`data-maps-style`, `data-maps-theme`); one <style> per file, kept up to
// date with it.

import type { IndexedMap } from '../renderer/model.ts';
import { scopeCss } from './scope-css.ts';
import type { MapsStore } from './store.ts';

/** A short name for a path, as an attribute value. */
function keyOf(path: string) {
  let h = 5381;
  for (let i = 0; i < path.length; i++) h = ((h << 5) + h + path.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export class StyleRegistry {
  private elements = new Map<string, { el: HTMLStyleElement; css: string }>();

  constructor(private store: MapsStore) {}

  private put(key: string, css: string, scoped: () => string) {
    const found = this.elements.get(key);
    if (found?.css === css) return;
    const el = found?.el ?? document.head.createEl('style', { attr: { 'data-maps-md': key } });
    el.textContent = scoped();
    this.elements.set(key, { el, css });
  }

  /** Names the style of the type of a map and the theme of its project on its container, and puts them in the page. */
  apply(container: HTMLElement, file: IndexedMap) {
    const type = file.map.meta.type;
    const css = this.store.typeText(file.path, `${type}.css`);
    if (css) {
      const key = `s${keyOf(`${this.store.typesFolderOf(file.path)}/${type}`)}`;
      // :where, so that a rule of a type weighs as in maps.html against the rules of style.css.
      this.put(key, css, () => scopeCss(css, { scope: `.maps-md:where([data-maps-style="${key}"])`, dark: '.theme-dark' }));
      container.dataset.mapsStyle = key;
    } else delete container.dataset.mapsStyle;
    const theme = this.store.themeOf(file.path);
    if (theme) {
      const key = `t${keyOf(theme.path)}`;
      // Over the colors of Obsidian (styles.css): a theme of a project wins, as it does in maps.html.
      this.put(key, theme.css, () => scopeCss(theme.css, { scope: `.maps-md.maps-md[data-maps-theme="${key}"]`, dark: '.theme-dark' }));
      container.dataset.mapsTheme = key;
    } else delete container.dataset.mapsTheme;
  }

  /** The same style and theme on another container (the side panel of a map). */
  copy(from: HTMLElement, to: HTMLElement) {
    for (const name of ['mapsStyle', 'mapsTheme'] as const) {
      if (from.dataset[name]) to.dataset[name] = from.dataset[name];
      else delete to.dataset[name];
    }
  }

  destroy() {
    for (const { el } of this.elements.values()) el.remove();
    this.elements.clear();
  }
}
