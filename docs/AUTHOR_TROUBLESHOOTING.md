# Author Role Troubleshooting Guide

This guide helps resolve common issues related to author roles and permissions.

## Quick Diagnostic Checklist

Before contacting support, please check:

- [ ] You are logged in with the correct account
- [ ] You completed the invitation registration process
- [ ] You can see "Admin Dashboard" in your navigation menu
- [ ] Your browser cache is cleared
- [ ] You're using a supported browser (Chrome, Firefox, Safari, Edge)

## Common Issues and Solutions

### Issue 1: "I don't see the Admin Dashboard option"

**Symptoms:**
- No "Admin Dashboard" link in navigation
- Only see regular reader features
- Can't create or edit articles

**Possible Causes:**
1. **Role not assigned**: Your author role wasn't properly assigned during registration
2. **Login issue**: You're not logged in or using wrong account
3. **Cache problem**: Browser is showing old version of the site

**Solutions:**

**Step 1: Verify Login**
```
1. Log out completely
2. Clear browser cache and cookies
3. Log back in with your registered email
4. Check if Admin Dashboard appears
```

**Step 2: Check Account Details**
```
1. Go to your profile settings
2. Verify the email address matches your invitation
3. Look for any role information displayed
```

**Step 3: Contact Administrator**
```
If steps 1-2 don't work:
1. Note your registered email address
2. Note when you completed registration
3. Contact an admin with this information
```

### Issue 2: "Access Denied" when trying to use author features

**Symptoms:**
- Can see Admin Dashboard but get "Access Denied" errors
- Some features work, others don't
- Inconsistent permissions

**Possible Causes:**
1. **Partial role assignment**: Role was assigned but not fully propagated
2. **Session issue**: Your login session has stale permission data
3. **Database inconsistency**: Role data is inconsistent

**Solutions:**

**Step 1: Refresh Session**
```
1. Log out completely
2. Wait 2-3 minutes
3. Log back in
4. Try accessing author features again
```

**Step 2: Clear All Browser Data**
```
1. Clear cookies, cache, and local storage
2. Close all browser tabs
3. Restart browser
4. Log in again
```

**Step 3: Report Specific Errors**
```
If issue persists:
1. Note which specific features don't work
2. Take screenshots of error messages
3. Contact support with detailed information
```

### Issue 3: "Can't edit my own articles"

**Symptoms:**
- Can see your articles but no "Edit" button
- Edit button is grayed out
- Get permission errors when trying to edit

**Possible Causes:**
1. **Article status**: Article might be in review or published
2. **Ownership issue**: System doesn't recognize you as the author
3. **Permission cache**: Stale permission data

**Solutions:**

**Step 1: Check Article Status**
```
1. Look at the article status indicator
2. If "Pending Review" - wait for review completion
3. If "Published" - editing will require new review
```

**Step 2: Verify Ownership**
```
1. Check if your name appears as the author
2. Verify you're logged in with the correct account
3. Look for "Created by: [Your Name]" in article details
```

**Step 3: Force Permission Refresh**
```
1. Log out and back in
2. Navigate directly to Articles page
3. Try editing again
```

### Issue 4: "Articles not appearing in my list"

**Symptoms:**
- Created articles don't show up
- Article count doesn't match what you created
- Missing articles from your dashboard

**Possible Causes:**
1. **Filter settings**: Articles list is filtered
2. **Status confusion**: Looking in wrong status category
3. **Database sync issue**: Articles not properly associated with your account

**Solutions:**

**Step 1: Check Filters**
```
1. Go to Articles page
2. Clear all filters
3. Look for "Show All Articles" option
4. Check different status tabs (Draft, Published, etc.)
```

**Step 2: Search by Title**
```
1. Use the search box to find specific articles
2. Search for partial titles you remember
3. Check if articles appear in search results
```

**Step 3: Verify Creation**
```
1. Check if you actually saved the articles (not just drafted)
2. Look in "Drafts" section for unsaved work
3. Check browser's back button for unsaved content
```

## Role Assignment Issues

### Understanding Role Assignment Process

**Normal Flow:**
1. Admin sends invitation → 2. You receive email → 3. Click invitation link → 4. Complete registration → 5. Author role assigned automatically

**Where It Can Go Wrong:**
- Step 4-5: Role assignment fails during registration
- Database trigger doesn't fire
- Service error during role assignment
- Network interruption during registration

### Manual Role Assignment Request

If automatic role assignment failed, an administrator can manually assign your role:

**Information to Provide:**
```
- Your registered email address
- Date/time you completed registration
- Invitation email you received (forward if possible)
- Any error messages you saw during registration
- Screenshots of your current dashboard view
```

**How to Request:**
1. Email support with above information
2. Use "Contact Admin" feature in the platform
3. Ask the person who invited you to follow up

## Browser and Technical Issues

### Supported Browsers

**Fully Supported:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Limited Support:**
- Internet Explorer (not recommended)
- Older browser versions

### Cache and Cookie Issues

**Clear Browser Data:**
```
Chrome:
1. Press Ctrl+Shift+Delete (Cmd+Shift+Delete on Mac)
2. Select "All time" as time range
3. Check "Cookies" and "Cached images and files"
4. Click "Clear data"

Firefox:
1. Press Ctrl+Shift+Delete (Cmd+Shift+Delete on Mac)
2. Select "Everything" as time range
3. Check "Cookies" and "Cache"
4. Click "Clear Now"

Safari:
1. Go to Safari > Preferences > Privacy
2. Click "Manage Website Data"
3. Click "Remove All"
4. Confirm removal
```

### Network and Connectivity

**Check Connection:**
- Ensure stable internet connection
- Try accessing other websites
- Disable VPN if using one
- Try different network (mobile hotspot)

**Firewall/Security Software:**
- Temporarily disable ad blockers
- Check if security software is blocking the site
- Try incognito/private browsing mode

## Getting Help

### Before Contacting Support

**Gather This Information:**
1. Your registered email address
2. Browser and version you're using
3. Operating system (Windows, Mac, etc.)
4. Exact error messages (screenshots helpful)
5. Steps you took before the issue occurred
6. Whether this worked before or is a new problem

### Contact Methods

**Priority Support (Technical Issues):**
- Email: tech-support@platform.com
- Response time: 2-4 hours during business hours

**General Support:**
- Email: support@platform.com
- In-app help system
- Response time: 24-48 hours

**Emergency Contact (Site Down/Critical Issues):**
- Emergency email: emergency@platform.com
- Response time: 30 minutes to 2 hours

### What to Include in Support Requests

**Essential Information:**
```
Subject: Author Role Issue - [Brief Description]

Account Details:
- Email: your-email@example.com
- Registration Date: [when you signed up]
- Invitation Source: [who invited you]

Issue Description:
- What you were trying to do
- What happened instead
- Error messages (exact text or screenshots)
- When the issue started

Browser Information:
- Browser: Chrome/Firefox/Safari/Edge
- Version: [browser version]
- Operating System: Windows/Mac/Linux

Steps Already Tried:
- List what you've already attempted
- Include results of troubleshooting steps
```

**Helpful Attachments:**
- Screenshots of error messages
- Screenshots of your current dashboard view
- Copy of invitation email (if available)

## Prevention Tips

### Avoid Common Issues

**During Registration:**
- Complete registration in one session
- Don't close browser during the process
- Ensure stable internet connection
- Use a supported browser

**Regular Maintenance:**
- Clear browser cache weekly
- Keep browser updated
- Log out/in periodically to refresh session
- Don't use multiple tabs for the same account

**Best Practices:**
- Bookmark the direct dashboard URL
- Save important work frequently
- Use strong, unique passwords
- Enable two-factor authentication if available

---

## Still Need Help?

If this troubleshooting guide doesn't resolve your issue:

1. **Document the problem** with screenshots and detailed steps
2. **Try the solutions** in order as listed above
3. **Contact support** with all relevant information
4. **Be patient** - complex role issues may take time to resolve

Remember: Most role-related issues can be resolved quickly once properly diagnosed. The key is providing detailed information about what you're experiencing.