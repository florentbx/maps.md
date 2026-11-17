---
type: decision-log
title: The decisions in its history
description: The decisions that shaped how Spliit computes money, from rounding the balances (2024) to one function for every share, amounts in minor units, a grace period before deleting a group and the anchor day of a recurrence (2026)
updated: 2026-11-16
---
<!-- decision-log: The decisions that matter on a project, one after the other, with their problem, the options considered and why one was chosen, as architecture decision records (ADR, MADR): so that nobody has to guess or decide again. Each ## is a decision (except Context and Open questions), in order; all decisions share the same properties. Status is one of proposed, accepted, rejected, deprecated, superseded (default: accepted). `undefined` means the source did not say. -->

## Context
Read from the history of Spliit (https://github.com/spliit-app/spliit, MIT license), up to commit `f293974` (2026-11-12): the messages of the merged pull requests, by their number (`git log`). Only the decisions a developer must know before changing the money or the data are here. The deciders are the authors of the pull requests, as git names them; the maintainers who merged them are not recorded. What a pull request does not say is `undefined`.

## Round the balances, not each expense
- Date: 2024-02-13
- Status: superseded
- Deciders:
  - Lauri Vuorela (#88)
- Problem:
  - undefined
- Options:
  - Round each share of each expense
  - Round the balance of each participant, once, at the end
- Rationale:
  - undefined
- Consequences:
  - The Balances tab shows balances derived from the suggested reimbursements ("public balances")
  - Rounding each participant on its own did not keep the sum: the residue ended up in the group's total (#562)
- Superseded by: [[#Compute every share in one place]]

## Leave reimbursements out of the stats
- Date: 2024-02-29
- Status: accepted
- Deciders:
  - Sebastien Castiel (#119)
- Problem:
  - The stats counted reimbursements as spending (#118)
- Options:
  - undefined
- Rationale:
  - A reimbursement moves money between participants; it is not spending
- Consequences:
  - The balances count reimbursements and the stats do not ([[rules#Reimbursements out of the stats]])

## Keep the suggestions stable across repayments
- Date: 2024-08-02
- Status: accepted
- Deciders:
  - Laszlo Makk (#179)
- Problem:
  - After one suggested reimbursement was paid, the app suggested a whole new list (#178)
- Options:
  - Sort the balances by amount
  - Sort the creditors before the debtors, then by participant id
- Rationale:
  - The pairing needs only creditors first and debtors last; sorting by id is not changed by a repayment
- Consequences:
  - Paying one suggestion removes just that one from the list ([[rules#Suggested reimbursements]])

## Call the server through tRPC
- Date: 2024-10-19
- Status: accepted
- Deciders:
  - Sebastien Castiel (#246, then #249, #250, #251, #253)
- Problem:
  - undefined
- Options:
  - undefined
- Rationale:
  - undefined
- Consequences:
  - Every page reads and writes through the procedures of `src/trpc/routers/` ([[architecture#tRPC API]])

## Create the occurrences of a recurring expense when read
- Date: 2025-04-19
- Status: accepted
- Deciders:
  - trandall (#263)
- Problem:
  - Recurring expenses were asked for (#5)
- Options:
  - undefined
- Rationale:
  - undefined
- Consequences:
  - No scheduler: the due occurrences are created, in a transaction each, whenever expenses are read ([[rules#Recurring expenses]])
  - An occurrence is a full expense, linked to the next one by a `RecurringExpenseLink`

## Store every amount in minor units
- Date: 2026-08-13
- Status: accepted
- Deciders:
  - yllar (#425)
  - Sebastien Castiel (#550)
- Problem:
  - `amount` was in minor units, `originalAmount` in major units, in an integer column: the fractions were lost
- Options:
  - undefined
- Rationale:
  - The same convention as `amount`
- Consequences:
  - A data migration multiplied the old rows by 100 (`20260812213708_backfill_original_amount_minor_units`); the balances were not touched, as they read `amount` only

## Compute every share in one place
- Date: 2026-08-13
- Status: accepted
- Deciders:
  - BastiOfBerlin (#562)
- Problem:
  - Three pieces of code computed a share (the balances, the stats, the CSV export) and disagreed on rows that break the invariants; 95.00 split three ways showed 31.67 three times
- Options:
  - A persisted cursor for who gets the leftover unit
  - A hash of the expense id
- Rationale:
  - The hash keeps the split a pure function of the expense: no migration, no state, the same answer on every render
- Consequences:
  - `src/lib/shares.ts` serves the balances, the stats, the form and the export ([[rules#Leftover minor unit]])
  - The rounding of the balances is kept as a guard, now a no-op
  - A new expense has no id yet; the form now mints it to preview the right split (#647)

## Check the feature flags on the server
- Date: 2026-08-13
- Status: accepted
- Deciders:
  - BastiOfBerlin (#560)
- Problem:
  - The AI server actions could be called with their features off, spending the operator's OpenAI credit, and any URL could be sent to OpenAI to fetch
- Options:
  - undefined
- Rationale:
  - A flag that only hides a button does not stop a direct call
- Consequences:
  - Both actions check `getRuntimeFeatureFlags()`, and the receipt URL must be on the app's own bucket (`isAllowedUploadUrl`)

## Sum the total balance per currency
- Date: 2026-08-16
- Status: accepted
- Deciders:
  - BastiOfBerlin (#583)
- Problem:
  - A balance across all groups was asked for (#509), but the server does not know who "you" are
- Options:
  - undefined
- Rationale:
  - A €20 credit and a $20 debt are not a zero balance
- Consequences:
  - The browser sends its `{ groupId, participantId }` pairs; one line per currency ([[rules#Total balance by currency]])

## Keep the group's amount in a repayment in another currency
- Date: 2026-08-16
- Status: accepted
- Deciders:
  - BastiOfBerlin (#588)
- Problem:
  - People pay each other back in their own currency, not the group's; the amount to transfer was worked out by hand
- Options:
  - undefined
- Rationale:
  - The amount in the group's currency settles the balance exactly; the transferred amount is only recorded
- Consequences:
  - Mark as paid fills in a read-only amount to transfer ([[rules#Pay back in another currency]])

## Schedule the deletion of a group
- Date: 2026-10-10
- Status: accepted
- Deciders:
  - Levin Herr (#420)
- Problem:
  - Deleting a group was asked for two years (#9, #186), but anyone with the link could then destroy it
- Options:
  - undefined
- Rationale:
  - A 30-day grace period stops someone with bad intent; typing the name stops a mistake
- Consequences:
  - A purge job to call every day, behind `ENABLE_GROUP_DELETION` and `CRON_SECRET`
  - The files in the bucket: left to do in the description of the pull request; the purge deletes them at `f293974` ([[rules#Purge after the grace period]])

## Repeat on the original day of the month
- Date: 2026-10-14
- Status: accepted
- Deciders:
  - t0ma5 (#676)
- Problem:
  - A monthly expense of the 31st fell on the 28th in February and stayed there: the next date came from the previous one
- Options:
  - undefined
- Rationale:
  - Store the day the series was made on, `anchorDay`
- Consequences:
  - February still falls on the 28th, March back on the 31st ([[rules#Anchor day]])
  - A series that already drifted keeps its drifted day
