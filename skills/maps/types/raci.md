---
type: type-definition
shape: sequence
element: task
---
<!-- Type definition: the name of the file is the name of the type. Context says what the type is for, then its own guidance. Each ## is a known property, in order; its items give its kind, the attributes of the kind and its meaning. The people and roles as columns, chosen by the map. -->

## Context
Who does what on a project: for each task or decision, who does it (R), who answers for it (A), who is consulted (C) and who is informed (I).

- Each task is named by what is done or decided (Choose the SMS provider…), in the order of the project.
- Each person or role taking part in a task is a property of the task, named the same way on every task (`- CTO: A`); a person who takes no part in a task is left out of it.
- One A per task; A/R when the one who answers for it also does it.

## *
- Kind: enum
- Values:
  - R
  - A
  - C
  - I
  - A/R
- Single: yes
- Meaning: The part of this person or role in the task: R does the work, A answers for the result and approves it, C is asked for their opinion before, I is told of the result.
