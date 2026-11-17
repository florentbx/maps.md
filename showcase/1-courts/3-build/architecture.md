---
type: system-architecture
title: The system architecture
description: The parts of Courtly and who uses them, the web app, its database, Stripe Connect for the payments and payouts, the emails, and the club's own tool kept beside it
updated: 2026-11-12
---
<!-- system-architecture: The parts of a system, who uses them and how they talk to each other. Each ## is a component (except Context and Open questions); "- label → [[#Component]]" is an arrow to another component, with an optional label; "→ undefined" means the other component is unknown. Kind is one of person, application, service, database, external system (default: service). `undefined` means the source did not say. -->

## Context
What Camille decided with the AI, as a PM sees it: the parts and what goes between them, not the code. From the notes of 2026-11-03 to 2026-11-12 (`notes/`) and [[decisions]]. The club's own tool stays outside Courtly: the slots its members book are blocked by hand in Courtly ([[rules]]).

## Player
- Description: Finds a slot, books it, pays, cancels.
- Kind: person
- finds, books, pays, cancels → [[#Courtly web app]]

## Club manager
- Description: Publishes the courts and the prices, sees the bookings and the payouts; the desk staff see the bookings only.
- Kind: person
- publishes courts, blocks slots → [[#Courtly web app]]
- books its members → [[#Club's own tool]]

## Courtly web app
- Description: The one web app for the players, the clubs and Camille and Hugo, made to work on a phone; its pages and its server code together.
- Kind: application
- Technology: Next.js, on Vercel
- reads and writes the clubs, courts, slots, bookings → [[#Courtly database]]
- starts a payment, a refund → [[#Stripe Connect]]
- sends the confirmations, the cancellations → [[#Email service]]

## Courtly database
- Description: The clubs, their courts and prices, the slots, the bookings, the accounts; and the sign-in of the accounts.
- Kind: database
- Technology: Supabase (PostgreSQL)

## Stripe Connect
- Description: Takes the payment of the player, holds the money, refunds it, and pays each club every Monday minus the commission; each club has its own Stripe account through Courtly.
- Kind: external system
- Technology: Stripe
- payment done, refund done (webhook) → [[#Courtly web app]]

## Email service
- Description: Sends the emails of Courtly: the confirmation of a booking to the player and the club, a cancellation.
- Kind: external system
- Technology: undefined

## Club's own tool
- Description: The software, paper sheet or spreadsheet where each club books its members; Courtly does not see it.
- Kind: external system

## Open questions
- Which service sends the emails? ([[#Email service]])
  - Assumption: Resend, which the AI proposed, free up to 3,000 emails a month.
- Does a club need its own Stripe account before it joins, or is it created through Courtly? Padel Garonne may have one for its shop. ([[#Stripe Connect]])
  - Decision: each club gets a new Stripe account through Courtly, even if it has one (Camille and Hugo, 2026-11-12).
