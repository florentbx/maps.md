---
type: value-proposition-canvas
title: The value of maps.md
updated: 2026-11-16
description: What maps.md brings to each of its three uses, against working with an AI through long conversations
---
<!-- value-proposition-canvas: How a product fits a customer segment: what the customers try to do, what bothers them and what they hope for, and how the product answers each. Each ## is a value proposition (except Context and Open questions); their order carries no meaning. `undefined` means the source did not say. -->

## Context
The three uses of `README.md` ("What it is for"), and what maps.md adds next to Mermaid and to asking an AI alone. maps.md is worth more than an AI alone when several maps are connected and kept over time in a repository. What makes it so: a type is a meaning, not a way of drawing; what an element is and what each property means, checked by tools and read by an AI, the drawing following from it. Mermaid draws what you already know; maps.md holds what a team and its AIs know, and what they do not know yet, and draws it.

## Designers and PMs who vibe-code
- Customer jobs:
  - Turn an idea into an MVP with an AI
  - Tell the AI precisely what to build: the screens, the flows, the data
- Pains:
  - Long conversations, where what was decided gets lost
  - The AI builds something else than expected, and fills the gaps with guesses
  - Specs in prose that nobody reads twice
- Gains:
  - The AI builds from specs they can see and correct
  - What was decided stays, next to the code
- Products and services:
  - Typed maps: lean canvas, story map, user flow, sitemap, screens, object map, state machine, system architecture
  - A skill that tells the AI how to write and read them
  - The page, to see a map drawn and correct it by hand
  - The check, which a CI can run
- Pain relievers:
  - A map holds the decision, not the conversation
  - The AI says what it does not know (`undefined`, open questions) instead of guessing
  - The check finds what is wrong in a map: a value out of its kind, an arrow or a link to nothing
- Gain creators:
  - One map feeds the next, from the idea to the screens
  - The maps are read back as context by the AI that codes
  - A detail corrected by hand in the page, without a new conversation

## People who make sense of a large context
- Customer jobs:
  - Understand an existing codebase or a pile of documents: its architecture, its data, its rules
- Pains:
  - Too much to read, and an AI that answers from it without showing what it read
- Gains:
  - A picture of the whole that the AI keeps up to date and reads back as context
- Products and services:
  - Types for it: system architecture, data model, business rules, glossary, decision log
  - The example `showcase/2-spliit/`, an open-source app mapped from its code
- Pain relievers:
  - Each fact written once, with its source; what the source does not say is `undefined`
- Gain creators:
  - The maps link to each other, down to an element: a person and an AI follow the same path

## Teams that keep UX as context
- Customer jobs:
  - Make research, personas and journeys that the people and the AIs who build read
  - Cite a finding where it matters
- Pains:
  - Deliverables in drawing tools, out of date as soon as the product changes
  - The same fact copied in several documents, and contradicting itself
  - Findings lost in decks and folders
- Gains:
  - One source of truth for the insights, kept up to date with little effort
  - Knowing what is not known yet, and what waits for a decision
- Products and services:
  - UX types in the catalog (study, insights, persona, journey map…), each with its own drawing and style
  - Links between maps, to an element or an item
  - Open questions and their decisions
  - A theme for the look of the brand; the private artifact to share the maps, a PNG for one map
- Pain relievers:
  - The AI writes and updates the maps from the notes
  - A journey links to an insight instead of copying it
  - `rename.mjs` and the check keep the links from breaking
- Gain creators:
  - The panel of an element shows the maps that cite it and the sources of its facts
  - Several views of the same map (a board, a matrix, cards) without changing the file
