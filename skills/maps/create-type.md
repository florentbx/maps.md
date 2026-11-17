# Creating a type

A type says what a kind of map holds: its shape, what an element is called,
its properties and its rules. Its definition is a Markdown file,
`maps/types/<type>.md`. You build it with the person: **you propose, they
decide**, one step at a time. Wait for their answer before the next step.
If the person asks you to decide alone, or is not there to answer, do the
steps without waiting, then tell them what you chose at each step and why, so
that they can change it.

## Changing a type

The types of a project are in `maps/types/`: to change one (a property more,
another drawing, another look), change its files there. A type of the
catalog (the `types/` folder next to the skill) is copied there first, its
`<type>.md` with its `.layout.md` and `.css` when they exist, under the same
name. Change only what is asked. To
color the boxes or the values by a property (a status, who does a step),
`- Color:` in the layout is enough (below). A view added to the layout takes the rules of the style written for
every view (`.view`), not those written for another view by its name: widen
those it needs (`create-style.md`).

## Steps

1. **Start from what you are given**:
   - an existing map, a document or a template: take its structure from it;
   - a name or a description ("a business model canvas"): take what this
     model usually holds.

   If you do not know what the maps will be for, ask.
2. **Propose the shape and the name of an element**, and say why:
   - `cards`: the elements are independent, each with its own properties,
     and their order carries no meaning (a persona, a canvas, an object map);
   - `sequence`: the elements are in order and all share the same
     properties, to be compared (a journey map, a roadmap); drawn as a grid;
   - `graph`: the elements are linked by arrows (a user flow, a state
     machine);
   - `tree`: the elements are nested, each under its parent (a sitemap, an
     org chart).

   The shape is how a map is written; a view can draw it another way (a
   tree as a table, cards as a board), below. An arrow of a `graph` carries
   a label only: when what links two elements has properties of its own
   (the status of a dependency between two teams, its date), it is the
   element, with its two ends as properties, in `cards` or a `sequence`.
3. **Propose the properties**, in order: for each, its name, its kind and
   what it means; with the attributes it needs (below).
4. **Propose the rules**: one sentence that says what the type is for, then
   its guidance for whoever writes a map (how to name an element, what to
   write when the context does not say…). For a `graph`, one item says what
   an arrow and its label mean (the next step and when it is followed, an
   event, a relation…), and whether an element with no arrow in or out is a
   start or an end. Ask to write a property on every element, `undefined`
   when the context does not say, only where a gap is what the reader looks
   for (no contact, no backup): each one is drawn "not said", and many of
   them hide the rest.
5. **Write the definition**, `maps/types/<type>.md`, with a kebab-case name
   (`business-model-canvas`). Take the definitions in `types/`, next to this
   file, as models: same front matter, same header comment, same layout.
6. **Offer a layout** when the model is usually drawn in a way of its own:
   a poster for `cards` (a canvas, a SWOT), diamonds for some values in a
   `graph` (decisions), the starts and ends of a `graph` whose arrows are a
   path, a table when the elements are many and compared, a color for the
   values that say where an element stands (a status). It is
   `maps/types/<type>.layout.md`, below. For `cards`, group the cards on a
   board without asking (`- Board:`, below): a list of cards is hard to scan.
7. **Write a short example map** of the type in `maps/`, following
   `SKILL.md`. Look at it yourself, if you can (see "Looking at the maps" in
   `create-style.md`), and correct what reads badly; then show it to the
   person (see "Showing the maps" in `SKILL.md`). Ask what should change,
   and change the definition if needed.
8. **Propose a style**, every time: in words, what the maps of the type will
   look like (a color for each value of an `enum`, its elements as cards, an
   icon per block), so that the type reads well from the start, as those
   of the catalog. What the layout can say is said there, not in a style. If
   the person wants
   it, write `maps/types/<type>.css` following `create-style.md`, and show
   the example map again. The check reads the definition and the maps, not
   the layout nor the style: the page says above the drawing when a layout
   cannot be read, and only a picture shows that a rule of a style does not
   apply.

## The definition

- Front matter: `type: type-definition`, `shape: cards|sequence|graph|tree`,
  `element: <what an element is called>`: the word the header comment of a
  map and the panel of the page use for every element; for a tree whose
  levels have different names, a word that fits them all (`node`).
- The header comment, copied from the models.
- `## Context`: the sentence that says what the type is for, then the
  guidance, one list item each.
- One `##` per property, in order (the order of the rows of a sequence, of the
  fields of a card). It cannot be named `Context` or `Open questions`. Its
  items:

| Item | What it gives |
|---|---|
| `- Kind:` | `text`, `number`, `enum`, `date` or `link` |
| `- Meaning:` | What the property says, for whoever writes or reads a map |
| `- Min:`, `- Max:` | The bounds of a `number` |
| `- Note: yes` | A `number` may have a word after a comma: `-1, worried` |
| `- Values:` | The values of an `enum`, one nested item each |
| `- Default:` | The value taken when a map leaves the property out |
| `## *` (a property) | Any other property the map writes, with this kind: columns chosen by the map (the people of a RACI, the options of a comparison) |
| `- Details:` | The details expected under each value, one nested item each with its own `Kind`, `Values`, `Meaning` (the type of an attribute, the impact of an idea) |
| `- Single: yes` | One value only; without it, a property takes several |

Nothing is required in a map: a property the context does not give is left
out, or `undefined` when the guidance asks to write it; `none` says that
the context states there is none (no owner, no backup), for every kind. Add
an attribute only when the type needs it.

- A `number` with `Min` and `Max` is a scale: a sequence draws it as a
  curve across its elements. Without them it is written as it is. A number
  has no unit: a value with its unit (`18 %`, `6 minutes`) is a `text`.
- The first property that is an `enum` with `Single: yes` is the kind of an
  element: in a graph or a tree, its box carries it, and a legend lists its
  values.

## The layout

It holds the drawing choices of the type; it changes nothing in the maps.
No front matter. Its list items are the settings of the main view, the
first tab, drawn in the shape of the type unless it says `- Draw:`; each
`##` is another view of the same map, with its name, shown as a tab. Offer
a view when the map is often read another way (the components of a system
architecture as cards, the pain points of a journey map alone); put first
the one that answers what the reader looks for first. A click on an element
shows all its properties in a panel: a view shows what is read at a glance,
not everything. Every view takes:

- `- Draw: <shape>`: the shape it is drawn in, with the settings of that
  shape, below; default, the shape of the type. A tree drawn as `cards` or
  as a `sequence` gives all its elements, in order, each with its level;
- `- Shows: <property>` (or one nested item per property): the properties
  shown, in order; in a box of a graph or a tree, under its name;
- `- Where: <property> = <value>`: only the elements whose enum has this
  value;
- `- Arrows: <property>`: a graph whose arrows are the links of these link
  properties;
- `- Color: <value> = <color>`: gives a value of an enum of the type one of
  the colors blue, amber, green, purple, red, gray or white. The value is
  then a chip in this color wherever it is written (a cell, a card, the
  head of a column of a board, the panel), and the box of an element that
  has it, in a graph or a tree, takes the color (of its first single enum
  that has one, the kind first: to color the boxes by another property,
  remove the colors of the kind). Written in the main view, it holds for
  every view. A color here says something: a status, a risk,
  a pain or a gain (red, amber, green). It wins over the style of the type.
  A color that only tells the kinds apart (a screen, an action) is a matter
  of look: it goes in the style (`create-style.md`). Not everything;
- `- Description: <text>`: a sentence above the drawing, that says what the
  view is for; on the main view, the `description` of the map is shown in
  its place, when the map has one; `- Meta: <key>, <key>` the keys of the
  front matter shown above the view, each with its value;
- `- Name: <name>` (the main view only): the name of its tab; default, `Map`.

A map keeps only some views with `views: <name>, <name>` in its front
matter (`views: none`: the main view alone).

```markdown
## Screens
- Draw: cards
- Where: Kind = screen
- Shows: Description
```

Then the settings of its shape:

**`graph`**: `- Diamond: <value>` draws the elements of this value as
diamonds; the value is one of the kind of the type, its first single enum
(for a user flow, `- Diamond: decision`); `- Cylinder: <value>` as
cylinders (a database), `- Person: <value>` as people; `- Thick: <value>`
gives them a thick border (for a user flow, the screens); `- Frame:
<value>, <value>` puts the elements of these values in one dashed frame,
with no name (a system and its parts). Without `- Color:`, each
value of the kind gets a color by its place. `- Ends: yes` draws the starts and
the ends, when the arrows of the type are a path (a user flow, a state
machine), not relations; `- Ends: start` the starts only, the elements with
no arrow out marked as final, for the style of the type to draw them (a
state machine). `- Lines: elbow` draws the arrows with right
angles; `- Direction: right` lays the graph out from left to right.
`- Returns: link` draws an arrow back to an earlier element as a link beside
the element it leaves, not across the drawing. `- Dashed: <word>` draws
dashed an arrow whose label is this word or starts with it (for a user flow,
`- Dashed: optional`: a step the person may skip); the word, a marker, is not
drawn before the rest of the label (`optional, edit them` reads "edit them"). `- Heads: none` draws lines,
not arrows, for relationships: a link and the link back are one line, each
label at the end it reaches; `- Heads: cardinality` draws the cardinality
that ends a label as crow's feet, for a data model. `- Labels: none` draws no
label on the arrows, for a graph that they would make too large (the panel
shows them).

**`tree`**: `- Stack: yes` lists the elements under the first level one
under the other, indented, as a file tree; `- Root: yes` draws the map itself
(its title and its `description`) above the first level; `- Lanes:
<property>` draws a board (a story map): the first level as a header, the
second as columns, the elements under them as cards, in a lane per value of
the property.

**`sequence`**: `- Boxes: <property>` (or one nested item per property)
draws the values of these rows as boxes, the rows as lanes (a service
blueprint); `- Background: <property> = <color>` gives each value of a row
a light background (the pain points of a journey map in red; default:
gray); `- Line: <property> = <name>` draws a named line above a row (the line of
visibility). `- Elements: rows` draws one element per row and the properties
as columns, when the elements are many and the properties few (a RACI);
by default, one element per column. With it, `- Dots: <property>` draws a
column per value of the property, a dot where an element has it, and their
total (the participants of a study). A tree drawn this way indents each row by its level. `- Lifelines: <property> → <property>`
draws the values of the two properties as participants side by side, each
with a line down, and each element as an arrow from the first to the second,
in order, numbered (a sequence diagram: it reads as a chronology).

**`cards`**: each list item is a row of property names, separated by `|`:

```markdown
- Strengths | Weaknesses
- Opportunities | Threats
```

The names of a row share its whole width equally, so a row of two names
under a row of five gives each half. A name written in the same place on
rows that follow each other spans them, and must fill a rectangle.
Use the names of the properties exactly. Properties left out are listed
above the poster.

`- Board: <property>` groups the cards in a column per value of the
property (the words of a glossary by kind, the rules by area):
the default for cards, unless they make a poster (one card per part, a
canvas) or are few. Group on a property
with few values, each shared by several cards: a single enum, or a short
single text (a theme, a feature); a link to a different element on each
card does not group them. If the type has no such property, offer one. The
columns of an enum come in the order of its values, so write first the
value to look at first. A card goes in the column of its first value only;
one with no value goes to the default of the enum, or to a last column
"not said". A card does not repeat the value of its column, even when
`- Shows:` names the property. A column is as wide as a card: more than
five or six do not fit the page.

`- Matrix: yes` places the cards on a grid by their first two enums (a
risk by likelihood and severity), each a numbered point, with a key.

Above cards, the page offers a filter per enum, a button per value.
