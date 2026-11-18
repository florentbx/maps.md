# maps.md for Obsidian (prototype)

A first prototype of an [Obsidian](https://obsidian.md) plugin that draws the maps of a vault, as `maps.html` draws them.
A map is already an Obsidian note: a Markdown file with `type:` in its front matter, `##` elements, `- Label: value`
properties and `[[map#Element]]` links ([`FORMAT.md`](../FORMAT.md)). Obsidian edits it, links it and finds it; the
plugin draws it, shows its details and checks it.

It is a prototype: built and tested headless (see [What was verified](#what-was-verified)), not yet run inside
Obsidian itself.

## Try it

You need Node 22 or later, in a clone of this repository:

```bash
npm ci
npm run build:obsidian
```

Then copy the three files of `obsidian/dist/` (`main.js`, `styles.css`, `manifest.json`) into
`<your vault>/.obsidian/plugins/maps-md/`, reload Obsidian, and turn on **maps.md** in **Settings → Community plugins**.

To try it on the examples, copy `maps/` and `showcase/` of this repository into a vault: each folder that holds a
`types/` folder is a project, as in `maps.html`.

## What it does

**The Map view.** A note whose front matter has a `type` that its project defines opens drawn, in a view of its own:
the bar says its title and its type, with **About this map**, **N open questions** and **N to fix**; the views of the
type are tabs under it; the drawing is on a canvas you drag to move, and zoom with a pinch, Ctrl or Cmd and the wheel,
or the buttons − % + at the bottom right. The button in the header of the view (and the command **Toggle Map view and
Markdown**) shows the same note as Markdown in the same tab, and back, as the Kanban plugin does. Obsidian edits the
Markdown: the plugin has no editor of its own.

**The details.** A click on an element, a value, a column or a participant shows its details in a panel of the right
sidebar, as the panel of `maps.html`: its properties, the arrows that reach it and leave it, what is under it, the
maps that cite it, its broken links, the open questions about it. The open questions bring out on the map what they
are about. The button at the top of the panel shows the line in the Markdown.

**Links.** A link of the drawing or of the panel opens its map with Obsidian (Ctrl or Cmd for a new tab), at the
element it reaches; in the Map view, the element is selected and brought to the middle, also for a link to an item under
an element (`[[story-map#Activity#Step#Story]]`), which Obsidian alone cannot reach. A link from any note to a map
(`[[map#Element]]`) opens it at the element too. Ctrl or Cmd over a link shows Obsidian's preview.

**Live.** A change to a map, to a map of its project (its backlinks, the targets of its links) or to a file of its
types draws it again, after a pause, where it was: the tab chosen, the place and the zoom of the canvas stay.

**Types.** A map takes its type in the types folder of its project: the nearest folder up that holds a `types/`
folder (or another name, in the settings), as `maps.html` and the check find it. The style of a type
(`<type>.css`) and the theme of a project (`theme.css`) apply to its maps only. The 28 types of the catalog are in the
plugin: **Add a type from the catalog** copies one (its definition, layout and style) into the types folder of the map
open; nothing is written over. A map whose type is missing says so, with a button to add it from the catalog.

**The check.** **Check every map** lists what is wrong in the maps of the vault, file by file, each with its line; a
click opens the Markdown at the line. The map shown is checked as it changes: **N to fix** in its bar and in the status
bar. The check writes nothing; **Write the header comment of this map** writes the comment that tells an AI how to read
the map, as `check.mjs` does, only when you run it.

**Embeds.** `![[map]]` in a note draws the map there, read only, in a box that scrolls, with its tabs and its links.

**The look of Obsidian.** The colors of the page (background, text, borders, accent) and its fonts are those of
Obsidian: light, dark and community themes apply. The tints that tell values apart (a status, a kind) stay those of
maps.md, in light and dark.

### Commands

| Command | What it does |
| --- | --- |
| Toggle Map view and Markdown | The note of the active tab, drawn or as Markdown. |
| Add a type from the catalog | Copies a type of the catalog into the types folder of the map open. |
| Check every map | The check of the vault, in the right sidebar. |
| Show the details panel | The panel of the details, in the right sidebar. |
| Write the header comment of this map | Writes the reading key of the map, as `check.mjs` does. |

### Settings

| Setting | Default | What it does |
| --- | --- | --- |
| Open maps in the Map view | On | A map whose type is found opens drawn. Off: it opens as Markdown, a click from the map. |
| Types folder | `types` | The name of the folder of the types, next to the maps of a project. |
| Default maps folder | `maps` | Where a type goes when the map has no project yet: in its types folder. |
| Read maps only in | (the whole vault) | Only the maps of this folder are read, linked and checked. |
| The wheel zooms | Off | On: the wheel zooms (a mouse). Off: it moves the canvas (a trackpad). |
| Height of an embedded map | 480 | In pixels. |

## How it is built

The plugin reads, links, checks and draws the maps with `renderer/` as it is: `readMap`, `parseDefinition`,
`buildIndex`, `linksOf`, `projectsOf`, `checkMap`, `drawMap`, `linksData`, `drawArrows`. What `maps.html` does with them
(`renderer/viewer.ts`) is ported for Obsidian: the canvas (`canvas.ts`), the details (`details.ts`), the Map view
(`map-view.ts`). Three small changes to `renderer/` made it possible, with `maps.html` and the tools unchanged: the arrows
of a grid are watched only when the page asks (`watchArrows`), `drawMap` measures its text in the element it is drawn
in (`options.host`), and `projectsOf` and `buildIndex` take the name of the types folder.

`renderer/style.css` is not changed: `build.ts` scopes it under `.maps-md` (`scope-css.ts`): `:root` and `body` become
the container of a map, `prefers-color-scheme: dark` becomes Obsidian's `.theme-dark`, `#page` and `.canvas` take names
of their own. `styles.css` maps the color tokens of the page to the variables of Obsidian. The style of a type and the
theme of a project are scoped the same way when the plugin reads them, each to the maps that use it.

| File | What it holds |
| --- | --- |
| `main.ts` | The plugin: views, commands, the toggle, the events of the vault, embeds, status bar. |
| `store.ts` | The maps of the vault as the renderer reads them, kept up to date; the types of each project. |
| `map-view.ts` | The Map view. |
| `details.ts` | The details of what is clicked (ported from `viewer.ts`). |
| `side-views.ts` | The panel of the details and the panel of the check. |
| `canvas.ts` | The canvas (panzoom) and the mounting of a drawing. |
| `check.ts` | The check of the vault, with no file system. |
| `catalog.ts` | The catalog of types and its list. |
| `embed.ts` | A map embedded in a note. |
| `styles.ts`, `scope-css.ts` | The styles of the types and of the page, scoped. |
| `build.ts` | The build: `dist/main.js`, `dist/styles.css`, `dist/manifest.json`. |
| `smoke/` | The smoke test, on a stand-in of the Obsidian API. |

### Develop

```bash
npm run build:obsidian   # obsidian/dist/
npm run check-types      # the plugin with renderer/ (obsidian/smoke/ is left out)
npm test                 # includes obsidian/test-scope.ts
npm run smoke:obsidian   # the smoke test, with Playwright; pictures in obsidian/smoke/out/
```

## What was verified

- **Type-check**: the plugin against the types of the Obsidian API (`obsidian` 1.14.4).
- **Build**: `dist/main.js` (about 1.8 MB, ELK makes most of it), `dist/styles.css`, `dist/manifest.json`.
- **The scoped style** (`obsidian/test-scope.ts`, in `npm test`): every rule of `style.css` is under `.maps-md`.
- **The smoke test** (`npm run smoke:obsidian`): `main.ts` as it is, in Chromium, on a stand-in of the Obsidian API
  (`smoke/obsidian-stub.ts`, written for the test: the workspace, leaves, views, vault, metadata cache, as the API
  documents them, simplified) with `maps/` and `showcase/` as the vault. It checks that no style of the plugin reaches
  outside its maps; that maps of the three projects and several types open in the Map view and are drawn (a journey, a
  table with tabs, a graph, a story map, a roadmap); About this map and a click on an element in the panel; a link of
  the panel followed; a nested link selecting its item; a change to a file drawing the map again with its tab, pan and
  zoom kept; the toggle and its command; a missing type, said, then added from the catalog and drawn; the check of the
  vault and a click to the line; the status bar; an embed in the reading view, and one in Live Preview; light and dark.
  Its pictures were looked at.

Not verified: the plugin inside Obsidian itself (desktop or mobile), with Obsidian's own styles, its real workspace and
its events. The stand-in follows the documented API, but where Obsidian behaves otherwise, the plugin may too.

## Known limits

- **Not run in Obsidian yet.** The first thing to do with it.
- **Links to an item in Obsidian's editor**: `[[map#Element#Item]]` is not resolved by Obsidian itself (the click
  in a note, its preview, the graph see `map#Element` at best). The plugin reaches the item when the map opens in the
  Map view, and the line of the item when the plugin opens it as Markdown.
- **Embeds in Live Preview** are drawn by watching the embeds Obsidian adds to the editor; this follows how Obsidian
  draws them today and is the most fragile part. An embed of part of a map (`![[map#Element]]`) stays as Obsidian
  shows it.
- **Obsidian's own styles** may still reach into a drawing in places (a table or a list inside an embed in the
  reading view): checked only against a stand-in of Obsidian's styles.
- **One project per vault folder**: the projects are found as in `maps.html` (a folder with a types folder); two
  projects with maps of the same name link within their project, which Obsidian's own links do not know.
- **Every Markdown file is read** at start (all of the vault, or the folder of the setting): fine for a few thousand
  notes, slower beyond. **Read maps only in** limits it.
- No export as PNG, no completion of `[[` in the editor (Obsidian's own completion proposes the headings, not the items
  or the values a type allows), no rename that follows the links (`rename.mjs` stays the way).
- The text of the drawings is measured in the font of Obsidian, a little wider or narrower than the one of
  `maps.html`: boxes are laid out for it.
- When the plugin is turned off, the tabs that showed a map are left empty, until reopened.

## Open decisions

- **Publishing to the community plugins of Obsidian**: Obsidian's store reads a `manifest.json` at the root of a
  repository, and installs the `main.js`, `styles.css` and `manifest.json` attached to a GitHub release whose tag is
  the version. The root of this repository is the package of maps.md: publish from here (a `manifest.json` and a
  `versions.json` at the root, a release workflow for the plugin's assets, apart from the tags of the package), or from
  a repository of its own, built from `renderer/`. Not done.
- **Whether to commit `obsidian/dist/`**, as `maps.html` is: it is not (`dist/` is ignored); a release would carry it.
- **Opening maps in the Map view by default**: on, but only for a map whose type is found, as many vaults use `type:`
  in their front matter for other things. Whether the plugin should be limited to a folder by default.
- **The header comment**: the check of `check.mjs` writes it; the plugin writes it only on a command. Whether to offer it
  at all.
- **The version and `minAppVersion`** (`1.5.0`, not tested against older versions); the author and the description of
  the manifest.
- **Mobile**: `isDesktopOnly` is false, as nothing in the plugin needs the desktop; not tried on a phone.
