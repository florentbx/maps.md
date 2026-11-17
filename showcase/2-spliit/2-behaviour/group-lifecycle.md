---
type: state-machine
title: The life of a group
description: A group of Spliit from its creation to its deletion for good, through the 30 days in which it can be restored
updated: 2026-11-16
---
<!-- state-machine: The states a thing goes through in its life, and the events that move it from one state to the next. Each ## is a state (except Context and Open questions); "- label → [[#State]]" is an arrow to another state, with an optional label; "→ undefined" means the other state is unknown. `undefined` means the source did not say. -->

## Context
Read from the code of Spliit (https://github.com/spliit-app/spliit, MIT license), commit `f293974` (2026-11-12): `src/lib/api.ts` (`scheduleGroupDeletion`, `restoreGroup`), `src/lib/group-deletion.ts`, `src/app/groups/[groupId]/delete-group-notice.tsx`, migration `20261010120000_add_group_deletion`. The state is held by `Group.deleteAt` alone, compared with the time. The rules: [[rules#Deletion grace period]], [[rules#Purge after the grace period]].

## Active
- Description: `deleteAt` is empty; anyone with the link can read and change the group.
- someone deletes it → [[#Scheduled for deletion]]

## Scheduled for deletion
- Description: `deleteAt` is 30 days ahead. Asked from Settings, by typing the name of the group, on an instance with `ENABLE_GROUP_DELETION`. The group still works; a notice gives the date and offers Restore. Logged as `SCHEDULE_GROUP_DELETION`.
- someone restores it → [[#Active]]
- the date passes → [[#Due for purge]]

## Due for purge
- Description: `deleteAt` has passed but the purge job has not run yet, or failed on it: the group still shows, the notice no longer offers Restore, and a restore is refused.
- the purge job runs → [[#Purged]]

## Purged
- Description: The group, its participants, expenses, shares and activities are deleted from the database, and its documents from the bucket. Its link leads nowhere; the browsers that knew it forget it from My groups.

## Open questions
- If the purge job is never called (an instance off Vercel that sets `CRON_SECRET` but no schedule), a group stays due for purge for ever, shown but not restorable. Should the app still offer Restore then, or warn the operator? ([[#Due for purge]])
