# maps.md — Format v0.1

> Version 0.1, 2026-11-07. It describes only what the tools read and what has been tested; what is not in it is not
> part of the format yet.

A **map** is a Markdown file that declares a **type** in its front matter. A **type** chooses a **shape** and gives
its own words and meanings, in a **definition**. The tools know shapes and kinds of values, never a type: adding a type
never changes them.

## 1. Shapes

What tells shapes apart is how the elements of a map relate to each other. The shape says how the file is written and
read, by an AI and by the tools (an arrow, an element under another); how a map is drawn is the choice of the layout of
its type (section 6), which may draw it in another shape.

| Shape | The elements… | Order of the elements | Example types |
|---|---|---|---|
| `cards` | are independent, each with its own properties | No meaning | Data model, business model canvas |
| `sequence` | are in order and share the same properties, to be compared; drawn as a grid, one element per column | The order of the elements | Journey map, roadmap |
| `graph` | are linked by arrows | No meaning | User flow, state machine |
| `tree` | are nested: each `##` is an element of the first level, with the elements under it as a nested list | The order of siblings | Sitemap, org chart |

## 2. A map

```markdown
---
type: user-flow
title: Online booking
updated: 2026-11-06
---
<!-- User flow: … how to read this file … -->

## Context
Free Markdown: scope, sources.

## Slot picker
- Description: Shows the next four weeks.
- Kind: screen
- → [[#Free slot?]]

## Open questions
- What happens after someone joins the waiting list?
  - Assumption: nothing is sent.
```

| Part | Rule |
|---|---|
| File | `<name>.md`, UTF-8. The name is unique in a folder of maps: links use it. |
| Front matter | Between two `---` lines, `key: value` per line. `type` (required for a map; the name of a definition, in kebab-case), `title` and `updated` (`YYYY-MM-DD`), both optional. `description` (optional): a sentence shown above the main view (for a journey map, the journey itself: `Michelle books a dermatologist appointment`). `views` (optional): the views of the type shown as tabs for this map, by name, separated by commas (`views: Pain points, Table`; `views: none` for the main view alone); without it, all of them (section 6). `direction`, `ends`, `returns` (optional, for a map drawn as a graph): section 6. Other keys are free, with no meaning to the tools. Every key but `type`, `title` and `updated` is shown as written in the panel **About this map**. A file without `type` is a plain Markdown file, not a map. |
| Header comment | Right after the front matter, an HTML comment that says what the file is and how to read it: the reading key for an AI. Tools ignore it. The check writes it from the definition of the type (`headerOf` in `renderer/read.ts`). |
| `## Context` | Optional, first: free Markdown. |
| Elements | Every other `##` heading is an element. Its name is unique in the file. No `###` heading. |
| Properties | An element holds list items only, no free paragraph. A property is `- Label: value`; the label ends at the first `: ` after a word, never a space: ` : `, as French writes it, is text. Labels match ignoring case. A long value continues on indented lines. |
| Lists | Several values are nested items, one per value, indented by two spaces. A comma inside a value is ordinary text. |
| `undefined` | Alone as the value, it says that the source did not say. Valid for every kind. A property may also be left out; the guidance of a type may ask to write every property, with `undefined` when the source does not say (a sequence, whose elements are compared); a property the source gives for no element is then left out, and `Context` says so, unless the AI was asked to propose and proposes it (an open question with its `Assumption`). |
| `none` | Alone as the value, it says that the source states there is none (nobody owns it, no backup). Valid for every kind, as `undefined`; drawn muted, and a column of its own in a board. |
| Arrows (`graph`) | A list item `- label → [[#Element]]` is an arrow to another element (`->` is accepted). The label is optional and cannot contain `: `. `- → undefined` says the other element is unknown; an arrow can go to an element of another map (`→ [[file#Element]]`). What an arrow and its label mean (the next step, an event, a relation) is said by the guidance of the type. |
| Arrows between values (`sequence`) | A value `text → [[#Element#Value]]` is an arrow from this value to another value of the map, named by the element and its exact text (without its own arrow). The page draws it between the two values (a service blueprint). The guidance of the type says when to write one. |
| Elements under an element (`tree`) | Under an element, an item that is not `Label: value` is an element under it, with its own properties and elements nested below it. Its name cannot contain `: `. |
| `## Open questions` | Optional, last: one item per question, with an optional nested `- Assumption: …`. A question that has been answered stays, with a nested `- Decision: …` (who decided and when, when known; the date written as a `date` value, `YYYY-MM-DD` or as precise as the source, so that tools can show it). |

## 3. Kinds of values

| Kind | A value is | Attributes in the definition |
|---|---|---|
| `text` | Free text | — |
| `number` | A number; with `Note: yes`, an optional word after a comma (`-1, worried`) | `Min`, `Max` |
| `enum` | One of the values of the definition, ignoring case | `Values`, one nested item per value; `Default`, taken when a map leaves it out |
| `date` | As precise as the source: `YYYY-MM-DD`, `YYYY-MM`, `YYYY-Qn` (a quarter) or `YYYY` | — |
| `link` | Text with a link in it (`[[sitemap#Pricing]]`); a label before the link names the relation (`has 0..n → [[#Relative]]`) | — |

Any kind: `Single: yes` allows one value only; without it, a property takes several. Nothing is required.

## 4. Links and names

- Names match ignoring case and punctuation, as heading anchors do (`Who pays?` is `who-pays`).
- `[[file]]` links to a map, `[[file#Element]]` to one of its elements, `[[#Element]]` to an element of the same map.
- An element under another, or an item at any depth, is reached by its path: `[[file#Element#Item]]`.
- `[[file#Context]]` and `[[file#Open questions]]` link to these sections (and `[[file#Open questions#Question]]` to
  one question).
- A link shows the last name of its path, or the map for a link to a map or to its `Context`; `[[target|text]]`
  shows `text`. Two links of a map that would read the same and lead to different places each name their map first
  (`sitemap › Balances`), or their whole path when that still reads the same.
- A link can go in any value, in `Context` and in `Open questions`. Links are optional and free: no link is required,
  and none needs to be declared. A link that leads nowhere is broken; tools show it, and the map stays valid.

## 5. The definition of a type

`types/<type>.md`, itself a map of the type `type-definition`. The types of a project are in its `types/` folder
(`maps/types/`), and only there: each map takes its type in the `types/` folder of its project, the nearest one up. A
folder that holds a `types/` folder is a project of its own: its maps take its types and link among themselves, so that
one folder can hold several (the examples of `showcase/`). The skill comes with a catalog of types to start from, copied
into a project when one of its maps needs them.

```markdown
---
type: type-definition
shape: sequence
element: phase
---
<!-- Type definition: … -->

## Context
What a person does, thinks and feels, phase by phase, where it goes wrong and what could be better.

- Each phase is named by what the person is doing at that moment (Search, Compare, Book…).

## Emotion
- Kind: number
- Min: -3
- Max: 3
- Single: yes
- Note: yes
- Meaning: How the person feels, from -3 (negative) to 3 (positive), only when the context states a feeling.
```

| Part | Rule |
|---|---|
| Front matter | `type: type-definition`, `shape` (one of the four), `element` (what an element is called: phase, step, page…) |
| `## Context` | What the type is for, in one sentence; then its guidance for whoever writes a map, one item each |
| Each other `##` | A known property, in order: the order of the rows of a sequence and of the fields of a card. Not `Context` nor `Open questions`. |
| Its items | `Kind` (required), `Meaning` (what the property says), and the attributes of its kind (section 3), with `yes` or `no` for `Single` and `Note` |
| `## *` | Optional: any other property the map writes, with this kind (the columns chosen by the map: the people of a RACI), in the order the map first writes them; without it, such a property is shown as added. |
| `- Details:` | Optional: the details expected under each value of the property, one nested item each (`- Type:`), with the same items as a property (`Kind`, `Values`, `Meaning`…). A map writes them under a value (`- email`, then `  - Type: text`); the check verifies them, an unknown one is a warning; the page shows them in the panel, not on the drawing. |

A map may hold properties its type does not know: they are kept and shown as written.

## 6. The layout of a type (for the drawing only)

`types/<type>.layout.md`, next to the definition: the drawing choices of the type, read by the renderer only. An AI
that reads or writes a map does not need it. Without it, or when it cannot be read, a map is drawn by its shape alone,
and the page says why. No front matter. Its list items before any heading are the settings of the main view, the first
tab; each `##` is another view of the map, with its name, shown by the page as a tab (a view reads
one map, and never changes it). A map can keep only some of them, with `views:` in its front matter. A map whose main view
is a graph can choose, in its front matter, its own `direction` (`down`, `right`), `ends` (`yes`, `start`, `no`) and `returns`
(`arrow`, `link`), over those of the main view of its layout (a user flow read from left to right, with no start nor end).
Every view takes these settings:

- `- Draw: <shape>`: the shape it is drawn in; default, the shape of the type. The main view takes it too: the shape
  says how a map is written, and the view a reader sees first may be drawn another way (a tree as a table).
- `- Color: <value> = <color>`: gives a value of an enum of the type one of the colors of the page (blue, amber, green,
  purple, red, gray, white), for a color that says something (a status, a risk); a color that only tells the kinds
  apart is a matter of look, in the style of the type. It wins over that style. The value is then a chip in this color wherever it is written (a cell of a grid, a field of
  a card, the panel), the head of its column in a board is a chip in this color, and, in a graph or a tree, the box of
  an element takes the color of the first of its single enums whose value has one, with a key in the legend (in a tree, when the values of its kind have no color, the legend gives only the colors
  the boxes take). The colors of the main view hold for every view.
- `- Board: <property>` (a view of cards): a board, the cards in a column per value of the property: for an enum, in
  the order of its values; for another kind, per value written in the map, in the order they first come (the themes of
  a study); an element with no value goes to the default, or to a last column "not said". A card does not repeat the
  value of its column.
- `- Matrix: yes` (a view of cards): a matrix, the cards in a grid by their first two enums, the known ones first, then
  those the map writes for `## *` (the axes named by the map: a matrix): the first across, its values from left to
  right, the second up, its values from bottom to top; the axes are named outside the grid. The boxes keep one size
  however many elements they hold: each element is a numbered point in its box, its name on hover, and its card in a
  key beside the grid, by box, in the order the boxes are read (top left first), without the axes. An element without a
  value on both is listed in the key, "Not placed".
- `- Shows: <property>` (or one nested item per property): the properties shown, in this order: the rows of a sequence,
  the fields of a card, the text under the name in a box of a graph or a tree (an ERD shows its attributes).
- `- Where: <property> = <value>`: keeps the elements whose enum has this value (`Kind = screen`).
- `- Arrows: <property>` (or one nested item per property): draws a graph whose arrows are the links of these link
  properties, labeled by the text before each link (`0..n [[#Appointment]]`).
- `- Description: <text>`: a sentence shown above the drawing, that says what the view is for; on the main view, the
  `description` of the map is shown in its place, when the map has one.
- `- Meta: <key>, <key>` (or one nested item per key): the keys of the front matter of the map shown above the view,
  each with its value (the method, the participants and the date of a study).
- `- Name: <name>` (the main view only): the name of its tab; default, `Map`.

```markdown
- Shows: Attributes

## Screens
- Draw: cards
- Where: Kind = screen
- Shows: Description
```

A tree drawn in another shape gives all its elements, in order, each with its level (`data-depth`): with an element
per row, a row is indented by it. Then the settings of the shape of the view:

- `graph`: `- Diamond: <value>` (or one nested item per value) draws the elements of these values of their kind (the
  first single enum property of the type) as diamonds; `- Cylinder: <value>` as cylinders (a database), `- Person:
  <value>` as people (a head over a body). `- Frame: <value>, <value>` puts the elements of these values in one dashed
  frame, with no name (a system and its parts; the page shows the title of the map above it), the others never in it: before it (those that lead into it) or after it (those it leads to, even when they lead back into it), two of them linked on one side a layer apart. Without it, each value but the default gets a look by its place
  in `Values`, and the default value a neutral one, unless the layout gives it a color (`- Color:`). `- Thick: <value>` gives a value a thick border. `- Ends: yes` draws the starts (no arrow in) and the ends (no arrow out), as round "Start" and "End" joined to them, for a type whose arrows are a
  path; `- Ends: start` the starts only, the elements with no arrow out marked `node--final` for the style of the type
  (a state machine: its final states); without it, none is marked. `- Lines: elbow` draws the arrows with right angles (default: `curved`).
  `- Direction: right` lays the graph out from left to right (default: `down`). `- Dashed: <word>` draws dashed an arrow whose label is this
  word or starts with it, the word not drawn before the rest of the label (`optional, edit them` reads "edit them"). A graph is placed by ELK, by the logic of a flow:
  each arrow leaves by the side that faces its target, the bottom for the target most in line, a return enters by a
  side, every arrow has its own point, each label at the start of its arrow, or further along it where room is kept for
  it when it would cover a box, a line or another label. `- Returns: link` draws an arrow back to an earlier element as a link
  beside the element it leaves (`↩ Slot picker`), which leads to it, instead of an arrow across the drawing (default:
  `arrow`). `- Heads: none` draws lines, not arrows, for a graph of relationships: a link and the link back between the
  same two elements (a relationship written on both) are one line, the label of each at the end it reaches;
  `- Heads: cardinality` draws the cardinality that ends a label (`1`, `0..1`, `1..n`, `0..n`) at the end of the line in
  crow's foot notation, as part of the line (its color, its weight, its fading), and leaves it out of the label; the
  check warns about a label with none (default: `arrow`). `- Labels: none` draws no label on the arrows, and keeps no
  room for them: a smaller drawing when the labels would take more room than the elements; the panel shows them
  (default: `always`).
- `sequence`: `- Boxes: <property>` (or one nested item per property) draws the values of these rows as boxes, side by
  side, and the rows as lanes; `- Background: <property> = <color>` gives each value of a row a light background in
  one of the colors of the page (default: gray), to tell it apart (the pain points in red); `- Line: <property> = <name>` draws a line with this name above a row (the lines of a service blueprint).
  `- Elements: rows` draws one element per row and the properties as columns (a RACI; default: `columns`,
  one element per column, as a journey map), each column as wide as what it holds. A scale is then written, not drawn as a curve.
  With it, `- Dots: <property>` draws a narrow column per value of the property, in a natural order (`P2` before `P10`),
  and a dot where an element has it, then how many it has out of all (`3/8`) (the participants of a study, as a
  rainbow spreadsheet).
  `- Lifelines: <property> → <property>` draws the values of the two properties as participants, side by side, each
  with a dashed line down, and each element as an arrow from the line of the first to the line of the second, in order,
  labeled with its number and its name (a sequence diagram); an arrow has the value of its kind (`data-value`, a reply
  dashed by a style), and a participant not known (`undefined`) is a "?" drawn as an element not known.
- `cards`: each item is a row of property names separated by `|`, placing the properties of a card as a poster. The
  names of a row share its width; a name written in the same place on rows that follow each other spans them, and must
  fill a rectangle. Properties left out are listed above the poster. In a card, one value alone is written as text,
  several as a list.

```markdown
- Key partners | Key activities | Value propositions | Customer relationships | Customer segments
- Key partners | Key resources | Value propositions | Channels | Customer segments
- Cost structure | Revenue streams
```

A canvas is a `cards` type with a layout, not a shape of its own.

- `tree`: `- Stack: yes` lists the elements under the first level one under the other, indented by level, as a file
  tree, each element of the first level heading its column (default: `no`, each parent centered above its children).
  `- Root: yes` draws the map itself above the first level, its title and its `description`, joined to each element of
  the first level; in the main view, the description is then not written above the drawing. `- Lanes: <property>`
  draws a board (a story map): the first level as a header, the second as columns under it, the elements under them as
  cards in their column, in a lane per value of the property, and a last lane for the cards without it: for an enum, in
  the order of its values, else in the order the steps write them (the cards of a step written by lane: MVP, then
  Release 2, then Later), combined across the steps, and in the order they first appear where no step orders two
  lanes, or the steps disagree. A node of a tree has the kind of its element (its first single enum property) as `data-value`, with
  a legend; an element of a tree drawn as a card shows the element it is under, above its name.

**The style of a type**, `types/<type>.css`, next to the layout, optional: what its values look like, in CSS (the pain
points as numbered cards, the thoughts as bubbles, a face for each emotion). The definition says what a map holds, the
layout what is drawn, the style how it looks. Read by the page only, while a map of the type is shown, after the theme
of the folder (`theme.css`); it is in the `types/` folder of the project, with the definition and the layout. A style reaches the drawing only through these hooks, the ones kept stable:

- `data-view-name` on each view: its name as anchors are made (`pain-points`); for the main one, the name its layout gives it (`journey`), `map` without one;
- `data-el` on an element (a phase, a card), `data-prop` on a property (a row of a grid, a field of a card, a cell of a poster, a column);
- `data-depth` on an element of a tree, its level: `1` for the first, `0` for the root (`- Root: yes`); also on its row or its card, when the tree is drawn in another shape;
- `.chip` on a value its layout gives a color, with `.node--<color>` (which sets `--tint`); `.undefined` on a value not said; `data-value="none"` on a value written `none`;
- in a board, `.board-column[data-value]` on a column (`not-said` for the cards with no value), its name in `h3`; in a table with an element per row, `tbody th[data-el]`, `thead th[data-prop]` and `td[data-prop]`; in a card, `dd.single` on one value alone; the sentence above a view in `.view-description`;
- `data-value` on a short value, as a key (`phone`), and on the number of a scale (`-2`); in a graph, on a box, its kind (`screen`), on an arrow, its label (`yes`), and on the keys of the legend.
- in the panel, `data-prop` on the details of a value and on each detail (`severity`), `data-value` on a short one (`high`) and on a property of an element of one short value (the kind of a step); `.details-enum` on a property whose kind is `enum`; `.details-arrow-label` on the label of an arrow. On the drawing, the name of a detail `Label: value`, and the label that starts a line under the name of a box, are in `.detail-label`, which a style can hide (the box is then sized without it).

What belongs to one map, and not to its type (an emoji for a phase), is written in the Markdown of the map.
