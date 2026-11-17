---
type: sitemap
title: The pages
description: The pages of Spliit and their routes, from the home page and My groups to the six tabs of a group and the expense form
updated: 2026-11-16
---
<!-- sitemap: The pages of a product and how they are organized, in the order of navigation. Each ## is a page of the first level (except Context and Open questions), in order; under a page, an item "- Label: value" is a property, and any other item is a page under it, in order. `undefined` means the source did not say. -->

## Context
Read from the routes of Spliit (https://github.com/spliit-app/spliit, MIT license), commit `f293974` (2026-11-12): the folders of `src/app/` (Next.js App Router), each page with its route; the names are those of the screens (`messages/en-US.json`). The routes under `src/app/api/` and the exports are not pages ([[architecture]]).

## Home
- Description: `/`: what Spliit is, with a button to My groups and a link to its GitHub.

## My groups
- Description: `/groups`: the total balance of the person across their groups, then the recent, starred and archived groups, all remembered by this browser; a group can be added by pasting its link.
- Create group
  - Description: `/groups/create`: the name, the currency, the information and the participants of a new group; who you are in it.
- Group
  - Description: `/groups/<groupId>`: redirects to Expenses; a header with the name of the group and Share, then a tab per page below; a notice when the group is scheduled for deletion.
  - Expenses
    - Description: `/groups/<groupId>/expenses`: the expenses, newest first, each with what it changes to the active user's balance; search, export to JSON or CSV, and Create from receipt when it is enabled; the past occurrences of recurring expenses are created when it opens.
    - Create expense
      - Description: `/groups/<groupId>/expenses/create`: the expense form; with `?reimbursement=yes`, filled in as a suggested reimbursement.
    - Edit expense
      - Description: `/groups/<groupId>/expenses/<expenseId>/edit`: the same form, with Delete.
  - Balances
    - Description: `/groups/<groupId>/balances`: the balance of each participant and the suggested reimbursements.
  - Information
    - Description: `/groups/<groupId>/information`: the free text of the group.
  - Stats
    - Description: `/groups/<groupId>/stats`: the totals of the group and of the active user, by category, by month, by participant, and the recurring spending, over a period.
  - Activity
    - Description: `/groups/<groupId>/activity`: who changed what in the group, and when.
  - Settings
    - Description: `/groups/<groupId>/edit`: the group form, who you are, and Delete group when the instance enables it.
