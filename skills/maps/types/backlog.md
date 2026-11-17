---
type: type-definition
shape: sequence
element: item
---
<!-- Type definition: the name of the file is the name of the type. Context says what the type is for, then its own guidance. Each ## is a known property, in order; its items give its kind, the attributes of the kind and its meaning. -->

## Context
The work planned on a product, item by item, in the order it will be done.

- The order of the items is their priority: the first one is the next to be done.
- Each item is named by what someone will be able to do, or by what is fixed or done (Book for a relative, Fix the reminder time…).
- Write every known property on every item, with `undefined` when the context does not say.

## Description
- Kind: text
- Meaning: What the item is and why it matters, in one sentence.

## Kind
- Kind: enum
- Values:
  - story
  - bug
  - task
- Default: story
- Single: yes
- Meaning: A story gives someone something new to do, a bug fixes what does not work, a task is work with no change seen by a user.

## Status
- Kind: enum
- Values:
  - to do
  - in progress
  - done
- Default: to do
- Single: yes
- Meaning: Where the item stands.

## Estimate
- Kind: number
- Min: 0
- Single: yes
- Meaning: The size of the item, in points.

## Acceptance criteria
- Kind: text
- Meaning: What must be true for the item to be done, one per item.
