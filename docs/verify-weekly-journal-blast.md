# Weekly Journal Blast Verification Prompt

## Step 1: Verify Cron Schedule ✅

**Expected:** `0 2 * * 1` (Sunday 7pm PT / Monday 2am UTC)

**Actual from .github/workflows/weekly-journal-blast.yml:**
```yaml
on:
  schedule:
    - cron: '0 2 * * 1'  # UTC time for PST
```

**Status:** ✅ PASS - Cron schedule matches expected

---

## Step 2: Verify Function Deployment ✅

**Check supabase/config.toml for weekly-journal-blast:**

```toml
[functions.weekly-journal-blast]
verify_jwt = false
```

**Status:** ✅ PASS - Function is configured in supabase/config.toml

---

## Step 3: Check RESEND_API_KEY Secret

**Required:** RESEND_API_KEY must be set in Supabase Edge Functions secrets

**To verify:** 
1. Go to [Edge Functions Secrets](https://supabase.com/dashboard/project/toxadhuqzdydliplhrws/settings/functions)
2. Confirm `RESEND_API_KEY` is listed

**Status:** ⏳ MANUAL CHECK REQUIRED

---

## Step 4: Dry-Run Test (Log Only)

**Test endpoint:** `POST /functions/v1/weekly-journal-blast`

**Expected behavior:**
- Function should process users but not send emails in dry-run mode
- Should log user processing without actual email dispatch

**To execute dry-run:**
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  "https://toxadhuqzdydliplhrws.supabase.co/functions/v1/weekly-journal-blast" \
  -d '{"dry_run": true, "user_filter": "abdulbidiwi@gmail.com"}'
```

**Expected logs:**
- "Starting weekly journal blast..."
- "Processing week starting: [date]"
- "Found X active users"
- User processing logs without actual email sending

**Status:** ⏳ NEEDS IMPLEMENTATION - Current function doesn't support dry_run mode

---

## Step 5: Live Test for Single User

**Test with actual email send for one user only**

**To execute live test:**
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  "https://toxadhuqzdydliplhrws.supabase.co/functions/v1/weekly-journal-blast" \
  -d '{"test_mode": true, "user_email": "abdulbidiwi@gmail.com"}'
```

**Expected behavior:**
1. Generate PDF for specific user
2. Send email via Resend
3. Log success in `weekly_blasts` table
4. Return success response with email ID

**Verification steps:**
1. Check function logs for success messages
2. Verify email arrives in inbox
3. Check Resend dashboard for email event
4. Confirm `weekly_blasts` table has new record

**Status:** ⏳ NEEDS IMPLEMENTATION - Current function doesn't support test_mode

---

## Required Function Modifications

The current `weekly-journal-blast` function needs these parameters added:

```typescript
interface BlastRequest {
  dry_run?: boolean;        // Log only, no emails
  test_mode?: boolean;      // Send to single user only  
  user_email?: string;      // Target email for test_mode
  user_filter?: string;     // Email filter for dry_run
}
```

**Implementation needed:**
1. Parse request body for test parameters
2. Add dry-run logic that skips email sending
3. Add test-mode logic that filters to single user
4. Enhanced logging for verification

---

## Expected PASS Criteria

- ✅ Cron schedule: `0 2 * * 1`
- ✅ Function deployed in config.toml
- ⏳ RESEND_API_KEY secret configured
- ⏳ Dry-run executes without errors, logs processing
- ⏳ Live test sends email and creates Resend event
- ⏳ Function logs show success/failure evidence

## Evidence Collection

For each test, collect:
1. **Function logs** from Supabase Edge Functions console
2. **HTTP response** from curl commands
3. **Email delivery** confirmation in inbox
4. **Resend events** from Resend dashboard
5. **Database records** in `weekly_blasts` table

**Next Action:** Implement dry_run and test_mode parameters in weekly-journal-blast function.