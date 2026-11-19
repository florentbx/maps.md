# Benchmark plan: a project's maps as Markdown vs as HTML, in Claude Sonnet's context

Status: plan, not run yet.

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
- **Sub-agents, no API key**: Claude Code sub-agents on Sonnet, as the AI really reads maps (with its Read tool).
  Each agent is told to read every file of its folder in full first, then to answer, from these files only, and to
  return its answers as JSON, with the list of the files it read (an agent that skipped a file is run again).
- **3 agents per form** (12 in all), to see the variance of the model. Same prompt, only the folder changes.

## Questions

**20 questions**, written by hand from the Markdown, each with its gold answer, then checked to be answerable from
the HTML too (a question whose answer is only in the Markdown is kept and tagged: it shows what the HTML loses).

| Kind | Count | Example |
| --- | --- | --- |
| Find a value | 4 | "What is the status of the initiative X on the roadmap?" |
| Gather a list | 4 | "Which roles can cancel a booking?" |
| Structure | 4 | "From which states can a booking go to *cancelled*?" |
| Follow links between maps | 4 | "Which decision does the rule X come from?" |
| Reason | 2 | "Which initiative of the roadmap has no acceptance scenario?" |
| Trap (not in the maps) | 2 | Must answer `NOT_IN_MAPS` |

Grading: 1 per right answer, partial for lists (share of right elements), 0 and an **invention** counted for any
element that is not in the maps.

## Measures

| Measure | How |
| --- | --- |
| Tokens | The total tokens each agent reports when it ends (its reading of the folder + the answers), mean of 3, per form. Plus the size in characters of each folder, for a figure that does not depend on the agent |
| Understanding | Score out of 20, per kind of question, mean of 3 |
| Inventions | Count, per form |
| Headline | Score per 10K tokens, per form |

Three comparisons are read from it: **A vs B** (the form itself), **B vs B+css** (what the CSS costs, and whether it
changes anything to understanding), **A vs A+def** (what knowing the type brings).

## Steps

1. Export the four folders (a short script, no API). Write the 20 questions and their gold answers.
2. Run the 12 agents in parallel.
3. Grade, and write `RESULTS.md` here: the table above, and the questions where the forms differ, explained.

## Limits

- Tokens reported by an agent include its prompt and its tools: the same for A and B, so the gap is real, but the
  absolute figures are not the cost of the maps alone.
- One project, 20 questions, 3 runs per form: enough to see a large gap (cost x3 is certain; understanding to be seen), not a
  small one. B+css (~250K tokens to read) may also push an agent to skim: the list of the files it read shows it.
  If the result is close, the next step is a second project (`3-coop`, the most linked).
- The HTML is the HTML of this renderer: it says nothing of a cleaner HTML.
