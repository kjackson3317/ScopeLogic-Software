# ScopeLogic Software — Batch 7

Batch 7 adds the hybrid Document Portal.

## Adds
- global Documents view
- project-level folders
- standard project folder seeding
- general files
- controlled documents
- document versions
- current/superseded status
- Supabase Storage bucket definition
- project document view
- upload API

## Upload
Extract and upload the contents to the repository root.

## Database / Storage
After migration 0005, apply:

`supabase/migrations/0006_document_portal.sql`

The migration creates the private storage bucket `project-documents`.

## New projects
The migration also adds a project-insert trigger so projects created after Batch 7 automatically receive the standard folder tree.
