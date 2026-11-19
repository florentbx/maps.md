# Results: a project's maps as Markdown vs as HTML, in Claude Haiku's context

Run on 2026-11-19, following [PLAN.md](PLAN.md). One Claude Code sub-agent on Haiku per form and per test; each read
every file of its folder in full (all of them listed the files they read), then answered the questions in JSON.
The forms are made by [export.ts](export.ts); the questions and their gold answers are in
[questions-courts.json](questions-courts.json) and [questions-coop.json](questions-coop.json).

## In short

- **Understanding: the same.** Haiku understood the HTML as well as the Markdown, with or without CSS: every chain
  of links, arrow and nested tree was found in the HTML too, through the `title` and `data-*` attributes. No form
  made it invent anything; every trap was avoided.
- **Cost: the HTML is 2 to 6 times as expensive**, for nothing more. The CSS alone multiplies the cost of the map by
  about 7.
- **The two differences in answers are about what the drawing changes, not about reading**: the HTML loses what the
  layout hides (the labels of the arrows of an architecture), and shows what the Markdown leaves implicit (a default
  value of the type).

## Test 1: `showcase/1-courts`, 10 maps, 20 questions

| Form | Size of the folder | Score | Inventions | Tokens of the agent | Time |
| --- | --- | --- | --- | --- | --- |
| A, Markdown | 38 K chars | **20/20** | 0 | **86,800** | 32 s |
| A+def | 55 K chars | not run (A already at 20/20) | | | |
| B, HTML | 125 K chars | **19.7/20** | 0 | **135,100** (x1.6) | 31 s |
| B+css, HTML with its CSS | 921 K chars | **19.7/20** | 0 | **492,800** (x5.7) | 74 s |

The only point lost by B and B+css (Q11): the label of the arrow from Stripe Connect to the web app, "payment done,
refund done (webhook)". The layout of the system architecture draws no label on its arrows (the panel of the page
shows them on a click), so the label is not in the HTML. Both agents said the arrow has no label: no invention.

## Test 2, harder: `showcase/3-coop`, 11 maps, 20 questions

Chains of 3 to 4 links across maps, findings cited by no insight, counts over the whole project, a computation,
two traps; the HTML repeats content across up to 5 views per map.

| Form | Size of the folder | Score | Inventions | Tokens of the agent | Time |
| --- | --- | --- | --- | --- | --- |
| A, Markdown | 52 K chars | **20/20** | 0 | **93,800** | 33 s |
| B, HTML | 247 K chars | **19/20**, or 20/20 (see below) | 0 | **195,300** (x2.1) | 49 s |

The only difference (H11, "which research questions have no status?"): three questions have no `Status` written in
the Markdown, and A listed them. The type gives `open` as the default status, and the page draws it: B saw `open`
and answered "none, 3 are open". By the letter of the question B is wrong; by the meaning of the map (its type), B is
right and A only reads what is written. A+def, which reads the type, would likely have answered as B.

## Tokens: what the maps themselves cost

The tokens an agent reports include its own prompt and tools. Across the five runs they fit a fixed part of about
70K tokens plus about 0.5 token per character of the folder, so the part of the maps is roughly:

| | A | B | B+css |
| --- | --- | --- | --- |
| 1-courts | ~19K | ~62K (x3.3) | ~425K (x22) |
| 3-coop | ~26K | ~122K (x4.7) | not run |

An estimate from 5 points, not a count: an exact count needs `countTokens` with an API key.

## What it means for maps.md

- Give an AI the Markdown: same understanding, 3 to 5 times fewer tokens than the HTML of the page, 20 times fewer
  than a self-contained HTML file. The HTML is for people.
- Two things the Markdown alone does not carry, which the HTML showed: the defaults of a type (read the type
  definition, A+def, to have them) and, the other way, what a layout hides is never lost in the Markdown.

## Limits

- One agent per form and per test, on Haiku; two projects written by an AI with maps.md.
- At this size (10 to 11 maps), Haiku reads every form without error: the questions did not separate the forms on
  understanding, even the harder ones. A larger context (several projects at once) might.
- Not run, as decided along the way: A+def, B+css on 3-coop, Sonnet.
