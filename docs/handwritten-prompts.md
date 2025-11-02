# 🖊️ LegacyText Handwritten Prompts

This document stores all handwritten prompts authored by Abdul Bidiwi for the LegacyText journaling system.

> **Sync Process:** When Abdul pastes new prompts via the Admin UI, Lovable automatically:
> 1. Parses the raw text into individual prompts
> 2. Deduplicates against existing database entries
> 3. Adds new prompts to the Supabase `prompts` table
> 4. This document serves as the master record

---

## 📊 Summary

- **Total Handwritten Prompts:** 0
- **Latest Batch:** None yet
- **Last Updated:** Never

---

## 📅 Batch History

_No batches imported yet. Use the Admin UI at `/admin/prompts` to import your first batch._

---

## 🔍 All Prompts (by Batch)

_Prompts will appear here after first sync._

---

## Technical Details

### Parsing Rules

- **Blank-line separation:** Each prompt is separated by one or more blank lines
- **Numbering stripped:** Automatic removal of "1.", "2)", etc.
- **Minimum length:** 10 characters (prevents accidental fragments)
- **Multi-line support:** Internal line breaks are preserved as single prompts

### Deduplication

- **Hash algorithm:** SHA-256 of normalized text (lowercase, collapsed whitespace, no trailing punctuation)
- **Uniqueness:** Enforced at database level via unique constraint on `hash` column
- **Cross-sync:** Works across multiple import batches

### Database Schema

Prompts are stored in the `prompts` table with:
- `text` - The prompt content
- `hash` - SHA-256 hash for deduplication
- `source_type` - Set to `'handwritten'` for these prompts
- `batch_date` - Date of import
- `active` - Boolean flag for prompt activation
- `created_at` - Timestamp of insertion

### Integration

Handwritten prompts serve as:
1. **Fallback prompts** when AI generation fails
2. **Curated prompts** for users who prefer human-written questions
3. **Quality baseline** for prompt generation system
