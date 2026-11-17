---
type: type-definition
shape: cards
element: insight
---
<!-- Type definition: the name of the file is the name of the type. Context says what the type is for, then its own guidance. Each ## is a known property, in order; its items give its kind, the attributes of the kind and its meaning. -->

## Context
What a team knows from its user research, insight by insight, brought together from the observations of its studies; the other maps link to its insights rather than copying them.

- One map of insights per scope the organization chooses (a kind of customer, a product…); a map that grows is split.
- An insight is created on purpose, by a person: write the insights you are given; do not draw new insights from the studies on your own, unless the person asks you to: they are then proposals, each said in the open questions.
- Each insight is named by what it states, in one sentence.
- An insight is short: the quotes stay in the studies, reached through Supported by.
- Theme groups the insights by subject (`Search`, `After booking`), in the words of the team; the same words for the insights of one subject.
- Implication says what the insight means for the product, in one sentence: a question to work on (`How might we show the next free slot in the results?`) or a decision.
- An observation that contradicts an insight is an open question that links to both; once settled, its decision.

## Description
- Kind: text
- Single: yes
- Meaning: What the insight means, in a few lines, when its name is not enough.

## Theme
- Kind: text
- Single: yes
- Meaning: The subject the insight is about, in a word or two; the insights are drawn by theme.

## Kind
- Kind: enum
- Values:
  - pain
  - gain
  - need
  - behaviour
- Single: yes
- Meaning: `pain` what goes wrong, `gain` what people value, `need` what they need, `behaviour` what they do.

## Implication
- Kind: text
- Single: yes
- Meaning: What the insight means for the product, in one sentence: a question to work on, or a decision.

## Supported by
- Kind: link
- Meaning: The observations of the studies that support the insight, one per item (`[[2026-10-interviews#Cannot see when a practitioner is available]]`).
