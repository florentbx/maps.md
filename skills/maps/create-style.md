# Creating a style or a theme

How the maps look is CSS, in two files of the folder of the maps:

- **a theme**, `maps/theme.css`: the look of every map (the colors of a
  brand, its fonts), by giving new values to the design tokens of the page;
- **the style of a type**, `maps/types/<type>.css`: what the maps of one type
  look like (the pain points as numbered cards, a face for each emotion, a
  site as a stacked tree). A type copied from the catalog (`types/` next
  to this file) comes with its style, when it has one: change it there.

The page reads them with the maps: the theme first, then the style of the
type of the map shown, only while it is shown. Neither changes a map, and an
AI that writes a map does not read them.

You build it with the person: **you propose, they decide**, one step at a
time. If the person asks you to decide alone, do the steps without waiting,
then tell them what you chose and why.

## Steps

1. **Ask what they want**, if they have not said: a brand (its colors, its
   fonts, a link to its site or a picture), or a look for one type (a
   reference image, a template, what should stand out). A brand is a theme;
   a look for one type is a style.
2. **Read what exists**: the design tokens at the top of the styles of
   `maps/maps.html` (`:root`, then `@media (prefers-color-scheme: dark)`),
   the definition and the layout of the type (its properties, its views),
   a map of the type, and its current style if there is one. Then show the
   map and look at it, if you can: you style what is already drawn, and the
   layout gives it a look of its own (a `- Background:` puts
   `.has-background.node--<color>` on its row, a tinted background on each
   value).
3. **Say first what the layout can say**, for the style of a type: a color
   that says something (`- Color:`), a board, a table, the properties a view
   shows are settings of `maps/types/<type>.layout.md` (see "The layout" in
   `create-type.md`). A style is for what is left.
4. **Propose the changes**, in words, and say why: what each part of the
   map will look like, which tokens change. Wait for their answer.
5. **Write the file**, with the rules below.
6. **Look at it before you show it**, if you can (see "Looking at the maps"
   below): read the pictures as the person who will use the map, correct
   what is in the way (a text cut or out of its box, a color that says
   nothing, what matters lost among the rest), and look again, in light and
   in dark.
7. **Show the maps** (see "Showing the maps" in `SKILL.md`), and ask what
   should change.

## Looking at the maps

You write a style without seeing it: look at what it draws.
`node .claude/skills/maps/shot.mjs maps/` takes a picture of every map, one
PNG per view, in light and in dark, and prints where each is; `--map <file
name>` takes one map only, and a second folder after `maps/` says where to
write them (by default a temporary folder, outside the project). A picture
is the whole map, as the page exports it, at twice its size: on a screen, a
person first sees about 1200 by 800 of it. It needs Playwright; without it,
the command says so: use what your session has (a preview that takes
screenshots, a browser you drive), or ask the person to look.

## A theme

Two examples, complete, next to this guide: `themes/minimalist.css` (sober,
smaller) and `themes/warm.css` (warm colors, raised buttons). Start from the
one closest to what the person wants, or copy one as it is.

`maps/theme.css` holds a comment that says what it is (the theme of which
brand), then only tokens, on `:root`, and only those that change: the colors
by role (`--color-bg`, `--color-text`, `--color-accent`…), the fonts
(`--font-sans`) and the scales (`--space-*`, `--radius-*`, `--font-size-*`).
The sizes of the text are in `rem` (the browser's 16px): `--font-size-root`
changes only the text of the page, so a smaller or larger theme redefines the
whole `--font-size-*` scale. The shadows: `--shadow-note` lifts the cards and
the notes, `--shadow-node` the boxes of a graph; `--shadow-control` and
`--shadow-selected` raise the buttons and what is chosen, flat by default.
Give the dark mode its colors too, in
`@media (prefers-color-scheme: dark) { :root { … } }`.
The page has one accent: a second color of the brand goes where it carries
no meaning (a tint for what is selected), or is left out. Keep text readable
and lines visible, in both modes (a contrast of 4.5:1 for text, 3:1 for a
line): a color of the brand too pale for that is used as a tint, not as text.
The tints keep their hue (`--color-tint-blue` stays a blue, lighter or darker):
the layouts of the types name them by their hue and give them a meaning (the
pain points in red). A font is one installed on the computer, named in
`--font-sans` before fonts to fall back on (`"Inter", system-ui, sans-serif`):
the page works offline, so do not load one, neither from the web nor from a
file; where the font is not installed, the page shows the next one.

## The style of a type

- **A comment at the top** says what the file is: the style of which type,
  what it changes.
- **Only tokens**, never a raw value: the colors, the fonts, the spaces, the
  radii (also of the boxes of a drawing, `rx: var(--radius-md)`), the strokes,
  the opacities and the durations (`var(--color-negative)`, `var(--space-md)`),
  so that a theme and the dark mode change it too. The font of the page is in it at three weights only:
  regular, `var(--font-weight-bold)` and italic; another weight shows as the
  nearest. The dimensions of the type itself (a width, a number
  of columns) are tokens of its own, named after the type, on `:root` at the
  top (`--persona-columns: 2;`).
- **In the page as it is laid out**: a map is laid out in a page of 90rem
  (`--size-canvas-page`), whatever the window, then shown at the zoom that
  fits its width, 100 % at most. A drawing wider than the page is shown
  smaller: keep it within the page. The rules of the page are often as
  specific as `.grid :is(th, td)`: scope yours by the view
  (`[data-view-name="…"]`), and check in a picture that they apply.
- **Through the hooks of the page**, the only stable ones:
  - `data-view-name` on each view: its name as an anchor (`pain-points`); the
    main view, the name its layout gives it, else `map`. Scope a rule for
    one view by its name, `[data-view-name="journey"] { … }`, and a rule for
    every view (the look of a card, a chip) by `.view { … }`: a view added
    later, by a copy of the type, has it too;
  - `data-el` on an element, `data-prop` on a property (a row of a grid, a
    field of a card, a part of a poster), with the name of the property as an
    anchor (`pain-points`);
  - `data-value` on a short value (48 characters at most), as an anchor
    (`phone`), on the number of a scale (`-2`); in a graph or a tree, on a
    box, its kind: the value of the first single enum of the type
    (`screen`); on an arrow its label (`yes`). A value written `none` has `data-value="none"`, and is drawn
    muted. To match a word of a value, match the whole word, never a part
    (`*="app"` takes `whatsapp-group`): `[data-value|="app"],
    [data-value$="-app"], [data-value*="-app-"]`;
  - `data-depth` on an element of a tree, its level (`0` the root, `1` the
    first level); when the tree is drawn as rows or as cards, on the row
    (`tr[data-depth]`) or on the card;
  - `.chip` on a value its layout gives a color (`- Color:`), with
    `.node--<color>`, which sets `--tint`; `.undefined` on "not said";
  - in the panel, the details of a value: `data-prop` on the list and on
    each detail (`severity`), `data-value` on a short detail (`high`); a
    detail drawn on the map, `Label: value`, has its name in `.detail-label`,
    which a style can hide.
- **What the page draws**, by shape, to place these hooks:
  - `sequence`: `.grid table`, a column per element (`th[data-el]`), a row
    per property (`tr[data-prop]`, its name in `th`, its values in `td`, a
    list in `ul > li`; a scale, a number with `Min` and `Max`, in
    `td.scale`, its number in `.curve-value`; a number without them is a
    plain value); with `- Boxes:`, the values as boxes in lanes. With
    `- Elements: rows`, the reverse, `.grid--rows table`: a row per element
    (`tbody tr`, its name in `th[data-el]`), a column per property
    (`thead th[data-prop]`, its values in `td[data-prop]`); a property the
    element does not have is an empty `td`. With `- Lifelines:`, SVG: a
    participant is `g.node--top` and its line `.lifeline`, a message
    `g.lifeline-arrow[data-el]` with its kind as `data-value` and its number
    in `.lifeline-number`; all the arrows share one head;
  - on the map, the details of a value (the items under it) are hidden,
    the panel shows them: to draw them, show `li > ul` yourself. A detail
    is `li[data-prop]`, its `data-value` the label and the value together
    (`status-testing`); in the panel, the value alone (`testing`);
  - `cards`: `.cards`, an `article.card[data-el]` per element, its name in
    `h2`, its fields in `dl` (`dt` and `dd[data-prop]`, the values in
    `ul > li`, also one alone; a property the element does not have has
    neither; one value alone is `dd.single`, written without a bullet); the element it is under, for a tree drawn as
    cards, in `.card-parent`; with a poster, `.poster`, a
    `section[data-prop]` per part, its name in `h3`. With `- Board:`,
    `.board-columns`, a `section.board-column[data-value]` per column, its
    name in `h3`, its count in `.board-count`; the column of the cards with
    no value is `data-value="not-said"`, always the last; the names of the
    columns are capitalised by the page. With `- Color:`, the head of a
    column is a chip in its color (`.board-column.tinted > h3`); to tint a
    column or its cards, reach them by the `data-value` of the column. A
    card of a board is compact: each label beside its value (`dl` a grid). The filters above cards
    are `.filters`;
  - `graph` and `tree`: SVG, `.graph svg`; `g.node[data-el]` per box (a
    `rect`, a `polygon` for a diamond, `text`; with `- Shows:`, a second
    `rect.node-head` over the head of the box, with no fill and no stroke,
    for a style to color the head alone: style the box itself with
    `rect:not(.node-head)`; each line under the name is in
    `text.node-detail[data-prop]`, which has no `data-value`), `g.edge` per
    arrow (`path`, its label in `.edge-label text`), `.legend .key` for the
    keys; style an SVG with `fill`, `stroke`, `stroke-width`, not
    `background` or `border`. The size of a box and the lines of its text
    are computed by the page: a style cannot change them;
  - above a drawing, the sentence of its view is `.view-description`;
  - `tree` with `- Lanes:`: `.board table`, the lanes `tr.board-lane`, a card
    `li.board-card`.
  - The page also draws, out of the views, the panel on the right: the
    context and the open questions in `.details-text`, and the details of
    what is clicked (`.details-props > [data-prop]`, a property of the
    element clicked). A property whose kind is `enum` is a chip there
    (`.details-enum`), in the color its layout gives its value (`- Color:`),
    neutral without one: a style can give it the tint of its value as on
    the drawing (`.details-enum[data-prop="status"] [data-value="done"]`).
- **Nothing that depends on one map**: no name of a phase, no text, no
  position of an element. What belongs to one map (an emoji for a phase) is
  written in its Markdown.
- **Icons**: inline, as `data:` URLs (the page works offline), from a set
  whose license allows it (Lucide, ISC), named in the comment; drawn with
  `mask` and `background: var(--…)`, so that they take a color of the theme.
- Change only the look: never hide a value the person needs to read, except
  a label the drawing already says (the name of a row shown by its color).
