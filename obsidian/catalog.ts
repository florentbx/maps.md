// The catalog of 28 types of maps.md, bundled into the plugin (skills/maps/types/), and the command that copies one
// into the types folder of a project: its definition, its layout and its style, as the skill does. Nothing is written
// over: a file already there stays.

import { App, Notice, SuggestModal, normalizePath, TFolder } from 'obsidian';
import types from 'maps-md:catalog';

export interface CatalogType {
  name: string;
  /** What the type is for: the first sentence of the Context of its definition. */
  description: string;
  files: { name: string; text: string }[];
}

/** The first paragraph of `## Context` of a definition. */
function describe(text: string) {
  const context = /^## Context\s*\n([\s\S]*?)(?:\n\s*\n|\n##|$)/m.exec(text)?.[1] ?? '';
  return context.replace(/\s+/g, ' ').trim();
}

export class Catalog {
  readonly types: CatalogType[] = Object.entries(types)
    .map(([name, t]) => ({
      name,
      description: describe(t.md),
      files: [
        { name: `${name}.md`, text: t.md },
        ...(t.layout ? [{ name: `${name}.layout.md`, text: t.layout }] : []),
        ...(t.css ? [{ name: `${name}.css`, text: t.css }] : []),
      ],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  has(name: string) {
    return this.types.some((t) => t.name === name);
  }

  get(name: string) {
    return this.types.find((t) => t.name === name);
  }

  /** Copies a type into a folder of the vault (created when missing). Returns the files written. */
  async add(app: App, name: string, folder: string) {
    const type = this.get(name);
    if (!type) throw new Error(`No type "${name}" in the catalog.`);
    const dir = normalizePath(folder);
    if (!(app.vault.getAbstractFileByPath(dir) instanceof TFolder)) await app.vault.createFolder(dir).catch(() => {});
    const written: string[] = [];
    const kept: string[] = [];
    for (const file of type.files) {
      const path = normalizePath(`${dir}/${file.name}`);
      if (app.vault.getAbstractFileByPath(path)) kept.push(path);
      else (await app.vault.create(path, file.text), written.push(path));
    }
    new Notice(written.length ? `maps.md: “${name}” added to ${dir}/${kept.length ? ` (${kept.length} file${kept.length === 1 ? '' : 's'} already there, kept)` : ''}.` : `maps.md: “${name}” is already in ${dir}/.`);
    return written;
  }
}

/** The list of the types of the catalog, to choose one; searched by name and by what it is for. */
export class TypeModal extends SuggestModal<CatalogType> {
  constructor(
    app: App,
    private catalog: Catalog,
    private folder: string,
    private onChoose: (type: CatalogType) => void,
  ) {
    super(app);
    this.setPlaceholder(`A type to add to ${folder}/`);
  }

  getSuggestions(query: string) {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return this.catalog.types.filter((t) => words.every((w) => `${t.name} ${t.description}`.toLowerCase().includes(w)));
  }

  renderSuggestion(type: CatalogType, el: HTMLElement) {
    el.createDiv({ text: type.name });
    el.createEl('small', { text: type.description, cls: 'maps-md-suggestion-description' });
  }

  onChooseSuggestion(type: CatalogType) {
    this.onChoose(type);
  }
}
