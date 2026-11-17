---
type: type-definition
shape: cards
element: system
---
<!-- Type definition: the name of the file is the name of the type. Context says what the type is for, then its own guidance. Each ## is a known property, in order; its items give its kind, the attributes of the kind and its meaning. -->

## Context
Each external system the product depends on: what it reads and writes there, how it signs in, its limits, how to test against it, who owns it, and what the product does when it is down.

- Each system is named as its maker names it (`Stripe`, `Google Calendar`); one not chosen yet, by what it is (`SMS provider`), and its choice is an open question.
- Write every known property, with `undefined` when the context does not say.
- Reads and Writes: one value per piece of data or call, in the words of the product (`Payments of a deposit`), with the name of the API when the context gives it.
- Sign-in says how the product signs in (an API key, OAuth, a service account) and where the secret is kept, never the secret itself.

## Description
- Kind: text
- Single: yes
- Meaning: What the system is for, for this product, in one sentence.

## Reads
- Kind: text
- Meaning: What the product reads or receives from it.

## Writes
- Kind: text
- Meaning: What the product writes or sends to it.

## Sign-in
- Kind: text
- Meaning: How the product signs in, and where the secret is kept.

## Limits
- Kind: text
- Meaning: Its limits: rates, quotas, sizes, costs.

## Test environment
- Kind: text
- Meaning: Where and how to try it without touching real data.

## Owner
- Kind: text
- Meaning: Who owns it, or who to ask: a team, a person, a provider.

## When down
- Kind: text
- Meaning: What the product does when it cannot reach it.
