---
type: type-definition
shape: cards
element: question
---
<!-- Type definition: the name of the file is the name of the type. Context says what the type is for, then its own guidance. Each ## is a known property, in order; its items give its kind, the attributes of the kind and its meaning. -->

## Context
What the research does not know yet, question by question: the research backlog of a team, so that whoever builds sees what is not known, and the next studies are chosen from it.

- A question here is one a study can answer (interviews, a test, a survey, data); a choice the team or the organization must make is a decision, not a research question.
- Each question is named by the question itself, ending with a question mark (`Do members leave because of the shifts?`).
- Raised by links to where the gap shows: an open question of a map, an insight of weak confidence, an assumption of an opportunity solution tree, a phase of a journey written `undefined`.
- Plan says only what the team planned; a question with no plan stays `open`.
- When a study answers it: Status `answered`, Answered by links to its observations; the question is kept, as the open questions of a map.

## Status
- Kind: enum
- Values:
  - open
  - planned
  - answered
- Default: open
- Single: yes
- Meaning: `open` while no study is planned for it, `planned` once a study will answer it, `answered` once a study did.

## Why it matters
- Kind: text
- Single: yes
- Meaning: What waits on the answer: a decision, a solution, a map that cannot be completed, in one sentence.

## Raised by
- Kind: link
- Meaning: Where the gap shows, one per item: an open question, an insight, an assumption, a phase.

## Plan
- Kind: text
- Single: yes
- Meaning: The study that will answer it, as the team planned it: method, who, when.

## Answered by
- Kind: link
- Meaning: The observations of the study that answered it, one per item.
