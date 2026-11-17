---
type: user-flow
title: Getting started with maps.md
updated: 2026-11-16
description: A person installs maps.md, gets a first map from their AI, checks it where they work, then builds from it
---
<!-- user-flow: The path a person takes in the product to reach a goal: the steps, the decisions, and where it ends. Each ## is a step (except Context and Open questions); "- label → [[#Step]]" is an arrow to another step, with an optional label; "→ undefined" means the other step is unknown. Kind is one of screen, decision, action (default: action). `undefined` means the source did not say. -->

## Context
How a person starts with maps.md, from the install to a map they have checked, as `README.md` says it ("Get started"). Every way to open the maps was tested on 2026-11-12, the preview of the desktop app and Chrome included. What decides how the maps open is where the project folder is: on the computer, the page edits them live; in a container, a cloud session, it is a copy, published again after a change, whose edits the AI writes into the files.

## Ask your AI to install maps.md
- Description: "Install maps.md in this project: `npx github:florentbx/maps.md`" (or the person runs it): the skill, the page, the preview, and a line about maps in `CLAUDE.md` and `AGENTS.md`.
- → [[#Ask your AI for a map]]

## Ask your AI for a map
- Description: "Make a journey map of these interview notes."
- → [[#Does a type fit?]]

## Does a type fit?
- Kind: decision
- Description: Every map has a type: what the map holds (its elements, their properties, the values allowed) and how the page draws it. The AI looks at the types of the project, in `maps/types/`, then at the catalog of 28 types that comes with the skill, and copies the one it takes into `maps/types/`.
- yes → [[#The AI writes the map]]
- none → [[#The AI creates a type]]

## The AI creates a type
- Description: In `maps/types/`: its definition, its layout and, if wanted, its style in free CSS. It looks at a picture of a map of the type before it shows it.
- → [[#The AI writes the map]]

## The AI writes the map
- Description: It follows the skill, writes the map in `maps/`, then runs the check.
- → [[#Where is your project folder?]]

## Where is your project folder?
- Kind: decision
- on your computer → [[#Where do you work?]]
- in a container, a cloud session → [[#A private artifact]]

## Where do you work?
- Kind: decision
- the Claude desktop app, a local session → [[#Preview "maps"]]
- a terminal or VS Code → [[#The page of serve.mjs]]
- a browser only → [[#maps.html and a folder]]

## Preview "maps"
- Description: The pane of the desktop app shows the maps, live; nothing to run.
- Kind: screen
- → [[#Check and correct the map]]

## The page of serve.mjs
- Description: `node .claude/skills/maps/serve.mjs maps/`, then the address it prints: the maps, live.
- Kind: screen
- → [[#Check and correct the map]]

## maps.html and a folder
- Description: `maps/maps.html` opened in the browser, then Open a folder: it writes the files in Chrome and Edge, reads them only in the others.
- Kind: screen
- → [[#Check and correct the map]]

## A private artifact
- Description: The AI publishes the maps as one page on claude.ai that only the person can open; not live. An edit is kept in it, and the AI writes it into the file when asked, or when it publishes again.
- Kind: screen
- → [[#Check and correct the map]]

## Check and correct the map
- Description: A detail, by hand in the Markdown (**Edit**, in the bar; with `maps.html` in a browser, Chrome and Edge only; not while the AI writes the same map); more, by asking the AI ("Add a step for the payment").
- → [[#Commit the map with the code]]
- the type does not suit → [[#Change the type]]

## Change the type
- Description: "Add a severity to the pain points", "Draw the phases as columns": the AI changes the type in `maps/types/`, structure or look.
- → [[#The AI writes the map]]

## Commit the map with the code
- Description: The map is versioned in the repository: the team reads it, reviews it in a pull request, and it stays when the conversation is gone.
- → [[#What next?]]
- optional → [[#Share the link of the maps]]

## Share the link of the maps
- Description: The AI publishes the maps as a private artifact; its link, from its Share menu, for someone who does not have maps.md. One map, as a PNG.
- → [[#What next?]]

## What next?
- Kind: decision
- build → [[#The AI builds the app, with the maps as specs]]
- another map → [[#Ask for the next map, from this one]]

## Ask for the next map, from this one
- Description: "From this journey map, make the user flow." The new map links to the one it comes from.
- → [[#The AI writes the map]]

## The AI builds the app, with the maps as specs
- Description: "Build the booking screens from the user flow." No guesswork: the screens, the paths and the data are those of the maps, and what was not known was asked, not invented.
- → [[#The maps stay true as the app grows]]

## The maps stay true as the app grows
- Description: When a change contradicts a map, the AI says so and offers to update it; the next feature starts from maps that are still right, not from a forgotten conversation.
