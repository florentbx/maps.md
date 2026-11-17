# Changelog

What changes for the people who use maps.md, release by release. One version for the package and the format, the one
of `package.json`; each release is a tag `vX.Y.Z`, which `npx github:florentbx/maps.md#semver:^0` installs (the
latest one). The maps declare no version.

## Unreleased

## 0.1.0

The first version: the skill and its catalog of 28 types, the page (`maps.html`), the check, `serve`, `rename` and
`shot`, and `init`, which sets them up in a project.

**The types are the project's**: each map takes its type in `maps/types/`, and only there; the AI copies a type of
the catalog there when a map needs it, and a project changes its types as any file. `init` copies the types the maps of
a project already use. A folder that holds a `types/` folder is a project of its own: one folder can hold several (the
examples of `showcase/`, opened together).

**The format**
- `none`, alone as the value of a property, says that there is none (nobody owns it, no backup); `undefined` says that
  the source did not say. Valid for every kind; the page draws `none` muted. A property followed by `undefined` alone
  on the next line, and a detail written `undefined`, are drawn "not said".
- A sentence in French keeps its text: ` : `, with a space before the colon, is never read as a label. The check
  warns about an item of an element that is neither a property nor an arrow (`- Kind : screen`).
- A map drawn as a graph can choose how it is laid out, for itself: `direction: right`, `ends: no`, `returns: arrow`
  in its front matter, over the layout of its type.
- In a layout, a view names the shape it is drawn in with `- Draw: <shape>`; the main view too, so the first tab of a
  type can be drawn in another shape than the one its maps are written in (a tree as a table).
- In a layout, `- Color: <value> = <color>` gives a value of an enum a color in every view: a chip in this color
  wherever it is written (a table, a card, the panel, the head of the column of a board), and the box of a graph or a
  tree. Such a color says something (a status, a risk) and wins over the style of the type; the colors that only tell
  the kinds apart are in the styles. Without one, a value of an enum is a gray chip.
- Other settings of a layout: `- Meta:` (keys of the front matter shown above a view, with their value), `- Labels:
  none` (no label on the arrows of a graph, shown in the panel), `- Ends: start` (the elements with no arrow out
  marked as final), `- Dots: <property>` (a column per value, a dot where an element has it, and the total),
  `- Dashed: <word>` (the arrows whose label starts with this word dashed, the word not drawn).

**The types**
- Six types first needed to build a product with an AI, for any product: a brief (the problem, for whom, the success
  metrics, the non-goals, the constraints, read as a doc), a glossary (a table: the words to use, the other words, the
  words to avoid), test scenarios (given, when, then, read as a `.feature` file), business rules (each with its
  examples as a decision table, by area), failure modes (with a view by likelihood and severity), roles and
  permissions (a grid of the roles by the actions).
- The screen as a specification: what it shows by group (`Shows`), its main action and its other actions, who it is
  for (`For`), where one comes from (`From`), the screens grouped by area; each state with what it shows, what the
  person can do then and its message, in a view of its own, States.
- A study as the synthesis of a research report: its method, participants and date above, its themes one under the
  other, each observation with how many participants it concerns, its description and its first piece of evidence as
  a quote; a second view, Participants, as a rainbow spreadsheet. Insights by theme, each with its kind as a chip and
  what it implies for the product (`Implication`).
- The object map: the objects first, as cards, with their relationships and who can do each action; then their
  relationships, each box with its core content.
- The backlog as an issue tracker; the roadmap on a timeline across, as on a slide, with the initiatives one under the
  other and a board as other views; the story map as the wall of a workshop, each release a band across the map, in
  the order of the releases; the decision log as a changelog, with a view `Records`; the opportunity solution
  tree with what each node says under its name, and a view `Outline`.
- Every matrix as the 2×2 of a slide, each item a numbered point with a key beside the grid.
- A table with an element per row (failure modes, roles and permissions, RACI) is drawn as a table
  usually is; your AI writes short values in it, one fact each.
- The state machine: the label of an arrow is the event; its final states have a thick dark border. The system
  architecture: no label on its arrows, its frame with no name, an element outside the system never inside it. The
  journey map: an action, a touchpoint, a thought and a pain point can have a `Description`; the details of its pain
  points and opportunities (`Severity`, `Impact`, `Effort`, `Status`, `Due`) are checked.

**The page**
- The head of the files names the folder opened (the project, for its `maps/`), and so does the file `serve --out`
  writes (`my-app-maps.html`); the page opens on the first map of the list: number the subfolders to set the order
  (`1-frame/`, `2-product/`).
- **Edit**, in the bar, opens the Markdown of the map; where the page cannot write the files, it reads **Markdown**
  and shows it read only. The page never writes over a map your AI changed while you typed: the editor says `Not
  saved: the map changed meanwhile` and keeps what you typed.
- In the Markdown, `[[` opens a list of what a link can reach (the maps, their elements, `Context` and `Open
  questions`, what is under an element), and the list proposes what the type allows (the values of an enum or a
  scale, the properties, the details of a value). `->` becomes `→`. The links follow a name edited, in every map of
  the folder.
- The panel: the details of what a click selects, the maps that cite it and the sources of its facts. About this map:
  its context, the rest of its front matter, the maps that cite it. **N to fix** lists what the check finds wrong;
  **N open questions** makes what they are about stand out on the map.
- Filters above the cards, a button per value of an enum; in a table, a filter in the header of a column.
- Zoom at the bottom right of the map, for a mouse or a trackpad; a pinch on a phone, where the files and the panel
  cover the screen, as in a narrow window.
- The maps can be published as a private artifact of a cloud session: the edits are kept in it, your AI writes them
  into the files when you ask or when it publishes again, and the PNG export works there.
- `maps.html` carries, at its top, the license of maps.md (MIT) and the notices of what it bundles (CodeMirror, ELK,
  panzoom, the icons of Lucide).

**The skill and the tools**
- The skill: what each type is for is read from the first line of its Context; a type is a starting point, changed
  in `maps/types/`; asked for the maps of a project, the AI asks about the need when it is
  unclear, then chooses them; a type of cards it creates groups its cards on a board by default; subfolders of
  `maps/`; the structure of a map in English, its content in one language for the folder, the names the product shows
  in their language; when a value changes, the AI searches every map for its copies; the maps are shown once a request
  is done, and the AI says you can edit them there (**Edit**, in the bar).
- The line about maps: the maps that cover a feature are read before building it, as its specification; a map is
  updated when asked.
- `shot.mjs`: a picture of every map, per view, in light and in dark, for your AI to look at a type or a style it
  made before it shows it to you. It needs Playwright. The guides to create a type and a style give the settings of a
  layout and the hooks a style can use.
- The scripts of the skill start with `/* eslint-disable */`, so `.claude/` needs no exclusion from a project's lint.
- The README: three things to ask your AI (install maps.md, make a map, show the maps), maps and types, every way to
  open the maps ("Your maps in the page"); to share them, the link of the private artifact or the PNG of a map.
  Feedback: a section of the README, a line at the end of the install, and two forms to open an issue.
