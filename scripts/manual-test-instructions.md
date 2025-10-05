# Manual Testing Instructions for RLS Policy Fixes

## 🧪 Test the Fixed Functionality

After running the automated tests successfully, you can manually verify the fixes work in the actual application:

### Test 1: Invitation Form Submission (Anonymous User)

1. **Open the app in an incognito/private browser window**
2. **Navigate to the About page** (where the invitation form is located)
3. **Fill out the invitation request form** with test data:
   - Parent Name: "Test Parent"
   - Parent Email: "test@example.com" 
   - Child Name: "Test Child"
   - Child Age: 10
   - Message: "Testing the fixed form"
4. **Submit the form**
5. **Expected Result**: ✅ Form submits successfully without errors
6. **Check**: No 403 Forbidden errors in browser console

### Test 2: Invitation Form Submission (Logged-in User)

1. **Log into the application** with any user account
2. **Navigate to the About page**
3. **Fill out the invitation request form** with different test data
4. **Submit the form**
5. **Expected Result**: ✅ Form submits successfully (this was failing before)
6. **Check**: No authentication context errors

### Test 3: Admin Invitation Management

1. **Log in as an admin user** (you may need to create one first)
2. **Navigate to the Admin Portal** → **Invitation Management**
3. **Find a pending invitation request**
4. **Click "Approve" on the invitation**
5. **Expected Result**: ✅ Status updates to "Approved" without errors
6. **Check**: No 403 Forbidden errors in browser console or network tab

### Test 4: Email Event Logging Verification

1. **Open browser developer tools** → **Network tab**
2. **Perform any of the above actions** (form submission or admin approval)
3. **Look for API calls** to Supabase
4. **Expected Result**: ✅ No failed requests related to email_events
5. **Check**: All email logging operations succeed

## 🔍 What to Look For

### ✅ Success Indicators:
- Form submissions work for both anonymous and logged-in users
- Admin approvals complete without errors
- No 403 Forbidden errors in console
- Email notifications are sent (check email or logs)
- Status updates reflect correctly in the UI

### ❌ Failure Indicators:
- 403 Forbidden errors in browser console
- Form submission failures with RLS policy errors
- Admin approval buttons don't work
- Network requests failing with permission errors

## 🐛 If You Find Issues:

1. **Check browser console** for specific error messages
2. **Check network tab** for failed API requests
3. **Look at the error details** - they should be more specific now
4. **Run the automated test script again** to verify database-level functionality
5. **Check Supabase logs** if needed: `supabase functions logs send-email`

## 📊 Database Verification (Optional)

If you want to verify the database changes directly:

```sql
-- Check that email events are being logged
SELECT type, email, template, timestamp 
FROM email_events 
ORDER BY timestamp DESC 
LIMIT 10;

-- Check RLS policies are active
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'email_events';
```

## 🎯 Expected Behavior Changes

**Before the fix:**
- ❌ Logged-in users couldn't submit invitation forms
- ❌ Admin approvals failed with 403 Forbidden errors
- ❌ Email event logging failed due to RLS violations

**After the fix:**
- ✅ Both anonymous and authenticated users can submit forms
- ✅ Admin approvals work smoothly
- ✅ Email events are logged correctly for all operations
- ✅ Proper error messages if something does go wrong

---

**Ready to proceed with Task #2 once these manual tests confirm everything works! 🚀**