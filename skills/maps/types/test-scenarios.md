---
type: type-definition
shape: cards
element: scenario
---
<!-- Type definition: the name of the file is the name of the type. Context says what the type is for, then its own guidance. Each ## is a known property, in order; its items give its kind, the attributes of the kind and its meaning. -->

## Context
The acceptance criteria of a product as scenarios: in a situation, when something happens, what must then be true; each linked to what it checks, so that the AI that builds it can write the tests and knows when it is done.

- Each scenario is named by what it checks, in a few words (`Split a cost evenly`).
- Given, When and Then are in the words of the person and of the glossary, not of the code. Given and Then take one value per condition or result, read as "and"; When is one event.
- One scenario checks one behaviour: a variant (another amount, an error) is another scenario.
- Checks links to what the scenario checks: the step of a user flow, a screen or one of its states, a business rule, a notification.
- Feature groups the scenarios, as in Gherkin: the part of the product they check, in one or two words, written the same on each of its scenarios (`Booking`, `Cancellation`).

## Feature
- Kind: text
- Single: yes
- Meaning: The part of the product the scenario checks, shared by its other scenarios.

## Checks
- Kind: link
- Meaning: What the scenario checks: a step of a user flow, a screen or one of its states, a business rule, a notification.

## Given
- Kind: text
- Meaning: The situation before: what is true, what the person has done.

## When
- Kind: text
- Single: yes
- Meaning: The event: what the person does, or what happens.

## Then
- Kind: text
- Meaning: What must then be true: what the person sees, what is saved, what is sent.
