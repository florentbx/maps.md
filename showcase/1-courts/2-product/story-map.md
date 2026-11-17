---
type: story-map
title: The story map
description: What clubs and players do with Courtly, from the club that joins to the club that gets paid, and the stories cut into the MVP of the pilot, Release 2 and later
updated: 2026-11-12
---
<!-- story-map: What a person does with the product, as activities, their steps and the stories that serve each step, with the release each story goes in. Each ## is an activity of the first level (except Context and Open questions), in order; under an activity, an item "- Label: value" is a property, and any other item is an activity under it, in order. `undefined` means the source did not say. -->

## Context
From the scope said at the workshop of 2026-11-03 (`notes/2026-11-03-workshop.md`), with what Padel Garonne needs (`notes/2026-11-06-call-padel-garonne.md`) and the decisions of 2026-11-12 (`notes/2026-11-12-decisions.md`). The backbone follows a marketplace: the club comes first, or a player finds nothing; then the player books and plays; then the club gets paid. Each activity says whose it is. The MVP is what the pilot of 2027-03-01 needs ([[brief]]).

## The club joins
- Description: A club manager puts their club on Courtly.
- Sign up the club
  - Create the club's page, with its address
    - Release: MVP
  - Connect the club's bank account through Stripe
    - Release: MVP
    - Description: Stripe Connect asks the club for its bank details and identity; Courtly never sees them ([[decisions#Pay with Stripe Connect]]).
  - Give access to the desk staff
    - Release: MVP
    - Description: They see and block the bookings, not the money ([[roles]]).
- Get approved
  - Courtly approves the club
    - Release: MVP
    - Description: Camille or Hugo checks the club before its courts go public: only the pilot clubs, at first.

## The club publishes its courts
- Description: What the club sells, and at what price.
- Describe a court
  - Add a court, with its sport and whether it is indoor
    - Release: MVP
  - Set the opening hours and the length of a slot
    - Release: MVP
    - Description: 1 hour for tennis, 1h30 for padel, at the clubs of the workshop.
- Set prices
  - Set a peak and an off-peak price per sport
    - Release: MVP
    - Description: Each club chooses its peak hours ([[rules#Peak price]]).
  - Set the club's own deadline to cancel
    - Release: Release 2
    - Description: Padel Garonne wants 48 hours at peak; 24 hours for every club in the pilot ([[decisions#One cancellation deadline, 24 hours]]).
- Keep the slots right
  - Block a slot booked outside Courtly
    - Release: MVP
    - Description: The club keeps its own tool for its members, and blocks by hand what they book; it must take two clicks ([[decisions#Block slots by hand, no sync]]).
  - Sync with the club's own calendar
    - Release: Later

## The player finds a court
- Description: From the search to the slot that suits.
- Search
  - Search by sport, day and time
    - Release: MVP
  - See the free slots of every club, with their price
    - Release: MVP
  - Filter indoor courts only
    - Release: Release 2
  - See the clubs on a map
    - Release: Later
- Choose
  - See the page of a club
    - Release: MVP
  - Read the reviews of a club
    - Release: Later
    - Description: Clubs would hate it (Hugo); maybe never.

## The player books
- Description: From the slot chosen to the booking paid.
- Hold the slot
  - Hold the slot while paying
    - Release: MVP
    - Description: 10 minutes, with a countdown ([[rules#Hold while paying]]).
- Pay
  - Pay the whole court by card
    - Release: MVP
  - Pay with Apple Pay or Google Pay
    - Release: Release 2
  - Split the price between the players
    - Release: Later
    - Description: Everybody asks for it (Nadia), but it is messy at Rallyo ([[decisions#One player pays the whole court]]).
- Get the proof
  - Get the confirmation by email
    - Release: MVP

## The player plays
- Description: Between the booking and the game.
- Before the game
  - See my bookings
    - Release: MVP
  - Cancel a booking
    - Release: MVP
    - Description: Refunded up to 24 hours before ([[rules#Player cancels]]).
  - Get a reminder the day before
    - Release: Release 2
  - Invite the other players to the booking
    - Release: Release 2
- Find players
  - Find players to complete a game
    - Release: Later

## The club runs the day
- Description: The bookings, at the desk.
- See the bookings
  - See the bookings of the day, with who booked and their phone
    - Release: MVP
    - Description: Each morning, at the desk (Sophie, Padel Garonne).
  - Get an email for each new booking
    - Release: MVP
- Handle the weather
  - Cancel a slot for rain
    - Release: MVP
    - Description: The club decides, the player is refunded in full ([[rules#Club cancels]]).

## The club gets paid
- Description: The money of the bookings, every week.
- Get paid
  - Get paid every Monday for the week before
    - Release: MVP
    - Description: Minus 8% ([[rules#Commission]], [[rules#Weekly payout]]).
  - See each booking with its commission
    - Release: MVP
- Do the accounts
  - Export the bookings for the accountant
    - Release: Release 2

## Open questions
- Can a player book as a guest, without an account? It changes Book, and See my bookings. ([[#The player books]], [[#The player plays#Before the game#See my bookings]])
  - Assumption: an account is needed, created at the first booking.
- Does the club need a sync with its own calendar in the MVP, or do the clubs block slots by hand? ([[#The club publishes its courts#Keep the slots right#Sync with the club's own calendar]])
  - Decision: by hand in the MVP, watched during the pilot (Camille and Hugo, 2026-11-12).
- Does split payment go in the MVP? ([[#The player books#Pay#Split the price between the players]])
  - Decision: no, the player who books pays the whole court (Camille and Hugo, 2026-11-12).
- Can the desk staff of a club use Courtly? ([[#The club joins#Sign up the club#Give access to the desk staff]])
  - Decision: yes, a role of their own that sees the bookings but not the money (Camille and Hugo, 2026-11-12).
