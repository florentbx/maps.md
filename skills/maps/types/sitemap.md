---
type: type-definition
shape: tree
element: page
---
<!-- Type definition: the name of the file is the name of the type. Context says what the type is for, then its own guidance. Each ## is a known property, in order; its items give its kind, the attributes of the kind and its meaning. -->

## Context
The pages of a product and how they are organized, in the order of navigation.

- A page is a place the person navigates to. A dialog, a confirmation, an error message or a step of a flow is not a page: it goes in the description of its page, or in a user flow.
- Each page is named as the person sees it in the navigation (Pricing, My appointments…).
- Under a page, write its properties first, then its sub-pages, in the order of navigation.
- A page name cannot contain `: `: it would be read as a property.

## Description
- Kind: text
- Meaning: What the page is for, in one sentence.
