// The settings of the plugin, with their defaults, and their tab in the settings of Obsidian.

import { App, PluginSettingTab, Setting } from 'obsidian';
import type MapsPlugin from './main.ts';

export interface MapsSettings {
  /** Open a map in the Map view when it is opened, rather than in the Markdown view (when its type is found). */
  openAsMap: boolean;
  /** The name of the folder of the types, next to the maps of a project (`types`, as maps.html and the check read it). */
  typesFolder: string;
  /** Where a type is added when the map has no project yet: a folder of the vault, whose types folder gets it. */
  defaultFolder: string;
  /** Only the maps under this folder are read (empty: the whole vault). */
  mapsFolder: string;
  /** A wheel without Ctrl or Cmd zooms the canvas (a mouse); off, it moves the canvas (a trackpad). */
  wheelZooms: boolean;
  /** The height of a map embedded in a note (`![[map]]`), in pixels; it scrolls past it. */
  embedHeight: number;
}

export const DEFAULT_SETTINGS: MapsSettings = {
  openAsMap: true,
  typesFolder: 'types',
  defaultFolder: 'maps',
  mapsFolder: '',
  wheelZooms: false,
  embedHeight: 480,
};

/** A folder path as the vault writes it: no slash at either end. */
export const folderPath = (path: string) => path.trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');

export class MapsSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: MapsPlugin) {
    super(app, plugin);
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    const save = async () => {
      await this.plugin.saveSettings();
    };
    new Setting(containerEl)
      .setName('Open maps in the Map view')
      .setDesc('A Markdown file whose type is found opens drawn; the toggle in its header switches to the Markdown.')
      .addToggle((t) => t.setValue(this.plugin.settings.openAsMap).onChange(async (v) => ((this.plugin.settings.openAsMap = v), await save())));
    new Setting(containerEl)
      .setName('Types folder')
      .setDesc('The name of the folder of the types, next to the maps of a project: <type>.md, <type>.layout.md, <type>.css.')
      .addText((t) => t.setPlaceholder('types').setValue(this.plugin.settings.typesFolder).onChange(async (v) => ((this.plugin.settings.typesFolder = folderPath(v) || 'types'), await save())));
    new Setting(containerEl)
      .setName('Default maps folder')
      .setDesc('Where a type from the catalog goes when the map has no project yet (its types folder, inside). Empty: the root of the vault.')
      .addText((t) => t.setPlaceholder('maps').setValue(this.plugin.settings.defaultFolder).onChange(async (v) => ((this.plugin.settings.defaultFolder = folderPath(v)), await save())));
    new Setting(containerEl)
      .setName('Read maps only in')
      .setDesc('A folder of the vault: only the maps under it are read, linked and checked. Empty: the whole vault.')
      .addText((t) => t.setPlaceholder('(the whole vault)').setValue(this.plugin.settings.mapsFolder).onChange(async (v) => ((this.plugin.settings.mapsFolder = folderPath(v)), await save())));
    new Setting(containerEl)
      .setName('The wheel zooms')
      .setDesc('On: the wheel of a mouse zooms the canvas. Off: it moves the canvas, as two fingers on a trackpad. Ctrl or Cmd with the wheel, and a pinch, always zoom.')
      .addToggle((t) => t.setValue(this.plugin.settings.wheelZooms).onChange(async (v) => ((this.plugin.settings.wheelZooms = v), await save())));
    new Setting(containerEl)
      .setName('Height of an embedded map')
      .setDesc('In pixels, for ![[map]] in a note.')
      .addText((t) =>
        t.setValue(String(this.plugin.settings.embedHeight)).onChange(async (v) => {
          const n = Number(v);
          if (Number.isFinite(n) && n >= 120) (this.plugin.settings.embedHeight = Math.round(n)), await save();
        }),
      );
  }
}
