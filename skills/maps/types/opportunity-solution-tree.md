---
type: type-definition
shape: tree
element: node
---
<!-- Type definition: the name of the file is the name of the type. Context says what the type is for, then its own guidance. Each ## is a known property, in order; its items give its kind, the attributes of the kind and its meaning. As Teresa Torres teaches it (Continuous Discovery Habits): one outcome per tree, the opportunity space split from big to small, one target opportunity with several solutions to compare, and under them the assumptions to test, not the solutions. -->

## Context
The outcome a team aims for, the opportunities that could reach it, the solutions to the opportunity it works on and the assumptions it tests (an opportunity solution tree, from continuous discovery).

- One outcome per tree, at the top: a product outcome, a change in what the customers do that the team can move and measure (Increase the share of patients who book online), not an output (Launch the app) nor a business result alone.
- Under the outcome, the opportunities: needs, pain points or desires of the customers, heard in interviews, written from their point of view, in the first person (I don't know who can see me soon), without quotation marks: a need drawn from several interviews, not the quote of one person (quotes go in Evidence). Never a solution in disguise (I want a filter is a solution). Split a big opportunity into smaller, more specific ones under it, by the moments of the experience; siblings do not overlap.
- Choose one target opportunity at a time, small and specific (one under another), and put solutions under it only: at least three, to compare and contrast, rather than one idea to prove right.
- Under a solution, the assumptions it rests on, each with its Category; test the riskiest first, with a small test (Description), and write what it showed (Evidence). Test assumptions, not whole solutions.
- Give each node its Kind; Evidence says where an opportunity comes from (interviews, data), with a link when there is one.
- A name cannot contain `: `: it would be read as a property.

## Kind
- Kind: enum
- Values:
  - outcome
  - opportunity
  - solution
  - assumption
- Single: yes
- Meaning: What the node is.

## Description
- Kind: text
- Meaning: What the node is, when its name is not enough: for the outcome, how it is measured; for an assumption, the test that checks it.

## Category
- Kind: enum
- Values:
  - desirability
  - usability
  - feasibility
  - viability
  - ethics
- Single: yes
- Meaning: For an assumption, what it bets on: that the customers want it, can use it, that it can be built, that it pays, that it does no harm.

## Evidence
- Kind: text
- Meaning: Where an opportunity comes from (interviews, data), or what the test of an assumption showed.
