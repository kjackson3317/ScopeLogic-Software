# ScopeLogic Software — Numbering Decisions

**Status:** Base numbering format not yet approved.

ScopeLogic uses immutable internal UUIDs for database identity. Human-readable Project Numbers, Quote Numbers, revisions, and change-order identifiers are separate business identifiers.

## Already defined

The revision/change-order progression is already established conceptually:

- Original/base document starts at `0.0`.
- Revisions to the original progress `0.1`, `0.2`, etc.
- Change Order 1 starts at `1.0`.
- Revisions to Change Order 1 progress `1.1`, `1.2`, etc.
- Change Order 2 starts at `2.0`, with revisions `2.1`, `2.2`, etc.

Historical issued/finalized revisions remain immutable.

## Still to be defined

The company-visible base formats below require a deliberate product decision before production use:

### Project Number

Items to define later:

- company-wide sequential vs year-based sequence
- optional company prefix
- sequence width / leading zeroes
- whether branches/offices may have independent sequences
- whether a manually supplied external/customer project number is separate from the ScopeLogic project number
- whether numbering may be configured by each customer organization
- migration/import behavior for existing project numbers

### Quote Number

Items to define later:

- whether the quote number is globally unique within the company or derived from Project Number
- how multiple independent base quotes on one project are distinguished
- optional system/trade code behavior
- whether quote number should remain unchanged across revisions and change orders, with the `0.0 / 1.0` document progression displayed separately
- handling of imported/existing quote numbers
- company-configurable prefixes and sequence width

## Temporary Alpha behavior

Until the final numbering standard is approved:

- Project Number remains manually entered.
- Quote Number remains manually entered.
- Existing uniqueness constraints remain in place.
- Do not build irreversible numbering assumptions into new parity features.
- Do not couple the internal UUID to the visible project/quote number.

## Product requirement for the eventual solution

The final numbering system should be predictable, auditable, collision-safe under concurrent users, company-configurable within controlled options, and capable of preserving imported legacy numbers without renumbering historical records.