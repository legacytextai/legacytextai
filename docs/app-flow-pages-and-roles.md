## 🗺️ LegacyText AI — App Flow, Pages & Roles

### 🧭 Site Map (Top-Level Pages)

- `/` — **Homepage**
- `/login` — **Login / Signup**
- `/dashboard` — **Journal Entry Log**
- `/journal` — **Legacy Journal Viewer**
- `/editor` — **Legacy Journal Editor**
- `/settings` — **Messaging Settings**
- `/media` — **Media Library** *(optional)*

---

### 📄 Purpose of Each Page

- **Homepage:**  
  Introduces LegacyText’s mission, benefits, and starts sign-up flow  

- **Login / Signup:**  
  Lightweight authentication — just enough to feel secure  

- **Dashboard (Entry Log):**  
  Shows incoming entries as a chronological timeline  

- **Legacy Journal Viewer:**  
  Full journal preview (with dedication), export options visible  

- **Editor:**  
  Drag-and-drop + inline edits to refine your entries  

- **Messaging Settings:**  
  Set prompt frequency, test phone, update connected number  

- **Media Library (optional):**  
  View, caption, and manage uploaded media sent via SMS  

---

### 👥 User Roles & Access Levels

#### 👨 **Father (Primary User)**

- Receives prompts via SMS  
- Replies get auto-logged and organized  
- Full access to:
  - Dashboard
  - Journal Viewer + Editor
  - Messaging Settings
  - Export options (PDF + physical)
  - Media Library (if enabled)

#### 🛠️ Admin (Internal Use Only)

- View all user data for support/debug  
- Manage prompt templates  
- Monitor export queue + Stripe payments  
- Access delivery logs and media moderation tools  

---

### 🧭 Primary User Journeys

#### 1️⃣ **Start Journaling**
1. Sign up with email and phone
2. Receive first SMS prompt
3. Reply via text — entry appears in dashboard

---

#### 2️⃣ **Export My Legacy Journal**
1. Open Journal Viewer  
2. Click `Export`  
3. Choose:
   - Free PDF  
   - Premium PDF ($9.99)  
   - Physical book ($199)

---

#### 3️⃣ **Adjust My Prompt Settings**
1. Go to Settings  
2. Select frequency: Daily / Weekly / Random  
3. Optionally test phone number or reconnect  

---
