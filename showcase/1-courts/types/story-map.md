---
type: type-definition
shape: tree
element: activity
---
<!-- Type definition: the name of the file is the name of the type. Context says what the type is for, then its own guidance. Each ## is a known property, in order; its items give its kind, the attributes of the kind and its meaning. -->

## Context
What a person does with the product, as activities, their steps and the stories that serve each step, with the release each story goes in.

- The first level is the backbone: the activities, in the order the person does them (Find a practice, Book, Go to the appointment…).
- Under an activity, its steps in order; under a step, its stories, the most needed first.
- A story is named by what the person can do (See the free slots of the week).
- Write Release on stories only.
- A name cannot contain `: `: it would be read as a property.

## Release
- Kind: text
- Single: yes
- Meaning: The release the story goes in, as the team names it (MVP, Release 2…).

## Description
- Kind: text
- Meaning: What the activity, the step or the story is, when its name is not enough.
