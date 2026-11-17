---
type: type-definition
shape: sequence
element: decision
---
<!-- Type definition: the name of the file is the name of the type. Context says what the type is for, then its own guidance. Each ## is a known property, in order; its items give its kind, the attributes of the kind and its meaning. -->

## Context
The decisions that matter on a project, one after the other, with their problem, the options considered and why one was chosen, as architecture decision records (ADR, MADR): so that nobody has to guess or decide again.

- The decisions are in the order they were taken, the oldest first; a new decision goes at the end.
- Each decision is named by what was decided (Send the reminders by SMS…), not by the question.
- A decision is never deleted nor rewritten once accepted: another decision supersedes it, its status becomes `superseded` and Superseded by links to the new one.
- Write every known property on every decision, with `undefined` when the context does not say.

## Date
- Kind: date
- Single: yes
- Meaning: When the decision was taken, or proposed.

## Status
- Kind: enum
- Values:
  - proposed
  - accepted
  - rejected
  - deprecated
  - superseded
- Default: accepted
- Single: yes
- Meaning: `proposed` while it waits for a decision, `accepted` once taken, `rejected` when it was not taken, `deprecated` when it no longer applies, `superseded` when a later decision takes its place.

## Deciders
- Kind: text
- Meaning: Who took the decision: people, roles or a meeting.

## Problem
- Kind: text
- Meaning: The context and the problem that called for a decision: the need, the forces, the constraints.

## Options
- Kind: text
- Meaning: The options considered, the chosen one included, each with its pros and cons when the source gives them.

## Rationale
- Kind: text
- Meaning: Why the chosen option was taken over the others.

## Consequences
- Kind: text
- Meaning: What the decision changes, good and bad: what becomes easier, harder, or must now be done.

## Superseded by
- Kind: link
- Single: yes
- Meaning: The decision that takes the place of this one (`[[#Send the reminders by SMS]]`), when its status is `superseded`.
