## 📅 LegacyText Prompt Scheduling System

### Overview

LegacyText uses a **timezone-aware scheduling system** to send daily journaling prompts at optimal times based on each user's local timezone. The system automatically handles daylight saving time transitions and ensures users receive exactly one prompt per local calendar day.

---

### 📍 Prompt Timing

| Day Type | Local Time | Purpose |
|----------|------------|---------|
| **Weekdays** (Mon-Fri) | **7:00 PM** | Evening reflection after the day ends |
| **Weekends** (Sat-Sun) | **8:00 AM** | Morning calm for weekend reflection |

**All times are in the user's local timezone**, as specified in the `timezone` field of the `users_app` table.

---

### 🏗️ System Architecture

#### GitHub Actions Scheduler
**File**: `.github/workflows/daily-prompts.yml`

- **Frequency**: Runs **every hour** on the hour (UTC)
- **Cron**: `0 * * * *`
- **Purpose**: Triggers the edge function 24 times per day to check which users should receive prompts

#### Edge Function
**File**: `supabase/functions/send-daily-prompts/index.ts`

**Main Logic Flow**:
1. Fetch all active users with their timezone information
2. For each user:
   - Calculate current local time using their `timezone` value
   - Determine if it's the target hour (7 PM weekday or 8 AM weekend)
   - Check if user has already received a prompt today (local day guard)
   - Generate/select appropriate prompt
   - Send via Twilio SMS
   - Log to `daily_prompts` and `messages` tables

---

### 🌍 Timezone Handling

#### Default Timezone
- Users without a `timezone` value default to `America/Los_Angeles` (Pacific Time)

#### Valid Timezones
Any IANA timezone database identifier, including:
- `America/New_York` (Eastern Time)
- `America/Chicago` (Central Time)
- `America/Denver` (Mountain Time)
- `America/Los_Angeles` (Pacific Time)
- `Europe/London`
- `Asia/Tokyo`
- etc.

#### Daylight Saving Time (DST)
- Automatically handled by JavaScript's `toLocaleString()` method
- No special logic required for Spring Forward or Fall Back transitions
- Users continue receiving prompts at correct local clock time

---

### 🛡️ Guard Mechanisms

#### Local-Day Guard
Prevents duplicate sends within the same **local calendar day**:

```typescript
// Calculate start of local day (00:00:00 in user's timezone)
const tz = user.timezone || "America/Los_Angeles";
const localNowStr = new Date().toLocaleString("en-US", { timeZone: tz });
const localNow = new Date(localNowStr);
localNow.setHours(0, 0, 0, 0);
const startLocalISO = localNow.toISOString();

// Check if prompt already sent today (local day)
const { data: existing } = await supabase
  .from("daily_prompts")
  .select("id")
  .eq("user_id", user.id)
  .gte("sent_at", startLocalISO)
  .eq("source", "schedule")
  .limit(1);

if (existing && existing.length) continue; // Skip user
```

**Why Local-Day Instead of UTC-Day?**
- A user in Tokyo (UTC+9) at 7 PM Monday local time might still be in Sunday UTC
- Using UTC day boundaries would allow duplicate sends
- Local-day boundaries ensure exactly one prompt per user's calendar day

---

### 🔄 Execution Flow Example

**Scenario**: It's 15:00 UTC on a Tuesday

| User | Timezone | Local Time | Day Type | Target Hour | Send? |
|------|----------|------------|----------|-------------|-------|
| Alice | `America/Los_Angeles` | 8:00 AM | Weekday | 7 PM | ❌ Skip |
| Bob | `America/New_York` | 11:00 AM | Weekday | 7 PM | ❌ Skip |
| Carol | `Europe/London` | 4:00 PM | Weekday | 7 PM | ❌ Skip |
| Dan | `Asia/Tokyo` | 12:00 AM (Wed) | Weekday | 7 PM | ❌ Skip |

**Next Hour (16:00 UTC)**:
- No users match target hour, all skipped

**Later at 02:00 UTC (Wednesday)**:
| User | Timezone | Local Time | Day Type | Target Hour | Send? |
|------|----------|------------|----------|-------------|-------|
| Alice | `America/Los_Angeles` | 7:00 PM (Tue) | Weekday | 7 PM | ✅ **Send** |
| Bob | `America/New_York` | 10:00 PM (Tue) | Weekday | 7 PM | ❌ Skip |
| Carol | `Europe/London` | 3:00 AM (Wed) | Weekday | 7 PM | ❌ Skip |
| Dan | `Asia/Tokyo` | 11:00 AM (Wed) | Weekday | 7 PM | ❌ Skip |

---

### 📊 Database Schema

#### Required Fields in `users_app`
```sql
timezone TEXT DEFAULT 'America/Los_Angeles'
status TEXT -- Must be 'active' to receive prompts
```

#### Logging Tables
**`daily_prompts`**: Records each sent prompt
- Indexed by `user_id` and `sent_at` for efficient guard checks
- Includes `source` field (`'schedule'` vs `'manual'`)

**`messages`**: Records all SMS sent/received
- Includes Twilio SID for tracking

---

### 🧪 Testing

#### Test Scenarios
1. ✅ User at 7 PM weekday local time receives prompt
2. ✅ User at 8 AM weekend local time receives prompt
3. ✅ User at any other time is skipped
4. ✅ User who received prompt today is blocked by local-day guard
5. ✅ User with invalid timezone is skipped with error log
6. ✅ User with NULL timezone defaults to Pacific Time
7. ✅ DST transitions don't cause duplicate or missed sends

#### Manual Testing
```bash
# Trigger GitHub Action manually
# GitHub → Actions → "Send Timezone-Aware Prompts" → Run workflow

# Check edge function logs
# Supabase → Functions → send-daily-prompts → Logs

# Look for:
# [Timezone Check] entries showing which users were evaluated
# [Guard] entries showing when duplicates were prevented
# ✓ Sent entries showing successful deliveries
```

---

### 🚨 Edge Cases

| Edge Case | Handling |
|-----------|----------|
| User has NULL `timezone` | Defaults to `America/Los_Angeles` |
| Invalid timezone string | Caught in try/catch, user skipped with error log |
| DST Spring Forward (2 AM → 3 AM) | JavaScript handles automatically; no missed prompts |
| DST Fall Back (2 AM → 1 AM) | Local-day guard prevents duplicate in "repeated" hour |
| User changes timezone mid-day | Next hourly run uses new timezone; guard still applies |
| GitHub Actions downtime | Resumes next hour; guard prevents duplicates |
| User in timezone where target hour doesn't exist | Rare DST edge case; skipped that hour, tries next day |

---

### 📈 Performance & Cost

#### Execution Metrics
- **GitHub Actions runs**: 24 per day (hourly)
- **Edge function invocations**: 24 per day
- **Database queries**: ~6 per user per day (spread across 24 hours)
- **Actual prompts sent**: 1 per active user per day

#### Cost Impact
- **GitHub Actions**: Within free tier for most plans
- **Supabase Edge Functions**: Minimal cost increase (24 invocations vs 1)
- **Database queries**: Negligible increase
- **Twilio SMS**: **No change** (same number of messages sent)

**Total added cost**: ~$0.001 per day per project

---

### 🔮 Future Enhancements

**Not currently implemented, but planned for future versions:**

- **Per-user schedule preferences**: Let users choose custom times
- **Multiple prompts per day**: Morning + evening prompts
- **Quiet hours**: Don't send between 10 PM - 7 AM
- **Smart timing**: Learn when users typically respond
- **Timezone auto-detection**: Infer from phone number area code

---

### 📝 Migration Notes

**From previous system (8 AM PT daily)**:
- ✅ All users automatically benefit from timezone-aware delivery
- ✅ No data migration required
- ✅ No UI changes needed (timezone already in settings)
- ✅ Existing `daily_prompts` records remain valid
- ⚠️ Users may notice prompt time changes (now respects their local timezone)

**Rollback procedure** (if needed):
1. Revert GitHub Actions cron to `0 15 * * *` (daily at 8 AM PT)
2. Comment out `shouldSendPromptNow()` check in edge function
3. Restore UTC-based guard logic

---

### 🔗 Related Files

- `.github/workflows/daily-prompts.yml` - Hourly scheduler
- `supabase/functions/send-daily-prompts/index.ts` - Main logic
- `docs/masterplan.md` - Product roadmap
- `docs/implementation-plan.md` - Implementation guide
- `docs/tasks.md` - Task tracking

---

**Last Updated**: November 2, 2025
**System Status**: ✅ Live in Production
