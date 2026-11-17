---
type: type-definition
shape: graph
element: component
---
<!-- Type definition: the name of the file is the name of the type. Context says what the type is for, then its own guidance. Each ## is a known property, in order; its items give its kind, the attributes of the kind and its meaning. -->

## Context
The parts of a system, who uses them and how they talk to each other.

- Each component is named as the team calls it (Booking API, Patient app…); the people who use the system and the systems of other companies are components too, of their own kind.
- An arrow says that a component calls another or sends it data, written on the component that starts the exchange. Its label says what goes through it, then the protocol in brackets when the context gives it (`sends the reminders (HTTPS) → [[#SMS provider]]`). A component with no arrow is neither a start nor an end.
- Code says where a component lives in the repository, for a map written from a codebase; a person or an external system has none.

## Description
- Kind: text
- Meaning: What the component does, in one sentence.

## Kind
- Kind: enum
- Values:
  - person
  - application
  - service
  - database
  - external system
- Default: service
- Single: yes
- Meaning: A person uses the system; an application is what they use (a website, a mobile app); a service runs on a server; a database stores data; an external system belongs to another company.

## Technology
- Kind: text
- Single: yes
- Meaning: What it is built with or bought from (Node.js, PostgreSQL, Twilio…).

## Code
- Kind: text
- Meaning: Where the component lives in the repository: a folder or a file, one per item.
