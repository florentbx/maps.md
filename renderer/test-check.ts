// Test of the check, with no dependency: writes faulty maps in a temporary folder, runs
// skills/maps/check.mjs on it, and checks that it fails, reports each fault and writes the header comment. The maps
// of the showcase, which must pass, are checked by the CI. Run: npm test.

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const check = join(dirname(fileURLToPath(import.meta.url)), '..', 'skills', 'maps', 'check.mjs');

// A type of the folder with every kind of value, so that the test does not depend on the catalog.
const files = {
  'types/kinds.md': `---
type: type-definition
shape: graph
element: item
---

## Context
A type for the test of the check.

## Score
- Kind: number
- Min: 0
- Max: 5
- Single: yes

## Level
- Kind: enum
- Values:
  - low
  - high

## When
- Kind: date

## Source
- Kind: link

## Parts
- Kind: text
- Details:
  - Size:
    - Kind: enum
    - Values:
      - small
      - large
`,
  'faulty.md': `---
type: kinds
---

## One
- Score: 9
- Level: medium
- When: next week
- Source: a website
- Colour: blue
- → [[#Nowhere]]

## Two
- Score:
  - 1
  - 2
- Score: 2, fine
- Source: [[faulty#Missing]]
- Parts:
  - a wheel
    - Size: huge
    - Colour: red
A free paragraph.

## one

## Three
- Levl: low
- → [[#Tow]]
### A sub-heading

## Four
- Score: none
- Level: none
- When: none
- Source: none
`,
  'notes/elsewhere.md': `---
type: type-definition
shape: cards
---

## Note
- Kind: text
`,
  'unknown-type.md': `---
type: no-such-type
---
`,
};

// What the check must say: one line per fault, as it prints it.
const expected = [
  '9 is out of the scale, from 0 to 5',
  '"medium" is not one of low, high',
  '"next week" is not a date',
  '"a website" is not a link',
  'not a property of kinds',
  'arrow to "Nowhere": no item of this file has this name',
  'one value only',
  'no word after the number for this property',
  'broken link [[faulty#Missing]]',
  'free text under an element',
  'another item has this name',
  'no-such-type',
  'not read: a type definition goes in the types/ folder',
  '"huge" is not one of small, large',
  'not a detail of Parts',
  'faulty.md:7: error: One › Score: 9 is out of the scale', // the line, after the header comment written
  'not a property of kinds, did you mean "Level"?',
  'arrow to "Tow": no item of this file has this name, did you mean "Two"?',
  'a heading under an element',
];

const dir = mkdtempSync(join(tmpdir(), 'maps-check-'));
let output = '';
let header = ''; // the header comment the check wrote in faulty.md, which had none
let failed = false;
try {
  mkdirSync(join(dir, 'types'));
  mkdirSync(join(dir, 'notes'));
  for (const [path, text] of Object.entries(files)) writeFileSync(join(dir, path), text);
  try {
    output = execFileSync(process.execPath, [check, dir], { encoding: 'utf8' });
  } catch (e) {
    const error = e as { stdout: string; status: number }; // what execFileSync throws
    output = error.stdout;
    failed = error.status === 1;
  }
  header = readFileSync(join(dir, 'faulty.md'), 'utf8').split('\n')[3];
} finally {
  rmSync(dir, { recursive: true, force: true });
}

const missing = expected.filter((text) => !output.includes(text));
// `none`, alone as the value, says that there is none: valid for every kind, as `undefined`.
if (output.includes('"none"')) missing.push('(reported, and must not be: a value written none)');
if (!failed) console.log('The check did not fail on faulty maps.');
for (const text of missing) console.log(`Not reported: ${text}`);
const right = '<!-- kinds: A type for the test of the check. Each ## is an item (except Context and Open questions); "- label → [[#Item]]" is an arrow to another item, with an optional label; "→ undefined" means the other item is unknown. Score goes from 0 to 5. Level is one of low, high. `undefined` means the source did not say. -->';
if (header !== right) console.log(`The header comment written:\n${header}\ninstead of:\n${right}`);
if (!failed || missing.length || header !== right) {
  console.log(`\nOutput of the check:\n${output}`);
  process.exit(1);
}
console.log(`The check reports the ${expected.length} faults and writes the header comment.`);
