---
type: decision-log
title: Decisions on the member app
description: What the member app team decided from the research, and what it left to the co-op, with the insights behind each decision.
updated: 2026-10-24
---
<!-- decision-log: The decisions that matter on a project, one after the other, with their problem, the options considered and why one was chosen, as architecture decision records (ADR, MADR): so that nobody has to guess or decide again. Each ## is a decision (except Context and Open questions), in order; all decisions share the same properties. Status is one of proposed, accepted, rejected, deprecated, superseded (default: accepted). `undefined` means the source did not say. -->

## Context
The decisions of the member app team on the shifts, from the meeting of 2026-10-24 ([[2026-10-24-team-meeting]]) and the test of prototype v1 ([[2026-10-swap-test]]).

- A rule of the co-op (the approval of a swap, what a cashier may do) is decided by its general assembly or its board, not by the app team: it is written here as `proposed` until they decide.

## Swap one for one, within the team
- Date: 2026-09-25
- Status: superseded
- Deciders: the member app team
- Problem: The member app needs a swap; the rules of the co-op say a swap is between two members of the same team.
- Options:
  - Swap one for one, within the team, as the rules say
- Rationale: It follows the rules as they are; it was built as prototype v1.
- Consequences: undefined
- Superseded by: [[#Give a shift away through a pool open to all members]]

## Show the status as the number of make-up shifts owed
- Date: 2026-10-24
- Status: accepted
- Deciders:
  - Inès, Malik, Jo, Sam
  - Claire, for the members office
- Problem: Members do not know where they stand, and "On alert" means nothing to them ([[insights#Members do not know where they stand]]).
- Options:
  - Keep the status of the office: OK, On alert, Suspended
  - The number of make-up shifts owed, in plain words ("You owe 1 make-up shift")
- Rationale: 5 of 6 participants of the test looked for a number of shifts owed.
- Consequences:
  - The office uses the same words in its emails
  - The tablet at the checkout still says "On alert": a matter for the board
- Superseded by: none

## Give a shift away through a pool open to all members
- Date: 2026-10-24
- Status: accepted
- Deciders:
  - Inès, Malik, Jo, Sam
  - Claire, for the members office
- Problem: Half of the participants could not swap: they do not know who is free in their team ([[insights#Members want to give a shift away, not trade it]]).
- Options:
  - Swap one for one, within the team (prototype v1)
  - "I can't come" puts the shift in a pool open to all members; anyone can take it; the giver is told when it is taken
  - Share the shift to the team's WhatsApp group, from the app
- Rationale: The members look for "I can't come", not "Swap"; the team is too small to find someone; the group stays the way members swap today, so sharing to it is kept as a fallback.
- Consequences:
  - Prototype v2, tested mid-November 2026
  - A swap outside the team goes against the rules today: see [[#A swap no longer needs the approval of the office]]
- Superseded by: none

## Keep the whiteboard and the shift desk next to the app
- Date: 2026-10-24
- Status: accepted
- Deciders: Inès, Malik, Jo, Sam, Claire
- Problem: One member in eight would not use a phone app ([[insights#Not every member will use a phone app]]).
- Options:
  - The app as the only way to see and swap the shifts
  - The app as one more way, the whiteboard and the desk kept
- Rationale: The members who would not use the app are among those who fill the gaps.
- Consequences:
  - The open shifts must be the same on the whiteboard and in the app
- Superseded by: none

## A swap no longer needs the approval of the office
- Date: 2026-10-24
- Status: proposed
- Deciders: the general assembly of 2026-12-13
- Problem: The office approves each swap by email, and answers after the shift ([[insights#The members office is too slow for a swap]]).
- Options:
  - Keep the approval, 48 hours before, by email
  - No approval: the app records the swap
- Rationale: undefined
- Consequences: undefined
- Superseded by: none

## Open questions
- The open shifts must be the same on the whiteboard and in the app ([[#Keep the whiteboard and the shift desk next to the app]]): who copies one to the other? Nobody said.
