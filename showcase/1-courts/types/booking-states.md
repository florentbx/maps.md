---
type: type-definition
shape: graph
element: state
---
<!-- Type definition: the name of the file is the name of the type. Context says what the type is for, then its own guidance. Each ## is a known property, in order; its items give its kind, the attributes of the kind and its meaning. -->

## Context
The states a booking goes through in its life, the events that move it from one state to the next, and, in each state, whether the slot can be sold to someone else and where the money is: what a marketplace that takes payments must get right.

- Copied from the `state-machine` of the catalog, with two properties more, Slot and Money: in a marketplace, a state is defined as much by what it does to the slot and to the money as by its name.
- Each state is named by its status, as the team calls it (Held, Paid…).
- An arrow goes to the next state, labeled with the event that moves the booking there, in two or three words, with who causes it when the context says (`player cancels early → [[#Cancelled, refunded]]`). A condition or a detail of the event goes in the Description of the state it leads to, not in the label. Write the first state first. A state with no arrow in is the first one, with no arrow out a last one.
- What happens while the booking is in a state (an email sent…) goes in its Description, not in an arrow.
- Write Slot and Money on every state, `undefined` when the context does not say: a gap there is a bug in the product.

## Description
- Kind: text
- Meaning: What the state is and what happens while the booking is in it.

## Slot
- Kind: enum
- Values:
  - taken
  - held
  - free
- Single: yes
- Meaning: Whether the slot can be booked by another player: `taken` it cannot, `held` not for a few minutes, `free` it is open again.

## Money
- Kind: text
- Single: yes
- Meaning: Where the money of the booking is in this state, in the words of the glossary: not paid, paid and kept by Stripe, refunded to the player, paid out to the club.
