---
type: type-definition
shape: cards
element: observation
---
<!-- Type definition: the name of the file is the name of the type. Context says what the type is for, then its own guidance. Each ## is a known property, in order; its items give its kind, the attributes of the kind and its meaning. -->

## Context
One study of user research, qualitative or quantitative (a round of interviews, a usability test, a survey, an analysis of usage…), as its observations: what was observed, with its evidence, so that maps of insights can cite each observation.

- The front matter gives what describes the study as its source does (its researcher, its date, its method…); `Context` gives its goal, its questions and its scope.
- Each observation is named by what was observed, in one sentence (`Cannot see when a practitioner is available`); Description says it in full, in two or three sentences: what the participants did or said, in which situation, and how it showed.
- Only what was observed: no kind, persona nor severity; interpreting is the work of the insights.
- A study is not changed once it is over.
- Group the observations by theme when the study has several subjects; keep each observation named by what was observed, not by its theme.

## Description
- Kind: text
- Single: yes
- Meaning: What was observed, in full: what the participants did or said, in which situation, and how it showed; no interpretation.

## Theme
- Kind: text
- Single: yes
- Meaning: The group the observation belongs to, in the words of the study (`Search`, `After booking`): the observations of a theme are drawn together. Free: a study chooses its themes, and changes them as the synthesis goes.

## Participants
- Kind: text
- Meaning: The participants concerned (`P2`, `P5`), one per item, when the study has participants: how often the observation was seen. The same name for a participant across the study, so that each one is a column of the view Participants. Left out otherwise (a survey, an analysis of usage).

## Evidence
- Kind: text
- Meaning: What shows the observation, one per item: a quote between quotation marks, a fact observed, or a figure (`62% of 1,200 respondents`).
- Details:
  - Participant:
    - Kind: text
    - Single: yes
    - Meaning: Who said or did it (`P2`), when the study has participants.
