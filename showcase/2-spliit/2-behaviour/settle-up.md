---
type: user-flow
title: Split an expense and settle up
description: The main path of Spliit as its end-to-end tests drive it, from opening the link of a group to adding an expense, reading the balances and marking a suggested reimbursement as paid
updated: 2026-11-16
---
<!-- user-flow: The path a person takes in the product to reach a goal: the steps, the decisions, and where it ends. Each ## is a step (except Context and Open questions); "- label → [[#Step]]" is an arrow to another step, with an optional label; "→ undefined" means the other step is unknown. Kind is one of screen, decision, action (default: action). `undefined` means the source did not say. -->

## Context
Read from the end-to-end tests of Spliit (https://github.com/spliit-app/spliit, MIT license), commit `f293974` (2026-11-12), which drive this path in a real browser: `e2e/active-user.spec.ts`, `e2e/core.spec.ts`, `e2e/split-modes.spec.ts`, `e2e/reimbursements.spec.ts`, `e2e/repayment-currency.spec.ts`; and from the pages they open (`src/app/groups/[groupId]/`). The rules applied at each step are in [[rules]].

## Open the group link
- Description: Someone of the group sent the link; no account, no login.
- → [[#First visit?]]

## First visit?
- Description: Whether this browser already knows who the person is in this group (`<groupId>-activeUser` in localStorage).
- Kind: decision
- yes → [[#Who are you?]]
- no → [[#Expenses]]

## Who are you?
- Description: A dialog over the expenses: pick a participant, or "I don't want to select anyone"; it can be changed later in the group's settings.
- Kind: screen
- → [[#Expenses]]

## Expenses
- Description: The expenses of the group, newest first, grouped by period, each with what it changes to the active user's balance; a search bar.
- Kind: screen
- → [[#Create expense]]

## Create expense
- Description: The form of an expense: title, amount, date, category, Paid by (the active user by default), Paid for, split mode, recurrence, currency, documents.
- Kind: screen
- → [[#Fill in the expense]]

## Fill in the expense
- Description: The person types the amount and chooses who it was paid for; the form previews each share as it will be saved, and a negative amount turns it into an income.
- → [[#Does the split add up?]]

## Does the split add up?
- Description: Checked when the person saves: percentages to 100 %, amounts to the amount, no share at zero ([[rules#Split adds up on save]]).
- Kind: decision
- yes → [[#Save the expense]]
- no, the form names the difference → [[#Fill in the expense]]

## Save the expense
- Description: The expense is created with the id the form minted, and logged in the activity.
- → [[#Balances]]

## Balances
- Description: The balance of each participant, then the suggested reimbursements, each with Mark as paid.
- Kind: screen
- → [[#Anyone owes?]]

## Anyone owes?
- Description: Whether any balance is not zero.
- Kind: decision
- yes → [[#Mark as paid]]
- no → [[#Settled up]]

## Mark as paid
- Description: On a suggested reimbursement ("Bob owes Alice"): opens Create expense filled in as that reimbursement: titled Reimbursement, paid by Bob, for Alice, of the amount owed, "This is a reimbursement" checked.
- → [[#Create the reimbursement]]
- optional, to pay in another currency → [[#Pay in another currency]]

## Pay in another currency
- Description: The person picks the currency of the transfer; the form fills in the amount to transfer, read only, from the exchange rate.
- → [[#Create the reimbursement]]

## Create the reimbursement
- Description: The person clicks Create; the reimbursement appears in the expenses.
- → [[#Balances]]

## Settled up
- Description: "It looks like your group doesn't need any reimbursement 😁"
- Kind: screen
