---
type: erd
title: The data model
description: The tables of Spliit as Prisma declares them, groups, participants, expenses and their shares, documents, recurrences, categories and the activity log, and how they relate
updated: 2026-11-16
---
<!-- erd: The entities the product stores, what each one holds and how they relate (an entity relationship diagram). Each ## is an entity (except Context and Open questions); "- label → [[#Entity]]" is an arrow to another entity, with an optional label; "→ undefined" means the other entity is unknown. `undefined` means the source did not say. -->

## Context
Read from `prisma/schema.prisma` and `prisma/migrations/` of Spliit (https://github.com/spliit-app/spliit, MIT license), commit `f293974` (2026-11-12). The names are those of the schema. The types are Prisma's.

- Every money amount is an integer number of minor units of the group's currency (cents for most): 12.34 is stored `1234` ([[rules#Minor units]]).
- The ids are random 21-character strings minted by the app (`src/lib/random.ts`), except the category's.
- Deleting a group cascades to its participants, expenses, shares and activities; the documents are deleted by the purge job itself ([[rules#Purge after the grace period]]).
- What the browser keeps (the active user, the recent groups) is not in the database ([[architecture#Browser storage]]).

## Group
- Description: A set of people who share expenses, reached by its link; it has one currency.
- Attributes:
  - id
    - Type: text, a random id that is also the link of the group
    - Required: yes
    - Unique: yes
  - name (2 to 50 characters)
    - Type: text
    - Required: yes
  - information (free text shown on the Information tab, 10,000 characters at most)
    - Type: text
    - Required: no
  - currency (the symbol shown, `$` by default)
    - Type: text
    - Required: yes
  - currencyCode (ISO 4217, enables the conversion of expenses)
    - Type: text, 3 letters
    - Required: no
  - createdAt
    - Type: date and time
    - Required: yes
  - deleteAt (when the group will be purged; empty while it is not scheduled for deletion)
    - Type: date and time
    - Required: no

## Participant
- Description: A person of a group, known by a name only; no account, no email.
- Attributes:
  - id
    - Type: text
    - Required: yes
    - Unique: yes
  - name (2 to 50 characters, unique in its group, checked by the form only)
    - Type: text
    - Required: yes
- belongs to 1 → [[#Group]]

## Expense
- Description: Money paid by one participant for some of the participants: an expense, an income when its amount is negative, or a reimbursement.
- Attributes:
  - id
    - Type: text
    - Required: yes
    - Unique: yes
  - expenseDate (the day it was spent; today by default)
    - Type: date
    - Required: yes
  - title (2 to 200 characters)
    - Type: text
    - Required: yes
  - amount (in minor units of the group's currency; never 0; negative for an income)
    - Type: integer
    - Required: yes
  - originalAmount (in minor units of the original currency)
    - Type: integer
    - Required: no
  - originalCurrency
    - Type: text, an ISO 4217 code
    - Required: no
  - conversionRate (1 original currency = this many of the group's)
    - Type: decimal
    - Required: no
  - isReimbursement
    - Type: yes or no, no by default
    - Required: yes
  - splitMode
    - Type: one of EVENLY, BY_SHARES, BY_PERCENTAGE, BY_AMOUNT; EVENLY by default
    - Required: yes
  - recurrenceRule
    - Type: one of NONE, DAILY, WEEKLY, MONTHLY, YEARLY; NONE by default
    - Required: no
  - notes (5,000 characters at most)
    - Type: text
    - Required: no
  - createdAt (orders two expenses of the same day)
    - Type: date and time
    - Required: yes
- belongs to 1 → [[#Group]]
- paid by 1 → [[#Participant]]
- is of 0..1 → [[#Category]]

## ExpensePaidFor
- Description: The share of one participant in one expense; its meaning depends on the split mode of the expense ([[rules#Split modes]]).
- Attributes:
  - shares (1 by default; ignored when the split is even; a weight, hundredths of a percent, or minor units)
    - Type: integer
    - Required: yes
- for 1 → [[#Expense]]
- of 1 → [[#Participant]]

## Category
- Description: A kind of expense (General, Dining Out, Groceries…), under a grouping (Uncategorized, Food and Drink…); the list is seeded by the migrations and the same for every group.
- Attributes:
  - id (0 is General, the default; seeded in `20240108194443_add_categories`)
    - Type: integer
    - Required: yes
    - Unique: yes
  - grouping
    - Type: text
    - Required: yes
  - name
    - Type: text
    - Required: yes

## ExpenseDocument
- Description: A photo attached to an expense, stored in the S3 bucket.
- Attributes:
  - url
    - Type: text
    - Required: yes
  - width
    - Type: integer
    - Required: yes
  - height
    - Type: integer
    - Required: yes
- attached to 0..1 → [[#Expense]]

## RecurringExpenseLink
- Description: The link from the current occurrence of a recurring expense to the next one to create; it is closed once the next occurrence exists, which then gets its own link ([[rules#Recurring expenses]]).
- Attributes:
  - nextExpenseDate (when the next occurrence is due)
    - Type: date and time
    - Required: yes
  - nextExpenseCreatedAt (empty while the link is open)
    - Type: date and time
    - Required: no
  - anchorDay (the day of the month a monthly or yearly series repeats on; empty for daily and weekly)
    - Type: integer, 1 to 31
    - Required: no
  - groupId (indexed, without a relation)
    - Type: text
    - Required: yes
- for the current occurrence 1 → [[#Expense]]

## Activity
- Description: A line of the activity log of a group: who did what, and when.
- Attributes:
  - time
    - Type: date and time
    - Required: yes
  - activityType
    - Type: one of UPDATE_GROUP, CREATE_EXPENSE, UPDATE_EXPENSE, DELETE_EXPENSE, SCHEDULE_GROUP_DELETION, RESTORE_GROUP
    - Required: yes
  - participantId (the active user who did it, when there is one; not a relation)
    - Type: text
    - Required: no
  - expenseId (not a relation, the expense may be deleted since)
    - Type: text
    - Required: no
  - data (the title of the expense at the time)
    - Type: text
    - Required: no
- belongs to 1 → [[#Group]]

## Open questions
- When an expense is deleted, its documents stay in the database, detached (the relation has no `onDelete`; `src/lib/group-deletion.ts` says they are "only detached"), and their files stay in the bucket; the purge of the group finds documents through their expense, so it misses these. Is that intended, or should they be deleted with the expense? ([[#ExpenseDocument]])
- `Group.currency` (a symbol) and `Group.currencyCode` (an ISO code) are both kept, the code optional: is a group without a code still meant to be created, or is the symbol only kept for the groups made before 2025-04 (migration `20250405152338_add_group_currency_code`)? ([[#Group]])
