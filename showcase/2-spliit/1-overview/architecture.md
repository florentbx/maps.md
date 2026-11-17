---
type: system-architecture
title: The architecture
description: The parts of Spliit and how they talk: the Next.js app in the browser, its tRPC API and server actions, the domain library that splits and balances, PostgreSQL, and the S3, OpenAI, Frankfurter and cron services around it
updated: 2026-11-16
---
<!-- system-architecture: The parts of a system, who uses them and how they talk to each other. Each ## is a component (except Context and Open questions); "- label → [[#Component]]" is an arrow to another component, with an optional label; "→ undefined" means the other component is unknown. Kind is one of person, application, service, database, external system (default: service). `undefined` means the source did not say. -->

## Context
Read from the code of Spliit (https://github.com/spliit-app/spliit, MIT license), commit `f293974` (2026-11-12): `package.json`, `src/app/`, `src/trpc/`, `src/lib/`, `prisma/schema.prisma`, `vercel.json`, `README.md`. Every part is one deployable Next.js app; the boxes below are the parts of its code a developer works in, not separate services.

- There is no account and no login: the tRPC context is empty (`src/trpc/init.ts`), and whoever has the link of a group can read and change it ([[glossary#Group link]]).
- Who you are in a group is kept in the browser only ([[#Browser storage]]); a request carries it only to sign the activity log.
- The optional parts (documents, receipt scan, group deletion, analytics) are switched on by environment variables ([[integrations#Context]]).

## Group member
- Description: Someone who shares expenses with friends: opens a group from its link, adds expenses, settles up.
- Kind: person
- → [[#Web app]]

## Web app
- Description: The pages of Spliit, rendered by Next.js and run in the browser as a Progressive Web App; computes the split of an expense as it is typed, with the same code as the server.
- Kind: application
- Technology: Next.js 16 (App Router), React 19, Tailwind CSS 4, shadcn/ui, next-intl
- Code:
  - `src/app/`
  - `src/components/`
  - `public/sw.js` (the service worker)
- reads and writes the groups (tRPC over HTTPS) → [[#tRPC API]]
- extracts a receipt or a category (server actions) → [[#AI extraction]]
- asks where to upload a document → [[#Upload endpoint]]
- uploads the documents (presigned PUT) → [[#S3 bucket]]
- fetches the exchange rate of a day → [[#Frankfurter]]
- keeps the active user and the recent groups → [[#Browser storage]]
- splits an expense for its preview → [[#Split and balances]]
- sends page views and events → [[#Analytics]]

## Browser storage
- Description: What the app remembers per browser, and the server does not keep: the active user of each group, the recent, starred and archived groups, the default splitting options of a group.
- Kind: database
- Technology: localStorage
- Code:
  - `src/app/groups/recent-groups-helpers.ts`
  - `src/lib/hooks.ts` (`useActiveUser`)
  - `src/app/groups/[groupId]/expenses/expense-form.tsx`

## tRPC API
- Description: The procedures the pages call: groups, expenses, balances, stats, activities, categories; each validates its input with zod, then calls the data access.
- Kind: service
- Technology: tRPC 11, zod 4, superjson
- Code:
  - `src/trpc/routers/`
  - `src/app/api/trpc/[trpc]/route.ts`
- reads and writes → [[#Data access]]
- computes the balances and stats → [[#Split and balances]]

## Data access
- Description: Every read and write of the database, the activity log, and the creation of the due occurrences of recurring expenses, done each time the expenses of a group are read.
- Kind: service
- Technology: TypeScript, Prisma Client 7
- Code:
  - `src/lib/api.ts`
  - `src/lib/prisma.ts`
- reads and writes (SQL) → [[#PostgreSQL]]

## Split and balances
- Description: The domain rules, as pure functions: the share of each participant in an expense, the balances, the suggested reimbursements, the totals and stats, the next date of a recurrence, the currency conversion.
- Kind: service
- Technology: TypeScript
- Code:
  - `src/lib/shares.ts`
  - `src/lib/balances.ts`
  - `src/lib/totals.ts`
  - `src/lib/recurrence.ts`
  - `src/lib/currency-conversion.ts`

## AI extraction
- Description: Two server actions: read the amount, date, title and category of a receipt photo, or guess the category of an expense from its title; refused when their feature flag is off.
- Kind: service
- Technology: Next.js server actions, OpenAI SDK
- Code:
  - `src/app/groups/[groupId]/expenses/create-from-receipt-button-actions.ts`
  - `src/components/expense-form-actions.tsx`
- sends the receipt URL or the title (HTTPS) → [[#OpenAI]]

## Upload endpoint
- Description: Gives the browser a presigned URL to upload a document to the bucket, under a key `document-<time>-<random id>`.
- Kind: service
- Technology: next-s3-upload
- Code:
  - `src/app/api/s3-upload/route.ts`

## Expense export
- Description: Downloads all the expenses of a group as JSON or CSV, with each participant's share.
- Kind: service
- Technology: Next.js route handlers
- Code:
  - `src/app/groups/[groupId]/expenses/export/`
- reads the expenses → [[#PostgreSQL]]

## Purge job
- Description: Deletes for good the groups whose 30 days of grace are over, their documents in the bucket first; answers only a caller with the cron secret.
- Kind: service
- Technology: Next.js route handler, AWS SDK
- Code:
  - `src/app/api/cron/purge-deleted-groups/route.ts`
  - `src/lib/group-deletion.ts`
- deletes the groups → [[#PostgreSQL]]
- deletes their documents → [[#S3 bucket]]

## PostgreSQL
- Description: Holds the groups, participants, expenses, shares, documents (their URLs), recurrences and activities ([[data#Context]]).
- Kind: database
- Technology: PostgreSQL, Prisma migrations
- Code:
  - `prisma/schema.prisma`
  - `prisma/migrations/`

## S3 bucket
- Description: Stores the photos attached to expenses, when documents are enabled.
- Kind: external system
- Technology: Amazon S3 or an S3-compatible provider

## OpenAI
- Description: Reads a receipt and guesses a category, when the AI features are enabled; it fetches the receipt photo from the bucket itself, by its URL.
- Kind: external system
- Technology: OpenAI Chat Completions, or a compatible endpoint (`OPENAI_BASE_URL`)

## Frankfurter
- Description: Gives the exchange rate between two currencies on a date, for an expense in another currency.
- Kind: external system
- Technology: api.frankfurter.dev

## Vercel Cron
- Description: Calls the purge job every day at 03:00 on a Vercel deployment; elsewhere, the instance must call it on a schedule itself.
- Kind: external system
- Technology: Vercel, `vercel.json`
- calls daily, with the cron secret (HTTPS) → [[#Purge job]]

## Analytics
- Description: Counts the pages seen and a few events, when an operator sets a provider; none by default.
- Kind: external system
- Technology: Plausible or Umami

## Open questions
- Is the expense export meant to be readable by anyone with the group id, as every other route is? It checks no secret, as the rest of the app. ([[#Expense export]])
