---
type: booking-states
title: The life of a booking
description: The states of a booking on Courtly, from the slot held while the player pays to the club paid out, and for each one whether the slot can be sold again and where the money is
updated: 2026-11-12
---
<!-- booking-states: The states a booking goes through in its life, the events that move it from one state to the next, and, in each state, whether the slot can be sold to someone else and where the money is: what a marketplace that takes payments must get right. Each ## is a state (except Context and Open questions); "- label → [[#State]]" is an arrow to another state, with an optional label; "→ undefined" means the other state is unknown. Slot is one of taken, held, free. `undefined` means the source did not say. -->

## Context
From the rules of [[rules]] and the decisions of 2026-11-12 (`notes/2026-11-12-decisions.md`). The money is held by Stripe, through Stripe Connect ([[architecture#Stripe Connect]]).

## Held
- Description: The player chose a slot and is paying. A countdown of 10 minutes shows ([[rules#Hold while paying]]).
- Slot: held
- Money: not paid
- player pays → [[#Paid]]
- 10 minutes pass → [[#Expired]]

## Expired
- Description: The player did not pay within 10 minutes, or gave up; the payment is stopped.
- Slot: free
- Money: not paid

## Paid
- Description: The booking is confirmed: an email goes to the player and to the club, and the club sees it in its bookings of the day.
- Slot: taken
- Money: paid, kept by Stripe
- player cancels early → [[#Cancelled, refunded]]
- club cancels → [[#Cancelled by the club]]
- time of the slot → [[#Played]]

## Cancelled, refunded
- Description: The player cancelled at least 24 hours before ([[rules#Player cancels]]).
- Slot: free
- Money: refunded to the player

## Cancelled by the club
- Description: The club cancelled the slot, for rain or another reason; an email tells the player ([[rules#Club cancels]]).
- Slot: undefined
- Money: refunded to the player

## Played
- Description: The time of the slot has passed. Courtly does not know whether the players came: a no-show is played, for the money.
- Slot: taken
- Money: paid, kept by Stripe
- next Monday → [[#Paid out]]

## Paid out
- Description: The club got the price minus 8% with its weekly payout ([[rules#Weekly payout]], [[rules#Commission]]).
- Slot: taken
- Money: paid out to the club, 8% kept by Courtly

## Open questions
- Once the club has cancelled a slot, can another player book it, if the rain stops? ([[#Cancelled by the club]])
  - Assumption: no, the slot stays closed; the club opens it again by hand if it wants.
