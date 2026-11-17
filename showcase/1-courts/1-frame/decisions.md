---
type: decision-log
title: The decisions
description: The decisions taken on Courtly, from the workshop to the decisions of 2026-11-12, the market, the commission, the payments, the hold, the cancellation, the double bookings, the split payment, and the one still proposed
updated: 2026-11-12
---
<!-- decision-log: The decisions that matter on a project, one after the other, with their problem, the options considered and why one was chosen, as architecture decision records (ADR, MADR): so that nobody has to guess or decide again. Each ## is a decision (except Context and Open questions), in order; all decisions share the same properties. Status is one of proposed, accepted, rejected, deprecated, superseded (default: accepted). `undefined` means the source did not say. -->

## Context
Kept by Camille, from the notes in `notes/`. Who decided: Camille (PM) and Hugo (co-founder); "with the AI" when Camille weighed the options with the AI that builds Courtly.

## Start with padel and tennis in Bordeaux
- Date: 2026-11-03
- Status: accepted
- Deciders:
  - Camille
  - Hugo
- Problem: A marketplace is empty until clubs are on it; where to start?
- Options:
  - Padel and tennis in Bordeaux, where Hugo knows about 15 clubs
  - Every racket sport, in several cities
- Rationale: Hugo can sign the first clubs; padel courts are the most booked by non-members.
- Consequences:
  - The sports of the MVP are padel and tennis only.

## Take 10% from each booking
- Date: 2026-11-03
- Status: superseded
- Deciders:
  - Hugo
- Problem: How Courtly earns money.
- Options:
  - A commission on each booking
- Rationale: Said by Hugo at the workshop; who pays it was left open.
- Consequences:
  - undefined
- Superseded by: [[#Take 8% from the club, no fee for the player]]

## Take 8% from the club, no fee for the player
- Date: 2026-11-12
- Status: accepted
- Deciders:
  - Camille
  - Hugo
- Problem: Rallyo takes 12% from the clubs and a fee of 1.50 € from the players, who complain about it; Padel Garonne joins the pilot under 10%.
- Options:
  - 10%, paid by the club
  - 8%, paid by the club
  - A fee added for the player
- Rationale: The price the player sees is the price they pay, and 8% is the club's yes ("Eight, I sign today").
- Consequences:
  - The commission is taken from the payout of the club ([[rules#Commission]]).
  - Courtly earns 3.84 € on a 48 € booking, before the fees of Stripe.

## Pay with Stripe Connect
- Date: 2026-11-12
- Status: accepted
- Deciders:
  - Camille, with the AI
- Problem: The player pays Courtly, and each club must get its money minus the commission, every week, without Courtly holding the money itself.
- Options:
  - Stripe Connect, each club with its own Stripe account through Courtly
  - A single Stripe account, and bank transfers to the clubs by hand
- Rationale: Stripe pays the clubs and keeps the commission for Courtly; no transfers by hand, and Courtly never sees the bank details of a club.
- Consequences:
  - Each club fills in the forms of Stripe to join ([[story-map#The club joins#Sign up the club#Connect the club's bank account through Stripe]]).
  - Stripe takes its fees on each payment.

## Hold a slot 10 minutes while paying
- Date: 2026-11-12
- Status: accepted
- Deciders:
  - Camille
  - Hugo
- Problem: While a player pays, another could take the same slot.
- Options:
  - 15 minutes, like train tickets (Nadia)
  - 10 minutes, like Rallyo
- Rationale: Enough to pay by card on a phone; a slot held too long is a slot others cannot book.
- Consequences:
  - A countdown while paying ([[rules#Hold while paying]]).

## One cancellation deadline, 24 hours
- Date: 2026-11-12
- Status: accepted
- Deciders:
  - Camille
  - Hugo
- Problem: Padel Garonne wants 48 hours for padel at peak hours, 24 hours elsewhere.
- Options:
  - 24 hours for every club and every hour
  - A deadline set by each club
- Rationale: One rule to explain to the players and to build for the pilot; Sophie's need is looked at again after it.
- Consequences:
  - [[rules#Player cancels]]

## Block slots by hand, no sync
- Date: 2026-11-12
- Status: accepted
- Deciders:
  - Camille
  - Hugo
- Problem: The clubs keep their own tool for their members; a slot booked there must not be sold on Courtly.
- Options:
  - The club blocks the slot by hand in Courtly
  - A sync with the tool of each club
- Rationale: Sophie does not want a sync project, "as long as it takes two clicks"; each club has a different tool.
- Consequences:
  - Blocking a slot must take two clicks.
  - A double booking can happen if a club forgets: watched during the pilot.

## One player pays the whole court
- Date: 2026-11-12
- Status: accepted
- Deciders:
  - Camille
  - Hugo
- Problem: The 4 players of a padel court would like to split the price (Nadia), but it is messy at Rallyo.
- Options:
  - Split payment between the players
  - The player who books pays the whole court
- Rationale: It is how it works at the clubs today; split payment is for later.
- Consequences:
  - [[story-map#The player books#Pay#Split the price between the players]] goes to Later.

## Book with an account only
- Date: 2026-11-12
- Status: proposed
- Deciders:
  - Camille
  - Hugo
- Problem: Can a player book as a guest? Camille wants an account, so that the player can cancel; Hugo wants guests, to book faster.
- Options:
  - An account, created at the first booking
  - A guest booking, with a link by email to cancel
- Rationale: To decide after seeing the screens.
- Consequences:
  - undefined
