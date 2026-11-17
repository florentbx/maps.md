// The Markdown editor of maps.html, in the panel on the right: the file of the map shown, its syntax colored, edited as
// it is written. CodeMirror 6, bundled by build.ts; its colors and sizes are the tokens of style.css. Generic: it knows
// Markdown and the links of the format (`[[…]]`), never a shape or a type. It helps where writing by hand is tedious,
// with a list only: what a link can reach, the values and the
// properties the type of the map allows, given by the page (complete.ts); and it writes in italics the labels the
// type does not know, as the map draws them.

import { acceptCompletion, autocompletion, closeCompletion, type CompletionContext, completionStatus, moveCompletionSelection, selectedCompletion, startCompletion } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { defineLanguageFacet, HighlightStyle, Language, syntaxHighlighting } from '@codemirror/language';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { Compartment, EditorState, Prec } from '@codemirror/state';
import {
  Decoration,
  drawSelection,
  EditorView,
  highlightActiveLine,
  keymap,
  MatchDecorator,
  ViewPlugin,
} from '@codemirror/view';
import { tags } from '@lezer/highlight';
import { parser } from '@lezer/markdown';
import type { Proposal } from './complete.ts';

/** What the page proposes in the file shown, `text` as typed, the cursor on its line `line` (from 0) at the column
 *  `at`. */
type Propose = (text: string, line: number, at: number) => Proposal | undefined;

/** The labels the type of the file shown does not know, in its lines `from` to `to` (from 0): each, its line and
 *  its columns. */
export type Added = (text: string, from: number, to: number) => { line: number; from: number; to: number }[];

/** A label the type of the map does not know, in italics, as the map draws it: one sees a label mistyped. */
const addedLabels = (added: Added) =>
  ViewPlugin.define(
    (view) => {
      const build = () => {
        const { doc } = view.state;
        const text = doc.toString();
        const mark = Decoration.mark({ class: 'cm-added-label' });
        return Decoration.set(
          view.visibleRanges.flatMap(({ from, to }) =>
            added(text, doc.lineAt(from).number - 1, doc.lineAt(to).number - 1).map((a) => mark.range(doc.line(a.line + 1).from + a.from, doc.line(a.line + 1).from + a.to)),
          ),
          true,
        );
      };
      return {
        decorations: build(),
        update(u) {
          if (u.docChanged || u.viewportChanged) this.decorations = build();
        },
      };
    },
    { decorations: (v) => v.decorations },
  );

// Markdown alone: the parser of @lezer/markdown, not @codemirror/lang-markdown, which brings HTML, CSS and JavaScript.
// `---` closes the front matter: it makes no heading of the line above.
const markdown = new Language(defineLanguageFacet(), parser.configure({ remove: ['SetextHeading'] }), [], 'markdown');

const colors = HighlightStyle.define([
  { tag: tags.heading, fontWeight: 'var(--font-weight-bold)' },
  { tag: [tags.processingInstruction, tags.contentSeparator, tags.quote, tags.comment], color: 'var(--color-text-muted)' },
  { tag: [tags.link, tags.url], color: 'var(--color-accent)' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strong, fontWeight: 'var(--font-weight-bold)' },
]);

// The links of the format, `[[file#Element]]`, which Markdown does not know.
const linkMarks = new MatchDecorator({ regexp: /\[\[[^\]\n]+\]\]/g, decoration: Decoration.mark({ class: 'cm-map-link' }) });
const links = ViewPlugin.define(
  (view) => ({
    decorations: linkMarks.createDeco(view),
    update(u) {
      this.decorations = linkMarks.updateDeco(u, this.decorations);
    },
  }),
  { decorations: (v) => v.decorations },
);

/** A long line that wraps goes on under its own text, not under its dash or its indent: the nesting of a value stays
 *  seen. In monospace, its indent and dash are as many `ch`. */
const hanging = ViewPlugin.define(
  (view) => {
    const build = () => {
      const marks = [];
      for (const { from, to } of view.visibleRanges) {
        for (let pos = from; pos <= to; ) {
          const line = view.state.doc.lineAt(pos);
          const n = /^\s*(?:[-*+]\s+)?/.exec(line.text)![0].length;
          if (n && n < line.text.length) marks.push(Decoration.line({ attributes: { style: `padding-left: calc(var(--space-sm) + ${n}ch); text-indent: -${n}ch` } }).range(line.from));
          pos = line.to + 1;
        }
      }
      return Decoration.set(marks);
    };
    return {
      decorations: build(),
      update(u) {
        if (u.docChanged || u.viewportChanged) this.decorations = build();
      },
    };
  },
  { decorations: (v) => v.decorations },
);

/** `* ` typed at the start of a line becomes `- `, the dash every map writes its items with. A `*` elsewhere (an
 *  emphasis) stays. */
const dashes = EditorView.inputHandler.of((view, from, to, text) => {
  if (text !== ' ' || from !== to) return false;
  const line = view.state.doc.lineAt(from);
  if (!/^\s*\*$/.test(line.text.slice(0, from - line.from))) return false;
  view.dispatch({ changes: { from: from - 1, to, insert: '- ' }, selection: { anchor: from + 1 }, userEvent: 'input' });
  return true;
});

/** `->` typed in an item of a list becomes `→`, the arrow every map writes (the format reads both). Not the dash of
 *  the item itself, nor in code between backticks, nor after another dash. */
const arrows = EditorView.inputHandler.of((view, from, to, text) => {
  if (text !== '>' || from !== to) return false;
  const line = view.state.doc.lineAt(from);
  const before = line.text.slice(0, from - line.from);
  if (!/^\s*[-*+]\s+(.*[^-])?-$/.test(before) || before.split('`').length % 2 === 0) return false;
  view.dispatch({ changes: { from: from - 1, to, insert: '→' }, selection: { anchor: from }, userEvent: 'input' });
  return true;
});

/** Enter at the end of the heading of an element starts its first item, with its dash: an element holds items only
 *  (not `Context`, which is free text). The list then shows what the type expects in it. */
function startItems(view: EditorView) {
  const { state } = view;
  const range = state.selection.main;
  const line = state.doc.lineAt(range.head);
  if (state.readOnly || state.selection.ranges.length > 1 || !range.empty || range.head !== line.to) return false;
  if (!/^##\s+\S/.test(line.text) || /^##\s+context\s*$/i.test(line.text)) return false;
  view.dispatch(state.update({ changes: { from: range.head, insert: '\n- ' }, selection: { anchor: range.head + 3 }, scrollIntoView: true, userEvent: 'input' }));
  startCompletion(view);
  return true;
}

/** Enter in an item of a list starts the next item, at the same indent, with its dash; in an empty item, it ends the
 *  list. Otherwise Enter does what it always does. */
function continueList(view: EditorView) {
  const { state } = view;
  const range = state.selection.main;
  if (state.readOnly || state.selection.ranges.length > 1 || !range.empty) return false; // a command writes even read only
  const line = state.doc.lineAt(range.head);
  const item = /^(\s*)([-*+])(\s+)/.exec(line.text);
  if (!item || range.head - line.from < item[0].length) return false;
  if (!line.text.slice(item[0].length).trim()) {
    view.dispatch({ changes: { from: line.from, to: line.to, insert: '' } });
    return true;
  }
  const next = `\n${item[1]}${item[2]} `;
  view.dispatch(state.update({ changes: { from: range.head, insert: next }, selection: { anchor: range.head + next.length }, scrollIntoView: true, userEvent: 'input' }));
  return true;
}

/** The list of what can be written where the cursor is, given by the page: what a link being written can reach
 *  (`[[`), one level of its path at a time; the values a property allows; the properties not written yet. Enter
 *  accepts the row chosen. `#` goes down a level from a row of a link, once its part has letters (right after `[[`,
 *  `#` alone is this map, as the format writes it). */
function completion(propose: Propose) {
  const at = (view: EditorView) => {
    const pos = view.state.selection.main.head;
    const line = view.state.doc.lineAt(pos);
    return { line, proposal: propose(view.state.doc.toString(), line.number - 1, pos - line.from) };
  };
  // Read again where the cursor is now: the list shown may be one key late.
  const write = (view: EditorView, name: string, down: boolean) => {
    const { line, proposal } = at(view);
    const row = proposal?.rows.find((r) => r.name === name);
    const change = down ? row?.down : row?.accept;
    if (!row || !change) return false;
    const from = line.from + change.from;
    view.dispatch({ changes: { from, to: line.from + change.to, insert: change.insert }, selection: { anchor: from + (change.cursor ?? change.insert.length) }, scrollIntoView: true, userEvent: 'input.complete' });
    if (down || row.again) startCompletion(view);
    else closeCompletion(view);
    return true;
  };
  const source = (context: CompletionContext) => {
    const line = context.state.doc.lineAt(context.pos);
    const proposal = propose(context.state.doc.toString(), line.number - 1, context.pos - line.from);
    if (!proposal) return null;
    return {
      from: line.from + proposal.from,
      filter: false, // filtered and ordered by the page
      options: proposal.rows.map((row) => ({ label: row.name, detail: row.detail, apply: (view: EditorView) => write(view, row.name, false) })),
    };
  };
  const goDown = EditorView.inputHandler.of((view, from, to, text) => {
    const chosen = text === '#' && from === to && completionStatus(view.state) === 'active' && selectedCompletion(view.state);
    return Boolean(chosen && write(view, chosen.label, true));
  });
  // The keys of the list, while it is open: the arrows and Tab move in it (Shift+Tab, back), Enter accepts, Escape
  // closes it. It opens as one types, never asked for: no Ctrl+Space, taken by the system on some computers.
  const keys = Prec.highest(
    keymap.of([
      { key: 'ArrowDown', run: moveCompletionSelection(true) },
      { key: 'ArrowUp', run: moveCompletionSelection(false) },
      { key: 'PageDown', run: moveCompletionSelection(true, 'page') },
      { key: 'PageUp', run: moveCompletionSelection(false, 'page') },
      { key: 'Tab', run: moveCompletionSelection(true) },
      { key: 'Shift-Tab', run: moveCompletionSelection(false) },
      { key: 'Enter', run: acceptCompletion },
      { key: 'Escape', run: closeCompletion },
    ]),
  );
  return [autocompletion({ override: [source], icons: false, defaultKeymap: false }), keys, goDown];
}

const theme = EditorView.theme({
  '&': { height: '100%', color: 'var(--color-text)', backgroundColor: 'var(--color-bg)', fontSize: 'var(--font-size-xs)' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: 'var(--font-mono)', lineHeight: 'var(--leading-editor)' }, // monospace: the indent of a nested value shows
  '.cm-content': { padding: 'var(--space-sm) 0' },
  '.cm-line': { padding: '0 var(--space-sm)' },
  // Translucent: the line is drawn over the selection, which must show through.
  '.cm-activeLine': { backgroundColor: 'var(--color-active-line)' },
  '.cm-cursor': { borderLeftColor: 'var(--color-text)' },
  '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: 'var(--color-text-selection)',
  },
  '.cm-map-link': { color: 'var(--color-accent)' },
  '.cm-added-label': { fontStyle: 'italic' },
  // The list of the completion: a popover of the page, a row as a row of the files. Only the row chosen has a
  // background, none under the pointer: two rows would look chosen.
  '.cm-tooltip.cm-tooltip-autocomplete': {
    zIndex: 'var(--z-bubble)',
    border: 'var(--border-width) solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-bg)',
    color: 'var(--color-text)',
    boxShadow: 'var(--shadow-popover)',
    overflow: 'hidden',
  },
  '.cm-tooltip.cm-tooltip-autocomplete > ul': {
    fontFamily: 'var(--font-sans)',
    fontSize: 'var(--font-size-sm)',
    minWidth: 'var(--size-completion)',
    maxWidth: 'var(--size-completion-max)',
    maxHeight: 'var(--size-completion-height)',
    padding: 'var(--space-2xs)',
  },
  '.cm-tooltip.cm-tooltip-autocomplete > ul > li': { padding: 'var(--space-2xs) var(--space-sm)', borderRadius: 'var(--radius-sm)', lineHeight: 'var(--leading-normal)' },
  '.cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]': { backgroundColor: 'var(--color-selected)', color: 'var(--color-text)' },
  '.cm-completionDetail': { marginLeft: 'var(--space-sm)', color: 'var(--color-text-muted)', fontStyle: 'normal' },
});

/** An editor in `parent`. `onEdit(text)` is called on each change made by the person, not on a text shown by `show`;
 *  `propose` gives what the list of the completion shows, `added` the labels written in italics. */
export function createEditor(parent: HTMLElement, { onEdit, propose, added }: { onEdit: (text: string) => void; propose: Propose; added: Added }) {
  const readOnly = new Compartment();
  let quiet = false;
  const extensions = (locked: boolean) => [
    highlightActiveLine(),
    drawSelection(),
    history(),
    highlightSelectionMatches(),
    completion(propose),
    keymap.of([{ key: 'Enter', run: startItems }, { key: 'Enter', run: continueList }, ...defaultKeymap, ...historyKeymap, ...searchKeymap, indentWithTab]),
    EditorView.lineWrapping,
    markdown,
    syntaxHighlighting(colors),
    links,
    addedLabels(added),
    hanging,
    dashes,
    arrows,
    theme,
    readOnly.of(EditorState.readOnly.of(locked)),
    EditorView.updateListener.of((u) => u.docChanged && !quiet && onEdit(u.state.doc.toString())),
  ];
  const view = new EditorView({ parent, state: EditorState.create({ doc: '', extensions: extensions(true) }) });
  // A click anywhere but in the list closes it, as a menu: also where the editor keeps the focus (the edge of a panel).
  document.addEventListener('pointerdown', (e) => !(e.target as Element).closest?.('.cm-tooltip-autocomplete') && closeCompletion(view), true);
  let shown: string | undefined; // the path of the file shown

  return {
    /** Shows the text of a file. Another file starts afresh (its own undo); the same file, changed elsewhere, only
     *  gets the lines that changed, so that the cursor stays. */
    show(path: string, text: string, locked: boolean) {
      if (path !== shown) {
        shown = path;
        view.setState(EditorState.create({ doc: text, extensions: extensions(locked) }));
        return;
      }
      this.lock(locked);
      const old = view.state.doc.toString();
      if (old === text) return;
      let from = 0;
      while (from < old.length && from < text.length && old[from] === text[from]) from++;
      let end = 0;
      while (end < old.length - from && end < text.length - from && old[old.length - 1 - end] === text[text.length - 1 - end]) end++;
      quiet = true;
      view.dispatch({ changes: { from, to: old.length - end, insert: text.slice(from, text.length - end) } });
      quiet = false;
    },
    /** Read only, when the page cannot write the file. */
    lock(locked: boolean) {
      view.dispatch({ effects: readOnly.reconfigure(EditorState.readOnly.of(locked)) });
    },
    /** Puts the cursor at the start of a line of the file (from 0) and scrolls to it. */
    goTo(line: number) {
      const at = view.state.doc.line(Math.min(line + 1, view.state.doc.lines)).from;
      view.dispatch({ selection: { anchor: at }, effects: EditorView.scrollIntoView(at, { y: 'center' }) });
    },
  };
}
