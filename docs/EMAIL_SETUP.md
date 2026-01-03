# Email Setup Guide - Resend Integration

Urban Simple uses [Resend](https://resend.com) for sending invoice emails. This guide will help you set up email functionality in under 10 minutes.

## Why Resend?

- ✅ **Simple API** - Just one environment variable needed
- ✅ **Free tier** - 3,000 emails/month (100/day)
- ✅ **Beautiful templates** - React Email integration
- ✅ **Great deliverability** - Professional email infrastructure
- ✅ **Email tracking** - See when emails are opened and clicked
- ✅ **No credit card required** for free tier

## Setup Steps

### 1. Create a Resend Account

1. Go to [resend.com](https://resend.com)
2. Click "Sign Up" (free, no credit card needed)
3. Verify your email address

### 2. Get Your API Key

1. Log in to [resend.com/api-keys](https://resend.com/api-keys)
2. Click "Create API Key"
3. Give it a name (e.g., "Urban Simple Development")
4. Select permission: **Sending access**
5. Click "Add"
6. **Copy the API key** (starts with `re_`)

### 3. Add API Key to Environment

1. Open `.env.local` (or `.env`) in your project root
2. Add this line:
   ```
   RESEND_API_KEY=re_your_actual_api_key_here
   ```
3. Save the file

### 4. Configure Your Sending Domain (Optional but Recommended)

**For Development:**
- Use the default `onboarding@resend.dev` domain
- Emails will work but may go to spam
- Good for testing

**For Production:**
1. Go to [resend.com/domains](https://resend.com/domains)
2. Click "Add Domain"
3. Enter your domain (e.g., `urbansimple.net`)
4. Add the DNS records shown (SPF, DKIM, DMARC)
5. Wait for verification (usually takes a few minutes)
6. Update the `from` address in `src/lib/email.ts`:
   ```typescript
   from = 'invoices@yourdomain.com'
   ```

## Testing Email Functionality

### Test 1: Send a Test Email

```bash
# Create a test script (optional)
npm run dev
```

Then visit your app, go to **Invoices**, and click **Send Invoice** on any invoice.

### Test 2: Check Email Logs

1. Go to [resend.com/emails](https://resend.com/emails)
2. You'll see all sent emails with:
   - Delivery status
   - Open tracking
   - Click tracking
   - Bounce/complaint reports

## Email Template Customization

The invoice email template is located at:
```
src/emails/invoice-email.tsx
```

To customize:
1. Edit the template (it's just React/TSX)
2. Update colors, text, layout, etc.
3. Preview locally by running:
   ```bash
   npm run email:dev
   ```

## Troubleshooting

### "Unauthorized" Error
- Check that `RESEND_API_KEY` is in your `.env.local`
- Verify the key starts with `re_`
- Restart your dev server (`npm run dev`)

### Emails Going to Spam
- **Development**: This is normal with onboarding@ domain
- **Production**:
  - Verify your custom domain
  - Add SPF, DKIM, DMARC records
  - Warm up your domain by sending gradually

### Rate Limits
- Free tier: 100 emails/day, 3,000/month
- If you hit limits, upgrade to Pro ($20/mo for 50k emails)

## Production Checklist

Before going live:

- [ ] Add custom domain to Resend
- [ ] Verify domain with DNS records
- [ ] Update `from` address in `src/lib/email.ts`
- [ ] Test sending to multiple email providers (Gmail, Outlook, etc.)
- [ ] Set up email templates for:
  - [ ] Invoices
  - [ ] Payment receipts (future)
  - [ ] Payment reminders (future)
  - [ ] Welcome emails (future)

## Monitoring

Resend provides built-in monitoring:
- **Dashboard**: [resend.com/emails](https://resend.com/emails)
- **Webhooks**: Get notified of deliveries, opens, clicks
- **Analytics**: Track email performance over time

## Support

- Resend Docs: [resend.com/docs](https://resend.com/docs)
- React Email Docs: [react.email](https://react.email)
- Urban Simple Issues: [GitHub Issues](https://github.com/AlexVazquezATX/Urban-Simple-2.0/issues)

## Cost Breakdown

| Tier | Price | Emails/Month | Best For |
|------|-------|--------------|----------|
| Free | $0 | 3,000 | Development, small businesses |
| Pro | $20/mo | 50,000 | Growing businesses |
| Enterprise | Custom | Unlimited | Large organizations |

Most users will be fine with the **free tier** for the first few months!
