# 🖊️ LegacyText Handwritten Prompts

### ⚠️ Source of Truth Notice
**As of November 2, 2025**, all handwritten prompts are stored and managed in the **Supabase `prompts` table**.  
This Markdown document is **for architectural reference only** and is **no longer a live data record**.

### 📘 How It Works
1. Admin pastes iPhone Notes dump into the `/admin/prompts` page
2. System parses text (blank-line separated, strips numbering)
3. SHA-256 hash deduplicates against existing database entries
4. New entries inserted with `source_type = 'handwritten'`
5. **View live data at `/admin/prompts/view`**

### 📊 Current Status
- **Total Handwritten Prompts:** 65 (as of last check)
- **Database Table:** `prompts` (filtered by `source_type = 'handwritten'`)
- **Viewer Page:** `/admin/prompts/view`

### 🔍 Accessing Prompt Data
**Option 1:** Admin UI at `/admin/prompts/view` (searchable, exportable)  
**Option 2:** Direct SQL query:
```sql
SELECT id, text, created_at 
FROM prompts 
WHERE source_type = 'handwritten' 
ORDER BY id;
```

### Technical Implementation
- **Parsing:** Blank-line separation, numbering stripped, 10-char minimum
- **Deduplication:** SHA-256 hash with unique constraint on `hash` column
- **Database Schema:** `text`, `hash`, `source_type`, `batch_date`, `active`, `created_at`
- **Integration:** Fallback for AI generation failures, curated baseline prompts

---

_This file is architectural documentation only. For live data, use `/admin/prompts/view`._
