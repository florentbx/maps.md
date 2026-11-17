<!-- Layout of a decision log, for the drawing only: a feed of the decisions in the order they were taken, each with its problem and why, as a changelog; then a record per decision, with its options and its consequences, as in a doc. -->

- Name: Log
- Elements: rows
- Shows:
  - Date
  - Status
  - Problem
  - Rationale
  - Deciders
  - Superseded by
- Description: The decisions in the order they were taken, the last one at the bottom: the problem, then why.

## Records
- Draw: sequence
- Elements: rows
- Shows:
  - Date
  - Status
  - Deciders
  - Problem
  - Options
  - Rationale
  - Consequences
  - Superseded by
- Description: A record per decision: the problem, the options considered, why one was chosen, and what it changes.
