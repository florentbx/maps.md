---
type: opportunity-solution-tree
title: Fewer suspended members
description: The outcome the member app aims for, the opportunities the research found, and the solutions to the target one, with what they bet on and what the tests showed.
updated: 2026-10-24
---
<!-- opportunity-solution-tree: The outcome a team aims for, the opportunities that could reach it, the solutions to the opportunity it works on and the assumptions it tests (an opportunity solution tree, from continuous discovery). Each ## is a node of the first level (except Context and Open questions), in order; under a node, an item "- Label: value" is a property, and any other item is a node under it, in order. Kind is one of outcome, opportunity, solution, assumption. Category is one of desirability, usability, feasibility, viability, ethics. `undefined` means the source did not say. -->

## Context
The tree of the member app team (Jo, Sam, Malik, Inès), from [[insights]] and the meeting of 2026-10-24 ([[2026-10-24-team-meeting]]).

- The opportunities are the insights of the research, written from the point of view of the members; each links to its insight.
- The target opportunity: I don't know who could take my shift. The solutions and their assumptions are only under it.

## Fewer members suspended for a missed shift
- Kind: outcome
- Description: The share of active members suspended at the start of a cycle: 7% on 2026-10-01 ([[2026-10-support-messages#One member in fourteen is suspended]]).
- I don't know where I stand until it is too late
  - Kind: opportunity
  - Evidence: [[insights#Members learn they are suspended at the checkout]]
  - I don't know how many make-up shifts I owe
    - Kind: opportunity
    - Evidence: [[insights#Members do not know where they stand]]
  - I am suspended for a shift I did
    - Kind: opportunity
    - Evidence: [[insights#The status is wrong for days after a shift]]
- When my week changes, I cannot hand my shift on
  - Kind: opportunity
  - Evidence: [[insights#Members miss a shift when their week changes]]
  - I don't know who could take my shift
    - Kind: opportunity
    - Description: The target opportunity, chosen on 2026-10-24.
    - Evidence: [[insights#Members want to give a shift away, not trade it]]
    - Swap with a chosen member of my team
      - Kind: solution
      - Description: Prototype v1: choose a member of the team and a date; dropped on 2026-10-24 ([[decisions#Give a shift away through a pool open to all members]]).
      - Members know who in their team is free
        - Kind: assumption
        - Category: usability
        - Description: Task 2 of the test of prototype v1.
        - Evidence: Wrong: 3 of 6 stopped at "choose a member" ([[2026-10-swap-test#Choosing a member to swap with blocks the swap]])
    - A pool of shifts to give away, open to all members
      - Kind: solution
      - Description: "I can't come" puts the shift in a pool; any member can take it; the giver is told when it is taken. Prototype v2.
      - Members take a shift from someone they do not know
        - Kind: assumption
        - Category: desirability
        - Description: To test with prototype v2, mid-November 2026.
        - Evidence: In part: the whiteboard by the entrance, open to all, gets half of its gaps filled ([[2026-10-store-observations#The whiteboard fills only half of the gaps]])
      - Members of 65 or older can use the pool
        - Kind: assumption
        - Category: usability
        - Description: To test with prototype v2, with 2 members of 65 or older.
        - Evidence: The oldest participant gave up on the list of open shifts, the text too small ([[2026-10-swap-test#The list of open shifts works]])
      - A swap no longer needs the approval of the office
        - Kind: assumption
        - Category: viability
        - Description: It changes the rules of the co-op: proposed at the general assembly of 2026-12-13.
    - Share the shift to my team's WhatsApp group
      - Kind: solution
      - Description: From the app, post the shift to the group where members already swap; kept as a fallback, not built first.
      - The swap reaches the records when it is arranged in the group
        - Kind: assumption
        - Category: feasibility
        - Description: Not tested.
  - The office answers after my shift
    - Kind: opportunity
    - Evidence: [[insights#The members office is too slow for a swap]]
- I don't understand the rules when I join
  - Kind: opportunity
  - Evidence: [[insights#New members leave the onboarding without the rules]]

## Open questions
- Is the outcome the right one, if members leave rather than get suspended? ([[#Fewer members suspended for a missed shift]]) The research has not heard members who left ([[research-questions#Do members leave because of the shifts?]]).
