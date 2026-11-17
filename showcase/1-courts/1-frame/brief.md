---
type: brief
title: The brief
description: Courtly on one page, the marketplace where clubs of Bordeaux sell their padel and tennis courts and players book and pay online - the problem, for whom, success, non-goals, constraints
updated: 2026-11-12
---
<!-- brief: A product framed on one page, for the people and the AI that build it: the problem, for whom, how success is measured, what it will not do, and what it must respect. Each ## is a product (except Context and Open questions); their order carries no meaning. `undefined` means the source did not say. -->

## Context
Written by Camille (PM) with the AI, from the kick-off workshop of 2026-11-03 (`notes/2026-11-03-workshop.md`), the call with Padel Garonne (`notes/2026-11-06-call-padel-garonne.md`) and the look at Rallyo, a competitor (`notes/2026-11-07-rallyo.md`); updated after the decisions of 2026-11-12 (`notes/2026-11-12-decisions.md`). The words are those of [[glossary]]; the scope of the MVP is in [[story-map]]; why each choice was made is in [[decisions]].

## Courtly
- Description: A web app where padel and tennis clubs of Bordeaux publish their courts and free slots, and players who are not their members find a slot, book it and pay online at once.
- Problem:
  - Players find a free court by calling clubs during their opening hours, or by going through the website of each club; a booking by phone leaves them no proof.
  - Clubs have empty courts off-peak (weekdays 10:00 to 17:00): an hour not sold is lost for good.
  - Clubs take non-member bookings by phone, on paper or a spreadsheet, unpaid in advance: about 1 in 10 is a no-show at Padel Garonne.
  - Rallyo, the competitor, charges players a fee and pays the clubs monthly, with a 12% commission.
- For whom:
  - Players of padel and tennis in Bordeaux who are not members of the club, or members who want a court elsewhere.
  - Club managers, who publish their courts and prices, see what is booked and get paid; and their desk staff, who see the bookings.
- Success metrics:
  - 3 pilot clubs at launch, each with all its courts on Courtly.
  - 300 bookings paid online in the first 2 months of the pilot.
  - Players who book again within 30 days.
- Non-goals:
  - No fee for the player
  - No member bookings, the clubs keep their own tool for them
  - No split payment between players
  - No matchmaking, levels or chat
  - No lessons with a coach
  - No reviews of clubs
  - No app on the stores
  - No sync with the club's own calendar
- Constraints:
  - A web app that works well on a phone.
  - Padel and tennis, in Bordeaux, at first.
  - Payments with Stripe Connect: the player pays by card at booking, the club is paid every Monday, minus 8% ([[decisions#Take 8% from the club, no fee for the player]]).
  - Pilot launched on 2027-03-01, before the outdoor season.

## Open questions
- What share of players should book again within 30 days? ([[#Courtly#Players who book again within 30 days.]])
  - Assumption: 1 in 3, as said in the room but not written.
- Does a player need an account to book, or can they book as a guest? ([[#Courtly]])
  - Assumption: an account, so that the player can cancel and see their bookings.
- When does Courtly open, and with how many clubs? ([[#Courtly#Pilot launched on 2027-03-01, before the outdoor season.]])
  - Decision: the pilot opens on 2027-03-01 with 3 clubs, Padel Garonne and two others (Camille and Hugo, 2026-11-12).
