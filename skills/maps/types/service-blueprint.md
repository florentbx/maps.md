---
type: type-definition
shape: sequence
element: phase
---
<!-- Type definition: the name of the file is the name of the type. Context says what the type is for, then its own guidance. Each ## is a known property, in order; its items give its kind, the attributes of the kind and its meaning. -->

## Context
How a service is delivered, phase by phase: what the customer sees and does, what the staff and the systems do in front of them and behind the scenes, and what supports them.

- Each phase is named by what the customer is doing at that moment (Book, Arrive, Pay…).
- Write every known property on every phase, with `undefined` when the context does not say.
- Frontstage is what the customer sees; Backstage is what happens out of their sight: the line between them is the line of visibility.
- When a value leads to another, in another lane or another phase (the customer confirms, then the product shows it), it points to it, with the phase and the exact text of the other value: `- Confirms → [[#Book#The booking is confirmed on screen]]`. These are the arrows of the blueprint; write only those the context gives.

## Description
- Kind: text
- Meaning: What the phase is, in one sentence.

## Customer actions
- Kind: text
- Meaning: What the customer does.

## Frontstage
- Kind: text
- Meaning: What the staff or the product do in front of the customer.

## Backstage
- Kind: text
- Meaning: What the staff do out of the customer's sight.

## Support processes
- Kind: text
- Meaning: The systems, partners and internal processes the phase relies on.
