---
type: failure-modes
title: What can go wrong
description: What can go wrong in Spliit as its code stands, from a group changed by anyone with its link to orphan files in the bucket, a duplicate expense on retry, or a purge that never runs, with how each is noticed and what the person sees
updated: 2026-11-16
---
<!-- failure-modes: What can go wrong while the product runs, how likely and how serious it is, how it is noticed and what the product does then; so that the AI that builds it handles each case on purpose. Each ## is a failure (except Context and Open questions), in order; all failures share the same properties. Likelihood is one of low, medium, high. Severity is one of low, medium, high. `undefined` means the source did not say. -->

## Context
Read from the code of Spliit (https://github.com/spliit-app/spliit, MIT license), commit `f293974` (2026-11-12), the file of each failure named in its Cause. No incident report was read: the likelihoods are left `undefined` when the code alone cannot say how often a failure happens.

## Anyone with the link changes a group
- Likelihood: undefined
- Severity: high
- Cause:
  - No account, no login: the link of a group is its only key, by design (`src/trpc/init.ts`, an empty context)
- Detected by:
  - The activity log, signed by the active user the person chose, if any
- Response:
  - A deletion waits 30 days and can be undone ([[group-lifecycle#Scheduled for deletion]])
- The person sees:
  - The Share dialog: "Every person with the group URL will be able to see and edit expenses."

## Expense reached outside its group
- Likelihood: low
- Severity: high
- Cause:
  - `getExpense`, `updateExpense` and `deleteExpense` find an expense by its id alone, the group id unused (`src/lib/api.ts`)
  - Guessing an id is hard: 21 random characters
- Detected by:
  - undefined
- Response:
  - none
- The person sees:
  - undefined

## Duplicate expense on retry
- Likelihood: low
- Severity: medium
- Cause:
  - The create succeeds but its answer is lost; the retry is a new expense
- Detected by:
  - The person, seeing it twice
- Response:
  - none: an end-to-end test expects two (`e2e/split-modes.spec.ts`, "can retry a create whose response was lost")
- The person sees:
  - The same expense twice in the list; they delete one

## Orphan files in the bucket
- Likelihood: high
- Severity: low
- Cause:
  - Deleting an expense, or removing a photo from it, leaves the file in the bucket (`src/lib/api.ts`)
  - The purge finds the files through their expense, so it misses those of deleted expenses (`src/lib/group-deletion.ts`)
- Detected by:
  - undefined
- Response:
  - none
- The person sees:
  - nothing; the operator pays for the storage

## Recurring occurrence missing
- Likelihood: medium
- Severity: low
- Cause:
  - The occurrences are created only when some group's expenses are read, never on a schedule (`createRecurringExpenses`, `src/lib/api.ts`)
  - Creating one fails: logged, retried at the next read
- Detected by:
  - A server log, "Failed to created recurringExpense"
- Response:
  - The next read creates every occurrence due since, in order
- The person sees:
  - The occurrences appear at their own dates once the group is opened

## Purge never runs
- Likelihood: medium
- Severity: medium
- Cause:
  - Group deletion is on, off Vercel, and nothing calls `/api/cron/purge-deleted-groups`
- Detected by:
  - undefined
- Response:
  - none
- The person sees:
  - The group past its date, still there, which they can no longer restore ([[group-lifecycle#Due for purge]])

## Purge fails for a group
- Likelihood: low
- Severity: low
- Cause:
  - The bucket or the database refuses a deletion (`src/lib/group-deletion.ts`)
- Detected by:
  - The job answers 500 with the failed ids; a server log
- Response:
  - The group stays, retried at the next run
- The person sees:
  - The group a day longer

## Receipt scan fails
- Likelihood: undefined
- Severity: low
- Cause:
  - The upload or the call to OpenAI fails, caught together (`create-from-receipt-button.tsx`)
- Detected by:
  - A log in the browser console
- Response:
  - none
- The person sees:
  - "Error while uploading document", even when the upload worked, with Retry

## Category guess fails
- Likelihood: undefined
- Severity: low
- Cause:
  - The call to OpenAI throws, and the form does not catch it (`expense-form.tsx`, `onBlur` of the title)
- Detected by:
  - An unhandled error in the browser console
- Response:
  - none
- The person sees:
  - The category keeps its loading spinner

## No exchange rate
- Likelihood: low
- Severity: low
- Cause:
  - Frankfurter is down, or has no rate for that currency on that day (`src/lib/hooks.ts`)
- Detected by:
  - The form, from the answer
- Response:
  - No retry on its own
- The person sees:
  - "Oops, we could not get the most recent rates.", with Refresh, or a custom rate to type

## Active user forgotten
- Likelihood: medium
- Severity: low
- Cause:
  - Who the person is lives in one browser's localStorage: another device, a private window or cleared data forgets it, and the list of groups with it
- Detected by:
  - The app, finding no active user for the group
- Response:
  - Asks "Who are you?" again
- The person sees:
  - The dialog again; My groups empty until they open the links again

## Instance misconfigured
- Likelihood: low
- Severity: high
- Cause:
  - A feature switched on without what it needs (S3 keys, `CRON_SECRET`, `OPENAI_API_KEY`), or no database URL (`src/lib/env.ts`)
- Detected by:
  - The environment check, at start
- Response:
  - The app refuses to start, naming the missing variable
- The person sees:
  - The instance down

## Open questions
- Should `getExpense`, `updateExpense` and `deleteExpense` also match the group id, as their signature suggests? Today the group id they take is not used to find the expense. ([[#Expense reached outside its group]])
- Is the duplicate on a lost answer accepted on purpose? The test that expects two expenses says a retry that reused the id "would collide", not that two are wanted. ([[#Duplicate expense on retry]])
- What does the category button do while it shows its spinner: can the person still open the list? The code read only shows the spinner. ([[#Category guess fails]])
