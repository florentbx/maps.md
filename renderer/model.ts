// The types of the data the code of renderer/ passes around, written once: a map as read from its file (its sections,
// its items, its elements and their properties), the definition of a type and its layout, and the index of the links
// of a folder with a link resolved. Types only: nothing of this file is in what the build makes. Imported by every
// other file of renderer/: a mistake in these structures is seen by `npm run check-types`, not in the page.

// ---- A map, as read.ts reads it ----

/** Where a name or a value is written in its file: its line and its column, from 0. */
export interface Src {
  line: number;
  col: number;
}

/** A file given to the code: its path and its text (a map, a type definition, a layout, plain notes). */
export interface Source {
  path: string;
  text: string;
}

/** The front matter of a file, its keys in lowercase: `type`, `title`, `description`, `updated`, `views`; for a type
 *  definition, `shape` and `element`. A key not written is `undefined`. */
export type Meta = Record<string, string | undefined>;

/** A `##` section of a map: its name, its lines as written, where its name is written (`src`) and the line of the file
 *  of its first line (`start`). An element, or `Context`, or `Open questions`. */
export interface Section {
  name: string;
  lines: string[];
  src: Src;
  start: number;
}

/** A map as read from its file (`readMap`): its front matter and its sections, nothing interpreted yet. Any `.md`
 *  file reads so; it is a map when its front matter has a `type`. */
export interface MapDoc {
  meta: Meta;
  sections: Section[];
}

/** A list item (`- text`), with the items nested under it. `src`, where its text is written, when the lines it was
 *  read from are known to be lines of the file. A value of a property is an item; its details are its children. */
export interface Item {
  text: string;
  children: Item[];
  src?: Src;
}

/** An item read as `Label: value` (`readProperty`): a property of an element, a detail of a value, an attribute of a
 *  definition, a setting of a layout. `value` is empty when the values are the nested items. */
export interface Labeled {
  label: string;
  value: string;
  children: Item[];
}

/** A property of an element: its label as written, its values (one item per value), `isUndefined` when the map
 *  writes `undefined` (the source did not say), `raw` the text written after the label, and where it is written. */
export interface Property {
  label: string;
  values: Item[];
  isUndefined: boolean;
  raw: string;
  src?: Src;
}

/** An arrow of an element of a graph (`label → [[#Step]]`): its label, the name of its target, and the file of the
 *  target when it is another one. */
export interface Arrow {
  label: string;
  target: string;
  file?: string;
}

/** An element of a map: a `##` section read (`elementsOf`), or, in a tree, an item under one. Its properties by
 *  lowercase label; in a graph, its arrows; in a tree, its children. `parent`: the name of the element above it, when a
 *  tree is drawn in another shape. */
export interface MapElement {
  name: string;
  src?: Src;
  properties: Map<string, Property>;
  arrows: Arrow[];
  children: MapElement[];
  parent?: string;
  /** Its level, for an element of a tree drawn in another shape (`1` the first level). */
  depth?: number;
}

/** A number written in a map, with its optional word after a comma (`-1, worried`); `raw`, the number as written. */
export interface ScaleValue {
  value: number;
  word: string;
  raw: string;
}

/** A cardinality at the end of a line, in crow's foot notation: 1, 0..1, 1..n, 0..n. */
export type Cardinality = 'one' | 'zero-one' | 'many' | 'zero-many';

// ---- A type definition and its layout, as read.ts reads them ----

/** The shapes a type, or a view of its layout, is drawn in. */
export type Shape = 'cards' | 'sequence' | 'graph' | 'tree';

/** The kinds of values of a property. */
export type Kind = 'text' | 'date' | 'enum' | 'number' | 'link';

/** A property a type knows (a `##` of its definition), or a detail expected under each of its values (`details`):
 *  its name (`*`: any other property), the kind of its values and their attributes. */
export interface PropertySpec {
  name: string;
  kind: Kind;
  min?: number;
  max?: number;
  single?: boolean;
  note?: boolean;
  default?: string;
  values?: string[];
  details?: PropertySpec[];
}

/** The definition of a type (`types/<type>.md`): its shape, the word for its elements (a step, a state…), its
 *  properties in order, and its layout when it has one; `layoutError` when the layout could not be read. While a view
 *  is drawn, `shape` and `layout` are those of the view. */
export interface Definition {
  type: string;
  shape: Shape;
  element?: string;
  /** The first paragraph of its Context: what the type is for. */
  context?: string;
  properties: PropertySpec[];
  layout?: Layout;
  layoutError?: string;
}

/** The layout of a type (`types/<type>.layout.md`), for the drawing only: one view, the main one, with its other
 *  `views`, each a layout too. The settings every view takes, then those of each shape; `viewLayout` and the layouts
 *  of the shapes, in read.ts, say what each one draws. */
export interface Layout {
  /** The name of its tab; none for the main view without `- Name:`. */
  name?: string;
  shape: Shape;
  shows?: string[];
  description?: string;
  /** The keys of the front matter shown above the view (`- Meta: method, date`), each with its value. */
  meta?: string[];
  arrows?: string[];
  where?: { key: string; value: string; isDefault: boolean };
  /** The other views (main view only). */
  views?: Layout[];
  // Cards: a board, a matrix, or the poster of a card.
  board?: { key: string; values?: string[]; default?: string };
  matrix?: boolean;
  columns?: number;
  cells?: string[][];
  // A sequence.
  elements?: string;
  /** With an element per row: a column per value of this property (its key), a dot where an element has it. */
  dots?: string;
  boxes?: string[];
  background?: Record<string, string>;
  line?: Record<string, string>;
  lifelines?: { from: string; to: string };
  // A graph.
  diamond?: string[];
  cylinder?: string[];
  person?: string[];
  frame?: string[];
  thick?: string[];
  /** The first words of the labels of the arrows drawn dashed (`- Dashed: optional`). */
  dashed?: string[];
  color?: Record<string, string>;
  ends?: false | 'yes' | 'start';
  lines?: string;
  direction?: string;
  returns?: string;
  heads?: string;
  /** `none`: the labels of the arrows not drawn, the panel shows them (default: always). */
  labels?: string;
  // A tree.
  stack?: boolean;
  root?: boolean;
  lanes?: string;
}

// ---- The links of a folder, as links.ts indexes them ----

/** An element of a file as a link target: its name, its items, and every name under it, at any depth. */
export interface IndexedElement {
  name: string;
  items: Item[];
  names: Set<string>;
}

/** A `.md` file of a folder, in the index: its name without `.md`, its path, its text, what was read from it (`map`)
 *  or why it could not be read (`error`), its title, and its sections as link targets. A map (`isMap`) was read, and
 *  its front matter has a type. */
export type IndexedFile = {
  name: string;
  /** The project it is in, as the start of its key (`1-courts/`), when the folder holds several (`projectsOf`); else ''. */
  project: string;
  /** Its name in the folder: its project, then its name (`1-courts/rules`); its name alone in a folder of one project. */
  key: string;
  path: string;
  text: string;
  error?: string;
  title: string;
  elements: Map<string, IndexedElement>;
} & ({ isMap: true; map: MapDoc & { meta: { type: string } } } | { isMap: false; map?: MapDoc });

/** An indexed file that is a map. */
export type IndexedMap = Extract<IndexedFile, { isMap: true }>;

/** The address of a file, or of one of its elements or items (`anchor`), in the page; empty for the check. */
export type HrefOf = (file: IndexedFile, anchor?: string) => string;

/** A link resolved (`resolve` in links.ts): the link as written (`raw`), its text (`label`) and its full address in
 *  words (`full`); then either why it is broken (`problem`, with the file and the element found on the way), or the
 *  file it reaches and its address (`href`), with, for a link to an element or to an item under it, the element, the
 *  names of its path (the element first) and the lines of the file where the names after the element are written. */
export interface Resolved {
  raw: string;
  label: string;
  full: string;
  problem?: string;
  file?: IndexedFile;
  href?: string;
  element?: IndexedElement;
  path?: string[];
  lines?: number[];
}

/** A link resolved that reaches an element or an item. */
export type ElementLink = Resolved & { file: IndexedFile; href: string; element: IndexedElement; path: string[]; lines: number[] };

/** A link written in a map of the folder, resolved, with where it is written: its file, its section, and the property
 *  it is under (none for an arrow, nor in `Context` and `Open questions`). */
export type IndexedLink = Resolved & { from: { file: IndexedFile; element: string; property: string } };

/** The index of a folder (`buildIndex`): its files by lowercase name, the address of a file in the page, and every
 *  link its maps write. */
export interface LinkIndex {
  files: Map<string, IndexedFile>;
  hrefOf: HrefOf;
  links: IndexedLink[];
}

/** What a page needs from the index for one of its files (`linksOf`): text as HTML with clickable links (`links`),
 *  the same with the links between parentheses as small marks (`linkify`), its open questions with what their links
 *  reach, one link resolved, the links of the other maps to it (`backlinks`) and its broken links. */
export interface PageLinks {
  linkify: (text: string) => string;
  links: (text: string) => string;
  questions: { item: Item; targets: ElementLink[] }[];
  resolve: (raw: string) => Resolved;
  backlinks: IndexedLink[];
  broken: IndexedLink[];
  hrefOf: HrefOf;
}
