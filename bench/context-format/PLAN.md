# Benchmark plan: a map as Markdown vs the same map as HTML, in Claude Sonnet's context

Status: plan, not run yet.

## Question

When an AI reads a map as its context, which form gives it **the best understanding of the map for the fewest
tokens**:

- **A. The Markdown** of the map (`<map>.md`), what maps.md stores and what the AI reads today;
- **B. The HTML** of the same map, as the page draws it (the boxes, tables, tabs and SVG of the renderer)?

Two axes, and only two:

1. **Token cost**: what the map costs in context.
2. **Effective understanding**: what the AI actually gets right about the map, from finding a value to reasoning on
   it, without inventing anything.

Both are joined in one headline number: **understanding per token** (see Metrics). Latency is out of scope.

Model under test: Claude Sonnet 5.5 (`claude-sonnet-5-5`).

## Hypotheses

- **H1 (cost)**: B costs 3 to 4 times the input tokens of A without CSS, far more with it.
- **H2 (understanding)**: A is understood at least as well as B; B loses most on relations (arrows drawn as SVG paths,
  links reduced to `↗` marks with the target only in a `title` attribute) and on lists repeated across views.
- **H3 (faithfulness)**: B makes the AI invent more, because of the noise of the markup (filter buttons, tabs,
  repeated content).

The benchmark is built so that any of these can be refuted, including in favour of HTML (its tables and views lay
out what the Markdown leaves implicit, such as a matrix or the elements grouped by status).

## What the repository already shows (measured on 2026-11-19, no API call)

`drawMap()` (renderer/draw.ts) renders a map to HTML in Node, with no browser. Rendered on the 31 maps of `showcase/`:

| | Markdown | HTML (fragment, no CSS) |
| --- | --- | --- |
| Total size | 154 KB | 545 KB (**x3.5**) |
| Per map | 2 to 14 KB | x1.6 (brief) to **x10.5** (opportunity tree) |
| Visible text once tags are stripped | 154 KB | 152 KB, but up to 2x the Markdown on maps with several views (journey map, opportunity tree): the same content is repeated in each tab |

And three facts that the benchmark must account for:

1. **Links lose their target in the text**: `[[story-map]]` becomes `<a class="mark" href="#" title="story-map (The story map)">↗</a>`.
2. **Views duplicate content**: a type with three views (roadmap: Timeline, Roadmap, Board) renders the elements three times.
3. **`renderer/style.css` alone is 75 KB** (~20K tokens): with it, the CSS would outweigh most maps.

`maps.html` (2 MB) is not a candidate: it is the app that loads the Markdown at runtime; it holds no map content.

## Conditions

| Id | What Sonnet receives | Role |
| --- | --- | --- |
| **A** | The map's `.md` file, as is | Baseline |
| **B** | The HTML fragment of `drawMap()`, wrapped in a minimal `<!doctype html>` page, with no CSS | Main comparison: the map as drawn |
| **B+css** | B with `renderer/style.css`, the type's `.css` and the theme inlined in `<style>` | Realistic "self-contained HTML file": tokens counted for every map, understanding tested on a 30% sample (CSS should change the cost, not the understanding: the sample checks it) |
| A+def (optional) | A plus the type definition `<type>.md` | What the skill really gives the AI: tells whether knowing the type changes the understanding, and at what extra cost |

Same system prompt in every condition, only the document changes:
"Answer only from the document. If the document does not say it, answer `NOT_IN_MAP`."

Two levels:

1. **One map in context** (31 maps of `showcase/`, plus the 4 of `maps/`).
2. **A whole project in context** (`showcase/2-spliit`, 10 maps; `showcase/3-coop`, 11 maps): understanding that
   needs several maps and the links between them, where the token gap adds up.

## Axis 1: token cost

Measured exactly, never estimated:

- `messages.countTokens` on every document in every condition (free): **tokens per map**, per type, per shape
  (cards, sequence, graph, tree), per project.
- Where the tokens of B go: share of tags and attributes, of repeated views, of SVG paths, of CSS. Measured by
  counting the tokens of B with each part removed, so that a cleaner HTML could be specified if B is ever worth it.
- `usage` of every answer: input and output tokens actually billed (the AI may also answer longer from HTML).
- In dollars, at Sonnet 5.5's price ($2 / $10 per MTok), for one question and for a working session (a project in
  context, 20 questions).

This axis needs no question and can be delivered first.

## Axis 2: effective understanding

Understanding is tested in five levels, from reading to reasoning, so that the result says *where* a form helps or
hurts, not only a global score. Questions are generated from the parsed map (`readMap`, `elementsOf` in
renderer/read.ts): the gold answer comes from the source, with no hand labelling. About 8 to 10 per map, ~300 in
total, plus ~40 at the project level.

| Level | What it tests | Example | Grading |
| --- | --- | --- | --- |
| 1. Find | A value of an element | "What is the Status of *Club onboarding*?" | Exact match (normalized) |
| 2. Gather | Every element that meets a condition, and how many | "List every initiative whose Status is planned." | Set F1 + exact count |
| 3. Relate | The structure: arrows, parents, order | "Which components does *API* call?", "What is the parent of X?", "Which step comes after X?" | Set F1 / exact |
| 4. Follow | Links to other maps and elements | "Which insight does the phase *X* rest on?"; at the project level, a question that needs the cited map | Exact (map + element) |
| 5. Reason | A conclusion the map supports but does not state | "Which planned initiative depends on one still undecided?", "Which pain point has no opportunity?" | Gold from the parsed map when it can be computed; else a rubric graded by Claude Opus 5.5 (`claude-opus-5-5`), blind to the condition |

And across every level, **faithfulness**:

- Negative questions (an element or property that does not exist, built from a near name): the answer must be
  `NOT_IN_MAP`.
- In every list answer, elements that are not in the map are counted as **inventions**.

Optional, after the first results, a sixth level, **Use**: "Add an element *Y* with these properties; return the map
in its Markdown format." Graded by `check.mjs` and the new element. It measures whether an AI that read the HTML can
still work on the map, which is what maps.md is for.

**Presence check** before any run: each closed question's gold answer must be in the visible text of both A and B.
A question whose answer is missing from B (e.g. a link target only in `title`) is kept but tagged `lost-in-html` and
reported apart: it is a finding about the form, not noise.

Answers are returned as JSON through structured outputs (`output_config.format`), so grading is deterministic.

## Metrics

| Metric | Definition |
| --- | --- |
| Tokens per map | `countTokens` of the document, per condition |
| Understanding score | Mean score over the questions (exact = 0/1, F1 for lists, rubric 0-1 for level 5), overall and per level |
| Invention rate | Wrong answers to negative questions + invented elements in lists, per 100 questions |
| **Understanding per token** | Understanding score / thousands of input tokens: the headline, how much is understood for what is paid |
| Cost per correct answer | Dollars billed (input + output) / correct answers |
| Ratio B / A | Of each metric above, with a 95% confidence interval |

Statistics: paired design (every question in every condition, 3 repetitions for the model's variance); McNemar test
on binary answers, Wilcoxon signed-rank on F1 and rubric scores, bootstrap confidence intervals. With ~300 pairs x 3
repetitions, a gap of ~6-8 points of understanding is detectable. The 20 largest disagreements between A and B are
read and explained in the report.

## Protocol

- Model: `claude-sonnet-5-5`, adaptive thinking (default), effort `medium` for the main run; an effort `low` run on
  the pilot, to see whether a weaker effort widens the gap. No `temperature` (not accepted).
- Order of questions shuffled; the document first in the prompt, the question after it.
- Run through the **Message Batches API** (-50%), with prompt caching on the document (one cache per map and
  condition, the question after the breakpoint). Caching changes the bill, not the tokens the model reads: both are
  reported, so that the comparison of forms stays on the uncached count.

## Cost estimate (to confirm with countTokens in step 1)

Rough: ~1.5K input tokens per map in A, ~5-6K in B, ~25K in B+css. ~300 questions x 3 repetitions, batch -50%:

| Part | Cost at $2 / $10 per MTok |
| --- | --- |
| A | ~$1.5 |
| B | ~$5 |
| B+css (30% sample) | ~$6 |
| Outputs | ~$4 |
| Project level + judge | ~$8 |

Total about **$25-30**; less with caching. Nothing is billed before the pilot is approved.

## Steps

| # | Step | Output | API cost |
| --- | --- | --- | --- |
| 1 | `export.ts`: render every map to A, B, B+css; count tokens; split the tokens of B | `out/docs/`, `out/tokens.csv`, **axis 1 complete** | 0 (countTokens is free) |
| 2 | `questions.ts`: generate the questions of levels 1-5 and their gold; presence check; hand-write the rubric questions | `questions.json`, `questions.manual.json` | 0 |
| 3 | Pilot: `showcase/1-courts` only, 1 repetition, effort low and medium | first numbers, prompt fixes | ~$2 |
| 4 | Full run (batch) | `out/answers.jsonl` | ~$25 |
| 5 | `grade.ts` + `report.ts`: grading, judge, statistics, charts | `RESULTS.md` | ~$3 (judge) |

Code in TypeScript, as the rest of the repository, with `@anthropic-ai/sdk` as a dev dependency; nothing of
`bench/` is shipped (`package.json` `files` does not list it). Generated outputs (`out/`) are not committed, only
`RESULTS.md`. Steps 1 and 3-5 need an Anthropic API key in the environment.

## Threats to validity

- **The examples are written by an AI with maps.md**: the Markdown may be "easier" for a model of the same family.
  Mitigation: also run the 4 maps of `maps/`, written differently; report per project.
- **Generated questions favour what the parser sees**, so the Markdown structure. Mitigation: the level 5 questions
  are written by hand from the drawn map, not from the source.
- **The HTML of maps.md is one HTML among many**: the result says "the HTML of this renderer", not "any HTML". The
  token split of step 1 says what a cleaner HTML (B-clean: no UI chrome, one view, links as text) would cost; it is
  added as a condition if B understands better but costs too much.
- **One model**: the result holds for Sonnet 5.5; a short replication on Claude Haiku 5.5 would show whether the gap
  grows with a smaller model.

## Decisions to confirm

1. Keep B+css on a sample only (recommended) or on every map.
2. Add A+def (recommended: it is what the skill really gives).
3. Include level 6, Use, now or after the first results (recommended: after).
