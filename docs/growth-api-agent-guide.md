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

## Shell Tips (Windows PowerShell)

- Use `curl.exe` (NOT `curl` which is a PowerShell alias) for all POST/PATCH/DELETE requests.
- For JSON bodies with special characters (apostrophes, quotes), **write the JSON to a temp file first**, then pass it with `@`:

```powershell
Set-Content -Path "C:\temp\body.json" -Value '{"companyNames": ["Geraldines Counter"]}'
curl.exe -s -H "Authorization: Bearer us_live_..." -H "Content-Type: application/json" -d @C:\temp\body.json https://www.krew42.com/api/growth/prospects/check-duplicates
```

- For simple GET requests, `Invoke-WebRequest` is fine:

```powershell
$headers = @{ Authorization = "Bearer us_live_..." }
$response = Invoke-WebRequest -Uri "https://www.krew42.com/api/growth/prospects" -Headers $headers -UseBasicParsing
$response.Content | ConvertFrom-Json
```

---

## Typical Workflow: Find Leads > Enrich > Outreach

### Step 1 — Check for duplicates

Note: `companyNames` is an **array**, not a single string.

```json
POST /api/growth/prospects/check-duplicates
{
  "companyNames": ["Geraldines Counter", "Joes BBQ"]
}
```

Response: `{ "duplicates": ["Joes BBQ"] }` (lists any that already exist)

### Step 2 — Create the prospect

Only `companyName` is required. Everything else is optional.

```json
POST /api/growth/prospects
{
  "companyName": "Geraldines Counter",
  "businessType": "restaurant",
  "address": { "street": "1115 S Congress Ave", "city": "Austin", "state": "TX" },
  "website": "https://geraldinescounter.com",
  "phone": "512-555-1234",
  "source": "ai_discovery",
  "sourceDetail": "Aria agent discovery",
  "status": "new",
  "priority": "medium",
  "contacts": [
    {
      "firstName": "Jane",
      "lastName": "Doe",
      "email": "jane@geraldinescounter.com",
      "title": "Owner",
      "role": "primary",
      "isDecisionMaker": true
    }
  ]
}
```

Response: Full prospect object including `id` (you'll need this for later steps).

### Step 3 — AI-enrich the prospect

No body needed. Just POST to the URL with the prospect ID.

```
POST /api/growth/prospects/{id}/enrich
```

### Step 4 — Find contact emails

```json
POST /api/growth/email-prospecting/discover
{
  "businessName": "Geraldines Counter",
  "website": "geraldinescounter.com",
  "city": "Austin",
  "state": "TX"
}
```

### Step 5 — Verify email

```json
POST /api/growth/email-prospecting/verify
{
  "email": "jane@geraldinescounter.com"
}
```

### Step 6 — Generate outreach message

```json
POST /api/growth/outreach/generate
{
  "prospectId": "THE_PROSPECT_ID",
  "channel": "email",
  "tone": "friendly",
  "purpose": "cold_outreach"
}
```

Options for `tone`: "friendly", "professional", "casual", "warm"
Options for `purpose`: "cold_outreach", "follow_up", "re_engagement"

Response:
```json
{
  "success": true,
  "message": {
    "channel": "email",
    "subject": "...",
    "body": "...",
    "personalizationNotes": "..."
  }
}
```

### Step 7 — Send the email

All four fields are **required**.

```json
POST /api/growth/outreach/send-email
{
  "prospectId": "THE_PROSPECT_ID",
  "to": "jane@geraldinescounter.com",
  "subject": "Quick question about Geraldines Counter",
  "body": "<p>Hi Jane,</p><p>Your email body here as HTML...</p>"
}
```

### Step 7b — Generate content for a sequence step (no prospect needed)

Use this to generate template content for a specific step in a sequence. Does NOT require a prospect ID — good for building reusable sequence templates.

```json
POST /api/growth/outreach/sequences/generate-step
{
  "channel": "email",
  "stepNumber": 1,
  "totalSteps": 3,
  "sequenceName": "Geraldines Counter - Outreach",
  "sequenceDescription": "3-step email sequence for Geraldines Counter",
  "tone": "friendly"
}
```

All fields except `sequenceDescription` and `tone` are **required**.

Response:
```json
{
  "success": true,
  "content": {
    "subject": "...",
    "body": "..."
  }
}
```

### Step 8 (Alternative) — Create a multi-step sequence

Requires `name` and `messages` array. Each message needs `channel` and `body`.

```json
POST /api/growth/outreach/sequences
{
  "name": "Geraldines Counter - Outreach",
  "description": "3-step email sequence for Geraldines Counter",
  "messages": [
    {
      "channel": "email",
      "subject": "Quick question about Geraldines Counter",
      "body": "Hi Jane, I wanted to reach out...",
      "delayDays": 0
    },
    {
      "channel": "email",
      "subject": "Following up",
      "body": "Hi Jane, just wanted to follow up...",
      "delayDays": 3
    },
    {
      "channel": "email",
      "subject": "One last note",
      "body": "Hi Jane, I know you are busy...",
      "delayDays": 7
    }
  ]
}
```

Response: Campaign object with `id` and all created messages.

### Step 9 (Alternative) — Auto-draft for approval queue

Requires a campaign/sequence ID first (from Step 8). Generates AI messages for multiple prospects at once.

```json
POST /api/growth/outreach/auto-draft
{
  "prospectIds": ["PROSPECT_ID_1", "PROSPECT_ID_2"],
  "campaignId": "THE_CAMPAIGN_ID"
}
```

Optional: add `"templateId": "..."` to use a saved template.

### Step 10 — Discover prospects by location (Google Places + Yelp)

Search for businesses in a specific area. Requires `location` (or `city` + `state`). The `sources` array defaults to both if omitted.

```json
POST /api/growth/discovery/search
{
  "location": "Austin, TX",
  "type": "restaurant",
  "sources": ["google_places", "yelp"],
  "minRating": 4.0
}
```

Alternative using `city` and `state` separately:
```json
{
  "city": "Austin",
  "state": "TX",
  "type": "bar",
  "minRating": 3.5
}
```

Response includes a `warnings` array if any API keys are not configured on the server:
```json
{
  "results": [...],
  "total": 15,
  "warnings": ["Yelp API key not configured — skipped"]
}
```

> Note: This endpoint requires `GOOGLE_PLACES_API_KEY` and/or `YELP_API_KEY` to be configured on the Krew42 backend. If neither is configured, results will be empty. If you get `{ "results": [], "total": 0, "warnings": [...] }`, tell Ali — it means the API keys need to be added to Vercel.

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
| `/api/growth/prospects/check-duplicates` | POST | Check if company names exist (takes `companyNames` array) |
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
| `/api/growth/outreach/auto-draft` | POST | Auto-draft messages for multiple prospects (requires campaignId + prospectIds array) |
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
| `/api/growth/outreach/sequences` | POST | Create sequence (requires `name` + `messages` array with `channel` and `body`) |
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
8. Use the **temp file pattern** for all POST requests to avoid shell escaping issues.

---

## Error Responses

| Status | Meaning |
|---|---|
| 200 | Success |
| 400 | Bad request — check your request body (field names, types, required fields) |
| 401 | Unauthorized — API key is missing, invalid, or revoked |
| 404 | Resource not found |
| 500 | Server error |

All errors return JSON: `{ "error": "description" }`

---

## Common Mistakes

- `check-duplicates` takes `companyNames` (plural, **array**), NOT `companyName` (singular string)
- `auto-draft` requires both `prospectIds` (array) AND `campaignId` — create a sequence first to get a campaign ID
- `send-email` requires all four fields: `prospectId`, `to`, `subject`, `body`
- `sequences` POST requires `name` and `messages` array — each message needs at least `channel` and `body`
- The `address` field on prospects is a JSON object: `{"street": "...", "city": "...", "state": "..."}`
- Always use `www.krew42.com` — never `krew42.com`
- `generate-step` requires `channel`, `stepNumber`, `totalSteps`, and `sequenceName` — all four are mandatory
- `generate` (standalone) requires `prospectId` — the prospect must exist in the system first
- AI generation endpoints may take 5-15 seconds — do NOT assume timeout, wait for the response

---

## Troubleshooting

### 401 Unauthorized
- Verify the API key starts with `us_live_`
- Verify you're using `https://www.krew42.com` (with `www`)
- The bare domain `krew42.com` does a 307 redirect that **strips the Authorization header**
- Check that the key hasn't been revoked in Growth > API Keys

### 500 with "AI generation failed" message
- The error message now includes the actual cause from Google's Gemini API
- If you see "model not found" or "no longer available": tell Ali — the Gemini model needs updating on the backend
- If you see "API key not valid": the Google Gemini API key on the server needs to be checked (this is NOT your `us_live_` key — it's a backend config)

### 400 Bad Request
- Read the error message carefully — it tells you which fields are missing
- Double-check field names: `companyNames` (array) not `companyName`, `prospectIds` (array) not `prospectId`
- For sequences: the `messages` array must have objects with at least `channel` and `body`

### POST requests fail silently or return HTML
- You're probably using PowerShell's `curl` alias instead of `curl.exe`
- Always use `curl.exe` for POST/PATCH/DELETE
- Always write JSON to a temp file first: `Set-Content -Path "C:\temp\body.json" -Value '...'` then `curl.exe -d @C:\temp\body.json`
