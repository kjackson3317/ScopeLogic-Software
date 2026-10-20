# ScopeLogic Symbol Identity Standard (PROPOSED v0.1)

## Core principle

**One stable Symbol ID, one counted scope unit, one named estimating definition.**

The source of truth for what a counted symbol includes is ScopeLogic, not the PDF,
markup appearance, manufacturer part number or Revu Tool Chest icon. The Symbol ID
must work across Revu imports, ScopeLogic Takeoff, Scope Rules, quantity inputs
and historical quote revisions.

## Format

`SYSTEM-DEVICE[-VARIANT]`

- Uppercase A-Z, digits and hyphen only.
- 2–5 uppercase characters for SYSTEM, 2–12 uppercase/digit characters for DEVICE,
  and an optional 1–12 uppercase/digit VARIANT.
- The optional VARIANT differentiates materially different counted scope types.
- No spaces, punctuation, leading/trailing hyphens, or manufacturer names.
- Do not rename a published code merely because its assembly parts/pricing changes.
  Make a new code only when counted scope/function changes.
- Do not put an assembly version, part number, cable length or pricing in the code.
- Avoid numbered suffixes whose purpose is unclear; `2P` is useful (two ports),
  `02` without a definition is not.

## Proposed system prefixes

| Prefix | System |
| --- | --- |
| SC | Structured cabling |
| FA | Fire alarm |
| ACS | Access control |
| CCTV | Video surveillance |
| INTR | Intrusion |
| ICOM | Intercom and video intercom |
| AV | Audio/visual |
| PA | Paging / sound |
| AOR | Area of refuge / two-way emergency communications |
| ERRC | Emergency responder radio coverage |
| EPH | Emergency phone / call station |
| OTH | Other |

These prefixes are a proposal until approved. One code must always have one
scope-unit definition; never reassign a retired ID to a different device.

## Example symbols (proposed)

| Symbol ID | Display name | Unit | Kind |
| --- | --- | --- | --- |
| SC-DATA-1P | Single-port data outlet | EA | assembly |
| SC-DATA-2P | Two-port data outlet | EA | assembly |
| SC-WAP | Wireless AP location | EA | assembly |
| FA-SMK | Smoke detector location | EA | assembly |
| FA-PULL | Manual pull station | EA | assembly |
| FA-SPK-STR | Speaker strobe | EA | assembly |
| ACS-DR-1R | One-reader access-controlled door | EA | assembly |
| CCTV-CAM-DOME | Dome camera location | EA | assembly |
| CCTV-CAM-BULLET | Bullet camera location | EA | assembly |
| AOR-CALL | Area-of-refuge remote station | EA | assembly |
| AV-SPK-CLG | Ceiling speaker location | EA | assembly |
| SC-CAB-LF | Cable pathway/length quantity | LF | quantity_only |

Only generate a symbol variant when it means something that legitimately
changes the quantity basis. Different appearance colors or shapes alone must
not create different IDs. Conversely, different IDs must remain distinct
even if their color/shape happens to be identical.

## Appearance and Count Table — controlling UI requirement

- **On the PDF drawing:** show only the chosen colored geometric symbol (circle,
  square, triangle, or diamond). Never print the Symbol ID, assembly name,
  description, count, or a caption beside/inside the markup.
- **Markup properties:** store the immutable ScopeLogic Symbol ID in Subject.
  The optional Label/description is metadata for the Markups List, not a
  drawing text label. When setting up Count tools, turn **Show Caption OFF**;
  verify this in the saved Tool Chest item and after placement.
- **Bottom count table (Revu Markups List, and future ScopeLogic Takeoff UI):**
  show a small symbol swatch, Symbol ID, friendly description, count, and unit.
  Group by system, keep counts prominent and accessible during takeoff.
- **Source of descriptions:** ScopeLogic symbol registry/Rule Engine, never
  the visible markup. The table may read properties without writing text
  back onto the PDF.
- **ScopeLogic import:** preserve the Symbol ID and quantity for each takeoff
  type. Visual icon/shape/color are presentation metadata, not estimating
  identity or BOM definitions.
- The bottom count table is a docked UI panel, not a requirement to imprint
  a legend or schedule on the drawing.

## Bluebeam Revu mapping

- Tool Chest organized in Tool Sets by system (SC, FA, ACS, etc.).
- **Subject** is the exact Symbol ID, e.g. `SC-DATA-2P`.
- **Label** may be a readable description in the list, with markup captions hidden. Do not use Label as the primary key.
- Shape and Color are for at-a-glance placement only. They are not the primary key. Disable Show Caption so no code or text is drawn next to the symbol.
- Use one Count Tool/markup subject per code. Revu Core supports customized
  Count Tool icons and Count totals; export Subject and Count via Markups List.
- For ordinary markup shapes, each placed markup counts once; Count Tool
  groups use their numeric Count column.
- For a new library, imports should auto-map by Subject exact code to the
  matching ScopeLogic Rule input. Unknown Subjects go to an Unmapped queue,
  never silently mapped using shape/color.
- Additional manual markups are explicitly excluded, or use separate tool
  sets / exports; do not infer every markup is a takeoff quantity.

## ScopeLogic data model (desired)

Symbol Definition:
- symbol_code (immutable/unique per tenant)
- system, display_name, unit, description
- kind: assembly | quantity_only
- assembly_id (if kind=assembly), or quantity rule reference
- status: draft/published/retired
- visualization metadata (shape/color) **not used as identity**

Assembly:
- name and stable ID; versioned BOM and labor definitions
- material components, quantities, waste factors, labor and other costs
- project overrides may change calculated requirements without renaming code

Quote:
- source type, source ID/document, Symbol ID, counted quantity, unit
- rule/assembly version applied and resulting BOM contribution audit trail
- re-import replaces the source snapshot without double-applying quantities
- historical final quotes retain their original rule/assembly snapshots

**Important existing-system gap:** The current Alpha Rules Engine supports
single-output recommendations linked to catalog items. The `assemblies`
and `assembly_components` tables exist, but an end-to-end pipeline to expand
one symbol into a multi-part assembly is **not yet implemented**. Building and
testing that pipeline is required before calling the assembly-first demo
production-ready.

## Release acceptance

- New Revu symbol named SC-DATA-2P imports as the same stable ID regardless
  of color or shape change.
- Only the shape is visible on the PDF: no symbol name, code, label or caption.
- The docked count table provides the descriptive information and total.
- Forty-two SC-DATA-2P placements produce quantity 42, not 42 guessed items.
- Changes to the assembly contents do not require renaming the Revu symbol.
- Unknown valid IDs and malformed IDs are clearly flagged.
- Duplicate PDFs / re-imports do not add quantities twice.
- The standalone ScopeLogic takeoff tool can emit the same Symbol IDs.
