# Benchmark plan: a map as Markdown vs the same map as HTML, in Claude Sonnet's context

Status: plan, not run yet.

## Question

When an AI reads a map as its context, which form serves it better, at what cost:

- **A. The Markdown** of the map (`<map>.md`), what maps.md stores and what the AI reads today;
- **B. The HTML** of the same map, as the page draws it (the boxes, tables, tabs and SVG of the renderer)?

"Better" is measured on four axes: **accuracy** of answers, **hallucinations**, **input tokens / cost**, **latency**.

Model under test: Claude Sonnet 5.5 (`claude-sonnet-5-5`).

## Hypotheses

- **H1 (accuracy)**: A is at least as accurate as B overall; B loses on structure (arrows drawn as SVG paths, links
  reduced to `↗` marks with the target only in a `title` attribute) and on lists repeated across views.
- **H2 (cost)**: B costs 3 to 4 times the input tokens of A without CSS, far more with it.
- **H3 (hallucination)**: B produces more wrong answers to questions about elements that are not in the map, because
  of the noise of the markup (filter buttons, view tabs, repeated content).

The benchmark is built so that any of these can be refuted.

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
| **B+css** | B with `renderer/style.css`, the type's `.css` and the theme inlined in `<style>` | Realistic "self-contained HTML file"; tokens measured for all maps, accuracy run on a 30% sample (CSS should not change accuracy, only cost) |
| A+def (optional) | A plus the type definition `<type>.md` | What the skill really gives the AI; tells whether the gap closes once the AI knows the type |

Same system prompt in every condition, only the document changes:
"Answer only from the document. If the document does not say it, answer `NOT_IN_MAP`."

## Two levels

1. **One map in context** (31 maps of `showcase/`, plus the 4 of `maps/`): questions on that map.
2. **A whole project in context** (`showcase/2-spliit`, 10 maps; `showcase/3-coop`, 11 maps): questions that need
   two maps and the links between them. In A, the Markdown files concatenated with their path; in B, the HTML pages
   concatenated with their path.

## Questions and gold answers

Generated from the parsed map (`readMap`, `elementsOf` in renderer/read.ts), so the gold answer comes from the source
and no hand labelling is needed for the closed questions. About 8 questions per map, ~280 in total, plus ~40 project
questions.

| Category | Example | Grading |
| --- | --- | --- |
| Lookup | "What is the Status of the initiative *Club onboarding*?" | Exact match (normalized) |
| Filter / count | "List every initiative whose Status is planned." | Set F1 + exact count |
| Structure | Graph: "Which components does *API* call?"; tree: "What is the parent of X?"; sequence: "Which step comes after X?" | Set F1 / exact |
| Links | "Which map and element does *X* cite?" | Exact (map name + element) |
| Negative | A property or element that does not exist (made from a near name) | Must answer `NOT_IN_MAP` |
| Synthesis (~5 per project) | "What are the three main pain points of the journey, and the insight behind each?" | Rubric graded by Claude Opus 5.5 (`claude-opus-5-5`), blind to the condition (the judge sees the Markdown as reference) |
| Round trip (optional, stage 2) | "Add an element *Y* with these properties; return the map in its Markdown format." | `check.mjs` passes + the new element is right. Measures whether an AI that read HTML can still write the map back |

**Presence check** before any run: for each closed question, check that the gold answer is in the visible text of
both A and B. A question whose answer is missing from B (e.g. a link target only in `title`) is kept but tagged
`lost-in-html`, and reported apart: it is a finding, not noise.

Answers are returned as JSON through structured outputs (`output_config.format`), so grading is deterministic.

## Protocol

- Model: `claude-sonnet-5-5`, adaptive thinking (default), effort `medium` for the main run; an effort `low` run on
  the pilot to see if the gap depends on it. No `temperature` (not accepted).
- **Paired design**: every question is asked in every condition; 3 repetitions per (question, condition) for the
  model's variance.
- Order of questions shuffled; the document first in the prompt, the question after it.
- Cost run through the **Message Batches API** (-50%), with prompt caching on the document (one cache per map and
  condition, questions after the breakpoint).
- **Latency** measured apart, on 40 questions per condition, with direct streaming calls and no cache: time to first
  token and total time.
- Tokens: `messages.countTokens` for every document (exact, no estimate), and `usage` of every response.

## Metrics and analysis

- Accuracy per condition, overall, per category, per map type and per shape (cards, sequence, graph, tree).
- Hallucination rate: wrong answers to negative questions + invented elements in lists.
- Input tokens, output tokens, cost per question and **cost per correct answer**.
- Latency: TTFT and total, median and p90.
- Statistics: McNemar test on paired binary answers (A vs B), Wilcoxon signed-rank on F1 and judge scores, 95%
  bootstrap confidence intervals. With ~280 pairs x 3 repetitions, a gap of ~6-8 points of accuracy is detectable.
- Qualitative: the 20 largest disagreements between A and B, read and explained.

## Cost estimate (to confirm with countTokens in step 1)

Rough: ~1.5K input tokens per map in A, ~5-6K in B, ~25K in B+css. ~280 questions x 3 repetitions:

| Condition | Input tokens | Cost at $2 / $10 per MTok, batch -50% |
| --- | --- | --- |
| A | ~1.3M | ~$1.5 |
| B | ~5M | ~$5 |
| B+css (30% sample) | ~6M | ~$6 |
| Outputs (all) | ~0.8M | ~$4 |
| Project level + judge + latency runs | | ~$10 |

Total about **$25-35**. Prompt caching lowers it further. Nothing is billed before the pilot is approved.

## Steps

| # | Step | Output | API cost |
| --- | --- | --- | --- |
| 1 | `export.ts`: render every map to A, B, B+css; count tokens | `out/docs/`, `out/tokens.csv` | ~0 (countTokens is free) |
| 2 | `questions.ts`: generate questions and gold answers; presence check; hand-write the synthesis questions | `questions.json`, `questions.manual.json` | 0 |
| 3 | Pilot: `showcase/1-courts` only, 1 repetition, effort low and medium | first numbers, prompt fixes | ~$2 |
| 4 | Full run (batch) + latency run | `out/answers.jsonl` | ~$25-35 |
| 5 | `grade.ts` + `report.ts`: grading, judge, statistics, charts | `RESULTS.md` | ~$3 (judge) |

Code in TypeScript, as the rest of the repository, with `@anthropic-ai/sdk` as a dev dependency; nothing of
`bench/` is shipped (`package.json` `files` does not list it). Generated outputs (`out/`) are not committed, only
`RESULTS.md`.

## Threats to validity

- **The examples are written by an AI with maps.md**: the Markdown may be "easier" for a model of the same family.
  Mitigation: also run the 4 maps of `maps/`, written differently; report per project.
- **Generated questions favour what the parser sees**, so the Markdown structure. Mitigation: the synthesis questions
  are written by hand, from the drawn map, not from the source.
- **The HTML of maps.md is one HTML among many**: the result says "the HTML of this renderer", not "any HTML". A
  cleaned HTML (semantic tags only, no UI chrome, one view) could be added as a condition B-clean if B loses.
- **One model**: the result holds for Sonnet 5.5; a short replication on Claude Haiku 5.5 would show whether the gap
  grows with a smaller model.

## Decisions to confirm

1. Keep B+css on a sample only (recommended) or on every map.
2. Add A+def (recommended: it is what the skill really gives).
3. Include the round trip (stage 2) now or after the first results (recommended: after).
