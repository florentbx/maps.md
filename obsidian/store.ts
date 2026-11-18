// The maps of the vault as the renderer reads them: the text of every Markdown file (under the folder of the settings)
// and of the styles of the types, kept up to date from the events of the vault; the link index of them all, built
// again when it is asked for after a change; and the types of each project (`projectsOf`), as maps.html finds them: a
// map takes its type in the types folder of its project, the nearest one up.

import { App, TFile, type TAbstractFile } from 'obsidian';
import { buildIndex, projectsOf } from '../renderer/links.ts';
import type { Definition, HrefOf, IndexedFile, IndexedMap, LinkIndex, Source } from '../renderer/model.ts';
import { parseDefinition, readMap } from '../renderer/read.ts';
import type { MapsSettings } from './settings.ts';

/** The address of a file, or of one of its elements, in the drawings of the plugin: `#/<path>` or `#/<path>/<anchor>`,
 *  the anchor as maps.html writes it (`el-name`, then the lines of an item: `el-name/12/14`). A click on it is followed
 *  by the plugin (`parseHref`), never by the browser. */
export const hrefOf: HrefOf = (file, anchor) => `#/${encodeURIComponent(file.path)}${anchor ? `/${anchor}` : ''}`;
export function parseHref(href: string) {
  const m = /^#\/([^/]*)(?:\/(.*))?$/.exec(href);
  return m ? { path: decodeURIComponent(m[1]), anchor: m[2] ?? '' } : undefined;
}

/** The type of a map, as its front matter says it, or nothing for a plain note or a type definition. */
export function typeOfText(text: string) {
  try {
    const type = readMap(text).meta.type;
    return type && type !== 'type-definition' ? type : undefined;
  } catch {
    return undefined;
  }
}

/** What a map needs to be drawn: its definition, or why there is none. */
export type DefinitionResult = { definition: Definition; error?: undefined } | { definition?: undefined; error: string; missing?: string };

export class MapsStore {
  /** The texts read, by path: every Markdown file, the styles of the types and the themes. */
  private texts = new Map<string, string>();
  private built?: LinkIndex;
  private builtProjects?: ReturnType<typeof projectsOf>;
  private ready?: Promise<void>;
  /** Changes since the index was built: a counter, so that a view knows when to draw again. */
  version = 0;

  constructor(
    private app: App,
    private settings: () => MapsSettings,
  ) {}

  get typesFolder() {
    return this.settings().typesFolder || 'types';
  }

  /** Whether the plugin reads a file: a Markdown file under the maps folder, or a style of a type or a theme. */
  reads(path: string) {
    const folder = this.settings().mapsFolder;
    if (folder && !path.startsWith(`${folder}/`)) return false;
    if (/\.md$/i.test(path)) return true;
    return this.isStyle(path);
  }

  private isStyle(path: string) {
    const types = this.typesFolder.replace(/[.*+?^$()|[\]\\{}]/g, '\\$&');
    return new RegExp(`(^|/)${types}/[^/]+\\.css$`, 'i').test(path) || /(^|\/)theme\.css$/i.test(path);
  }

  /** Reads every file of the vault the plugin reads, once (and again after `reset`). */
  load() {
    this.ready ??= (async () => {
      const files = this.app.vault.getFiles().filter((f) => this.reads(f.path));
      const texts = await Promise.all(files.map(async (f) => [f.path, await this.app.vault.cachedRead(f)] as const));
      this.texts = new Map(texts);
      this.changed();
    })();
    return this.ready;
  }

  /** Forgets everything read: after the settings changed. */
  reset() {
    this.ready = undefined;
    this.texts.clear();
    this.changed();
    return this.load();
  }

  private changed() {
    this.built = undefined;
    this.builtProjects = undefined;
    this.version++;
  }

  /** A file created or changed: read again. Returns whether the plugin reads it. */
  async update(file: TAbstractFile) {
    if (!(file instanceof TFile) || !this.reads(file.path)) return false;
    const text = await this.app.vault.cachedRead(file);
    if (this.texts.get(file.path) === text) return false;
    this.texts.set(file.path, text);
    this.changed();
    return true;
  }

  remove(path: string) {
    if (!this.texts.delete(path)) return false;
    this.changed();
    return true;
  }

  async rename(file: TAbstractFile, oldPath: string) {
    const removed = this.remove(oldPath);
    return (await this.update(file)) || removed;
  }

  text(path: string) {
    return this.texts.get(path);
  }

  /** The Markdown files read, as the renderer takes them. */
  sources(): Source[] {
    return [...this.texts].filter(([path]) => /\.md$/i.test(path)).map(([path, text]) => ({ path, text }));
  }

  /** The projects of the vault: each folder that holds a types folder. From the files of the vault, so that it is
   *  known before they are read (when Obsidian opens the leaves it had). */
  projects() {
    this.builtProjects ??= projectsOf(this.app.vault.getFiles().map((f) => f.path).filter((p) => this.reads(p)), this.typesFolder);
    return this.builtProjects;
  }

  /** Whether the definition of a type is in the types folder of a map, read or not yet. */
  hasType(path: string, type: unknown) {
    return typeof type === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(type) && this.app.vault.getAbstractFileByPath(`${this.typesFolderOf(path)}/${type}.md`) instanceof TFile;
  }

  /** The link index of every map read, built again after a change. */
  index(): LinkIndex {
    this.built ??= buildIndex(this.sources(), { hrefOf, types: this.typesFolder });
    return this.built;
  }

  file(path: string): IndexedFile | undefined {
    return [...this.index().files.values()].find((f) => f.path === path);
  }

  /** The folder of the project of a file, with its `/` ('' at the root of the vault), when the file is in one. */
  projectOf(path: string) {
    const root = this.projects().rootOf(path);
    return root !== undefined && path.startsWith(root) ? root : undefined;
  }

  /** Where the types of a map are: the types folder of its project, or else the one of the maps folder of the
   *  settings (as maps.html, which takes the nearest types folder up, or the one at the top of the folder). */
  typesFolderOf(path: string) {
    const root = this.projects().rootOf(path);
    if (root !== undefined) return `${root}${this.typesFolder}`;
    const folder = this.settings().defaultFolder;
    return folder ? `${folder}/${this.typesFolder}` : this.typesFolder;
  }

  /** A text of a type in the project of a file: `<type>`, `<type>.layout` or `<type>.css`. */
  typeText(path: string, name: string) {
    const folder = this.typesFolderOf(path);
    return this.texts.get(`${folder}/${name}${name.endsWith('.css') ? '' : '.md'}`);
  }

  /** The theme of the project of a file: `theme.css` at its root. */
  themeOf(path: string) {
    const root = this.projects().rootOf(path) ?? '';
    const theme = `${root}theme.css`;
    return this.texts.has(theme) ? { path: theme, css: this.texts.get(theme)! } : undefined;
  }

  /** The definition of the type of a map, with its layout, or why it cannot be had. */
  definitionOf(file: IndexedMap): DefinitionResult {
    const type = file.map.meta.type;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(type)) return { error: `"${type}" is not a type name (kebab-case, like "user-flow").` };
    const text = this.typeText(file.path, type);
    if (!text) return { error: `No definition for the type "${type}" in ${this.typesFolderOf(file.path)}/.`, missing: type };
    try {
      return { definition: parseDefinition(type, text, this.typeText(file.path, `${type}.layout`)) };
    } catch (e) {
      return { error: `The definition of "${type}" cannot be read: ${(e as Error).message}` };
    }
  }

  /** Whether a path is a file of a type (`types/<type>.md`, `.layout.md`, `.css`) or a theme: a change to it may
   *  change how every map of its project is drawn. */
  isTypeFile(path: string) {
    const types = this.typesFolder.replace(/[.*+?^$()|[\]\\{}]/g, '\\$&');
    return new RegExp(`(^|/)${types}/[^/]+\\.(md|css)$`, 'i').test(path) || /(^|\/)theme\.css$/i.test(path);
  }
}
