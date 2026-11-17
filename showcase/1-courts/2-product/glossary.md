---
type: glossary
title: The glossary
description: The words of Courtly, so that the team and the AI write the same word for the same thing, booking, slot, court, hold, block, peak, commission, payout
updated: 2026-11-12
---
<!-- glossary: The words of a product and its domain, so that the people and the AI that build it use the same word for the same thing: what each one means, the other words people use, and the words to avoid. Each ## is a term (except Context and Open questions); their order carries no meaning. Kind is one of thing, action, state, role, technical (default: thing). `undefined` means the source did not say. -->

## Context
At the workshop of 2026-11-03, the same things were called a slot, a créneau, a booking, a résa, a session or a match (`notes/2026-11-03-workshop.md`): these are the words Courtly writes, in its screens, its emails and its code.

## Block
- Kind: action
- Definition: What a club does to a slot booked outside Courtly, by its members: the slot is no longer offered, and no money goes through Courtly.
- Avoid:
  - Book (a block is not a booking: nobody pays)

## Booking
- Definition: A slot paid by a player on Courtly. It goes from held to paid out ([[booking-states]]).
- Also called:
  - Résa
- Avoid:
  - Session (a lesson with a coach, later)
  - Match (a game between players, for the matchmaking of later)

## Club
- Definition: A place with courts that sells them on Courtly, run by a club manager; its members book through its own tool, not Courtly.

## Club manager
- Kind: role
- Definition: Who runs a club on Courtly: its courts, its prices, its bookings and its payouts. The desk staff of the club see and block the bookings, not the money.

## Commission
- Definition: The 8% of the price of a booking that Courtly keeps, paid by the club, taken from its payout ([[rules#Commission]]).
- Avoid:
  - Fee (the player pays no fee)

## Court
- Definition: A padel or tennis court of a club, indoor or outdoor; it has a sport, opening hours, a length of slot and prices.

## Hold
- Kind: state
- Definition: A slot kept for one player for 10 minutes while they pay ([[rules#Hold while paying]]).

## Off-peak
- Kind: state
- Definition: The hours of a club that are not peak, at the lower price.

## Payout
- Definition: The money a club receives every Monday for the bookings played the week before, minus the commission ([[rules#Weekly payout]]).

## Peak
- Kind: state
- Definition: The hours a club sets as busy, at the higher price; for Padel Garonne, weekdays from 18:00 and all weekend ([[rules#Peak price]]).

## Player
- Kind: role
- Definition: Who books and pays a court on Courtly, for themselves and the people they play with.
- Avoid:
  - Member (a member of a club books through the club, not Courtly)

## Refund
- Kind: action
- Definition: Money paid back to the player, in full, when they cancel in time or the club cancels.

## Slot
- Definition: A court at a time, for the length the club sets (1 hour for tennis, 1h30 for padel at Padel Garonne): free, held, booked or blocked.
- Also called:
  - Créneau
- Avoid:
  - Booking (a slot exists before anyone books it)
