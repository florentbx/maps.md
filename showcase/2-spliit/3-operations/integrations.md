---
type: integrations
title: The external systems
description: What Spliit reads and writes in Amazon S3, OpenAI, Frankfurter, Vercel Cron, Plausible and Umami, how it signs in, the environment variables that switch each one on, and what it does when one is down
updated: 2026-11-16
---
<!-- integrations: Each external system the product depends on: what it reads and writes there, how it signs in, its limits, how to test against it, who owns it, and what the product does when it is down. Each ## is a system (except Context and Open questions); their order carries no meaning. `undefined` means the source did not say. -->

## Context
Read from the code of Spliit (https://github.com/spliit-app/spliit, MIT license), commit `f293974` (2026-11-12): `src/lib/env.ts`, `src/lib/featureFlags.ts`, `.env.example`, `vercel.json`, and the files named in each system. Only PostgreSQL is required; every system below is optional, and off by default.

- A feature is on when its variable is `true`, `yes`, `1` or `on`, read at runtime (`ENABLE_*`) or at build time (`NEXT_PUBLIC_ENABLE_*`); the app refuses to start when a feature is on without what it needs (`src/lib/env.ts`).
- The secrets are environment variables of the instance; none is sent to the browser.
- Owner: none of the code names who owns an account; each instance (spliit.app or a self-hosted one) brings its own.

## Amazon S3
- Description: Stores the photos attached to expenses and the receipts to scan; any S3-compatible provider works.
- Reads:
  - The photos, by their URL, in the browser
- Writes:
  - A photo, uploaded by the browser to a presigned URL, under the key `document-<time>-<random id>.<extension>` (`src/app/api/s3-upload/route.ts`)
  - The deletion of the files of a purged group, one `DeleteObject` per file, ten at a time (`src/lib/group-deletion.ts`)
- Sign-in:
  - An access key, `S3_UPLOAD_KEY` and `S3_UPLOAD_SECRET`, with `S3_UPLOAD_BUCKET`, `S3_UPLOAD_REGION`, and `S3_UPLOAD_ENDPOINT` for a provider other than AWS
  - Switched on by `ENABLE_EXPENSE_DOCUMENTS`
- Limits:
  - 5 MB per file, checked in the browser (`src/components/expense-documents-input.tsx`)
- Test environment:
  - undefined
- Owner:
  - The operator of the instance
- When down:
  - The upload fails, a toast says "Error while uploading document", with Retry
  - A file that cannot be deleted fails the purge of its group, retried the next day

## OpenAI
- Description: Reads a receipt photo, and guesses the category of an expense from its title.
- Reads:
  - The amount, date, title and category of a receipt, as JSON checked against a schema (`create-from-receipt-button-actions.ts`)
  - The category of a title (`src/components/expense-form-actions.tsx`)
- Writes:
  - The URL of the receipt in the bucket, refused if it is not one the app uploaded
  - The title of the expense and the list of categories
- Sign-in:
  - An API key, `OPENAI_API_KEY`; `OPENAI_BASE_URL` for a compatible endpoint
  - Switched on by `ENABLE_RECEIPT_EXTRACT` and `ENABLE_CATEGORY_EXTRACT`, checked on the server too
- Limits:
  - The models `OPENAI_MODEL_RECEIPT_EXTRACT` and `OPENAI_MODEL_CATEGORY_EXTRACT`, `gpt-5-nano` by default
- Test environment:
  - Mocked in the unit tests (`src/lib/openai.test.ts`, `src/components/expense-form-actions.test.ts`)
- Owner:
  - The operator of the instance
- When down:
  - An answer that does not fit the schema → nothing extracted, the form left for the person to fill in
  - The receipt call fails → the toast of a failed upload, "Error while uploading document", with Retry ([[failures#Receipt scan fails]])
  - The category call fails → nothing caught: the category keeps its spinner ([[failures#Category guess fails]])

## Frankfurter
- Description: Gives the exchange rate between two currencies on a date, for an expense in another currency, or a repayment in another currency.
- Reads:
  - The rate of a date: `GET https://api.frankfurter.dev/v2/rates?date=&base=&quotes=`, from the browser (`src/lib/hooks.ts`, `useCurrencyRate`)
- Writes:
  - none
- Sign-in:
  - none
  - Used only when the group has a currency code
- Limits:
  - No rate for a currency on a day → "Oops, Frankfurter does not have the rate for this currency at this day."
  - A future date → the rate of the last day it has, with "Rates from date"
- Test environment:
  - Mocked in the end-to-end tests, a fixed rate for every request (`e2e/fixtures.ts`)
- Owner:
  - Frankfurter, a free public API
- When down:
  - "Oops, we could not get the most recent rates.", no retry on its own; the person refreshes, or types a custom rate

## Vercel Cron
- Description: Calls the purge job once a day, so that the groups past their grace period are deleted.
- Reads:
  - The ids of the groups purged and of those that failed
- Writes:
  - `GET /api/cron/purge-deleted-groups`, every day at 03:00 (`vercel.json`)
- Sign-in:
  - `Authorization: Bearer <CRON_SECRET>`, compared in constant time (`src/lib/cron.ts`); without `CRON_SECRET` the route answers 404
  - Required by `ENABLE_GROUP_DELETION`
- Limits:
  - undefined
- Test environment:
  - The check of the secret is unit tested (`src/lib/cron.test.ts`); the purge itself has no test
- Owner:
  - The operator of the instance; off Vercel, any scheduler that calls the route with the secret
- When down:
  - Nothing is purged: the groups past their date stay, and can no longer be restored ([[group-lifecycle#Due for purge]])

## Plausible
- Description: Counts the page views and a few events, with anonymised paths, on an instance that chooses it.
- Reads:
  - none
- Writes:
  - Page views and events (`src/lib/analytics/`)
- Sign-in:
  - none; `ANALYTICS_PROVIDER` includes `plausible`, with `PLAUSIBLE_DOMAIN`
- Limits:
  - undefined
- Test environment:
  - The `console` provider logs the events instead
- Owner:
  - The operator of the instance
- When down:
  - undefined

## Umami
- Description: Counts the page views and a few events, as Plausible does, on an instance that chooses it.
- Reads:
  - none
- Writes:
  - Page views and events (`src/lib/analytics/providers/umami.tsx`)
- Sign-in:
  - none; `ANALYTICS_PROVIDER` includes `umami`, with `UMAMI_WEBSITE_ID`
- Limits:
  - undefined
- Test environment:
  - The `console` provider logs the events instead
- Owner:
  - The operator of the instance
- When down:
  - undefined
