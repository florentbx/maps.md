---
name: maps
description: Write, correct or update a map in the maps.md format (a diagram written as a Markdown file), of any type it defines, from notes, a brief, a workshop or any other context. Use when asked to create or update a map of any type that has a definition (for example a user journey map or a user flow), or to create a new type of map, a theme for the maps or the style of a type. Also use when asked to see or show the maps.
---

# Writing a map

A map is a diagram written as a Markdown file. Write it from the context you
are given (notes, a brief…), following the definition of its type.

To create a new type of map, follow `create-type.md`, next to this file. To
change how the maps look (a theme, the style of a type), follow
`create-style.md`.

## Showing the maps

When asked to see the maps, and once you have written the maps a request
asks for (at its end, not after each map), show them to the person, and tell
them, in one sentence, that they can edit a map there by hand (**Edit**, in
the bar). First, where do your commands run? In a cloud session (on a remote
machine, not the person's computer), go to the cloud session below: do not
start `serve` nor a preview, and give no address of it: the person cannot
open it. On the person's computer, show them live: in a local session of the
Claude desktop app, start the preview server `maps` (`.claude/launch.json`);
elsewhere, run `node .claude/skills/maps/serve.mjs maps/` in the background
and give the address it prints. Leave it running: the page shows each change
of a map, and saves what the person edits as they type. Commit and push the
changes when the person asks, as for any file.

In a cloud session, publish the maps as a private page (an artifact on
claude.ai), if you can:

1. If the artifact was published before, first bring back what the person
   edited in it: list the collection `edits` of its database (one document
   per file edited, `{ path, text }`; the path starts with the name of the
   folder of maps, `maps/journey.md`). Write each `text` into its file; if you
   changed that file since you published, merge both. Then delete these
   documents, once the new version is published (step 3), each pinned to the
   version you read: if the person edited it since, the delete fails; bring
   that edit back too, then delete it.
2. `node .claude/skills/maps/serve.mjs maps/ --out <temporary folder>` writes
   there one file with the page and the maps in it, named after the project
   (`my-app-maps.html`), then stops. Use a folder outside the project, so
   that nothing gets committed.
3. Publish that file as the page, as it is (do not edit or redesign it),
   with the capabilities `{ db: {}, user: {}, downloads: true }`: they let
   the person edit the maps in it, and export a map as a PNG image.
4. Give the person its link.

It shows the maps as they were: after a change, publish it again, at the same
address. If it was published before this conversation, find it in the
person's artifacts (titled `maps.md`), or ask them for the link. With the
link, tell the person that you write their edits into the files when they
ask, or the next time you publish.

If you cannot publish an artifact, say so, and tell the person how to see the
maps: open the project in a local session, or ask you for a change.

To look at a map yourself, before you show a type or a style you made:
`node .claude/skills/maps/shot.mjs maps/` takes a picture of every map, in
each of its views (see "Looking at the maps" in `create-style.md`).

The paths here are the ones `init` sets up. If the project differs (another
folder of maps, the page elsewhere: `--page <maps.html>`), its instructions or
`.claude/launch.json` give its own.

## Steps

1. **Choose the type.** A type is defined by a file `types/<type>.md`. The
   types of the project are in `maps/types/`, and only there: the page and
   the check read no other. The `types/` folder next to this file is a
   catalog of types to start from. Take the type you are asked for, or the
   one that fits the context, in the project first, then in the catalog:
   what a type is for is the first line under `## Context` in its
   definition, so read that line of each definition, not each whole file.
   A type of the catalog the project does not have yet: copy it into
   `maps/types/` first, its `<type>.md` with its `<type>.layout.md` and
   `<type>.css` when they exist. A type is a starting point, not a mold:
   when one comes close but misses what this context needs (a property, a
   value, a view), change it in `maps/types/`; when none fits, create one
   (`create-type.md`). Say which you did. A `<type>.layout.md` file is for
   the drawing only: you do not need it.

   When asked for the maps of a project rather than one map, ask first about
   the need when it is unclear, then choose the maps yourself: the person
   need not know what the types hold. There is no fixed set.
2. **Read its definition**:
   - the front matter gives its **shape** and what an element is called;
   - `## Context` says what the type is for, then lists its own guidance;
   - each `##` is a known **property**, in order, with its `Kind`, the
     attributes of the kind and its `Meaning`; a `## *` stands for any
     other property the map writes (the people of a RACI), with its kind.
3. **Write the map** in `maps/<name>.md` (unless the project keeps its maps
   elsewhere), with the rules below: the common rules, the rules of the
   shape, and the guidance and meanings of the definition. Subfolders of
   `maps/` are fine (by audience, by phase); a link names a map by its file
   name alone, so a file name is unique across the folders (of the project:
   a folder with its own `types/` is a project of its own).
4. **Check it** with the list at the end.

## Common rules

1. Front matter between two `---` lines: `type: <type>` (the name of the
   definition file), then a `title` and a `description`, a sentence that says
   what the map is about (shown above the map): an AI finds the maps it needs
   by them. `updated` (`YYYY-MM-DD`) is optional. Other keys are free, for a fact about the whole map, shown with it, under
   **About this map** (`persona: a prospect`, `journey: target`).
   `views: <name>, <name>` keeps only these views of the type as tabs
   (`views: none`: none); write it only when asked. A map drawn as a graph
   may choose its own `direction` (`down`, `right`), `ends` (`yes`, `start`,
   `no`) and `returns` (`arrow`, `link`), over those of its type; write them
   only when asked.
2. Right after the front matter, the header comment, written by the check
   (see "Header comment").
3. `## Context` is optional and comes first: free Markdown (scope, sources).
4. Every other `##` heading is an element of the type. Names are unique in the
   file, compared ignoring case and punctuation (`Share a photo?` and `Share a
   photo` are the same name).
5. An element holds list items only. No free paragraph; a sentence about the
   element goes in `- Description: …` when the type knows it.
6. A property is `- Label: value`. The label ends at the first `: ` after a
   word, with no space before the colon; ` : `, as French writes it, is text,
   never a label. Write the known properties with their names, in the order
   of the definition.
7. Several values are nested items, one per value, indented by two spaces. A
   comma inside a value is ordinary text; it never separates two values.
8. Kinds of values:
   - `text`: free text;
   - `number`: a number between `Min` and `Max`; with `Note: yes`, an optional
     word after a comma (`-1, worried`), only when the context writes it (an
     emoji or a color is not a word: do not translate it);
   - `enum`: one of its `Values`; left out, it takes its `Default` when the
     definition gives one;
   - `date`: as precise as the context: `YYYY-MM-DD`, `YYYY-MM`, `YYYY-Qn`
     (a quarter) or `YYYY`; never a precision the context does not give;
   - `link`: `[[file#Name]]`, or `[[#Name]]` for the same file; an element
     under another, or an item, by its path: `[[file#Element#Item]]`;
     `[[file#Context]]` and `[[file#Open questions]]` too. A link can also go
     in any text, to say where something comes from: between parentheses,
     after the fact (`Points balance ([[data-model#Account]])`); the page
     draws it as a small mark. To name a relation, put a
     label before the link, with its cardinality when the context gives it:
     `- has 0..n → [[#Relative]]`.
9. Any kind: with `Single: yes`, one value only; without it, several. When
   the definition gives a property `Details`, write those the context gives
   as items under each value (`- email`, then `  - Type: text`), with their
   kinds.
10. The structure stays as the type writes it, in English: the labels of the
    properties, the values of an enum, `Context`, `Open questions`,
    `Decision`, `Assumption`, `undefined`, `none`. The content (the names, the
    descriptions, the questions) is in one language for all the maps of the
    folder: the one the project's instructions ask for (not the one they are
    written in), or else the one of the maps already there, or else the one of
    the person who asks, not of the notes; translate the notes, but quotes
    keep the language of the source, and the names the product shows or the
    code uses (a screen, a button, an entity) are written as they are.
11. `## Open questions` is optional and comes last, only when the context
   leaves points open. Ask an open question only for a point whose answer
   would add, remove or change an element, an arrow or a value that matters
   (a missing step, an unknown outcome, two sources that disagree); a detail
   the source does not give stays `undefined` or is left out. One item per
   question, always with a link to each element or value it is about
   (`([[#Book online]])`): the page shows it in their panel. Optionally with a
   nested `- Assumption: …`. When a question is answered, keep it and add a nested
   `- Decision: …`, with who decided and when if known, the date written
   `YYYY-MM-DD` (or as precise as the source: `YYYY-MM`, `YYYY-Qn`); do not
   delete it, nor move the answer to `Context`.

## Rules of the shapes

**`cards`**: each `##` is a card, with its own properties; the order of the
cards carries no meaning. When the layout groups the cards on a board
(`- Board: <property>`), give that property to every card: a card without it
lands in a column "not said".

**`sequence`**: each `##` is an element, in the order of the journey or the
process; all elements share the same properties, so that they can be
compared (the page draws them as the columns of a grid).
- When the guidance of the type asks for it, a value points to another value,
  in another row or another element: `- Confirms → [[#Book#The booking is
  confirmed on screen]]`, with the element and the exact text of the other
  value (without its own arrow). The page draws an arrow between them.

**`graph`**: each `##` is a node; the order of the file does not matter, only
the arrows do.
- An arrow is a list item: `- → [[#Other]]`, or with a label:
  `- yes → [[#Other]]`. `->` is accepted. The label cannot contain `: `.
- Every arrow points to an element of the file, or to `undefined` when the
  other one is unknown: `- → undefined`.
- What an arrow and its label mean (the next step and when it is followed, an
  event, a relation…) is said by the guidance of the type: follow it.

**`tree`**: each `##` is an element of the first level, in order. Under an
element, an item `- Label: value` is a property, and any other item is an
element under it, with its own properties and elements nested below it.
- Write the properties of an element before the elements under it; keep
  the order of the context (for a sitemap, the order of navigation).
- The name of an element cannot contain `: `: it would be read as a property.

## Do not invent

- Write only what the context says: no element, value, arrow or answer it does
  not give.
- When the person asks you to propose or to analyse (building specs, a flow
  with no source, a state of play), what you add yourself, that neither the
  context nor the person gave, is a proposal, as is what you deduce (the
  emotion of a phase from its actions and pain points). It is written in its
  place and also as an open question that links to it, with your proposal as
  its `Assumption` (`- Is the account created at the first booking?
  ([[#Create an account]])`). Proposals of one kind may share one question
  (`Are these attributes right?`). When the person answers, add the
  `Decision`.
- A property the context does not give is left out, or, when the guidance of
  the type asks to write every property, written `undefined`, alone as the
  value (`- Thoughts: undefined`). Never fill it with a plausible guess.
- When the context says that there is none (nobody owns it, no backup, no
  target set), write `none`, alone as the value (`- Owner: none`), whatever
  the kind of the property: `undefined` is for what the context does not
  say.
- Even then, unless you propose it, a property the context gives for no
  element at all is left out of every element, and one line of `Context`
  says so and why (`Pain points: none, this is the target journey`).
- When correcting or updating a map: change only what the request or the new
  material gives, keep the names of the elements and the header comment, and
  fix any sentence that the change makes false. When a value changes (a
  threshold, a limit, a price), search every map of the folder for it and fix
  each copy.

## When the source is other maps

- To find the maps to read, read only the front matter of each map of the
  folder (its `title`, `description` and `type`), then read in full those that
  matter.
- Read them through their header comments; their definitions are in
  `types/` if needed.
- Say where each element comes from with one link, at the end of its first
  property (`([[appointment-states#Late cancellation]])`), or once in `Context`
  for the whole map; not after every value.
- Carry over, with a link, the open questions of the source maps that matter
  for the new map.
- Do not change the source maps unless asked; say in `Open questions` what
  does not match between them, or with any other map you read (a number, a
  deadline, a channel written differently), with a link to each.

## Few links

A map is read for its content; every link draws the eye away from it. A link
is first a source. Link only what a reader would follow:

- a source: where an element comes from (once, above), what justifies a
  fact, the decision it follows;
- a fact written in another map and not repeated here;
- a relation, in a property whose kind is `link`.

A link does not say that two elements of two maps are the same: a step of a
flow and a phase of a journey are different things.

Do not link a word only because an element bears that name, nor the same
target twice in an element, nor a value that repeats the name of the element.

## Renaming

To rename an element or an item, run `node rename.mjs <folder of the maps>
"<file>#<Element>[#<Item>]" "<New name>"` with the `rename.mjs` next to this
file (in a project: `node .claude/skills/maps/rename.mjs maps/ "journey#Book"
"Booking"`): it renames it and rewrites every link to it in the folder, so
that none breaks. If you cannot run commands, rename it, then rewrite by hand
every link to it or under it in the folder (`[[file#Old]]`, `[[#Old]]`,
`[[file#Element#Old#…]]`, whatever their case or their text after `|`).

## Header comment

The HTML comment right after the front matter is the reading key of the map,
for an AI that reads it without this skill. `check.mjs` writes it, from the
definition of the type: do not write it yourself. If you cannot run commands,
copy it from another map of the same type, or leave it out.

## Before you finish

If you can run commands, run `node check.mjs <folder of the maps>` with the
`check.mjs` next to this file (in a project: `node .claude/skills/maps/check.mjs
maps/`), and fix every error. Judge each warning: a property the type does not
know, free text under an element, a broken link. The check cannot see an
invented fact. Then, or otherwise, go through this list:

- `type` is the name of a type definition; every `##` heading is an element,
  or `Context`, or `Open questions`.
- The known properties follow the meanings of the definition.
- No list written on one line, no free paragraph under an element.
- Numbers are within their bounds, enums among their values, or `undefined`
  or `none`.
- `graph`: every arrow points to an element of the file, or to `undefined`.

Then show the map (see "Showing the maps").
