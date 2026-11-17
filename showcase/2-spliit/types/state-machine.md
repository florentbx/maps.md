---
type: type-definition
shape: graph
element: state
---
<!-- Type definition: the name of the file is the name of the type. Context says what the type is for, then its own guidance. Each ## is a known property, in order; its items give its kind, the attributes of the kind and its meaning. -->

## Context
The states a thing goes through in its life, and the events that move it from one state to the next.

- Each state is named by its status, as the team calls it (Booked, Confirmed…).
- An arrow goes to the next state, labeled with the event that moves the thing there, in two or three words, with who causes it when the context says (`patient cancels → [[#Cancelled]]`). A condition or a detail of the event goes in the Description of the state it leads to, not in the label: a long label spreads the drawing. Write the first state first. A state with no arrow in is the first one, with no arrow out a last one; when every state has an arrow in (a life that comes back to its start), the first one written is the first.
- What happens while the thing is in a state (a reminder sent…) goes in its Description, not in an arrow.

## Description
- Kind: text
- Meaning: What the state is and what happens while the thing is in it.
