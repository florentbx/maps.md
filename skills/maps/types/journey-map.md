---
type: type-definition
shape: sequence
element: phase
---
<!-- Type definition: the name of the file is the name of the type. Context says what the type is for, then its own guidance. Each ## is a known property, in order; its items give its kind, the attributes of the kind and its meaning. -->

## Context
What a person does, thinks and feels, phase by phase, where it goes wrong and what could be better.

- Each phase is named by what the person is doing at that moment (Search, Compare, Book…).
- Write every known property on every phase, with `undefined` when the context does not say.

## Description
- Kind: text
- Meaning: What the phase is, in one sentence.

## Actions
- Kind: text
- Meaning: What the person does.
- Details:
  - Description:
    - Kind: text
    - Single: yes
    - Meaning: What the action is, in one sentence, when the context gives it.

## Touchpoints
- Kind: text
- Meaning: Where it happens: channels, people, objects.
- Details:
  - Description:
    - Kind: text
    - Single: yes
    - Meaning: What the touchpoint is, or what happens there, in one sentence, when the context gives it.

## Thoughts
- Kind: text
- Meaning: What the person thinks or says, quoted when the context quotes it.
- Details:
  - Description:
    - Kind: text
    - Single: yes
    - Meaning: Why the person thinks it, in one sentence, when the context gives it.

## Emotion
- Kind: number
- Min: -3
- Max: 3
- Single: yes
- Note: yes
- Meaning: How the person feels, from -3 (negative) to 3 (positive), only when the context states a feeling, with its word after a comma: `-1, worried`.

## Pain points
- Kind: text
- Meaning: Problems the person meets. Each problem in a few words, with its details under it, only those the context gives.
- Details:
  - Description:
    - Kind: text
    - Single: yes
    - Meaning: What the problem is, in one sentence, when the context gives it.
  - Severity:
    - Kind: enum
    - Values:
      - low
      - medium
      - high
    - Single: yes
    - Meaning: How much the problem hurts the person, when the context says it.
  - Quote:
    - Kind: text
    - Single: yes
    - Meaning: What the person said about it, in their words.
  - Source:
    - Kind: text
    - Single: yes
    - Meaning: Where it comes from: an interview, a study, with its date.
  - Evidence:
    - Kind: text
    - Single: yes
    - Meaning: A fact that shows the problem.
  - Seen in:
    - Kind: text
    - Single: yes
    - Meaning: How many of the sources show it (`2 of 2 interviews`).
  - Metric:
    - Kind: text
    - Single: yes
    - Meaning: A measure of the problem, with where it comes from.

## Opportunities
- Kind: text
- Meaning: Ideas to improve the phase, only when the context gives them. Each idea in a few words, with its details under it, only those the context gives.
- Details:
  - Description:
    - Kind: text
    - Single: yes
    - Meaning: What the idea is, in one sentence.
  - Impact:
    - Kind: enum
    - Values:
      - low
      - medium
      - high
    - Single: yes
    - Meaning: What it would change for the person, when the context gives it.
  - Effort:
    - Kind: enum
    - Values:
      - low
      - medium
      - high
    - Single: yes
    - Meaning: What it would cost to make, when the context gives it.
  - Status:
    - Kind: enum
    - Values:
      - planned
      - in progress
      - live
    - Single: yes
    - Meaning: Where the idea stands, when the ideas are followed up.
  - Owner:
    - Kind: text
    - Single: yes
    - Meaning: Who carries it (`Booking team`).
  - Due:
    - Kind: date
    - Single: yes
    - Meaning: When it is due (`2027-Q1`).
  - Result:
    - Kind: text
    - Single: yes
    - Meaning: Once live, what it changed (`−8% late arrivals`).
