---
type: type-definition
shape: cards
element: term
---
<!-- Type definition: the name of the file is the name of the type. Context says what the type is for, then its own guidance. Each ## is a known property, in order; its items give its kind, the attributes of the kind and its meaning. -->

## Context
The words of a product and its domain, so that the people and the AI that build it use the same word for the same thing: what each one means, the other words people use, and the words to avoid.

- The terms are in alphabetical order, as in a dictionary: the reader looks a word up.
- Each term is named by the word to use, as the product writes it to the people: a thing in the singular (`Appointment`), an action by its verb (`Cancel`), a state by its adjective or its name (`Confirmed`).
- Write the things, and also the actions, the states, the roles and the technical terms the team uses: an AI mixes them up more than the things.
- Definition says what the term is in this product, not in a dictionary, and what tells it apart from a close term.
- Also called lists the harmless words people use for the same thing, which the product does not write; Avoid lists the words that would mislead (they mean something else here, or something else to the people), each with why between parentheses (`Booking (the practices use it for a block of slots)`). A word goes in one of the two only.

## Kind
- Kind: enum
- Values:
  - thing
  - action
  - state
  - role
  - technical
- Default: thing
- Single: yes
- Meaning: What the term names: a thing the product handles, an action, a state of a thing, a role of a person, or a technical term of the team.

## Definition
- Kind: text
- Single: yes
- Meaning: What the term means in this product, in one or two sentences.

## Also called
- Kind: text
- Meaning: The other words people use for the same thing, understood but not written by the product.

## Avoid
- Kind: text
- Meaning: The words not to use for it, each with why.
