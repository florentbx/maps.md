---
type: type-definition
shape: sequence
element: initiative
---
<!-- Type definition: the name of the file is the name of the type. Context says what the type is for, then its own guidance. Each ## is a known property, in order; its items give its kind, the attributes of the kind and its meaning. -->

## Context
What the product team works on, initiative by initiative, in the order of time: where each one stands, when, who carries it and why.

- Each initiative is named as the team calls it (SMS reminders v2, Waiting list…).
- Order the initiatives by When, earliest first; those without a date come last (a cancelled one at the date it was stopped), in the order of the context.
- Write every known property on every initiative, with `undefined` when the context does not say.
- Write When as the context gives it (a month, a quarter); never make it more precise.
- What is still to be decided goes in `## Open questions`, not in a property.

## Description
- Kind: text
- Meaning: What the initiative is, in one sentence.

## Status
- Kind: enum
- Values:
  - shipped
  - in progress
  - planned
  - undecided
  - cancelled
- Single: yes
- Meaning: `shipped` when it is live, `in progress` when the work has started, `planned` when it is committed but not started, `undecided` when it is only an idea or not decided yet, `cancelled` when it was stopped (When is then when it was stopped).

## When
- Kind: text
- Meaning: When it shipped or is planned to ship, as precise as the context gives it.

## Owner
- Kind: text
- Meaning: The person or the team who carries it.

## Depends on
- Kind: text
- Meaning: What must happen or be decided before it can be done.

## Why
- Kind: text
- Meaning: The problem it solves or the reason for it, only when the context gives it.
