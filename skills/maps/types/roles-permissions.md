---
type: type-definition
shape: sequence
element: action
---
<!-- Type definition: the name of the file is the name of the type. Context says what the type is for, then its own guidance. Each ## is a known property, in order; its items give its kind, the attributes of the kind and its meaning. The roles as columns, chosen by the map. -->

## Context
Who can do what in a product: for each action, which roles may do it.

- Each action is named by a verb and what it acts on, in the words of the glossary (`Cancel an appointment`), in the order of the product.
- Each role is a property of the action, named the same way on every action (`- Practice manager: yes`). Write every role on every action, `no` included, so that nothing is left to guess; `undefined` when the source does not say.
- `own` allows it only on what is theirs (their appointment, their practice); a finer condition is a business rule, linked from an open question or from Context.

## *
- Kind: enum
- Values:
  - yes
  - own
  - no
- Single: yes
- Meaning: Whether this role may do the action: `yes` always, `own` only on what is theirs, `no` never.
