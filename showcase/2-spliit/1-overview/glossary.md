---
type: glossary
title: The glossary
description: The words of Spliit as its screens write them, and how its code names them, from active user and balance to split mode, reimbursement and minor unit
updated: 2026-11-16
---
<!-- glossary: The words of a product and its domain, so that the people and the AI that build it use the same word for the same thing: what each one means, the other words people use, and the words to avoid. Each ## is a term (except Context and Open questions); their order carries no meaning. Kind is one of thing, action, state, role, technical (default: thing). `undefined` means the source did not say. -->

## Context
Read from the code of Spliit (https://github.com/spliit-app/spliit, MIT license), commit `f293974` (2026-11-12): the words are those of its English screens (`messages/en-US.json`), the names in Code those of `prisma/schema.prisma` and `src/`. Where the two differ, a developer and their AI are the most likely to mix them up.

## Active user
- Kind: role
- Definition: The participant the person said they are in a group, on this browser; it fills in "Paid by" and personalises the totals. The person may also choose nobody.
- Also called:
  - Who are you?
- Avoid:
  - User (there are no user accounts)
  - Logged-in user (there is no login)
- Code:
  - `activeUser`, in localStorage under `<groupId>-activeUser` (`None` for nobody)
  - `useActiveUser` (`src/lib/hooks.ts`)

## Activity
- Kind: thing
- Definition: A line of the activity log of a group: a change of the group or of an expense, with the active user who made it, if any.
- Code:
  - `Activity`, `ActivityType`

## Balance
- Kind: thing
- Definition: For a participant, what they paid minus their shares of all the expenses of the group, reimbursements included: positive, they are owed; negative, they owe. The balances of a group add up to zero.
- Avoid:
  - Debt (a balance may be a credit)
- Code:
  - `Balances`, `total` (`src/lib/balances.ts`)

## Category
- Kind: thing
- Definition: A kind of expense, picked in a fixed list shared by all groups; General by default.
- Code:
  - `Category`, `categoryId` (0 is General)

## Expense
- Kind: thing
- Definition: Money one participant paid for some of the participants of the group, split between them by a split mode; an income and a reimbursement are expenses too.
- Code:
  - `Expense`

## Group
- Kind: thing
- Definition: The people who share expenses (a trip, a flat), with one currency; anyone who has its link can see and change it.
- Code:
  - `Group`

## Group link
- Kind: technical
- Definition: The address of a group, `/groups/<id>`, with its random id; the only key to a group. The Share dialog warns: "Every person with the group URL will be able to see and edit expenses."
- Also called:
  - Share link
  - Group URL
- Avoid:
  - Invitation (nobody is invited, there is no account)
- Code:
  - `Group.id`, minted by `randomId()` (`src/lib/random.ts`)

## Income
- Kind: thing
- Definition: An expense with a negative amount: money one participant received for some of the participants, split as an expense is.
- Code:
  - `amount < 0`, `isIncome` (`expense-form.tsx`); no field of its own

## Mark as paid
- Kind: action
- Definition: Settles a suggested reimbursement, by opening the form of a new expense filled in as that reimbursement.
- Also called:
  - Settle up
- Code:
  - `isRepayment` (`expense-form.tsx`), the query `?reimbursement=yes`

## Minor unit
- Kind: technical
- Definition: The smallest unit of a currency (a cent of a euro; the yen has none); every amount is stored as a whole number of them.
- Avoid:
  - Cents (not every currency has cents)
- Code:
  - `amount`, `originalAmount` (integers), `amountAsDecimal`, `amountAsMinorUnits` (`src/lib/utils.ts`)

## Original currency
- Kind: thing
- Definition: The currency an expense was paid in, when it is not the group's; the expense keeps its amount in it and the rate used.
- Also called:
  - Currency of expense
- Code:
  - `originalCurrency`, `originalAmount`, `conversionRate`

## Participant
- Kind: role
- Definition: A person of a group, known by a name only; it may pay an expense and have a share in it.
- Avoid:
  - User (a participant has no account)
- Code:
  - `Participant`

## Paid by
- Kind: role
- Definition: The participant who paid an expense; one per expense.
- Code:
  - `paidBy`, `paidById`

## Paid for
- Kind: role
- Definition: The participants an expense was paid for, each with their share.
- Code:
  - `paidFor`, `ExpensePaidFor`

## Recurring expense
- Kind: thing
- Definition: An expense that repeats daily, weekly, monthly or yearly; each occurrence is a full expense of its own, created when its date has come.
- Also called:
  - Recurrence
- Code:
  - `recurrenceRule`, `RecurringExpenseLink`; an occurrence is a frame (`currentFrameExpense`)

## Reimbursement
- Kind: thing
- Definition: An expense that records money one participant paid back to another; it counts in the balances, not in the stats.
- Also called:
  - Repayment
- Code:
  - `isReimbursement`; `Reimbursement` (`src/lib/balances.ts`) is a suggested one, not stored

## Scheduled for deletion
- Kind: state
- Definition: A group that will be deleted for good at a date, 30 days after someone asked to delete it, and can be restored until then.
- Code:
  - `Group.deleteAt` not empty

## Share
- Kind: thing
- Definition: The part of an expense a participant is charged, always a whole number of minor units; the shares of an expense add up to its amount.
- Avoid:
  - Shares, for the stored number (that is a weight, a percentage or an amount, by split mode)
- Code:
  - computed by `getExpenseShares` (`src/lib/shares.ts`); stored `ExpensePaidFor.shares` is its input, not the share

## Split mode
- Kind: thing
- Definition: How an expense is split between the participants it was paid for: evenly, by shares, by percentage or by amount.
- Code:
  - `SplitMode`: `EVENLY`, `BY_SHARES`, `BY_PERCENTAGE`, `BY_AMOUNT`

## Suggested reimbursement
- Kind: thing
- Definition: A payment the app proposes, from a participant who owes to one who is owed, so that the group settles up in few payments; not stored, computed again from the balances.
- Code:
  - `getSuggestedReimbursements`, `Reimbursement` (`src/lib/balances.ts`)
