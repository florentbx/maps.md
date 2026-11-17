---
type: business-rules
title: The business rules
description: The rules of Courtly with examples, price, hold while paying, cancellation by the player or the club, commission and weekly payout
updated: 2026-11-12
---
<!-- business-rules: The rules of the domain that the product must apply, each stated once and shown with examples, so that the AI that builds it gets the edge cases right. Each ## is a rule (except Context and Open questions); their order carries no meaning. `undefined` means the source did not say. -->

## Context
From the workshop of 2026-11-03, the call with Padel Garonne of 2026-11-06, and the decisions of 2026-11-12 (`notes/`). The prices in the examples are those of Padel Garonne for non-members: padel 40 € off-peak, 48 € peak, the 1h30 court. The examples the notes give are marked as such; the others were worked out by the AI from the rule and checked by Camille on 2026-11-12. The life of a booking that these rules move is in [[booking-states]].

## Peak price
- Area: Price
- Statement: Each club sets, per sport, an off-peak price and a peak price, and the hours that are peak; the price of a slot is the one of the hour it starts at. The player pays the price the slot shows, nothing more.
- Examples:
  - Padel at Padel Garonne, Tuesday 14:00 → 40 € (from the call)
  - Padel at Padel Garonne, Tuesday 18:00 → 48 €, peak from 18:00 on weekdays (from the call)
  - Padel at Padel Garonne, Saturday 10:00 → 48 €, all weekend is peak (from the call)
  - Padel, Tuesday 17:00, ends at 18:30 → 40 €, the hour it starts at
- Why: No fee for the player, the argument against Rallyo ([[decisions#Take 8% from the club, no fee for the player]]).
- Applies to:
  - [[story-map#The club publishes its courts#Set prices#Set a peak and an off-peak price per sport]]

## Hold while paying
- Area: Booking
- Statement: When a player starts paying for a slot, the slot is held for them for 10 minutes; nobody else can book it. Paid within 10 minutes, it is booked; otherwise it is free again.
- Examples:
  - Léo starts paying at 20:00, pays at 20:04 → booked for Léo
  - Léo starts paying at 20:00, Inès opens the same slot at 20:02 → Inès sees it taken
  - Léo starts paying at 20:00, has not paid at 20:10 → the slot is free again, Léo's payment is stopped
- Why: Two players must never pay for the same slot ([[decisions#Hold a slot 10 minutes while paying]]).
- Applies to:
  - [[booking-states#Held]]
  - [[booking-states#Expired]]

## Player cancels
- Area: Cancellation
- Statement: A player can cancel a booking up to 24 hours before it starts and is refunded in full; later, they cannot cancel in Courtly, and are not refunded. The slot is free again once cancelled. Same rule for every club and every hour, in the MVP.
- Examples:
  - Saturday 19:00, cancelled on Thursday at 20:00 → refunded 48 €, the slot free again
  - Saturday 19:00, cancelled on Friday at 19:00 → refunded 48 €, exactly 24 hours
  - Saturday 19:00, on Friday at 20:00 → cannot cancel in Courtly
  - Not cancelled and not played → not refunded, the club paid as for a game played
- Why: What every club does (Nadia, at the workshop); one rule for all, simpler for the pilot ([[decisions#One cancellation deadline, 24 hours]]).
- Applies to:
  - [[booking-states#Cancelled, refunded]]
  - [[story-map#The player plays#Before the game#Cancel a booking]]

## Club cancels
- Area: Cancellation
- Statement: Only the club can cancel a slot for rain or for any reason of its own, at any time; the player is then refunded in full, and Courtly takes no commission on it.
- Examples:
  - Outdoor tennis at 10:00, rain at 9:00, the club cancels → the player refunded in full, no commission (from the call)
  - Indoor padel, the light breaks, the club cancels 2 hours before → the player refunded in full, no commission
- Why: The club sees the weather and the courts, not the player (Sophie, Padel Garonne).
- Applies to:
  - [[booking-states#Cancelled by the club]]
  - [[story-map#The club runs the day#Handle the weather#Cancel a slot for rain]]

## Commission
- Area: Money
- Statement: Courtly keeps 8% of the price of each booking played or not cancelled in time, paid by the club, taken from its payout. A booking refunded pays no commission.
- Examples:
  - A 48 € booking played → the club gets 44.16 €, Courtly 3.84 €
  - A 40 € booking, the player did not come → the club gets 36.80 €, Courtly 3.20 €
  - A 48 € booking cancelled by the player 2 days before → refunded, nothing for the club nor Courtly
- Why: Under 10%, Padel Garonne joins the pilot; Rallyo takes 12% ([[decisions#Take 8% from the club, no fee for the player]]).
- Applies to:
  - [[booking-states#Paid out]]

## Weekly payout
- Area: Money
- Statement: Every Monday, each club is paid the bookings of the week before, from Monday to Sunday, minus the commission, with the list of these bookings.
- Examples:
  - A booking played on Sunday 2027-03-07 → paid on Monday 2027-03-08
  - A booking played on Monday 2027-03-08 → paid on Monday 2027-03-15
- Why: Rallyo pays monthly and the clubs hate it (Sophie: "I paid the electricity before I saw the money").
- Applies to:
  - [[booking-states#Paid out]]
  - [[story-map#The club gets paid#Get paid#Get paid every Monday for the week before]]

## Open questions
- Who pays the fees of Stripe on each payment: Courtly from its 8%, or the club? ([[#Commission]])
  - Assumption: Courtly, from its 8%.
- Is a booking paid out on the Monday after the day it is played, or after the day it was paid? ([[#Weekly payout]])
  - Decision: after the day it is played, "for the bookings played the week before" (Camille and Hugo, 2026-11-12).
- Padel Garonne wants 48 hours to cancel a padel court at peak hours, not 24. ([[#Player cancels]])
  - Decision: 24 hours for every club in the MVP; per club after the pilot (Camille and Hugo, 2026-11-12).
