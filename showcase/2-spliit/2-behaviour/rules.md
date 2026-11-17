---
type: business-rules
title: The rules as the code applies them
description: How Spliit splits an expense, rounds it to the cent, computes the balances and suggests the reimbursements, converts currencies, repeats recurring expenses and deletes a group, each rule with the examples of its tests
updated: 2026-11-16
---
<!-- business-rules: The rules of the domain that the product must apply, each stated once and shown with examples, so that the AI that builds it gets the edge cases right. Each ## is a rule (except Context and Open questions); their order carries no meaning. `undefined` means the source did not say. -->

## Context
Read from the code of Spliit (https://github.com/spliit-app/spliit, MIT license), commit `f293974` (2026-11-12): what the code does, not what a document says. The examples are those of its unit tests (`src/lib/*.test.ts`) and end-to-end tests (`e2e/*.spec.ts`), with the names of the tests (Alice, Bob, Carol), or, for the deletion of a group, which no test covers, read from the code itself; none is worked out by hand. The words are those of [[glossary]].

## Minor units
- Area: Amounts
- Statement: Every amount is stored and computed as a whole number of minor units of the group's currency (cents for the euro, none for the yen); it is turned into a decimal only to be shown.
- Examples:
  - 150 minor units of euros → 1.5 euros
  - 1000 minor units of yen → 1000 yen, the yen has no minor unit
  - An amount of 0 → refused (`amountNotZero`)
  - An amount above 10,000,000.00 → refused (`amountTenMillion`)
- Why: The amounts are integer columns; storing `originalAmount` as a decimal lost its fractions, fixed by #425 and a backfill migration (#550) ([[decisions#Store every amount in minor units]]).
- Code:
  - `src/lib/utils.ts` (`amountAsDecimal`, `amountAsMinorUnits`)
  - `src/lib/schemas.ts` (`expenseFormSchema`)

## Income
- Area: Amounts
- Statement: An expense with a negative amount is an income: the payer received the money for the participants, who each owe their share of it back; an income is never a reimbursement.
- Examples:
  - −95.00 split evenly between Alice, Bob and Carol → −31.67, −31.67 and −31.66
  - A negative amount typed in the form → the form reads "Create income", and unchecks "This is a reimbursement"
- Applies to:
  - [[settle-up#Fill in the expense]]
- Code:
  - `src/app/groups/[groupId]/expenses/expense-form.tsx` (`isIncome`)
  - `src/lib/shares.test.ts`
  - `e2e/expense-variants.spec.ts`

## Split modes
- Area: Split
- Statement: The `shares` of each participant are read by the split mode of the expense: ignored when it is even, a weight by shares, hundredths of a percent by percentage, minor units by amount; in every mode they are taken as a ratio of their sum, so the whole amount is always split.
- Examples:
  - 1.00 evenly, stored shares 7 and 1 → Alice 0.50, Bob 0.50
  - 1.00 by shares, Alice 1, Bob 2 → Alice 0.33, Bob 0.67
  - 10.00 by amount, 3.33, 3.33 and 3.34 → kept as they are
  - 1.00 by percentage, 60 % and 20 % (an old row) → Alice 0.75, Bob 0.25
  - 1.00 by shares, all shares 0 (an old row) → everyone 0
- Why: Three parts of the code computed shares their own way and disagreed on the rows that break the invariants; one function now serves the balances, the stats, the form and the export (#562) ([[decisions#Compute every share in one place]]).
- Applies to:
  - [[settle-up#Fill in the expense]]
- Code:
  - `src/lib/shares.ts` (`getExpenseShares`)
  - `src/lib/shares.test.ts`
  - `e2e/split-modes.spec.ts`

## Split adds up on save
- Area: Split
- Statement: An expense is saved only if it is paid for at least one participant, every share is above zero, the percentages add up to exactly 100 % and the amounts to exactly the amount.
- Examples:
  - 100 by percentage, 50 %, 30 % and 10 % → refused, "The percentages add up to 90%, 10% less than 100%."
  - 100.00 by amount, 50.00, 30.00 and 20.01 → refused, "The amounts add up to 100.01, 0.01 more than the expense amount (100.00)." (#639)
  - A share of 0 → refused, "noZeroShares"
  - Nobody paid for → refused, "paidForMin1"
- Applies to:
  - [[settle-up#Does the split add up?]]
- Code:
  - `src/lib/schemas.ts` (`expenseFormSchema`, `superRefine`)
  - `src/lib/schemas.test.ts`
  - `e2e/split-modes.spec.ts`

## Leftover minor unit
- Area: Split
- Statement: Each participant first gets the whole minor units of their exact share, then the units left over go one each to the largest remainders; on a tie (an even split), the first to get one is chosen by a hash of the expense id, so the extra cent moves from one expense to the next but is always the same for one expense.
- Examples:
  - 95.00 evenly between three → 31.66, 31.67 and 31.67, adding up to 95.00
  - The same expense split twice → the same split
  - 50 expenses of 1.00 between three, with different ids → each of the three gets the extra cent at least once
  - The participants returned in another order by the database → the same split
  - An expense without an id yet → the extra cent to the first participant
- Why: Rounding each share on its own showed 95.00 as 3 × 31.67 = 95.01, and left balances that did not add up to zero (#562); the form mints the id of a new expense so that its preview is the split that is saved (#647).
- Applies to:
  - [[settle-up#Fill in the expense]]
- Code:
  - `src/lib/shares.ts` (`apportion`, `hashString`)
  - `src/lib/shares.test.ts`
  - `e2e/split-modes.spec.ts` ("saves an even split with the leftover cent where it was previewed")

## Balance
- Area: Balances
- Statement: The balance of a participant is what they paid minus their shares of all the expenses of the group, reimbursements included; the balances of a group always add up to zero.
- Examples:
  - Alice pays 30.00 for Alice and Bob → Alice +15.00, Bob −15.00
  - Then Bob reimburses Alice 15.00 → both 0
  - Alice pays 90.00 and Bob 30.00, each for the three → Alice +50.00, Bob −10.00, Carol −40.00
  - Randomised amounts, participants and split modes → the balances add up to zero
- Applies to:
  - [[settle-up#Balances]]
  - [[sitemap#My groups#Group#Balances]]
- Code:
  - `src/lib/balances.ts` (`getBalances`)
  - `src/lib/balances.test.ts`
  - `e2e/core.spec.ts`

## Suggested reimbursements
- Area: Settling up
- Statement: The reimbursements are suggested by pairing, again and again, the last participant who owes with the first who is owed, the creditors sorted before the debtors and each side by participant id; the one who owes less is cleared at each step.
- Examples:
  - Alice +50.00, Bob −10.00, Carol −40.00 → Carol owes Alice 40.00, Bob owes Alice 10.00
  - Every suggestion booked as a reimbursement → every balance at 0, nothing left to suggest
  - One suggestion booked → the same suggestions, without that one
- Why: Sorting by amount gave a whole new list after each repayment; sorting by id keeps it stable (#179) ([[decisions#Keep the suggestions stable across repayments]]).
- Applies to:
  - [[settle-up#Anyone owes?]]
  - [[sitemap#My groups#Group#Balances]]
- Code:
  - `src/lib/balances.ts` (`getSuggestedReimbursements`, `compareBalancesForReimbursements`)
  - `src/lib/balances.test.ts`

## Mark as paid
- Area: Settling up
- Statement: To settle a suggestion, the person creates a reimbursement: an expense titled "Reimbursement", paid by the one who owes, for the one who is owed, of the amount suggested, marked "This is a reimbursement".
- Examples:
  - Bob owes Alice 50.00, Mark as paid, Create → both balances at 0, "doesn't need any reimbursement"
- Applies to:
  - [[settle-up#Mark as paid]]
  - [[settle-up#Create the reimbursement]]
- Code:
  - `src/app/groups/[groupId]/reimbursement-list.tsx` (the link, `?reimbursement=yes&from=&to=&amount=`)
  - `src/app/groups/[groupId]/expenses/expense-form.tsx` (`isRepayment`)
  - `e2e/reimbursements.spec.ts`

## Pay back in another currency
- Area: Settling up
- Statement: A reimbursement may be paid in another currency: the amount in the group's currency stays the one of the balance, and the amount to transfer is that amount divided by the rate, rounded to the other currency; converting it back may not give the exact amount, and need not.
- Examples:
  - Bob owes Alice 50 USD, paid back in EUR at 1 EUR = 1.25 USD → amount to transfer 40.00 EUR, filled in and read only
  - Created → both balances at 0, the card shows 50 USD and 40 EUR
  - Reopened later → still 40 EUR, not converted again at today's rate
- Why: A trip's group uses the local currency, but people pay each other back in their own (#588).
- Applies to:
  - [[settle-up#Pay in another currency]]
- Code:
  - `src/lib/currency-conversion.ts` (`convertToOriginalCurrency`)
  - `src/lib/currency-conversion.test.ts`
  - `e2e/repayment-currency.spec.ts`

## Currency conversion
- Area: Currency
- Statement: An expense entered in another currency is converted into the group's currency with the rate of its date (1 original currency = rate × group currency), rounded to the decimals of the group's currency; the original amount, its currency and the rate are kept with it. It needs the group to have a currency code.
- Examples:
  - 130.21 EUR at 38.4, a group in THB → 5,000.06 THB
  - 10 at 163.456, a group in JPY → 1,635 JPY
  - −10 at 38.4, an income → −384.00 THB
  - A rate of 0, negative or not a number → no conversion
  - A custom rate typed in → it wins over the fetched one
- Applies to:
  - [[settle-up#Fill in the expense]]
- Code:
  - `src/lib/currency-conversion.ts` (`convertToGroupCurrency`)
  - `src/lib/hooks.ts` (`useCurrencyRate`)
  - `src/lib/currency-conversion.test.ts`
  - `e2e/multi-currency.spec.ts`

## Recurring expenses
- Area: Recurrence
- Statement: An expense may repeat daily, weekly, monthly or yearly; each occurrence is a full copy of the previous one (shares and documents included), created only when the expenses of a group are read and its date has come, never by a schedule.
- Examples:
  - A daily expense created a few days ago → the past occurrences appear when the list is opened
  - An occurrence with documents → the next one gets copies of them; the earlier one keeps its own (#666)
  - The recurrence switched to None before the next occurrence exists → the link deleted
- Applies to:
  - [[sitemap#My groups#Group#Expenses]]
- Code:
  - `src/lib/api.ts` (`createRecurringExpenses`, called by `getGroupExpenses`)
  - `src/lib/api.test.ts`
  - `e2e/recurrence.spec.ts`

## Anchor day
- Area: Recurrence
- Statement: A monthly or yearly series repeats on the day of the month it was created on: a missing day falls on the last day of the month, and the series comes back to its day after.
- Examples:
  - Monthly from 31 January 2025 → 28 February, then 31 March
  - Monthly from 31 January 2024 → 29 February
  - Monthly from 31 December 2025 → 31 January 2026
  - Yearly from 29 February 2024 → 28 February 2025, 2026, 2027, then 29 February 2028
  - The date of an open series edited → the next occurrence moves with it
- Why: A series made on the 31st stayed on the 28th after February (#676) ([[decisions#Repeat on the original day of the month]]).
- Code:
  - `src/lib/recurrence.ts` (`nextRecurringDate`, `usesAnchorDay`)
  - `src/lib/recurrence.test.ts`

## Deletion grace period
- Area: Groups
- Statement: Deleting a group schedules it for deletion 30 days later, once its name is typed; until then anyone with the link can restore it; on an instance where the feature flag is off, deleting is refused but restoring still works.
- Examples:
  - The name typed does not match → refused, "Group name does not match"
  - Scheduled twice at once → only one succeeds, the date is not pushed back
  - Restore before the date → the group as it was
  - Restore after the date → refused, the group may be being purged
- Why: An open request of two years (#9); the grace period keeps someone with bad intent from deleting a group at once (#420) ([[decisions#Schedule the deletion of a group]]).
- Applies to:
  - [[group-lifecycle#Scheduled for deletion]]
  - [[sitemap#My groups#Group#Settings]]
- Code:
  - `src/lib/api.ts` (`scheduleGroupDeletion`, `restoreGroup`)
  - `src/trpc/routers/groups/delete.procedure.ts`

## Purge after the grace period
- Area: Groups
- Statement: Once a day, every group whose deletion date has passed is deleted for good: its files in the bucket first, then its rows; a group that fails stays and is retried at the next run.
- Examples:
  - Two groups due, one fails → one purged, the job answers 500 with the id of the other
  - A document whose URL is not in the configured bucket → its file left alone
- Applies to:
  - [[group-lifecycle#Purged]]
- Code:
  - `src/lib/group-deletion.ts` (`purgeScheduledGroups`)
  - `src/app/api/cron/purge-deleted-groups/route.ts`

## Reimbursements out of the stats
- Area: Stats
- Statement: The totals and stats of a group (spending, your spending, your share, by category, by month, by participant) leave out reimbursements, which only move money between participants; the balances count them.
- Examples:
  - Groceries 10.00 and 5.00, Car 30.00, a reimbursement of 99.99 in Car → Car 30.00, Groceries 15.00
  - A reimbursement of 5.00 to Bob → his share 0 in the stats, 5.00 in the balances
- Why: Reimbursements inflated the spending (#118, #119).
- Applies to:
  - [[sitemap#My groups#Group#Stats]]
- Code:
  - `src/lib/totals.ts` (`getTotalGroupSpending`, `calculateShare`)
  - `src/lib/totals.test.ts`
  - `e2e/stats.spec.ts`

## Total balance by currency
- Area: Stats
- Statement: On My groups, the balance of the person across their groups is the sum of their balances in the groups where they said who they are, one line per currency, never converted.
- Examples:
  - A credit of €20 and a debt of $20 → two lines, not a zero balance
  - No active user in any group → the card hidden
- Why: #509, #583.
- Applies to:
  - [[sitemap#My groups]]
- Code:
  - `src/trpc/routers/groups/balances/forUser.procedure.ts`
  - `src/app/groups/global-balance-card.tsx`
  - `e2e/global-balance.spec.ts`

## Open questions
- The names of the participants of a group must differ, but only the form checks it (`groupFormSchema`): two participants may still share a name in the database. Should the database hold that rule? ([[data#Participant]])
