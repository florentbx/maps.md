---
type: type-definition
shape: cards
element: screen
---
<!-- Type definition: the name of the file is the name of the type. Context says what the type is for, then its own guidance. Each ## is a known property, in order; its items give its kind, the attributes of the kind and its meaning. -->

## Context
What each screen of a product is for, what it shows, what the person can do there, and how it changes with the situation: the specification of the screens, before any layout.

- Each screen is named as the person sees it (its title or its navigation label).
- Area groups the screens by the part of the product they belong to, as its navigation does (`Shifts`, `My account`, `Administration`), when the product has several; the same words for the screens of one area. In an area, the screens are in the order of its navigation.
- The paths through the screens are a user flow, whose steps of the kind screen are named after the screens (a link to the screen in their Description, when it helps); From only says where the person comes from.
- When the project has a sitemap, each screen is a page of it, with the same name, and Page links to it.
- Shows groups the information of the screen, from top to bottom: each group named by what it is about (`When and where`), the information under it. No field, button or layout: what the screen shows, not how.
- Main action is the one thing the screen pushes to do; Other actions are the rest. Each action is the label of the button or link, then where it leads, with a link to a screen or a step of a user flow when there is one: `Book → [[user-flow#Slot picker]]`.
- Each state is a situation the screen can be in (empty, full, too late, error, offline, saved…), named in a few words; under it, what it Shows, what the person Can do then, and the Message, in its exact words.
- A message is written in its exact words; a message of several lines has a nested item per line, and a line with `: ` in it is rephrased, or written alone after `- Message:`, as a nested `Label: value` is read as a detail.
- The messages of a screen are written under the state in which they show: a confirmation after an action is a state too (`Saved`). States and messages the same on every screen (loading, offline…) are written once, in Context.
- What the product sends outside its screens (an email, a push) is a notification, not a state.

## Area
- Kind: text
- Single: yes
- Meaning: The part of the product this screen belongs to, in a word or two; the screens are drawn by area.

## Page
- Kind: link
- Single: yes
- Meaning: The page of the sitemap this screen is.

## For
- Kind: text
- Meaning: Who uses this screen, when not everyone does.

## From
- Kind: link
- Meaning: The screens the person comes from.

## Purpose
- Kind: text
- Single: yes
- Meaning: What the person comes to this screen for, in one sentence.

## Shows
- Kind: text
- Meaning: The information of the screen, by group, from top to bottom: the name of each group, the information under it.

## Main action
- Kind: text
- Single: yes
- Meaning: The one thing the screen pushes the person to do: the label, then where it leads.

## Other actions
- Kind: text
- Meaning: What else the person can do, one per value: the label, then where it leads.

## States
- Kind: text
- Meaning: The situations the screen can be in, other than the usual one (empty, full, error, offline, saved…), one per value.
- Details:
  - Shows:
    - Kind: text
    - Meaning: What the screen shows then, in place of its usual content or on top of it.
  - Can do:
    - Kind: text
    - Meaning: What the person can do then: the label of each button or link, and where it goes.
  - Message:
    - Kind: text
    - Meaning: The exact words shown to the person, in the language of the product, the title first.

## Rules
- Kind: text
- Meaning: What the screen shows or hides with the role or the situation.
