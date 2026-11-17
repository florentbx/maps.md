---
type: type-definition
shape: cards
element: object
---
<!-- Type definition: the name of the file is the name of the type. Context says what the type is for, then its own guidance. Each ## is a known property, in order; its items give its kind, the attributes of the kind and its meaning. The properties follow ORCA (objects, relationships, calls to action, attributes). -->

## Context
The objects of a product as the people see and use them (object-oriented UX, the ORCA method): what each one is, what it shows, which other objects it shows, and what each person can do with it.

- Each object is named by a singular noun, as the people say it (Practice, Appointment…), not by a screen.
- A relationship says what links the two objects with a verb, read from the object it is written on (a practice `employs` its practitioners). It is written on both objects when the people see it from both sides, each with its own verb (a practitioner `works in` a practice).
- An object is not a table of the database: data the people never see is left out.
- Under a call to action, `- By: <role>` says who can do it (`By: patient, secretary`).

## Description
- Kind: text
- Meaning: What the object is for the people, in one sentence.

## Also called
- Kind: text
- Meaning: The other words the people use for it, one per item.

## Core content
- Kind: text
- Meaning: What the object is made of, shown on its page: name, photo, text… One per item, the most important first.

## Metadata
- Kind: text
- Meaning: What the objects of this kind can be sorted or filtered by: date, status, category… One per item.

## Relationships
- Kind: link
- Meaning: The other objects shown with this one (nested objects), one per item: a verb, the number when the context gives it, then the object (`books 0..n [[#Appointment]]`).

## Calls to action
- Kind: text
- Meaning: What the people can do with the object, one per item, as a verb (Book, Cancel, Share…), with who can do it under it.
