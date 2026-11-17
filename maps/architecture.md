---
type: system-architecture
title: How maps.md fits together
updated: 2026-11-16
description: The parts of maps.md in a project and around it, and what goes between them
---
<!-- system-architecture: The parts of a system, who uses them and how they talk to each other. Each ## is a component (except Context and Open questions); "- label → [[#Component]]" is an arrow to another component, with an optional label; "→ undefined" means the other component is unknown. Kind is one of person, application, service, database, external system (default: service). `undefined` means the source did not say. -->

## Context
The parts of maps.md once installed in a project, from the code on 2026-11-12. The sources are TypeScript in `renderer/`; what people run is JavaScript built by esbuild and committed, with no dependency to install. The ways to open the maps are in [[getting-started]].

## Person
- Description: Asks their AI for maps, checks them and corrects them in the page.
- Kind: person
- asks for a map → [[#AI agent]]
- reads and edits the maps → [[#Page]]

## AI agent
- Description: Claude Code, or any AI that reads the notes of the project.
- Kind: external system
- installs, updates → [[#init]]
- reads where the maps are → [[#Agent notes]]
- follows → [[#Skill]]
- writes the maps, copies their types from the catalog → [[#Maps]]
- runs after writing → [[#check.mjs]]
- runs to rename → [[#rename.mjs]]
- publishes, in a cloud session → [[#Private artifact]]

## init
- Description: Sets up maps.md in a project, or updates it; asks before it adds its line to the notes.
- Kind: service
- Technology: Node.js, npx
- copies → [[#Skill]]
- copies the types the maps use → [[#Maps]]
- adds its line → [[#Agent notes]]

## Agent notes
- Description: `CLAUDE.md` and `AGENTS.md`, with one line about maps.
- Kind: database
- Technology: Markdown

## Skill
- Description: How to write a map, a type, a style, with the catalog of types to start from, in `.claude/skills/maps/`.
- Kind: database
- Technology: Markdown, CSS

## Maps
- Description: The maps of the project, in `maps/`, with its own types and theme; versioned with the code.
- Kind: database
- Technology: Markdown, CSS

## check.mjs
- Description: Checks every map against its type and writes its header comment; runs in CI as it is.
- Kind: service
- Technology: Node.js
- checks, with their types → [[#Maps]]

## rename.mjs
- Description: Renames an element and rewrites every link to it.
- Kind: service
- Technology: Node.js
- rewrites the links → [[#Maps]]

## serve.mjs
- Description: Serves the page and the maps on the computer, saves the edits, tells the page when a file changes; with `--out`, writes one file.
- Kind: service
- Technology: Node.js
- reads, watches, saves → [[#Maps]]

## Page
- Description: `maps.html`, one file that works offline: draws each map by its type, shows its details, edits its Markdown.
- Kind: application
- Technology: TypeScript, ELK, CodeMirror
- loads and saves (HTTP) → [[#serve.mjs]]

## Claude desktop app
- Description: Runs `serve.mjs` as the preview `maps`, which `init` adds to `.claude/launch.json`, and shows the page in its pane.
- Kind: external system
- runs → [[#serve.mjs]]

## Private artifact
- Description: A page on claude.ai that only its owner opens: the maps in one file. An edit is kept in its database; the AI writes it into the files when asked, or when it publishes again.
- Kind: external system
