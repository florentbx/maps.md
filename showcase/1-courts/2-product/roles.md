---
type: roles-permissions
title: Who can do what
description: What a player, the desk staff and the manager of a club, and the Courtly team can each do, from booking to the payouts
updated: 2026-11-12
---
<!-- roles-permissions: Who can do what in a product: for each action, which roles may do it. Each ## is an action (except Context and Open questions), in order; all actions share the same properties. Each other property is one of yes, own, no. `undefined` means the source did not say. -->

## Context
From the workshop of 2026-11-03, the call with Padel Garonne (the desk staff, who must not see the money) and the decisions of 2026-11-12 (`notes/`). `own` is the player's own bookings, or the club's own courts and bookings: a club never sees another club. The words are those of [[glossary]].

## Book and pay a slot
- Player: yes
- Desk staff: no
- Club manager: no
- Courtly team: no

## Cancel a booking
- Player: own
- Desk staff: no
- Club manager: no
- Courtly team: yes

## Cancel a slot
- Player: no
- Desk staff: own
- Club manager: own
- Courtly team: no

## Block a slot
- Player: no
- Desk staff: own
- Club manager: own
- Courtly team: no

## See the bookings of a club
- Player: no
- Desk staff: own
- Club manager: own
- Courtly team: yes

## Add a court and set its prices
- Player: no
- Desk staff: no
- Club manager: own
- Courtly team: no

## See the payouts and the commission
- Player: no
- Desk staff: no
- Club manager: own
- Courtly team: yes

## Give access to the desk staff
- Player: no
- Desk staff: no
- Club manager: own
- Courtly team: no

## Approve a club
- Player: no
- Desk staff: no
- Club manager: no
- Courtly team: yes

## Open questions
- Can the Courtly team cancel a booking for a player, for a dispute? ([[#Cancel a booking]])
  - Assumption: yes, with a full refund, for Camille and Hugo only.
- Can the Courtly team add the courts of a club for it, to help a pilot club start? ([[#Add a court and set its prices]])
  - Assumption: no, the club does it; Hugo helps on the phone.
