## 🛠️ LegacyText — Implementation Plan (PRD v2.0)

### 🧱 Step-by-Step Build Sequence

#### 📦 Phase 1: MVP Core Loop (SMS → Dashboard → Export)

1. **Set up project structure**
   - Create monorepo (frontend + backend)
   - Configure Supabase project and tables

2. **Implement Auth**
   - Email/password login
   - Google OAuth (optional)

3. **Build Journal Data Model**
   - Tables: User, JournalEntry, Prompt, Export

4. **Set up SMS Integration**
   - SMS provider: Twilio (primary, confirmed working)
   - Create phone number and webhook endpoint
   - Parse incoming SMS → save raw entry

5. **Create Prompt Scheduler** ✅ COMPLETED
   - **Timezone-aware hourly GitHub Action** (runs every hour at :00 UTC)
   - Edge Function evaluates each user's local time
   - **Sends prompts at 7 PM on weekdays, 8 AM on weekends** (user's local timezone)
   - **One prompt per local calendar day** with guard mechanism
   - Automatic DST handling via JavaScript's timezone support

6. **AI Journal Processor**
   - Clean raw text (grammar, formatting)
   - Preserve voice/tone
   - Auto-categorize (e.g., “Advice,” “Milestones”)

7. **Dashboard UI (React + Tailwind)**
   - Timeline of entries
   - Left-hand sidebar navigation
   - Export button (PDF download)

8. **Free PDF Export Engine**
   - Render entries in structured layout
   - Include dedication + journal title page
   - Generate and store PDF file

---

#### 🚀 Phase 2: Power Features & Personalization

9. **WYSIWYG Editor**
   - Drag/drop to reorder entries
   - Edit text inline
   - Save changes to journal view

10. **Messaging Settings UI**
    - Phone number verification
    - Prompt frequency selector
    - Test message button

11. **Premium Export Engine**
    - Advanced formatting
    - Optional media section
    - Stripe integration for $9.99 PDF

12. **Physical Journal Workflow**
    - Export file to print-ready layout
    - Order button → webhook to fulfillment service
    - Email confirmation + tracking info

13. *(Optional)* Media Library
    - Upload + organize media
    - Attach to journal entries

---

### 🗓️ Timeline with Checkpoints

| Week | Focus Area                      | Milestone                         |
|------|----------------------------------|------------------------------------|
| 1    | Project setup + Supabase schema | Auth + DB live                     |
| 2    | SMS webhook + entry saving      | First journal entry captured       |
| 3    | AI processing pipeline          | Raw → cleaned → categorized entry  |
| 4    | Dashboard + export UI           | View + download PDF                |
| 5    | Prompt scheduler + SMS settings | Text prompt loop working           |
| 6    | MVP polish + tests              | Private beta ready                 |
| 7    | Premium export + RBAC           | Admin role system + exports live   |
| 8    | Physical journal ordering       | Order → confirmation working       |
| 9    | Editor + polish                 | Self-editable journals live        |
| 10   | Usability test + soft launch    | Ready for public release           |

**Note:** RBAC (Role-Based Access Control) completed ahead of schedule with `user_roles` table and `has_role()` function.

---

### 👥 Team Roles & Recommended Rituals

#### 🔧 Roles

- **PM/Founder** — Vision holder, QA, tone of voice  
- **Frontend Dev** — Dashboard, editor, export UI  
- **Backend Dev** — SMS intake, AI pipeline, data logic  
- **AI/Prompt Designer** — Prompts + text processing design  
- **Designer** — Journal motif design, brand assets, UX

#### 🔁 Rituals

- Weekly build reviews  
- 30-minute guerrilla UX test every 2 weeks  
- Monthly roadmap check-in  
- Quarterly customer feedback review

---

### 🔌 Optional Integrations & Stretch Goals

- **Stripe** — Paid exports (PDF + physical journal)  
- **Print Partner** — Fulfillment for physical keepsake  
- **Postmark / Resend** — Transactional emails  
- **OpenAI / Claude / Cohere** — Journal cleanup + tagging  
- **Zapier / Pipedream** — Low-code integrations in future

