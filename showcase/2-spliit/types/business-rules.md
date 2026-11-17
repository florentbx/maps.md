---
type: type-definition
shape: cards
element: rule
---
<!-- Type definition: the name of the file is the name of the type. Context says what the type is for, then its own guidance. Each ## is a known property, in order; its items give its kind, the attributes of the kind and its meaning. -->

## Context
The rules of the domain that the product must apply, each stated once and shown with examples, so that the AI that builds it gets the edge cases right.

- Each rule is named by what it is about, in a few words (`Late cancellation`).
- Statement is the rule, in one or two sentences, in the words of the glossary.
- Examples show the rule at work, one per value: the situation, then the result after `→` (`Cancelled 3 days before → the deposit refunded`, `Cancelled 5 hours before → the deposit kept`); the usual case first, then the edge cases.
- Write the examples the context gives; an example you work out yourself from the rule is a proposal.
- Applies to links to where the rule is used: a screen, a step of a user flow, a notification.
- Area groups the rules by what they are about (`Cancellation`, `Price`), when the source groups them or the map holds many rules; the same words for the rules of one area.
- Code says where the code applies the rule and where its tests pin it, for a map written from a codebase: the rule is what the code does there, not what it should do.

## Area
- Kind: text
- Single: yes
- Meaning: What part of the domain the rule belongs to, in a word or two; the rules are drawn by area.

## Statement
- Kind: text
- Single: yes
- Meaning: The rule, in one or two sentences.

## Examples
- Kind: text
- Meaning: The rule at work: a situation, then its result after →, one per value.

## Why
- Kind: text
- Meaning: Why the rule exists: a law, a contract, a decision.

## Applies to
- Kind: link
- Meaning: Where the rule is used: a screen, a step of a user flow, a notification.

## Code
- Kind: text
- Meaning: Where the code applies the rule and where its tests pin it: a file, with the function in brackets (`src/lib/shares.ts` (`getExpenseShares`)), one per item.
