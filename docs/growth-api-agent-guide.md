# Krew42 Growth API — Agent Guide

## Authentication

Every request must include this header:

```
Authorization: Bearer us_live_YOUR_KEY_HERE
```

API keys are created at **Growth > API Keys** in the app sidebar (admin only).

**Base URL:** `https://www.krew42.com`

> Important: Use `www.krew42.com`, NOT `krew42.com`. The bare domain does a 307 redirect that strips the Authorization header.

---

## Typical Workflow: Find Leads > Enrich > Outreach

### Step 1 — Discover prospects

```
POST /api/growth/discovery/search
Body: {
  "query": "commercial cleaning clients",
  "location": "Austin, TX",
  "type": "restaurant",
  "radius": 25
}
```

### Step 2 — Check for duplicates before adding

```
POST /api/growth/prospects/check-duplicates
Body: { "companyName": "Joe's BBQ" }
```

### Step 3 — Add to CRM

```
POST /api/growth/prospects
Body: {
  "companyName": "Joe's BBQ",
  "businessType": "restaurant",
  "address": "123 Main St, Austin TX",
  "website": "https://joesbbq.com",
  "phone": "512-555-1234",
  "source": "ai_discovery",
  "status": "new"
}
```

### Step 4 — Find contact emails

```
POST /api/growth/email-prospecting/discover
Body: {
  "businessName": "Joe's BBQ",
  "website": "joesbbq.com",
  "location": "Austin, TX"
}
```

### Step 5 — Verify email

```
POST /api/growth/email-prospecting/verify
Body: { "email": "joe@joesbbq.com" }
```

### Step 6 — AI-enrich the prospect

```
POST /api/growth/prospects/{id}/enrich
```

### Step 7 — Generate outreach message

```
POST /api/growth/outreach/generate
Body: {
  "prospectId": "clu...",
  "channel": "email",
  "tone": "professional"
}
```

### Step 8 — Send the email

```
POST /api/growth/outreach/send-email
Body: {
  "prospectId": "clu...",
  "to": "joe@joesbbq.com",
  "subject": "...",
  "body": "..."
}
```

---

## Full Endpoint Reference

### Prospects (Core CRM)

| Endpoint | Method | Description |
|---|---|---|
| `/api/growth/prospects` | GET | List prospects (query params: status, search, source, assignedToId) |
| `/api/growth/prospects` | POST | Create a single prospect |
| `/api/growth/prospects/{id}` | GET | Get prospect details with contacts and activities |
| `/api/growth/prospects/{id}` | PATCH | Update prospect fields |
| `/api/growth/prospects/{id}` | DELETE | Delete a prospect |
| `/api/growth/prospects/{id}/enrich` | POST | AI-enrich with Google Places + Yelp data |
| `/api/growth/prospects/{id}/activities` | POST | Log an activity (call, email, note, meeting, status_change) |
| `/api/growth/prospects/bulk-update` | POST | Bulk update status/priority/assignee/tags for multiple prospects |
| `/api/growth/prospects/check-duplicates` | POST | Check if a company name already exists (case-insensitive) |
| `/api/growth/prospects/import` | POST | Bulk import prospects from CSV data with deduplication |

### Discovery (Prospect Research)

| Endpoint | Method | Description |
|---|---|---|
| `/api/growth/discovery/search` | POST | Search Google Places + Yelp for businesses by location, type, keywords |
| `/api/growth/discovery/scrape` | POST | Extract businesses from a URL using AI |
| `/api/growth/discovery/enrich` | POST | AI classify and analyze raw business data |

### Email Prospecting

| Endpoint | Method | Description |
|---|---|---|
| `/api/growth/email-prospecting/discover` | POST | Find owner names + emails for a business |
| `/api/growth/email-prospecting/search/domain` | POST | Find contacts at a company domain |
| `/api/growth/email-prospecting/search/person` | POST | Find email for a specific person (first name, last name, domain) |
| `/api/growth/email-prospecting/verify` | POST | Verify an email address is valid and deliverable |

### Outreach

| Endpoint | Method | Description |
|---|---|---|
| `/api/growth/outreach/generate` | POST | AI-generate a personalized outreach message |
| `/api/growth/outreach/send` | POST | Send message via any channel (email, SMS, LinkedIn, Instagram) |
| `/api/growth/outreach/send-email` | POST | Send email via Resend with user signature and logo |
| `/api/growth/outreach/auto-draft` | POST | Auto-draft messages for multiple prospects (goes to approval queue) |
| `/api/growth/outreach/bulk` | POST | Bulk send to multiple prospects with variable personalization |
| `/api/growth/outreach/approval-queue` | GET | Get messages awaiting human approval |
| `/api/growth/outreach/approval-queue` | POST | Approve or reject queued messages |
| `/api/growth/outreach/dashboard` | GET | Outreach stats, tasks, recent activity, hot prospects |
| `/api/growth/outreach/command-center` | GET | Quick summary: queue count, hot leads, overnight activity, AI insights |

### Templates

| Endpoint | Method | Description |
|---|---|---|
| `/api/growth/outreach/templates` | GET | List templates (query param: channel) |
| `/api/growth/outreach/templates` | POST | Create a new message template |
| `/api/growth/outreach/templates/{id}` | GET | Get a single template |
| `/api/growth/outreach/templates/{id}` | PATCH | Update a template |
| `/api/growth/outreach/templates/{id}` | DELETE | Delete a template |

### Sequences (Multi-Step Campaigns)

| Endpoint | Method | Description |
|---|---|---|
| `/api/growth/outreach/sequences` | GET | List all sequences |
| `/api/growth/outreach/sequences` | POST | Create a multi-step outreach sequence |
| `/api/growth/outreach/sequences/{id}` | GET | Get sequence details |
| `/api/growth/outreach/sequences/{id}` | PATCH | Update a sequence |
| `/api/growth/outreach/sequences/{id}` | DELETE | Delete a sequence |
| `/api/growth/outreach/sequences/generate-step` | POST | AI-generate content for a specific sequence step |

### AI Content

| Endpoint | Method | Description |
|---|---|---|
| `/api/growth/ai/generate-content` | POST | General AI content generation (specify prospect data, channel, tone, purpose) |

### Pipeline

| Endpoint | Method | Description |
|---|---|---|
| `/api/growth/pipeline/automate` | POST | Trigger pipeline stage automation and hot prospect detection |

---

## Important Rules

1. **Never log or share the API key** — treat it like a password.
2. All data is **company-scoped** — you can only see/modify Urban Simple's data.
3. First outreach emails go to an **approval queue** — Ali reviews them before they send.
4. Follow-up messages in sequences auto-send once the sequence is approved.
5. Check the **Command Center** (`GET /api/growth/outreach/command-center`) each morning for a summary of what needs attention.
6. Always **check for duplicates** before creating new prospects.
7. **Verify emails** before sending outreach to avoid bounces.

---

## Error Responses

| Status | Meaning |
|---|---|
| 200 | Success |
| 400 | Bad request — check your request body |
| 401 | Unauthorized — API key is missing, invalid, or revoked |
| 404 | Resource not found |
| 500 | Server error |

All errors return JSON: `{ "error": "description" }`
