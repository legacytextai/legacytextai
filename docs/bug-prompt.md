# Bug Prompt Reference Guide
*Systematic debugging framework for LegacyText AI*

## Quick Start
When you encounter a bug, say **"Create Bug Prompt"** and I'll generate an optimized debugging request using this framework.

---

## Bug Classification System

### 🔐 Authentication & Authorization Issues
- **Symptoms**: Login failures, permission errors, user data not loading
- **Tools**: Security scan, RLS policy check, debug overlay, auth diagnostics
- **Investigation**: User verification status, phone confirmation, profile linking

### 🗄️ Database & Data Integrity Issues  
- **Symptoms**: Data not saving, orphaned records, constraint violations
- **Tools**: Database linter, schema analysis, migration review, RLS audit
- **Investigation**: Table relationships, triggers, constraints, data consistency

### 📱 SMS & External API Issues
- **Symptoms**: Messages not sending/receiving, webhook failures, OTP problems
- **Tools**: Network requests, function logs, Twilio diagnostics, prompt scheduler
- **Investigation**: Message flow, API credentials, webhook routing, rate limits

### 🎨 UI/UX & Frontend Issues
- **Symptoms**: Components not rendering, styling broken, state management errors
- **Tools**: Console logs, component inspection, design system audit
- **Investigation**: Component hierarchy, state flow, responsive design

### ⚡ Performance & Infrastructure
- **Symptoms**: Slow loading, timeout errors, resource exhaustion
- **Tools**: Performance monitoring, analytics, function execution logs
- **Investigation**: Query optimization, caching, resource usage

### 🛡️ Security Vulnerabilities
- **Symptoms**: Data exposure, unauthorized access, policy bypasses
- **Tools**: Security scanner, RLS policy audit, penetration testing
- **Investigation**: Access control, data leakage, policy effectiveness

---

## Investigation Framework

### Phase 1: Information Gathering (REQUIRED FIRST)
```markdown
Before attempting any fixes, run these diagnostic steps:

1. **Security & Access Control**
   - [ ] Run security scan: `security--run_security_scan`
   - [ ] Check RLS policies: `supabase--linter`
   - [ ] Verify user permissions and data access

2. **Database Integrity** 
   - [ ] Schema analysis: `security--get_table_schema`
   - [ ] Check constraints and triggers
   - [ ] Validate data relationships

3. **Authentication State**
   - [ ] Debug overlay analysis (check user session, phone status)
   - [ ] Auth diagnostic tests
   - [ ] Profile linking verification

4. **System Logs & Monitoring**
   - [ ] Console logs: `lov-read-console-logs`
   - [ ] Network requests: `lov-read-network-requests` 
   - [ ] Function logs (if applicable)

5. **Current State Documentation**
   - [ ] Reproduce the exact error
   - [ ] Document expected vs actual behavior
   - [ ] Identify affected user flows
```

### Phase 2: Root Cause Analysis
```markdown
Analyze findings to identify:

- **Immediate Cause**: What specific code/config is failing?
- **Contributing Factors**: What conditions enable this failure?
- **Root Cause**: What fundamental issue allows this to happen?
- **Systemic Impact**: What other areas might be affected?
```

### Phase 3: Solution Strategy
```markdown
Design solution approach:

- **Fix Strategy**: Address root cause, not just symptoms
- **Security Impact**: How does this change affect access control?
- **Data Integrity**: Will this maintain data consistency?
- **User Experience**: Does this improve or maintain UX?
- **Testing Plan**: How to verify the fix works completely?
```

---

## Prompt Templates

### 🔐 Authentication Bug Template
```markdown
**AUTHENTICATION BUG INVESTIGATION**

Issue: [Brief description]

INVESTIGATION REQUIRED (run in this order):
1. Run security scan to check for access control issues
2. Check RLS policies with database linter  
3. Analyze debug overlay for auth state inconsistencies
4. Review user verification and phone confirmation flow
5. Check for orphaned profiles or missing user data

ANALYSIS NEEDED:
- Auth user vs app user data consistency
- Phone verification complete flow validation
- Profile creation and linking process
- Session management and token validation

EXPECTED OUTCOME:
- Root cause identified (not just symptom)
- Security implications assessed
- Complete fix addressing underlying issue
```

### 🗄️ Database Bug Template  
```markdown
**DATABASE BUG INVESTIGATION**

Issue: [Brief description]

INVESTIGATION REQUIRED (run in this order):
1. Run database linter for structural issues
2. Get table schema and analyze relationships
3. Check constraints, triggers, and validation rules
4. Verify RLS policies are correctly implemented
5. Test data consistency across related tables

ANALYSIS NEEDED:
- Data model integrity and relationships
- Constraint violations and validation logic
- Migration history and schema evolution
- Performance implications of current structure

EXPECTED OUTCOME:
- Data integrity verified or issues identified
- Schema problems corrected
- Performance optimized if needed
```

### 📱 SMS/API Bug Template
```markdown
**SMS/API BUG INVESTIGATION**

Issue: [Brief description]

INVESTIGATION REQUIRED (run in this order):
1. Check network requests for API call patterns
2. Review function logs for external service integration
3. Verify webhook routing and message processing
4. Test SMS flow end-to-end with debug tools
5. Validate API credentials and rate limiting

ANALYSIS NEEDED:
- Message delivery pipeline integrity
- External service integration health
- Error handling and retry logic
- User communication preferences

EXPECTED OUTCOME:
- Message flow completely functional
- Error handling robust and user-friendly
- External integrations properly configured
```

### 🎨 UI/Frontend Bug Template
```markdown
**UI/FRONTEND BUG INVESTIGATION**

Issue: [Brief description]

INVESTIGATION REQUIRED (run in this order):
1. Check console logs for JavaScript errors
2. Inspect component hierarchy and props flow
3. Verify design system token usage
4. Test responsive design across viewports
5. Validate state management and data flow

ANALYSIS NEEDED:
- Component architecture and reusability
- Design system consistency
- State management patterns
- Performance and accessibility

EXPECTED OUTCOME:
- Clean, maintainable component structure
- Consistent design system usage
- Optimal user experience across devices
```

---

## Tool Usage Patterns

### Security-First Debugging
```bash
# Always start with security analysis
1. security--run_security_scan
2. supabase--linter  
3. security--get_table_schema
4. Analyze results before proceeding
```

### Database Investigation
```bash
# Systematic database analysis
1. supabase--read-query (check current data state)
2. supabase--analytics-query (check logs for errors)
3. Review schema and relationships
4. Test RLS policies manually
```

### Authentication Flow Debug
```bash
# Complete auth state verification  
1. Debug overlay analysis
2. User verification status check
3. Phone confirmation flow test
4. Profile creation/linking validation
```

---

## Red Flags (Stop and Investigate Deeper)

🚨 **CRITICAL SECURITY ISSUES**
- Data accessible without proper authentication
- RLS policies missing or ineffective
- User data bleeding between accounts
- Privilege escalation possible

🚨 **DATA INTEGRITY ISSUES**  
- Orphaned records or broken relationships
- Constraint violations being ignored
- Data inconsistency across related tables
- Missing validation logic

🚨 **SYSTEMIC FAILURES**
- Multiple user reports of same issue
- Cascading failures across features
- Performance degradation affecting core flows
- External service integration completely broken

---

## Common Root Causes & Solutions

### Authentication Issues
- **Root Cause**: Profile creation/linking logic incomplete
- **Solution**: Implement robust user onboarding with proper error handling

### Data Inconsistency  
- **Root Cause**: Missing database constraints or validation
- **Solution**: Add proper constraints, triggers, and validation logic

### Permission Problems
- **Root Cause**: RLS policies too restrictive or permissive
- **Solution**: Implement granular, well-tested access control

### Integration Failures
- **Root Cause**: Poor error handling for external services
- **Solution**: Robust retry logic and graceful degradation

---

## Emergency Bug Triage

### 🔥 P0 - Critical (Fix Immediately)
- Security vulnerabilities exposing user data
- Complete authentication system failure
- Data corruption or loss
- Total service outage

### ⚡ P1 - High (Fix Within Hours)
- Core user flows broken (signup, login, messaging)
- Data integrity issues affecting multiple users
- Performance severely degraded

### 📋 P2 - Medium (Fix Within Days)
- Non-core features broken
- UI/UX issues affecting usability
- Performance moderately degraded

### 📝 P3 - Low (Fix When Convenient)
- Minor UI inconsistencies
- Edge case bugs affecting few users
- Performance optimizations

---

## Quality Assurance Checklist

After implementing any bug fix:

### ✅ **Functionality Verification**
- [ ] Original issue completely resolved
- [ ] No regression in related features
- [ ] Edge cases properly handled
- [ ] User experience improved or maintained

### ✅ **Security Validation**
- [ ] No new security vulnerabilities introduced
- [ ] RLS policies still effective
- [ ] User data properly protected
- [ ] Access control maintained

### ✅ **Performance Impact**
- [ ] No significant performance degradation
- [ ] Database queries optimized
- [ ] Frontend rendering efficient
- [ ] API response times acceptable

### ✅ **Code Quality**
- [ ] Code follows project patterns
- [ ] Proper error handling implemented
- [ ] Documentation updated if needed
- [ ] Tests would pass (if we had them)

---

## Usage Instructions

### When to Use This Framework
- Any time you encounter a bug or unexpected behavior
- Before attempting quick fixes or patches
- When investigating user-reported issues
- During code reviews that reveal potential issues

### How to Use
1. **Say "Create Bug Prompt"** - I'll generate a specific debugging request
2. **Follow the Investigation Framework** - Complete Phase 1 before attempting fixes
3. **Use Appropriate Template** - Choose the template matching your bug type
4. **Apply Tool Patterns** - Use the systematic tool usage for thorough analysis
5. **Complete QA Checklist** - Verify fix quality before considering done

### Expected Outcomes
- **90% faster resolution** - Find root causes immediately instead of symptoms
- **Higher fix quality** - Address underlying issues, not just visible problems
- **Better security posture** - Always consider security implications first
- **Reduced regression** - Systematic approach prevents breaking other features

---

*Remember: The goal is not just to make the error go away, but to understand why it happened and prevent similar issues in the future.*