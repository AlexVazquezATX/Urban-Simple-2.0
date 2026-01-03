# Email Sending Troubleshooting Guide

## Common Issues and Solutions

### 1. "You can only send testing emails to your own email address" ⭐ MOST COMMON

**Error Message:**
```
You can only send testing emails to your own email address (youremail@gmail.com).
To send emails to other recipients, please verify a domain at resend.com/domains
```

**Why This Happens:**
Resend's free tier only allows sending test emails to the email address you signed up with until you verify a domain. This is totally normal and expected!

**Solution A - Quick Testing (2 minutes) ✅ RECOMMENDED FOR NOW:**
1. Click "Send Invoice" on any invoice
2. **Change the recipient email to YOUR email** (`avazquez2121@gmail.com`)
3. Click Send
4. Check your inbox - you'll see the beautiful invoice email!

This lets you test that everything works perfectly before setting up for production.

**Solution B - Send to Real Clients (10 minutes):**
1. Go to https://resend.com/domains
2. Click "Add Domain"
3. Enter your domain (e.g., `urbansimple.net` or `yourbusiness.com`)
4. Add the DNS records they provide (TXT, MX, CNAME records)
5. Wait for verification (usually 5-10 minutes)
6. Add to `.env.local`:
   ```
   RESEND_FROM_EMAIL=invoices@yourdomain.com
   ```
7. Restart dev server
8. Now you can send to any client email address!

---

### 2. "500 Internal Server Error" When Sending

**Check Your Terminal**
Look at your `npm run dev` terminal output. You should see a detailed error message.

**Most Common Causes:**

#### A. Missing API Key
**Error**: "RESEND_API_KEY not configured"

**Solution**:
1. Make sure you have `.env.local` file in your project root
2. Add this line:
   ```
   RESEND_API_KEY=re_your_actual_key_here
   ```
3. Get your key from: https://resend.com/api-keys
4. **Restart** your dev server (`Ctrl+C` then `npm run dev`)

#### B. Invalid API Key
**Error**: "Authentication failed" or "Invalid API key"

**Solution**:
1. Go to https://resend.com/api-keys
2. Make sure your key is still valid (not deleted)
3. Copy the FULL key (starts with `re_`)
4. Update `.env.local`
5. Restart dev server

#### C. Email Address Not Verified (Development Mode)
**Error**: "Domain not verified" or "Email not verified"

**Solution for Testing:**
- Resend's free tier uses `onboarding@resend.dev` as sender
- You can send TO any email address
- The code already uses this - just make sure you're using a valid recipient email

**Solution for Production:**
1. Go to https://resend.com/domains
2. Click "Add Domain"
3. Add your domain (e.g., `urbansimple.net`)
4. Add the DNS records (SPF, DKIM, DMARC)
5. Wait for verification
6. Update `from` in `src/lib/email.ts`

### 2. Email Not Arriving

**Check Spam Folder**
- Development emails (from `onboarding@resend.dev`) often go to spam
- This is normal!
- Production emails with verified domain won't have this issue

**Check Resend Dashboard**
1. Go to https://resend.com/emails
2. Find your sent email
3. Check status:
   - ✅ **Delivered** - Email sent successfully
   - ⏳ **Queued** - Being processed
   - ❌ **Bounced** - Email address invalid
   - ❌ **Failed** - See error message

### 3. "Cannot read property 'send' of undefined"

**Cause**: Resend not initialized properly

**Solution**:
1. Make sure `resend` package is installed:
   ```bash
   npm install resend react-email @react-email/components
   ```
2. Restart dev server

### 4. Rate Limit Exceeded

**Error**: "Too many requests"

**Cause**: Free tier limits hit
- 100 emails/day
- 3,000 emails/month

**Solution**:
- Wait until tomorrow (limits reset daily)
- Or upgrade to Pro ($20/mo for 50,000 emails)

## Testing Checklist

Before sending real invoices, test with these steps:

1. ✅ **Verify API Key Setup**
   ```bash
   # In terminal:
   echo $RESEND_API_KEY  # Should show your key
   ```

2. ✅ **Send Test Email**
   - Go to Invoices page
   - Click "Send Invoice" on any invoice
   - Use YOUR email address as recipient
   - Check terminal for errors
   - Check email inbox (and spam!)

3. ✅ **Check Resend Dashboard**
   - Visit https://resend.com/emails
   - Confirm email shows as "Delivered"

4. ✅ **Verify Email Content**
   - Check formatting looks good
   - Verify invoice details are correct
   - Test on mobile device

## Environment Variables Checklist

Make sure your `.env.local` has:

```bash
# Required for email
RESEND_API_KEY=re_xxxxxxxxxxxxx

# These should already exist
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Still Having Issues?

1. **Check Terminal Output** - Most errors show here with details
2. **Check Resend Dashboard** - See actual email delivery status
3. **Try with different email** - Some providers block automated emails
4. **Restart everything**:
   ```bash
   # Stop dev server (Ctrl+C)
   npm run dev
   ```

## Getting Help

1. Copy error message from terminal
2. Check Resend docs: https://resend.com/docs
3. Or create GitHub issue with:
   - Error message
   - What you were trying to do
   - Your `.env.local` setup (WITHOUT sharing actual keys!)
