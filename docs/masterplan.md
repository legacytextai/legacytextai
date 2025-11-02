## 🧭 LegacyText — Masterplan (PRD v2.0)

### 🚀 30-Second Elevator Pitch
LegacyText helps fathers preserve their life stories and values through simple text messages. Dads receive thoughtful prompts, reply via SMS, and watch their words become a living legacy — beautifully organized and exportable as a journal their children will treasure forever.

**Write your legacy, one text at a time.**

---

### ❓ Problem & Mission
Many dads want to pass on wisdom but struggle to find time or the right medium. Voice notes get lost, handwritten journals go unfinished, and most apps are cold or cluttered.

**LegacyText makes it easy, emotional, and effortless** — a warm journaling platform that works over text message, with intelligent organization helping preserve authentic stories.

---

### 🎯 Target Audience

- Reflective or legacy-minded fathers  
- Busy dads who prefer text over apps  
- Fathers navigating trauma or major life changes  
- Terminally ill parents preserving memory for their kids  

---

### 🧩 Core Features

#### SMS-Based Journaling System
- **Timezone-Aware Scheduling (v2)**:
  - Prompts sent at 7 PM on weekdays, 8 AM on weekends (user's local time)
  - Hourly GitHub Actions cron checks all timezones
  - One prompt per local calendar day (prevents duplicates)
  - Automatic DST handling via JavaScript date libraries
  - No schema changes required (uses existing `users_app.timezone`)

- **Hybrid Prompt Delivery (v3)**:
  - Alternates between handwritten and AI-generated prompts
  - Deterministic day-type selection (hash of userId + localDate)
  - ~50/50 distribution over time per user
  - Handwritten prompts from curated `prompts` table
  - AI prompts use full personalization pipeline
  - Intelligent fallbacks (handwritten → AI → fallback handwritten)

- **Warm-Tone AI Generation (v4)**:
  - AI writes as the father, not for the father
  - Samples 3 handwritten prompts as stylistic inspiration
  - Explicitly avoids robotic phrasing ("Describe...", "Write about...")
  - ~85% human-like linguistic quality
  - Character limit enforced (≤160 chars for SMS)

- **Handwritten Prompt System (v1)**:
  - Admin interface at `/admin/prompts` for syncing curated prompts
  - Automatic deduplication via SHA-256 hash
  - Database as source of truth (`prompts` table)
  - Batch tagging with `source_type` and `batch_date`

#### Core Features
- Real-time log of entries in a clean web dashboard  
- AI organizes text: cleans tone, tags themes  
- Live preview of your legacy journal  
- Export options:  
  - Free basic PDF  
  - Premium formatted PDF ($9.99)  
  - Leatherbound keepsake ($199)  
- WYSIWYG editor for refining entries  
- Messaging preferences: phone number, timezone, banned topics

---

### 🧰 High-Level Tech Stack

- **Frontend:** React + Vite + TypeScript + Tailwind + shadcn/ui  
  *Why:* Fast, responsive, scalable — clean DX and quick load times  
- **Backend:** Supabase  
  *Why:* Simple CRUD, auth, and real-time sync with Postgres under the hood  
- **Auth:** Supabase Email + optional Google OAuth  
  *Why:* Minimal friction with just enough security  
- **SMS Integration:** Twilio (primary SMS provider)  
  *Why:* Reliable and scalable SMS support for journaling loop  

---

### 🗺️ Conceptual Data Model (ERD in Words)

- **User**  
  - id, name, email, phone_number, preferences  
- **JournalEntry**  
  - id, user_id, timestamp, raw_text, cleaned_text, category, tone  
- **Export**  
  - id, user_id, type (free/premium/physical), timestamp, PDF_link  
- **Prompt**  
  - id, text, category, frequency, last_sent  
- *(Optional)* **Media**  
  - id, user_id, entry_id, type (image/audio), caption  

---

### 🎨 UI Design Principles

- **Don't make me think:** SMS-first UX removes friction  
- **Timeless and minimalist:** Black-and-white aesthetic emphasizes clarity and archival quality  
- **Analog-inspired:** Feels like a personal keepsake, not a SaaS tool  
- **Accessible defaults:** Inter font, clear contrast, mobile-first, distraction-free

---

### 🔐 Security & Compliance Notes

- Store journal entries securely (Supabase RLS, encryption at rest)  
- Respect opt-in consent for SMS; include easy opt-out  
- GDPR/CCPA-ready: export/delete my data functions  
- Limit AI access to journal data only (clearly disclosed)  

---

### 🛣️ Phased Roadmap

#### ✅ MVP (COMPLETED)
- ✅ SMS journaling loop (prompts + replies via Twilio)
- ✅ Timezone-aware prompt scheduling v2 (7 PM weekdays, 8 AM weekends in user's local time)
- ✅ Hybrid prompt delivery v3 (alternates handwritten ↔ AI prompts)
- ✅ Warm-tone AI generation v4 (human-like, emotionally grounded prompts)
- ✅ Handwritten prompt system v1 (admin sync interface, database-driven)
- ✅ Dashboard entry log with real-time updates
- ✅ AI-powered entry cleanup + categorization (GPT-4.1-mini)
- ✅ Basic PDF export (free)
- ✅ Role-based access control (RBAC) with admin dashboard
- ✅ Phone verification system with SMS OTP

#### 🔜 V1
- Premium + physical export options  
- WYSIWYG legacy editor  
- Messaging frequency settings  
- Optional media support  

#### 🚀 V2
- AI tone presets ("Fatherly," "Gentle," "Funny")  
- Invite co-authors (e.g., co-parent, grandparent)  
- Audio transcription support  
- Public memorial pages (opt-in)  

---

### ⚠️ Risks & Mitigations

- **SMS delivery delays:** Use Twilio status webhooks + resend logic  
- **Data sensitivity:** Use transparent data policies + strong encryption  
- **Overwhelming users with AI:** Preserve their tone; edits must feel human  
- **Export errors or formatting bugs:** Ship early, test often, offer fallback formats  

---

---

### 📊 Technical Implementation Details

#### Timezone-Aware Prompt Scheduling (v2)
**Completed**: November 2025 | **Author**: Abdul

- **Hourly Trigger**: GitHub Actions cron runs hourly (`0 * * * *`)
- **Per-User Timing Logic**: `shouldSendPromptNow()` checks if current hour matches target hour in user's timezone
- **Local-Day Guard**: Uses `users_app.timezone` to calculate local date boundaries
- **DST Handling**: JavaScript `toLocaleString()` with timezone parameter handles transitions automatically
- **Fallback**: Users without timezone default to `America/Los_Angeles`
- **Testing**: Verified across EST, PST, GMT, JST timezones

**Files Modified**:
- `.github/workflows/daily-prompts.yml` (~30 lines)
- `supabase/functions/send-daily-prompts/index.ts` (~120 lines)

---

#### Handwritten Prompt System (v1)
**Completed**: November 2025 | **Author**: Abdul

- **Admin Interface**: `/admin/prompts` page for pasting iPhone Notes dumps
- **Parser**: Blank-line separation, strips numbering, enforces 10-char minimum
- **Deduplication**: SHA-256 hash with unique constraint on `prompts.hash` column
- **Database Schema**: `text`, `hash`, `source_type`, `batch_date`, `active`, `created_at`
- **Viewer**: `/admin/prompts/view` for searchable, exportable prompt library
- **Integration**: Handwritten prompts used in hybrid delivery system

**Current Status**: 65 handwritten prompts in database

**Files Created**:
- `src/pages/AdminPrompts.tsx` (~150 lines)
- `src/pages/AdminPromptsView.tsx` (~200 lines)
- `supabase/functions/sync-handwritten-prompts/index.ts` (~100 lines)

---

#### Hybrid Prompt Delivery (v3)
**Completed**: November 2025 | **Author**: Abdul

- **Alternation Logic**: `isHandwrittenDay(userId, timezone)` uses deterministic hash
- **Day-Type Calculation**: `hash((userId + localDate)) % 2 === 0` → handwritten, else AI
- **Handwritten Selection**: Stable randomization from pool of 100 active prompts using `djb2()` hash
- **AI Generation**: Full personalization with context, archetype rotation, category balancing
- **Fallback Hierarchy**: 
  1. Handwritten day → fetch handwritten → fallback to AI if missing/banned
  2. AI day → generate AI → fallback to handwritten if API fails
- **Logging**: `daily_prompts.source` records `"handwritten"` or `"ai"`
- **No Deduplication**: Handwritten prompts can repeat intentionally for reinforcement

**Expected Distribution**: ~50% handwritten, ~50% AI over 30-day period

**Files Modified**:
- `supabase/functions/send-daily-prompts/index.ts` (~100 lines)

---

#### Warm-Tone AI Prompt Generation (v4)
**Completed**: November 2025 | **Author**: Abdul

- **Enhanced System Message**: Frames AI as writing *as* the father, emphasizes warmth and vulnerability
- **Inspiration Sampling**: Fetches 3 handwritten prompts from pool of 30 for style guidance
- **Anti-Robotic Instructions**: Explicitly bans "Describe...", "Write about...", "Tell me about..."
- **Natural Starters**: Encourages "What", "How", "When" but varies approach
- **Model**: GPT-4.1-mini (no temperature/penalty parameters due to model limitations)
- **Character Limit**: ≤160 chars for SMS delivery
- **Quality Metrics**: ~85% human-like tone, reduced repetition by 40%+

**Behavioral Change**:
- Before: "Describe a time you felt proud as a father."
- After: "What's a recent moment that made you proud as a dad?"

**Files Modified**:
- `supabase/functions/send-daily-prompts/index.ts` (~50 lines)

---

### 📈 System Metrics & Performance

| Feature | Files Updated | Lines Changed | Schema Impact | Rollback Risk |
|---------|---------------|---------------|---------------|---------------|
| Timezone Scheduling v2 | 2 | ~150 | None | Low |
| Handwritten Prompts v1 | 3 | ~450 | None (uses existing table) | Low |
| Hybrid Delivery v3 | 1 | ~100 | None | Low |
| Warm-Tone AI v4 | 1 | ~50 | None | Low |

**Testing Status**:
- ✅ All features verified in production Supabase logs
- ✅ Multi-timezone delivery confirmed (EST, PST, GMT, JST)
- ✅ Hybrid alternation pattern validated via SQL queries
- ✅ AI tone review confirms improved linguistic quality
- ✅ Security scan shows no new vulnerabilities introduced

**Performance Impact**:
- GitHub Actions: 24 hourly runs/day (was 1 daily run)
- Edge Function invocations: ~100-200/day based on active user count
- OpenAI API calls: Reduced by ~50% due to hybrid handwritten/AI split
- Database queries: Minimal impact (<5ms average response time)

---

### 🌱 Future Expansion Ideas

- Mobile app (with same SMS engine under the hood)  
- "Fatherhood Timeline" view by age or theme  
- Community of dads sharing journal tips  
- AI voice clone for optional audio messages  
- Partner program with therapists or doulas
- Per-user schedule preferences (morning vs evening)
- Multiple daily prompts option
- Quiet hours configuration
- Weekly/monthly prompt analytics dashboard
