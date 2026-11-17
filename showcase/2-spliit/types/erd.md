---
type: type-definition
shape: graph
element: entity
---
<!-- Type definition: the name of the file is the name of the type. Context says what the type is for, then its own guidance. Each ## is a known property, in order; its items give its kind, the attributes of the kind and its meaning. The attributes with their details, the cardinalities drawn at the ends of the lines. -->

## Context
The entities the product stores, what each one holds and how they relate (an entity relationship diagram).

- Each entity is named by a singular noun, as the team says it (Patient, Appointment…).
- An arrow is a relation, written once, on the entity that points to the other: a slot belongs to a practitioner, so the arrow is on the slot. Its label names the relation, then its cardinality when the context gives it (`belongs to 1 → [[#Practitioner]]`, `has 0..n → [[#Relative]]`). An entity with no arrow is neither a start nor an end.
- Limits that a cardinality does not say (not handled today…) go in the description.

## Description
- Kind: text
- Meaning: What the entity is, in one sentence.

## Attributes
- Kind: text
- Meaning: The data the entity holds, one per item, with its use in brackets when the context gives it: `phone number (for SMS)`; under it, its details, only those the context gives.
- Details:
  - Type:
    - Kind: text
    - Single: yes
    - Meaning: What the value is, in the words of the team or of its code: text, number, date, yes or no, one of a list (`one of authorized, captured, refunded`).
  - Required:
    - Kind: enum
    - Values:
      - yes
      - no
    - Single: yes
    - Meaning: `yes` when every entity has a value, `no` when it may be empty.
  - Unique:
    - Kind: enum
    - Values:
      - yes
      - no
    - Single: yes
    - Meaning: `yes` when no two entities have the same value (an email, a reference).
