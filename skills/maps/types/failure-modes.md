---
type: type-definition
shape: sequence
element: failure
---
<!-- Type definition: the name of the file is the name of the type. Context says what the type is for, then its own guidance. Each ## is a known property, in order; its items give its kind, the attributes of the kind and its meaning. -->

## Context
What can go wrong while the product runs, how likely and how serious it is, how it is noticed and what the product does then; so that the AI that builds it handles each case on purpose.

- Each failure is named by what goes wrong, in a few words (`Disk full`, `Payment refused`).
- Write every known property, with `undefined` when the context does not say.
- Severity is for the person: `low` a delay or a retry, `medium` they must act, `high` they lose data, money or access.
- Each value is short, what a person checks at a glance: one fact per item, in a few words. When it is not decided, or two sources say different things, the details go in an open question.
- Response is what the product does on its own (retries, rolls back, alerts someone); The person sees, what they are told, with a link to the state of a screen or the notification that tells them.

## Likelihood
- Kind: enum
- Values:
  - low
  - medium
  - high
- Single: yes
- Meaning: How often it is expected to happen.

## Severity
- Kind: enum
- Values:
  - low
  - medium
  - high
- Single: yes
- Meaning: How bad it is for the person.

## Cause
- Kind: text
- Meaning: Why it happens.

## Detected by
- Kind: text
- Meaning: How the product, or the team, notices it.

## Response
- Kind: text
- Meaning: What the product does on its own.

## The person sees
- Kind: text
- Meaning: What the person is told, and what they can do.
