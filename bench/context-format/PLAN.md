# Benchmark plan: a project's maps as Markdown vs as HTML, in Claude Haiku's context

Status: run on 2026-11-19, see [RESULTS.md](RESULTS.md).

## Question

When an AI works on a project with its maps as context, which form gives it the best understanding for the fewest
tokens: the Markdown of the maps (what maps.md stores), with or without the definitions of their types, or the HTML
of the same maps, as the page draws them, with or without its CSS?

Two measures only: **token cost** and **effective understanding**.

## Setup

- **One project**: `showcase/1-courts`, its 10 maps (not `notes/`, not `types/`). Every shape is in it: cards
  (brief, glossary, rules, decisions), sequence (roadmap), graph (architecture, life of a booking), tree (story map),
  matrices (roles), scenarios (acceptance). Size: ~38 KB of Markdown, ~121 KB of HTML without CSS (x3.2).
- **Four folders**, each with one form only, so that no agent can see another form:

  | Folder | What it holds | Size | Role |
  | --- | --- | --- | --- |
  | `A/` | The 10 `.md` files, at their paths | ~38 KB | Baseline: what maps.md stores |
  | `A+def/` | A, plus the definitions of their types (`types/<type>.md`, not the layouts nor the CSS) | ~59 KB | What the skill really gives the AI: does knowing the type help, and at what cost? |
  | `B/` | The 10 maps rendered by `drawMap()` (renderer/draw.ts), one `.html` file each, at the same paths, no CSS | ~121 KB | The map as drawn |
  | `B+css/` | B, each file self-contained: `renderer/style.css`, the type's `.css` and the theme inlined in `<style>` | ~940 KB | The map as a real self-contained HTML file |

  The HTML is written on one line by the renderer: line breaks are added between tags, so that the Read tool can read
  each file in full (they change the tokens very little; measured).
- **Model: Claude Haiku 5.5.** A smaller model feels the form of its context more than Sonnet does, so a gap shows
  sooner and a ceiling is less likely; it is also the cheapest to read B+css (~250K tokens). What holds for Haiku is
  checked on Sonnet only if it matters (see Steps).
- **Sub-agents, no API key**: Claude Code sub-agents on Haiku, as the AI really reads maps (with its Read tool).
  Each agent is told to read every file of its folder in full first, then to answer, from these files only, and to
  return its answers as JSON, with the list of the files it read (an agent that skipped a file is run again).
- **1 agent per form** (4 in all), same prompt, only the folder changes. A second agent is run on two forms only
  when their scores differ by less than 2 points, to tell a real gap from the variance of the model.

## Questions

**20 questions, hard by design.** Even Haiku would get simple lookups right in every form: a score of 20/20 everywhere
says nothing. So no question can be answered from one line of one map; each needs what a form can hide: every
element of a list, an arrow, a link to another map, or the absence of something.

Written by hand from the Markdown, each with its gold answer, then checked to be answerable from the HTML too (a
question whose answer is only in the Markdown is kept and tagged: it shows what the HTML loses).

| Kind | Count | Example | Why it is hard |
| --- | --- | --- | --- |
| Exhaustive list | 5 | "Every rule that applies to a cancellation, across all maps." | One missed element costs; skimming shows |
| Several maps | 6 | "The roadmap initiative that delivers the story X: which architecture component does it touch, and which decision set that component?" | 2-3 links to follow; links are `↗` marks in the HTML |
| Structure | 4 | "Every path from *pending* to *refunded* in the life of a booking." | Arrows are SVG paths in the HTML |
| Absence and counting | 3 | "Which stories of the story map have no acceptance scenario? How many?" | Needs the whole of two maps |
| Trap | 2 | A near name that does not exist, or a link that is not there | Must answer `NOT_IN_MAPS`; an answer is an invention |

Grading: lists by share of right elements (missed elements lower it), 0 and an **invention** counted for any element
that is not in the maps. Scores are out of 20, with decimals: a ceiling is far less likely than with right/wrong.

**Against a ceiling**: A and B run first. If both score 19/20 or more, the questions are made harder (longer
chains, larger lists) before A+def and B+css run, and A and B are run again.

## Measures

| Measure | How |
| --- | --- |
| Tokens | The total tokens each agent reports when it ends (its reading of the folder + the answers), per form. Plus the size in characters of each folder, for a figure that does not depend on the agent |
| Understanding | Score out of 20, per kind of question |
| Inventions | Count, per form |
| Headline | Score per 10K tokens, per form |

Three comparisons are read from it: **A vs B** (the form itself), **B vs B+css** (what the CSS costs, and whether it
changes anything to understanding), **A vs A+def** (what knowing the type brings).

## Steps

1. Export the four folders (a short script, no API). Write the 20 questions and their gold answers.
2. Run the agents of A and B; harden the questions if both reach 19/20.
3. Run the agents of A+def and B+css; a second agent where two forms are within 2 points.
4. Optional: if the forms differ, one Sonnet agent on A and one on B, to see whether the gap holds on a larger
   model.
5. Grade, and write `RESULTS.md` here: the table above, and the questions where the forms differ, explained.

## Limits

- Tokens reported by an agent include its prompt and its tools: the same for A and B, so the gap is real, but the
  absolute figures are not the cost of the maps alone.
- One project, 20 questions, one run per form: enough to see a large gap (cost x3 is certain; understanding to be
  seen), not a small one; a gap under 2 points is checked with a second run before it is reported. B+css (~250K tokens to read) may also push an agent to skim: the list of the files it read shows it.
  If the result is close, the next step is a second project (`3-coop`, the most linked).
- The HTML is the HTML of this renderer: it says nothing of a cleaner HTML.
- If every form still scores the same, that is a result too: the same understanding, for 3 to 25 times the tokens.
  On Haiku, that would mean the form does not matter for understanding, only for cost.
