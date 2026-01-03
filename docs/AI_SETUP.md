# AI Assistant Setup Guide

**Get your AI business assistant running in under 5 minutes!**

---

## What You'll Get

An intelligent AI assistant powered by Google's Gemini 2.0 Flash that:

- Answers questions about your business in plain English
- No need to navigate through complex reports
- Always available via floating chat button
- Understands your revenue, clients, invoices, and payments
- Costs ~$2-5/month (way cheaper than a bookkeeper!)

### Example Conversations

```
You: "How much did I make last month?"
AI: "You made $8,141 in December from 5 clients.
     Your biggest client was Austin Storage at $2,500."

You: "Who owes me money?"
AI: "3 clients owe you $4,250 total:
     - Austin Storage: $2,500 (45 days overdue)
     - Dallas Office: $1,200 (15 days overdue)
     - Houston Retail: $550 (on time)"

You: "Am I profitable?"
AI: "Yes! In Q4 2025:
     Revenue: $24,423
     You're doing great!"
```

---

## Setup Steps

### 1. Get a Gemini API Key (2 minutes)

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "**Get API key**" or "**Create API key**"
4. Click "**Create API key in new project**" (or use existing project)
5. Copy the API key (starts with `AIza...`)

**Free Tier Limits:**
- 15 requests per minute
- 1,500 requests per day
- Perfect for getting started!

**Cost (if you exceed free tier):**
- $0.075 per 1M input tokens (~$0.0002 per query)
- $0.30 per 1M output tokens (~$0.0001 per response)
- **Total: ~$2-5/month for typical usage**

### 2. Add API Key to Environment (1 minute)

1. Open your `.env.local` file (or create it if it doesn't exist)
2. Add this line:
   ```
   GEMINI_API_KEY=AIza_your_actual_key_here
   ```
3. Save the file

**Example .env.local:**
```bash
# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Email
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=onboarding@resend.dev

# AI Assistant
GEMINI_API_KEY=AIza_your_actual_key_here
```

### 3. Restart Dev Server (30 seconds)

```bash
# Stop the server (Ctrl+C)
# Then start it again:
npm run dev
```

### 4. Test It! (30 seconds)

1. Open your app: http://localhost:3000
2. Look for the **sparkle icon** (✨) button in bottom-right corner
3. Click it to open the AI chat
4. Try asking: **"How much did I make last month?"**
5. Watch the magic happen! 🎉

---

## Troubleshooting

### "GEMINI_API_KEY not configured"

**Cause**: API key not found in environment

**Solution**:
1. Make sure key is in `.env.local` (NOT `.env.example`)
2. Verify the variable name is exactly: `GEMINI_API_KEY`
3. Restart dev server after adding the key
4. Check for typos in the key

### "Invalid API key" or "Authentication failed"

**Cause**: API key is wrong or revoked

**Solution**:
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Check if your key is still valid
3. If not, create a new one
4. Update `.env.local` with the new key
5. Restart server

### "Quota exceeded" or "Rate limit"

**Cause**: You've exceeded the free tier limits

**Options**:
1. **Wait**: Free tier resets daily
2. **Upgrade**: Enable billing in Google Cloud for pay-as-you-go
3. **Optimize**: Reduce query frequency (still very cheap!)

### Chat button doesn't appear

**Check**:
1. You're logged in (not on login page)
2. Browser console for errors (F12)
3. Dev server is running without errors
4. Clear browser cache and refresh

### AI gives wrong or unhelpful answers

**This is normal in early stages!**

The AI learns from:
- Your actual business data
- The context we provide
- How you ask questions

**Tips for better answers**:
- Be specific: "Show me December 2025 revenue" vs "revenue"
- Ask follow-ups: "Can you break that down by client?"
- Give feedback: We'll add thumbs up/down soon

---

## Using the AI Assistant

### Best Practices

**Good Questions:**
- "How much did Austin Storage pay me in Q4?"
- "Who's my most profitable client?"
- "Show me invoices over 60 days old"
- "What's my average invoice amount?"
- "Is revenue growing?"

**Less Helpful:**
- "Help" (too vague)
- "What should I do?" (requires business context)
- Single words like "revenue" (be more specific)

### Keyboard Shortcuts

- **Open Chat**: Click the sparkle button (✨)
- **Send Message**: Press `Enter`
- **New Line**: Press `Shift + Enter`
- **Close Chat**: Click X or click overlay

### Suggested Prompts

When you first open the chat, you'll see suggested questions:
- "How much did I make last month?"
- "Who owes me money?"
- "Show my top clients"
- "What's my revenue trend?"

These are great starting points!

---

## Cost Management

### How Much Will This Cost?

**Typical Usage:**
```
Average user:
- 10 queries/day = 300/month
- Each query: ~$0.0003
- Total: ~$0.09/month

Power user:
- 50 queries/day = 1,500/month
- Each query: ~$0.0003
- Total: ~$0.45/month

Heavy user:
- 100 queries/day = 3,000/month
- Total: ~$0.90/month
```

**Compare To:**
- QuickBooks: $30-90/month
- Bookkeeper: $200-500/month
- Your time: Priceless!

### Monitoring Usage

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services → Gemini API**
3. Click **Quotas & Monitoring**
4. See your usage and costs

### Free Tier is Generous

- 15 requests/minute = 900/hour
- 1,500 requests/day
- For most small businesses, you'll stay free!

---

## Privacy & Security

### Your Data is Safe

- **No Training**: Gemini doesn't train on your data
- **Encrypted**: All API calls use HTTPS
- **No Sharing**: We don't share your data with Google beyond the API call
- **Temporary**: Gemini doesn't store your conversations

### What We Send to Gemini

**For each query, we send:**
- Your question
- Business summary (totals, stats)
- Recent invoices/payments (last 10)
- Top clients (top 5)
- AR aging summary

**We NEVER send:**
- Passwords
- API keys
- Full database dumps
- Personal client details (addresses, phone numbers)

### Security Best Practices

1. **Protect Your API Key**
   - Never commit `.env.local` to Git
   - Don't share your API key
   - Rotate keys periodically

2. **Monitor Usage**
   - Check Google Cloud Console monthly
   - Set up billing alerts
   - Watch for unusual patterns

3. **Rate Limiting**
   - Built-in: 15 requests/minute per user
   - Prevents abuse
   - Keeps costs low

---

## Advanced Configuration

### Customizing AI Behavior

The AI can be customized by editing:
```
src/features/ai/lib/gemini-client.ts
```

**Adjustable Settings:**
- `temperature`: Creativity (0-1, default: model default)
- `maxTokens`: Response length
- `systemPrompt`: AI personality and instructions

### Page-Specific Context

Future enhancement: AI will know what page you're on

Example:
```
On invoice page:
You: "Summarize this"
AI: "Invoice #1025 for Austin Storage..."

On client page:
You: "Payment history"
AI: "Austin Storage has paid 15 invoices..."
```

### Conversation History

Coming soon: AI will remember your conversation

Benefits:
- Follow-up questions work better
- "What about last quarter?" without repeating client name
- More natural conversations

---

## What's Next?

### Phase 1 ✅ (Current)
- Natural language queries
- Business context awareness
- Real-time data access
- Chat interface

### Phase 2 (Coming Soon)
- Smart actions ("Send payment reminder to Austin Storage")
- Chart generation in chat
- Conversation history
- Suggested insights

### Phase 3 (Future)
- Expense categorization from photos
- Tax estimates and guidance
- Predictive analytics
- Voice interface

---

## Getting Help

### AI Not Working?

1. **Check Environment**
   - `GEMINI_API_KEY` in `.env.local`?
   - Server restarted after adding key?

2. **Check API Key**
   - Valid at [Google AI Studio](https://aistudio.google.com/app/apikey)?
   - Copy/paste error?

3. **Check Logs**
   - Terminal where `npm run dev` is running
   - Browser console (F12 → Console tab)

4. **Test Connection**
   - Try a simple question like "Hello"
   - Should get a friendly response

### Still Stuck?

- **Check Docs**: This file!
- **GitHub Issues**: Report bugs
- **Email**: support@urbansimple.net

---

## FAQ

**Q: Do I need a Google Cloud account?**
A: No! Just a Google account to access AI Studio.

**Q: Will this work offline?**
A: No, it needs internet to reach Gemini API.

**Q: Can I use a different AI model?**
A: Yes! Code is modular. You could swap Gemini for Claude, GPT-4, etc.

**Q: Is my data used to train Gemini?**
A: No. Google doesn't train on API requests.

**Q: What if I hit the free tier limit?**
A: You can enable pay-as-you-go billing (still very cheap) or wait for daily reset.

**Q: Can multiple users use the same API key?**
A: Yes, but usage counts toward one quota. Consider separate keys for production.

**Q: How accurate is the AI?**
A: Very accurate for factual queries (revenue, clients, etc.). Less reliable for complex business advice.

**Q: Can it write invoices or make changes?**
A: Not yet! Phase 1 is read-only. Smart actions coming in Phase 2.

---

**Ready to simplify your business management with AI?**

🚀 Get your API key and start chatting!
