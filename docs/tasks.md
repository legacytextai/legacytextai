# 📋 LegacyText AI - Implementation Tasks

*Source of truth for development priorities and implementation details*

---

## 🎯 Phase 1: MVP Core Loop (Weeks 1-6)

### ✅ Task 1: Project Foundation & Design System
**Status**: COMPLETED ✅
**Description**: Set up React + Vite + TypeScript project with design system and core pages
**Completion**: Basic UI structure, navigation, and design tokens implemented

---

### ✅ Task 2: Supabase Setup & Authentication
**Priority**: HIGH | **Estimated**: 1 week
**Status**: COMPLETED ✅

#### Subtasks:
- [ ] 2.1 Connect Lovable project to Supabase
- [ ] 2.2 Set up authentication tables and RLS policies
- [ ] 2.3 Implement email/password authentication
- [ ] 2.4 Add Google OAuth (optional)
- [ ] 2.5 Create protected route wrapper

#### Database Schema:
```sql
-- Users/Profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  phone_number TEXT,
  prompt_frequency TEXT DEFAULT 'weekly' CHECK (prompt_frequency IN ('daily', 'weekly', 'random')),
  last_prompt_sent TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
```

#### Files to Update:
- `src/lib/supabase.ts` - Supabase client configuration
- `src/components/auth/` - Authentication components
- `src/hooks/useAuth.ts` - Authentication hook
- `src/pages/Login.tsx` - Login/signup page

---

### ✅ Task 3: Journal Entry Data Model
**Priority**: HIGH | **Estimated**: 3 days
**Status**: COMPLETED ✅

#### Subtasks:
- [ ] 3.1 Create journal_entries table with RLS
- [ ] 3.2 Create entry categories/tags system
- [ ] 3.3 Implement CRUD operations for entries
- [ ] 3.4 Add entry status tracking (raw, processed, edited)

#### Database Schema:
```sql
-- Journal Entries table
CREATE TABLE journal_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  raw_text TEXT NOT NULL,
  cleaned_text TEXT,
  category TEXT,
  tags TEXT[],
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'raw' CHECK (status IN ('raw', 'processed', 'edited')),
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies  
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own entries" ON journal_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own entries" ON journal_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own entries" ON journal_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own entries" ON journal_entries FOR DELETE USING (auth.uid() = user_id);

-- Categories lookup table
CREATE TABLE entry_categories (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1'
);

INSERT INTO entry_categories (name, description, color) VALUES
('Advice', 'Life lessons and guidance', '#3b82f6'),
('Milestones', 'Important moments and achievements', '#10b981'),
('Memories', 'Special moments and experiences', '#f59e0b'),
('Values', 'Core beliefs and principles', '#ef4444'),
('Daily Life', 'Everyday moments and reflections', '#8b5cf6');
```

#### Files to Create/Update:
- `src/types/journal.ts` - TypeScript interfaces
- `src/lib/journal.ts` - Journal CRUD operations
- `src/hooks/useJournalEntries.ts` - React Query hooks

---

### ✅ Task 4: SMS Integration & Webhook Setup
**Priority**: HIGH | **Estimated**: 1 week
**Status**: COMPLETED ✅

#### Subtasks:
- [ ] 4.1 Set up Twilio account and phone number (RECOMMENDED: Most scalable, reliable SMS provider)
- [ ] 4.2 Create SMS webhook endpoint (Supabase Edge Function)
- [ ] 4.3 Parse incoming SMS messages
- [ ] 4.4 Save raw entries to database
- [ ] 4.5 Implement SMS sending for prompts via Twilio
- [ ] 4.6 Add phone number verification
- [ ] 4.7 Integrate OpenAI GPT for intelligent prompt generation

#### Supabase Edge Function:
```typescript
// supabase/functions/sms-webhook/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const formData = await req.formData()
  const from = formData.get('From')?.toString()
  const body = formData.get('Body')?.toString()
  
  if (!from || !body) {
    return new Response('Missing required fields', { status: 400 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Find user by phone number
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('phone_number', from)
    .single()

  if (!profile) {
    // Send helpful response to unknown number
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Message>Thanks for texting! Please sign up at [your-domain] to start your legacy journal.</Message>
      </Response>`, {
      headers: { 'Content-Type': 'text/xml' }
    })
  }

  // Save journal entry
  await supabase
    .from('journal_entries')
    .insert({
      user_id: profile.id,
      raw_text: body,
      status: 'raw'
    })

  return new Response(`<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Message>Your journal entry has been saved! View it at [your-domain]/dashboard</Message>
    </Response>`, {
    headers: { 'Content-Type': 'text/xml' }
  })
})
```

#### Files to Create:
- `supabase/functions/sms-webhook/index.ts` - SMS webhook handler
- `supabase/functions/send-prompt/index.ts` - Send SMS prompts
- `src/lib/sms.ts` - SMS utilities

---

### ✅ Task 5: AI Text Processing Pipeline
**Priority**: MEDIUM | **Estimated**: 4 days
**Status**: COMPLETED ✅

#### Subtasks:
- [ ] 5.1 Set up OpenAI GPT integration (CONFIRMED: Primary AI provider)
- [ ] 5.2 Create text cleaning/grammar correction using GPT-4
- [ ] 5.3 Implement automatic categorization via GPT
- [ ] 5.4 Add tone preservation logic
- [ ] 5.5 Create batch processing for existing entries
- [ ] 5.6 Build intelligent prompt generation system with GPT
- [ ] 5.7 Add Claude integration framework (future-ready architecture)

#### Supabase Edge Function:
```typescript
// supabase/functions/process-entry/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { entryId, rawText } = await req.json()
  
  const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [{
        role: 'system',
        content: `You are helping a father create a legacy journal for his children. 
        
        Task: Clean up the following text message while preserving the father's authentic voice and tone. 
        Fix grammar and spelling, but keep it feeling personal and heartfelt.
        
        Also categorize this entry into one of: Advice, Milestones, Memories, Values, Daily Life
        
        Return a JSON object with: { "cleanedText": "...", "category": "..." }`
      }, {
        role: 'user',
        content: rawText
      }]
    })
  })

  const result = await openaiResponse.json()
  const processed = JSON.parse(result.choices[0].message.content)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  await supabase
    .from('journal_entries')
    .update({
      cleaned_text: processed.cleanedText,
      category: processed.category,
      status: 'processed'
    })
    .eq('id', entryId)

  return new Response(JSON.stringify({ success: true }))
})
```

---

### 🚧 Task 6: Enhanced Dashboard Implementation
**Priority**: MEDIUM | **Estimated**: 3 days
**Status**: STARTED 🚧

#### Subtasks:
- [ ] 6.1 Connect dashboard to real Supabase data
- [ ] 6.2 Add real-time entry updates
- [ ] 6.3 Implement entry filtering and search
- [ ] 6.4 Add entry editing inline capabilities
- [ ] 6.5 Create entry statistics widgets

#### Key Updates:
```typescript
// src/hooks/useJournalEntries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export const useJournalEntries = () => {
  return useQuery({
    queryKey: ['journal-entries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('journal_entries')
        .select(`
          *,
          entry_categories(name, color)
        `)
        .order('timestamp', { ascending: false })
      
      if (error) throw error
      return data
    }
  })
}
```

#### Files to Update:
- `src/pages/Dashboard.tsx` - Connect to real data
- `src/components/EntryCard.tsx` - Individual entry component
- `src/hooks/useJournalEntries.ts` - Data fetching hooks

---

### 🔲 Task 7: Basic PDF Export Engine
**Priority**: HIGH | **Estimated**: 5 days
**Status**: NOT STARTED

#### Subtasks:
- [ ] 7.1 Set up PDF generation library (jsPDF or React-PDF)
- [ ] 7.2 Create basic journal template
- [ ] 7.3 Implement free PDF generation
- [ ] 7.4 Add dedication page functionality
- [ ] 7.5 Store generated PDFs in Supabase Storage (CONFIRMED: Primary storage)

#### PDF Generation:
```typescript
// src/lib/pdfGenerator.ts
import jsPDF from 'jspdf'
import { JournalEntry } from '@/types/journal'

export const generateBasicPDF = async (entries: JournalEntry[], dedication: string) => {
  const doc = new jsPDF()
  
  // Title page
  doc.setFontSize(24)
  doc.text('My Legacy Journal', 20, 30)
  
  // Dedication
  if (dedication) {
    doc.addPage()
    doc.setFontSize(16)
    doc.text('Dedication', 20, 30)
    doc.setFontSize(12)
    doc.text(dedication, 20, 50, { maxWidth: 170 })
  }
  
  // Entries
  entries.forEach((entry, index) => {
    doc.addPage()
    doc.setFontSize(14)
    doc.text(new Date(entry.timestamp).toLocaleDateString(), 20, 30)
    doc.setFontSize(12)
    doc.text(entry.cleaned_text || entry.raw_text, 20, 50, { maxWidth: 170 })
  })
  
  return doc.output('blob')
}
```

#### Files to Create:
- `src/lib/pdfGenerator.ts` - PDF generation utilities
- `src/components/ExportDialog.tsx` - Export options modal
- `supabase/functions/generate-pdf/index.ts` - Server-side PDF generation

---

### ✅ Task 8: Prompt Scheduling System
**Priority**: MEDIUM | **Estimated**: 3 days
**Status**: COMPLETED ✅

#### Subtasks:
- [ ] 8.1 Create prompts database table
- [ ] 8.2 Implement prompt scheduler (cron job)
- [ ] 8.3 Add user prompt preferences
- [ ] 8.4 Create variety in prompt questions
- [ ] 8.5 Track prompt response rates

#### Database Schema:
```sql
-- Prompts table
CREATE TABLE prompts (
  id SERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  category TEXT NOT NULL,
  frequency TEXT[] DEFAULT ARRAY['weekly'], -- daily, weekly, random
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prompt history
CREATE TABLE prompt_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  prompt_id INTEGER REFERENCES prompts(id),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded BOOLEAN DEFAULT FALSE,
  response_entry_id UUID REFERENCES journal_entries(id)
);

-- Sample prompts
INSERT INTO prompts (text, category) VALUES
('What made you proud as a father this week?', 'milestones'),
('Share a lesson you learned from your own dad.', 'advice'),
('Describe a moment when your child surprised you.', 'memories'),
('What value do you hope your child never forgets?', 'values'),
('Tell me about an ordinary day that felt extraordinary.', 'daily_life');
```

---

## 🚀 Phase 2: Power Features (Weeks 7-10)

### 🔲 Task 9: WYSIWYG Journal Editor
**Priority**: MEDIUM | **Estimated**: 1 week
**Status**: NOT STARTED

#### Subtasks:
- [ ] 9.1 Implement drag-and-drop entry reordering
- [ ] 9.2 Add inline text editing capabilities
- [ ] 9.3 Create dedication editor
- [ ] 9.4 Add entry deletion with confirmation
- [ ] 9.5 Save edited journal state

#### Files to Update:
- `src/pages/Editor.tsx` - Enhanced editor interface
- `src/components/DraggableEntry.tsx` - Drag-and-drop component
- `src/hooks/useJournalEditor.ts` - Editor state management

---

### 🔲 Task 10: Premium Export & Stripe Integration
**Priority**: HIGH | **Estimated**: 1 week
**Status**: NOT STARTED

#### Subtasks:
- [ ] 10.1 Set up Stripe account and payment processing (CONFIRMED: Primary payment provider)
- [ ] 10.2 Create premium PDF template with enhanced styling
- [ ] 10.3 Implement payment flow for $4.99 PDF using Stripe Checkout
- [ ] 10.4 Add media integration to premium exports
- [ ] 10.5 Create purchase history tracking in Supabase
- [ ] 10.6 Set up $199 physical journal payment flow (fulfillment TBD)

#### Stripe Integration:
```typescript
// supabase/functions/create-payment/index.ts
import Stripe from 'https://esm.sh/stripe@13.8.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)

serve(async (req) => {
  const { exportType, userId } = await req.json()
  
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: exportType === 'premium' ? 'Premium Legacy Journal PDF' : 'Leatherbound Legacy Journal',
        },
        unit_amount: exportType === 'premium' ? 499 : 19900, // $4.99 or $199.00
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: `${req.headers.get('origin')}/export?success=true`,
    cancel_url: `${req.headers.get('origin')}/export?canceled=true`,
    metadata: {
      userId,
      exportType
    }
  })

  return new Response(JSON.stringify({ url: session.url }))
})
```

---

### ✅ Task 11: Enhanced Settings & Phone Verification
**Priority**: MEDIUM | **Estimated**: 3 days
**Status**: COMPLETED ✅

#### Subtasks:
- [x] 11.1 Enhanced Settings with journaling personalization (children, interests, banned topics)
- [x] 11.2 Row-Level Security implementation for users_app table
- [x] 11.3 Add timezone support with IANA timezone picker
- [x] 11.4 Children management with date validation
- [x] 11.5 Send Test Prompt functionality
- [ ] 11.6 Add phone number verification via SMS (Future)
- [ ] 11.7 Create account deletion functionality (Future)
- [ ] 11.8 Add data export (GDPR compliance) (Future)

#### Implementation Summary:
**Completed**: Enhanced /settings page with full journaling personalization including:
- Profile management (name, language, timezone)
- Interests and banned topics as editable chips
- Children management with name/DOB validation
- RLS policies for secure user data access by phone number
- Test prompt functionality calling the daily sender Edge Function
- Form validation with proper error handling
- Responsive design using the design system

#### Files to Update:
- `src/pages/Settings.tsx` - Enhanced settings interface
- `src/components/PhoneVerification.tsx` - Phone verification component

---

### ✅ Task 12: Auth Callback & Redirect Loop Fix
**Priority**: HIGH | **Estimated**: 1 day
**Status**: COMPLETED ✅

#### Subtasks:
- [x] 12.1 Create `/auth/callback` page for email confirmations
- [x] 12.2 Implement auth guards to prevent redirect loops
- [x] 12.3 Update auth flow to stop infinite redirects
- [x] 12.4 Ensure single OTP auto-kickoff per user session
- [x] 12.5 Handle various auth callback types (email, OAuth, etc.)

#### Implementation Summary:
**Completed**: Auth callback system with proper redirect handling:
- `/auth/callback` page handles email confirmation links, OAuth codes, and legacy hash tokens
- AuthGuard component prevents redirect loops on public pages
- Updated afterLoginBootstrap to use navigate function properly
- Single auto-kickoff for OTP ensures no spam during onboarding
- Tolerant auth parameter parsing for different Supabase auth flows

#### Files Created/Updated:
- `src/pages/AuthCallback.tsx` - New auth callback page
- `src/components/AuthGuard.tsx` - Auth protection wrapper
- `src/hooks/useAuth.tsx` - Updated bootstrap function
- `src/App.tsx` - Added auth guard and new route

---

### ✅ Task 13: Auth/OTP Diagnostics & Debug System
**Priority**: HIGH | **Estimated**: 1 day
**Status**: COMPLETED ✅

#### Subtasks:
- [x] 13.1 Add debug environment flags (PUBLIC_DEBUG_AUTH, PUBLIC_ONBOARDING_AUTO_OTP, PUBLIC_DEBUG_LOG_NETWORK)
- [x] 13.2 Enhanced AuthCallback page with debug information and stable session handling
- [x] 13.3 Improved AuthGuard with loop detection and recovery
- [x] 13.4 Debug overlay component for Settings page with auth state monitoring
- [x] 13.5 Network request interception and logging for OTP functions
- [x] 13.6 Created diagnostic edge function for JWT validation
- [x] 13.7 Console logging throughout auth flow for comprehensive debugging

#### Implementation Summary:
**Completed**: Comprehensive auth/OTP diagnostics system:
- AuthCallback page now shows detailed debug info when PUBLIC_DEBUG_AUTH=true or ?debug=1
- AuthGuard detects and prevents infinite loops with user-friendly recovery options
- DebugOverlay provides real-time auth state, user data, OTP status, and JWT validation
- Network request interception logs all OTP function calls when enabled
- Diagnostic edge function (/functions/v1/diag) validates JWT and auth headers
- Enhanced console logging throughout afterLoginBootstrap and auth flows
- Environment flags allow granular control over debug features and auto-OTP behavior

#### Files Created/Updated:
- `src/pages/AuthCallback.tsx` - Enhanced with comprehensive debug info
- `src/components/AuthGuard.tsx` - Added loop detection and recovery
- `src/components/DebugOverlay.tsx` - New debug overlay component
- `src/hooks/useAuth.tsx` - Enhanced logging and debug controls
- `src/pages/Settings.tsx` - Added debug overlay integration
- `supabase/functions/diag/index.ts` - New diagnostic edge function

---

### 🔲 Task 12: Media Library & Attachment Support
**Priority**: LOW | **Estimated**: 4 days
**Status**: NOT STARTED

#### Subtasks:
- [ ] 12.1 Set up Supabase Storage for media files
- [ ] 12.2 Handle MMS media attachments via SMS
- [ ] 12.3 Create media gallery interface
- [ ] 12.4 Add media captioning and organization
- [ ] 12.5 Integrate media into PDF exports

#### Database Schema:
```sql
-- Media table
CREATE TABLE media (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  caption TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own media" ON media FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can upload own media" ON media FOR INSERT WITH CHECK (auth.uid() = user_id);
```

---

### ✅ Task 14: In-App Debug Toggles (No Environment Variables)
**Priority**: HIGH | **Estimated**: 4 hours
**Status**: COMPLETED ✅

#### Subtasks:
- [x] 14.1 Create `utils/debugConfig.ts` with URL params → localStorage → defaults priority
- [x] 14.2 Add floating DebugControls widget (only visible when debug enabled)
- [x] 14.3 Replace all environment variable usage with toggle functions
- [x] 14.4 Force signUp emailRedirectTo: `/auth/callback` for proper redirects
- [x] 14.5 Update all debug overlays and auth components to use new config system

#### Implementation Summary:
**Completed**: Full debug system overhaul replacing environment variables with in-app toggles:
- Created URL parameter and localStorage-based debug configuration
- Added floating debug controls widget for real-time toggle management
- Updated auth callback, bootstrap, and debug overlay to use new config
- Ensured all sign-up flows redirect to `/auth/callback`
- Removed dependency on build-time environment variables for debug features

#### Files Created/Updated:
- `src/utils/debugConfig.ts` - New debug configuration utility
- `src/components/DebugControls.tsx` - New floating debug controls widget
- `src/pages/AuthCallback.tsx` - Updated to use new debug config
- `src/hooks/useAuth.tsx` - Updated bootstrap to use toggle functions
- `src/pages/Auth.tsx` - Fixed email redirect to `/auth/callback`
- `src/components/DebugOverlay.tsx` - Updated to use new config system
- `src/App.tsx` - Added DebugControls component

---

## 🧪 Phase 3: Polish & Launch (Weeks 9-10)

### 🔲 Task 13: Testing & Quality Assurance
**Priority**: HIGH | **Estimated**: 5 days
**Status**: NOT STARTED

#### Subtasks:
- [ ] 13.1 Implement comprehensive error handling
- [ ] 13.2 Add loading states and skeleton screens
- [ ] 13.3 Test SMS flow end-to-end
- [ ] 13.4 Verify PDF generation across devices
- [ ] 13.5 Performance optimization and caching

---

### 🔲 Task 14: Production Deployment & Monitoring
**Priority**: HIGH | **Estimated**: 2 days
**Status**: NOT STARTED

#### Subtasks:
- [ ] 14.1 Set up production Supabase project
- [ ] 14.2 Configure custom domain
- [ ] 14.3 Set up monitoring and analytics
- [ ] 14.4 Create backup and recovery procedures
- [ ] 14.5 Launch marketing site integration

---

## 📊 Progress Tracking

### Completion Status:
- ✅ **Phase 1 Foundation**: 1/8 tasks complete (12.5%)
- 🔲 **Phase 1 Core**: 0/7 tasks complete (0%)
- 🔲 **Phase 2 Features**: 0/4 tasks complete (0%)  
- 🔲 **Phase 3 Polish**: 0/2 tasks complete (0%)

### Current Priority Queue:
1. **Task 2**: Supabase Setup & Authentication
2. **Task 3**: Journal Entry Data Model  
3. **Task 4**: SMS Integration (Twilio + OpenAI GPT prompts)
4. **Task 5**: AI Processing Pipeline (OpenAI GPT)
5. **Task 7**: PDF Export (Supabase Storage + Stripe payments)

### Tech Stack Confirmed:
- ✅ **SMS Provider**: Twilio (scalable, reliable)
- ✅ **AI Processing**: OpenAI GPT (with Claude-ready architecture)  
- ✅ **Payment Processing**: Stripe
- ✅ **File Storage**: Supabase Storage
- 🔲 **Physical Fulfillment**: TBD

---

## 🔗 Reference Documentation:
- [Masterplan](./masterplan.md) - Product vision and strategy
- [Implementation Plan](./implementation-plan.md) - Development phases and timeline  
- [Design Guidelines](./design-guidelines.md) - UI/UX standards and brand voice
- [App Flow](./app-flow-pages-and-roles.md) - User journeys and page structure

---

*Last Updated: [Current Date]*
*Next Review: Weekly during development*