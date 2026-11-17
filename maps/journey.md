---
type: journey-map
title: Vibe-coding an app, map after map
description: A designer turns an idea into an app with an AI, map after map
updated: 2026-11-14
persona: a product designer who vibe-codes
journey: target
views: Summary
---
<!-- journey-map: What a person does, thinks and feels, phase by phase, where it goes wrong and what could be better. Each ## is a phase (except Context and Open questions), in order; all phases share the same properties. Emotion goes from -3 to 3, with an optional word. `undefined` means the source did not say. -->

## Context
An illustration, not research: the journey maps.md aims at, for its first use ([[value#Designers and PMs who vibe-code]]), written from where maps.md stands next to similar tools and the way the maps of this folder were made. The steps of the install and of the first map are in [[getting-started]].

- The emotion is what the journey aims at, not what someone said.
- The maps of each phase are types of the catalog; each one feeds the next.

## Start from an idea
- Description: She has an idea of an app and a few notes: interviews, a competitor, a sketch.
- Actions:
  - Gathers her notes in the repository of the project
    - Description: Interviews, a competitor and a sketch, as files next to the code, where the AI can read them.
  - Installs maps.md with `npx github:florentbx/maps.md`
    - Description: One command copies the skill, the types and the page into the project, and tells her AI about the maps.
- Touchpoints:
  - Her notes
    - Description: The raw material of every map to come.
  - The terminal, or the Claude desktop app
    - Description: Where she talks to her AI and where it runs the commands.
- Thoughts:
  - "Last time, the AI built something else than what I had in mind."
    - Description: Her expectations stayed in her head and in a long chat, so the AI filled the gaps.
- Emotion: -1, wary
- Pain points:
  - Long conversations with the AI, where what was decided gets lost
    - Description: A choice made an hour ago is buried in the chat, and the AI no longer takes it into account.
- Opportunities:
  - The decisions written in maps, next to the code, from the first day
    - Description: Every map is a Markdown file in `maps/`, committed with the code, so what was decided is never lost in a chat.

## Frame the product
- Description: She asks her AI for a lean canvas and a value proposition canvas from her notes.
- Actions:
  - "Make a lean canvas of these notes."
    - Description: The AI writes `maps/lean-canvas.md` from the notes, then the value proposition canvas.
  - Reads the open questions the AI left
    - Description: At the end of the map, what the notes did not say, each with the AI's assumption.
  - Answers two of them
    - Description: She tells the AI, which keeps the question and adds her decision, dated.
- Touchpoints:
  - The lean canvas
    - Description: The problem, the segments, the solution and the metrics, on one page.
  - The value proposition canvas
    - Description: What her users try to do, what bothers them, and how the app answers each.
- Thoughts:
  - "It says what it does not know, instead of guessing."
    - Description: The gaps are written as `undefined` and open questions, not filled in silently.
- Emotion: 1, reassured
- Pain points:
  - Questions she cannot answer yet
    - Description: Some depend on users she has not met yet; they wait, visible, in the map.
- Opportunities:
  - The open questions stay in the map, until someone decides
    - Description: What the notes do not say is written as an open question in the map, not guessed, and stays there until she answers it.

## Map the journeys
- Description: From the canvas and the interviews, the AI writes the journey map of a user, then the user flows.
- Actions:
  - "From this canvas and the interviews, make the journey map."
    - Description: The AI writes the journey of a user, phase by phase, citing the canvas.
  - "From the journey, make the user flow of the booking."
    - Description: The steps and decisions of one task, linked to the phases of the journey.
  - Fixes a step by hand in the Markdown
    - Description: With **Edit**, in the page: the file is saved as she types, and the map is drawn again.
- Touchpoints:
  - The journey map
    - Description: What the user does, thinks and feels, phase by phase.
  - The user flow
    - Description: The path through the product, step by step, with its decisions.
  - The page of the maps
    - Description: Where she sees each map drawn, clicks an element for its details, and edits it.
- Thoughts:
  - "Each map starts from the one before; I do not explain it all again."
    - Description: The AI reads the maps before; she only says what to make next.
- Emotion: 2, in flow
- Pain points:
  - A step of the flow the AI made up
    - Description: A step none of the maps before gave, so it is not grounded in what she knows.
- Opportunities:
  - Each map links to the one it comes from
    - Description: A link such as `[[value#Designers and PMs who vibe-code]]` cites the map it comes from, so the AI reads it again instead of her retelling it.
  - An optional step drawn dashed, a decision as a diamond
    - Description: The drawing follows the conventions of each type, so the flow reads at a glance, by her and by her team.

## Specify what to build
- Description: The sitemap, the screens, the data and the states, each from the maps before.
- Actions:
  - "Make the sitemap and the screens from the user flow."
    - Description: The pages of the app and what each screen shows, from the steps of the flow.
  - "Make the data model and the states of a booking."
    - Description: The ERD of the data and the state machine of a booking, from the screens.
  - Runs the check, which finds a broken link
    - Description: `check.mjs` reads every map against its type, and says the file, the line and the closest name.
- Touchpoints:
  - The sitemap
    - Description: The pages of the app and how they nest.
  - The screens
    - Description: Each screen, with what it shows and where it leads.
  - The ERD and the state machine
    - Description: The data of the app, and the states a booking goes through.
  - The check
    - Description: The command that checks every map against its type; a CI can run it.
- Thoughts:
  - "This is the spec, and I can see it."
    - Description: The spec is no longer prose to read: it is drawn, and each part links to where it comes from.
- Emotion: 2, in control
- Pain points:
  - A renamed screen breaks the links to it
    - Description: Other maps cite the screen by its name; renamed by hand, those links point to nothing.
- Opportunities:
  - `rename.mjs` rewrites every link to it
    - Description: Renaming an element with `rename.mjs` rewrites every link to it, in every map, and the check confirms none is broken.

## Build with the AI
- Description: The AI codes the app from the maps, read as context.
- Actions:
  - "Build the booking screens from the maps."
    - Description: The AI that codes reads the screens, the flow and the data model as its spec.
  - Compares the app with the maps
    - Description: The screens, the paths and the data should be those of the maps.
- Touchpoints:
  - The AI that codes
    - Description: The same AI, or another one, in the same repository.
  - The maps, as context
    - Description: Markdown files with a structure the AI reads reliably.
- Thoughts:
  - "It built what the maps say."
    - Description: What was not known was asked, not invented.
- Emotion: 3, proud
- Pain points:
  - A change in the code that contradicts a map
    - Description: A screen changed in the code, but not in its map, which is no longer true.
- Opportunities:
  - The AI says when a change contradicts a map, and offers to update it
    - Description: The line `init` adds to the notes of the AI asks it to say when a change contradicts a map, and to offer to update the map, not to do it on its own.

## Share and keep up to date
- Description: She shares the maps with her team, and they stay true as the product changes.
- Actions:
  - Shares the link of the maps
    - Description: The AI publishes the maps as a private artifact; she shares its link from its Share menu.
  - Asks the AI to update the journey after a new round of interviews
    - Description: The AI changes the map from the new notes, and the open questions show what is still unsure.
- Touchpoints:
  - The link of the artifact
    - Description: The maps on claude.ai, for her team: who may write edits, the others read.
  - A pull request
    - Description: The maps change with the code, and the team reviews them together.
- Thoughts:
  - "The maps are still right a month later."
    - Description: They changed with the product, in the same commits.
- Emotion: 2, confident
- Pain points: undefined
- Opportunities:
  - Several views of the same map, for each reader
    - Description: The same file shown as a journey, as cards or as a table, so that each reader sees what matters to them.
