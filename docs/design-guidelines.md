## 🎨 LegacyText — Design Guidelines (PRD v2.0)

### 🗣️ Brand Voice & Tone

- **Warm, encouraging, and reflective**
  - Feels handwritten, human, and emotionally aware
- **Simple, plain English**
  - No jargon or technical metaphors
- **Supportive but not sentimental**
  - Encourage reflection without sounding overly dramatic

#### ✅ Examples:
- “A moment your kids will laugh about someday?”
- “What lesson do you wish your dad had written down for you?”
- “This week’s entry is saved. Want to preview your legacy journal?”

---

### 🌈 Color, Typography, Spacing

- **Font:** `Inter` — readable, modern, and trustworthy  

#### Color System (Black & White Minimalist)
- **Primary Color:** `#000000` (black) — timeless, classic, authoritative  
- **Background:** `#FFFFFF` (white) — clean, simple, focused  
- **Subtle Gray:** `#F5F5F5` (off-white) — for cards and subtle backgrounds  
- **Border/Divider:** `#E0E0E0` (light gray) — gentle separation  
- **Text:** `#1A1A1A` (near-black) — optimal readability  

#### Design Philosophy
- **Timeless:** Black-and-white aesthetic emphasizes archival quality
- **Minimalist:** Distraction-free interface focused on content
- **Classic:** Feels like a cherished keepsake, not a tech product
- **Intentional:** Every element serves a purpose

#### Spacing Rules:
- Use `1.5rem` vertical rhythm between major blocks  
- Max text width: 640px for optimal legibility  
- Sidebar: fixed 240px, collapsible on mobile

---

### 📱 Layout Best Practices

- **Mobile-first:** Journaling happens via SMS — UI must work on the go  
- **Simple grid:**  
  - Mobile = single column  
  - Desktop = 2 columns (sidebar + content)  
- **No distractions:** No carousels, popups, or modal traps  
- **Card-based display:** Timeline entries in clear, chronological blocks

---

### ♿ Accessibility Must-Dos

- **Color contrast:** All text/background pairs pass WCAG AA  
- **Semantic HTML:**  
  - `h1` → `h2` → `h3` structure  
  - `<main>`, `<nav>`, `<section>` tags in layout  
- **Keyboard navigation:** Every button, toggle, and export is tabbable  
- **Visible focus states:** Never rely on subtle outlines or color alone  
- **ARIA labels:** Especially on icons, links, and dynamic UI (e.g. drag handles)

---

### ✍️ Content Style Guide

- **Headings:**
  - Sentence case only (`Your weekly prompt`)
  - No colons or periods unless required for clarity

- **Bullet Lists:**
  - Start with a verb
  - Keep ≤ 5 items max per list
  - No deep nesting (max 1 sub-level)

- **Links:**
  - Descriptive language like:
    - `Download your legacy journal`
    - `Edit journal entries`
  - Avoid: “click here,” “learn more”

- **Tone in Prompts:**
  - Gentle, specific, open-ended
  - Encourage honesty and small moments:
    - “A memory from your childhood you hope your kids repeat?”
    - “What’s one habit you’re proud of passing down?”

