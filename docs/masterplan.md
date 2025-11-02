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

- SMS-based journaling with AI prompt system  
  - **Timezone-aware scheduling**: Prompts sent at 7 PM on weekdays, 8 AM on weekends (user's local time)
  - **One prompt per local day**: Prevents duplicate sends across timezones
  - **Automatic DST handling**: System adapts to daylight saving transitions
- Real-time log of entries in a clean web dashboard  
- AI organizes text: cleans tone, tags themes  
- Live preview of your legacy journal  
- Export options:  
  - Free basic PDF  
  - Premium formatted PDF ($9.99)  
  - Leatherbound keepsake ($199)  
- WYSIWYG editor for refining entries  
- Messaging preferences: phone number, timezone, etc.

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

#### ✅ MVP
- SMS journaling loop (prompts + replies)  
- Timezone-aware prompt scheduling (7 PM weekdays, 8 AM weekends in user's local time)
- Dashboard entry log  
- AI-powered entry cleanup + categorization  
- Basic PDF export (free)

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

### 🌱 Future Expansion Ideas

- Mobile app (with same SMS engine under the hood)  
- "Fatherhood Timeline" view by age or theme  
- Community of dads sharing journal tips  
- AI voice clone for optional audio messages  
- Partner program with therapists or doulas  
