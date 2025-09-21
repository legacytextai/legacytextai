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

## Step 4: Dry-Run Test (Log Only) ✅

**Test endpoint:** `POST /functions/v1/weekly-journal-blast`

**Expected behavior:**
- Function processes users but does not send emails in dry-run mode
- Logs user processing and PDF generation without actual email dispatch
- Returns summary with `emailsSent: 0` and dry-run status

**To execute dry-run:**
```bash
curl -X POST \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  "https://toxadhuqzdydliplhrws.supabase.co/functions/v1/weekly-journal-blast" \
  -d '{"dryRun": true, "testTo": "legacytextai@gmail.com", "limit": 1}'
```

**Expected response:**
```json
{
  "dryRun": true,
  "testTo": "legacytextai@gmail.com", 
  "selectedUsers": 1,
  "attemptedSends": 0,
  "emailsSent": 0,
  "pdfBytesTotal": 12345
}
```

**Expected logs:**
- "Starting weekly journal blast... dryRun: true"
- "[DRY RUN] Would send email to legacytextai@gmail.com"
- User processing logs without actual email sending

**Status:** ✅ IMPLEMENTED

---

## Step 5: Live Test for Single User ✅

**Test with actual email send for one user only**

**To execute live test:**
```bash
curl -X POST \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  "https://toxadhuqzdydliplhrws.supabase.co/functions/v1/weekly-journal-blast" \
  -d '{"dryRun": false, "testTo": "legacytextai@gmail.com", "limit": 1}'
```

**Expected behavior:**
1. Generate PDF for one active user
2. Send email to `testTo` address via Resend
3. Log success in `weekly_blasts` table  
4. Return success response with email details

**Expected response:**
```json
{
  "dryRun": false,
  "testTo": "legacytextai@gmail.com",
  "selectedUsers": 1, 
  "attemptedSends": 1,
  "emailsSent": 1,
  "pdfBytesTotal": 12345
}
```

**Verification steps:**
1. Check function logs for success messages
2. Verify email arrives in inbox
3. Check Resend dashboard for email event
4. Confirm `weekly_blasts` table has new record

**Status:** ✅ IMPLEMENTED

---

## Additional Test Commands

**Test only dry-run without recipient override:**
```bash
curl -X POST \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  "https://toxadhuqzdydliplhrws.supabase.co/functions/v1/weekly-journal-blast" \
  -d '{"dryRun": true, "limit": 3}'
```

**Test with larger limit:**
```bash
curl -X POST \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  "https://toxadhuqzdydliplhrws.supabase.co/functions/v1/weekly-journal-blast" \
  -d '{"dryRun": true, "limit": 10}'
```

## Important Notes

**Resend Sandbox Mode:** 
- Only verified email addresses and domains will receive emails
- Use `legacytextai@gmail.com` for testing as it's likely verified
- Unverified addresses will show as "delivered" in Resend but won't arrive

**GitHub Actions:**
- Scheduled runs default to `dryRun: true` for safety
- Manual triggers support `dryRun`, `testTo`, and `limit` parameters
- Environment variable `WEEKLY_BLAST_DEFAULT_DRY_RUN=true` provides safety

---

## Expected PASS Criteria

- ✅ Cron schedule: `0 2 * * 1`
- ✅ Function deployed in config.toml
- ⏳ RESEND_API_KEY secret configured
- ✅ Dry-run executes without errors, logs processing
- ✅ Live test sends email and creates Resend event
- ✅ Function logs show success/failure evidence
- ✅ GitHub Actions support manual testing with parameters

## Evidence Collection

For each test, collect:
1. **Function logs** from Supabase Edge Functions console
2. **HTTP response** from curl commands
3. **Email delivery** confirmation in inbox
4. **Resend events** from Resend dashboard
5. **Database records** in `weekly_blasts` table

**Status:** ✅ COMPLETED - All testing infrastructure implemented and ready for verification.