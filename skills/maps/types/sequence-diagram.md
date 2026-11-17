---
type: type-definition
shape: sequence
element: message
---
<!-- Type definition: the name of the file is the name of the type. Context says what the type is for, then its own guidance. Each ## is a known property, in order; its items give its kind, the attributes of the kind and its meaning. The Kind of a message: a reply is drawn dashed. -->

## Context
Who sends what to whom, in order, to carry out one exchange between people and systems (a sequence diagram).

- Each message is named by what it asks or sends (Ask for the free slots, Return the slots…), in the order it is sent.
- From and To name a participant (a person, an application, a service) the same way on every message; a message a participant sends to itself has the same From and To.
- A reply is a message of its own, from the participant that answers, of the Kind reply.
- What happens only under a condition (an `alt` or a `loop`) is said in the Description of its message.

## From
- Kind: text
- Single: yes
- Meaning: The participant that sends the message.

## To
- Kind: text
- Single: yes
- Meaning: The participant that receives it.

## Description
- Kind: text
- Meaning: What the message carries, or when it is sent, when its name is not enough.

## Kind
- Kind: enum
- Values:
  - call
  - reply
- Default: call
- Single: yes
- Meaning: A call asks or sends something; a reply answers an earlier call, from the participant that received it.
