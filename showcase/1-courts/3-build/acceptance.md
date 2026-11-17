---
type: test-scenarios
title: The acceptance criteria
description: What must be true for the MVP of Courtly to be done, as scenarios on the booking, the hold, the cancellations and the money, each linked to its rule
updated: 2026-11-12
---
<!-- test-scenarios: The acceptance criteria of a product as scenarios: in a situation, when something happens, what must then be true; each linked to what it checks, so that the AI that builds it can write the tests and knows when it is done. Each ## is a scenario (except Context and Open questions); their order carries no meaning. `undefined` means the source did not say. -->

## Context
Written by Camille with the AI from [[rules]] and [[booking-states]], to tell the AI when the MVP is done: the AI writes a test for each, and Camille tries each on a phone before the pilot. Léo and Inès are players; the club is Padel Garonne, padel at 40 € off-peak and 48 € peak.

## Book and pay a slot
- Feature: Booking
- Checks:
  - [[booking-states#Paid]]
- Given:
  - Tuesday 18:00 is free at Padel Garonne
  - Léo has an account
- When: Léo books Tuesday 18:00 and pays 48 € by card
- Then:
  - The booking is paid
  - Léo and the club each get a confirmation email
  - Nobody else can book Tuesday 18:00

## Two players on the same slot
- Feature: Booking
- Checks:
  - [[rules#Hold while paying]]
- Given:
  - Léo started paying for Tuesday 18:00 two minutes ago
- When: Inès opens Tuesday 18:00
- Then:
  - Inès sees it taken and cannot book it

## The hold runs out
- Feature: Booking
- Checks:
  - [[booking-states#Expired]]
- Given:
  - Léo started paying for Tuesday 18:00 and did not pay
- When: 10 minutes pass
- Then:
  - The payment of Léo is stopped and nothing is charged
  - Tuesday 18:00 is free again for anyone

## A blocked slot is not offered
- Feature: Booking
- Checks:
  - [[story-map#The club publishes its courts#Keep the slots right#Block a slot booked outside Courtly]]
- Given:
  - A member booked Tuesday 18:00 by the club's own tool
- When: Sophie blocks Tuesday 18:00 in Courtly
- Then:
  - No player sees Tuesday 18:00 as free
  - It took Sophie two clicks

## Cancel in time
- Feature: Cancellation
- Checks:
  - [[rules#Player cancels]]
- Given:
  - Léo booked Saturday 19:00 for 48 €
- When: Léo cancels on Thursday at 20:00
- Then:
  - Léo is refunded 48 €
  - Saturday 19:00 is free again

## Too late to cancel
- Feature: Cancellation
- Checks:
  - [[rules#Player cancels]]
- Given:
  - Léo booked Saturday 19:00 for 48 €
- When: Léo opens the booking on Friday at 20:00
- Then:
  - Léo cannot cancel, and is told the deadline has passed

## The club cancels for rain
- Feature: Cancellation
- Checks:
  - [[rules#Club cancels]]
- Given:
  - Inès booked an outdoor tennis court at 10:00
- When: Sophie cancels the slot at 9:00 for rain
- Then:
  - Inès is refunded in full and told by email
  - The club gets nothing for it, and Courtly takes no commission

## The Monday payout
- Feature: Money
- Checks:
  - [[rules#Weekly payout]]
  - [[rules#Commission]]
- Given:
  - Padel Garonne had 10 bookings at 48 € played last week, and 1 refunded
- When: Monday comes
- Then:
  - Padel Garonne is paid 441.60 €
  - Its manager sees the 10 bookings, each with its commission of 3.84 €
  - The desk staff do not see it

## Open questions
- What does the player see when the deadline to cancel has passed: the phone of the club? ([[#Too late to cancel]])
  - Assumption: the deadline, and the phone of the club.
