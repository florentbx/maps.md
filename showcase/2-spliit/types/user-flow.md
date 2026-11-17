---
type: type-definition
shape: graph
element: step
---
<!-- Type definition: the name of the file is the name of the type. Context says what the type is for, then its own guidance. Each ## is a known property, in order; its items give its kind, the attributes of the kind and its meaning. -->

## Context
The path a person takes in the product to reach a goal: the steps, the decisions, and where it ends.

- Each step is named by what the person does or sees, or, for a decision, by its question (`Logged in?`).
- An arrow goes to the next step; its label, when there is one, says when it is followed. A step with no arrow in is a start, with no arrow out an end: leave a step without an arrow out only when the context says the path ends there.
- A decision has at least two arrows, one per answer, each labeled with the answer.
- An arrow the person may not take, a step they may skip, is labeled `optional`, or its label starts with it (`optional, to share it`); it is drawn dashed.
- Write first the arrow of the main path (the most common answer, the path the flow is about); it is drawn straight on, the others to the side.

## Description
- Kind: text
- Meaning: What the step is.

## Kind
- Kind: enum
- Values:
  - screen
  - decision
  - action
- Single: yes
- Default: action
- Meaning: `screen` for what the person sees, a page or a view of the product, named after it (`Slot picker`); what they do there (click, fill in, choose) is an `action` after it, not part of the screen. `decision` for a question that separates the path. `action` for something the person does or that happens; leave it out for an action.
