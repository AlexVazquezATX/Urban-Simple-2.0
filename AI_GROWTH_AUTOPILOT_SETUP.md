# AI Growth Autopilot Setup Guide

This guide explains how to set up and use the AI Growth Autopilot system.

## Overview

The AI Growth Autopilot transforms your GROWTH section into an automated system that:
1. **Discovers** prospects automatically using AI
2. **Scores** prospects to prioritize the best fits
3. **Drafts** personalized outreach messages
4. **Sends** follow-up sequences automatically
5. **Manages** pipeline stages based on engagement

## Daily Workflow

### Morning Routine (5 minutes)
1. Open **Command Center** (`/growth/outreach` → Dashboard tab)
2. Review **Approval Queue** - AI-drafted first contacts
3. Approve good messages (one-click)
4. Check **Hot Prospects** - high engagement alerts
5. Done! AI handles the rest

## Components

### 1. Command Center
- **Location**: `/growth/outreach` → Dashboard tab
- **Features**:
  - Approval Queue for first-contact messages
  - Hot Prospects showing high engagement
  - Overnight Activity summary
  - AI Insights and recommendations

### 2. AI Message Generator
- **Location**: `/growth/outreach` → Compose tab
- **Usage**: Select prospect → Click "Generate with AI" → Review → Send
- **Channels**: Email, SMS, LinkedIn, Instagram DM

### 3. Sequence Automation
- **Location**: `/growth/outreach` → Sequences tab
- **How it works**:
  - Create sequences with multiple steps
  - First contact requires approval
  - Follow-ups send automatically after approval

### 4. Discovery Engine
- **Location**: `/growth/discovery`
- **Features**:
  - Scheduled discovery jobs (nightly)
  - AI scoring and prioritization
  - Auto-enrichment with contact data

## Setting Up Cron Jobs

The autopilot requires scheduled jobs to run automatically. Set up these endpoints:

### 1. Discovery Jobs (Nightly at 2 AM)
```bash
# Add to your cron scheduler (Vercel Cron, GitHub Actions, etc.)
0 2 * * * curl -X POST https://your-domain.com/api/growth/discovery/jobs \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 2. Sequence Executor (Every Hour)
```bash
# Run every hour to send pending follow-ups
0 * * * * curl -X POST https://your-domain.com/api/growth/outreach/executor \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 3. Pipeline Automation (Every 15 Minutes)
```bash
# Check for pipeline stage changes
*/15 * * * * curl -X POST https://your-domain.com/api/growth/pipeline/automate \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Environment Variables

Add these to your `.env.local`:

```env
# Required
GOOGLE_GEMINI_API_KEY=your_gemini_api_key
CRON_SECRET=your_random_secret_string

# Optional (for actual sending)
RESEND_API_KEY=your_resend_key  # For email
TWILIO_ACCOUNT_SID=your_twilio_sid  # For SMS
TWILIO_AUTH_TOKEN=your_twilio_token
```

## Database Migration

Run Prisma migration to add new fields:

```bash
npx prisma migrate dev --name add_ai_autopilot_fields
npx prisma generate
```

## How It Works

### Discovery Flow
1. Scheduled job runs nightly
2. Searches Google Places + Yelp for prospects
3. AI scores each prospect (0-100)
4. Imports prospects with score ≥ 50
5. Auto-enriches with contact data

### Outreach Flow
1. AI drafts first-contact message
2. Message appears in Approval Queue
3. You approve (or edit) the message
4. Message sends immediately
5. Follow-up sequence starts automatically

### Pipeline Flow
1. Prospect moves to `contacted` when first message sent
2. Moves to `engaged` when they open/click
3. Moves to `qualified` when they reply
4. Hot prospects detected based on engagement score

## Customization

### Adjust AI Scoring Threshold
Edit `src/lib/ai/prospect-scorer.ts` to change scoring criteria.

### Modify Pipeline Rules
Edit `src/lib/ai/pipeline-automator.ts` to change stage transitions.

### Customize Message Templates
Create templates in `/growth/outreach` → Templates tab. AI will use them as reference.

## Troubleshooting

### Messages Not Sending
- Check cron jobs are running
- Verify `CRON_SECRET` matches in cron and env
- Check API logs for errors

### AI Not Generating Content
- Verify `GOOGLE_GEMINI_API_KEY` is set
- Check Gemini API quota/billing
- Review API logs for errors

### Prospects Not Moving Stages
- Check `pipeline-automator.ts` rules
- Verify activities are being logged correctly
- Check prospect status in database

## Next Steps

1. **Set up cron jobs** using Vercel Cron or similar
2. **Create your first sequence** in Sequences tab
3. **Test AI generation** with a few prospects
4. **Review Approval Queue** daily
5. **Monitor Hot Prospects** for immediate opportunities

## Support

For issues or questions, check:
- API logs in your hosting platform
- Database for prospect/activity records
- Cron job execution logs
