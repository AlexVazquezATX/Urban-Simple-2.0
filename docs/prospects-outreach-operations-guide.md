# Urban Simple — Prospects & Outreach Operations Guide

> Instructions for managing the prospect pipeline, outreach campaigns, and Growth Agent. These instructions are for an operator (human or AI agent) managing campaigns through the Urban Simple web interface.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Importing Leads](#2-importing-leads)
3. [Managing Prospects](#3-managing-prospects)
4. [Pipeline Management](#4-pipeline-management)
5. [AI Enrichment & Scoring](#5-ai-enrichment--scoring)
6. [Email Discovery](#6-email-discovery)
7. [Outreach Templates](#7-outreach-templates)
8. [Outreach Sequences](#8-outreach-sequences)
9. [Composing & Sending Outreach](#9-composing--sending-outreach)
10. [Approval Queue](#10-approval-queue)
11. [Growth Agent (Autonomous Pipeline)](#11-growth-agent-autonomous-pipeline)
12. [Daily Operations Workflow](#12-daily-operations-workflow)
13. [Key Concepts & Field Reference](#13-key-concepts--field-reference)

---

## 1. System Overview

### Pages & Navigation

| Page | URL | Purpose |
|------|-----|---------|
| Growth Hub / Daily Planner | `/growth` | Dashboard with today's priorities, pipeline stats, scheduled tasks |
| Prospects List | `/growth/prospects` | Browse, search, filter, and manage all prospects |
| Import Prospects | `/growth/prospects/import` | Upload CSV files with leads |
| Prospect Detail | `/growth/prospects/[id]` | Full detail view for a single prospect |
| Pipeline Board | `/growth/pipeline` | Kanban drag-and-drop pipeline view |
| Outreach Hub | `/growth/outreach` | Messages, compose, sequences, templates, settings |
| New Template | `/growth/outreach/templates/new` | Create reusable message templates |
| New Sequence | `/growth/outreach/sequences/new` | Build multi-step outreach sequences |
| Growth Agent | `/growth/agent` | Configure and monitor the autonomous agent |

### How Prospects Flow Through the System

```
Import / Discover
    ↓
Prospect Created (status: "new")
    ↓
Enrich (AI gathers business data, ratings, size)
    ↓
Find Emails (discover decision-maker contacts)
    ↓
Score (AI rates 0-100 fit score)
    ↓
Generate Outreach (AI drafts personalized message)
    ↓
Approval Queue (human reviews first-contact messages)
    ↓
Send (email via Resend, or copy for LinkedIn/SMS/Instagram)
    ↓
Track (activities, opens, responses, outcomes)
    ↓
Pipeline Progress (researching → contacted → engaged → qualified → proposal → won)
```

---

## 2. Importing Leads

### URL: `/growth/prospects/import`

### Preparing Your CSV

**Required column:** Business/Company Name (at minimum).

**Supported columns** (map any or all):
- Company Name, Legal Name, Industry, Business Type
- Address (Street, City, State, ZIP)
- Website, Phone
- Estimated Value
- Source, Source Detail
- Notes
- Contact First Name, Contact Last Name, Contact Email, Contact Phone, Contact Title

**Multiple contacts per company:** Use one row per contact. Repeat the company name on each row. The importer will create the company once, then add each contact to it (deduplicating by email).

Example:
```csv
Company Name,Contact First Name,Contact Last Name,Contact Email,Contact Title,Business Type,City,State
Fairmont Austin,Mike,Culver,mike.culver@fairmont.com,GM,Hotel,Austin,TX
Fairmont Austin,Gilberto,Ramirez,gilberto.ramirez@fairmont.com,Exec Chef,Hotel,Austin,TX
Four Seasons Hotel Austin,Abril,Galindo Callender,,Exec Chef,Hotel,Austin,TX
```

### Import Steps

1. **Upload CSV** — Click "Choose File" and select your .csv file
2. **Set Import Source Name** — Label this batch (e.g., "Austin Luxury Hotels March 2026"). This gets saved as `sourceDetail` on every prospect so you can filter by it later.
3. **Add Batch Tags** — Type tags and press Enter to add (e.g., "Tier 1", "Hotel", "Austin"). These are applied to ALL prospects in the batch.
4. **Map Columns** — Match each CSV column to a prospect field:
   - Required: map at least one column to "Company Name"
   - Use "→ Map to Tag" for columns that don't have a direct field (e.g., a "Tier" column — each row's value becomes a tag automatically)
   - Use "Skip Column" for columns you don't need
5. **Preview** — Check the first 5 rows look correct
6. **Check for Duplicates** (optional) — Click to see if any companies already exist
7. **Import** — Click "Import X Prospects"

### After Import

The success toast shows: `"5 prospects imported, 2 contacts added to existing, 1 duplicates"`

- **prospects imported** = new companies created
- **contacts added to existing** = new contacts added to already-existing companies
- **duplicates** = rows where the company already existed (contacts were still added if new)

### Filtering Imported Leads

On the Prospects List (`/growth/prospects`):
- Toggle on **"Import List"** and **"Tags"** columns via the **Columns** dropdown (gear icon)
- Use the **"All Import Lists"** filter dropdown to view only prospects from a specific spreadsheet
- Use the **"All Tags"** filter dropdown to view only prospects with a specific tag

---

## 3. Managing Prospects

### URL: `/growth/prospects`

### Viewing & Searching

- **Search bar** — searches company name, legal name, and contact names/emails
- **Tabs** — quick filters: All, Contact Today (overdue >7 days), Hot (high/urgent priority), Follow-Up (contacted/engaged), Has Email, Has Website, No Website, Queued
- **Filter dropdowns** — Status, Priority, Facility Type, Price Level, Source, Import List, Tags

### Prospect Statuses

| Status | Meaning | When to Use |
|--------|---------|-------------|
| `prospect` | Holding area, not in active pipeline | Raw leads before qualification |
| `new` | Just added, ready for research | Starting point for active leads |
| `researching` | Investigating fit | Looking up the business, gathering info |
| `contacted` | Initial outreach made | First email/call/message sent |
| `engaged` | Positive response received | They replied or showed interest |
| `qualified` | Meets criteria, ready for proposal | Good fit, decision maker identified |
| `proposal_sent` | Proposal delivered | Waiting for their decision |
| `won` | Closed deal | Convert to client |
| `lost` | Deal closed without win | Set a lost reason |
| `nurturing` | Ongoing relationship building | Not ready now, stay in touch |

### Priority / Interest Levels

| Priority | UI Label | Meaning |
|----------|----------|---------|
| `urgent` | Urgent | Immediate action needed |
| `high` | Hot | Strong fit, act quickly |
| `medium` | Warm | Good prospect, standard timeline |
| `low` | Cold | Low priority, long-term |

### Bulk Operations

Select multiple prospects via checkboxes, then:
- **Change Status** — Move selected to a new status
- **Change Priority** — Update priority for all selected
- **Assign** — Assign to a team member
- **Add Tags** — Add tags to all selected
- **Delete** — Remove selected prospects
- **Enrich** — Run AI enrichment on selected
- **Find Emails** — Discover contacts for selected
- **Queue for Agent** — Add to Growth Agent queue

### Editing a Prospect

Click any prospect row to open the detail panel, or click the eye icon to go to the full detail page (`/growth/prospects/[id]`).

Fields you can edit:
- Company Name, Legal Name, Industry, Business Type
- Address (City, State, Street, ZIP)
- Website, Phone
- Status, Priority, Estimated Value
- Source, Source Detail, Tags (comma-separated)
- Notes
- Assigned To

### Managing Contacts

Each prospect can have multiple contacts. On the detail page:
- View all contacts with name, email, phone, title, role
- Add new contacts manually
- See email verification status and confidence scores
- Mark contacts as Decision Maker

### Logging Activities

On the detail page, log interactions:
- **Call** — duration, outcome (connected, voicemail, no answer, interested, not interested, follow up)
- **Email** — subject, body, sent timestamp
- **Meeting** — scheduled time, description, outcome
- **Note** — internal notes
- **LinkedIn / SMS / Instagram DM** — channel-specific logging

Activities automatically update `lastContactedAt` (except notes and status changes).

---

## 4. Pipeline Management

### URL: `/growth/pipeline`

The pipeline board is a **Kanban-style drag-and-drop** view with columns:

```
New → Researching → Contacted → Engaged → Qualified → Proposal Sent → Won → Lost
```

- **Drag a card** between columns to change its status
- Each card shows: company name, contact, priority badge, estimated value
- The "prospect" status is a holding area and does NOT appear on the pipeline board
- **Remove from pipeline** sends a prospect back to "prospect" status

### Pipeline Workflow

1. **Import leads** → they start as "new"
2. **Research** → drag to "researching" while you enrich and score
3. **Send outreach** → drag to "contacted" after first message
4. **Get response** → drag to "engaged" when they reply
5. **Qualify** → drag to "qualified" when confirmed fit
6. **Send proposal** → drag to "proposal_sent"
7. **Close** → drag to "won" (convert to client) or "lost" (set lost reason)

---

## 5. AI Enrichment & Scoring

### Enrichment

Enrichment fills in missing data about a prospect using Google Places, Yelp, and AI analysis.

**How to trigger:**
- Single prospect: Click "Enrich" button on prospect detail or list row action
- Bulk: Select multiple prospects → click "Enrich" in bulk actions
- Automatic: Growth Agent runs enrichment as pipeline stage

**What enrichment adds:**
- Phone and website (if missing)
- Google rating, review count, business categories, price level
- Yelp rating, review count, categories
- AI-estimated size (small/medium/large)
- AI-estimated revenue range
- Decision maker title suggestion
- Outreach approach suggestion
- Potential value assessment

### Scoring

After enrichment, AI scoring rates each prospect 0-100 based on:

| Factor | Points | What It Measures |
|--------|--------|------------------|
| Industry Fit | 0-30 | Restaurant/hotel/bar = high, retail = medium |
| Size Potential | 0-25 | Price level and estimated revenue |
| Location | 0-20 | Proximity to service area (Austin, TX) |
| Business Health | 0-15 | Ratings, reviews, active website |
| Contact Accessibility | 0-10 | Email/phone available vs. unknown |

**Score ranges:**
- 80-100 → Priority: urgent
- 60-79 → Priority: high
- 40-59 → Priority: medium
- 0-39 → Priority: low

The Growth Agent uses `minScoreForOutreach` (default: 60) to decide which prospects get outreach.

---

## 6. Email Discovery

### Methods

**Owner Discovery** (best for hospitality):
- Discovers actual business owners and decision makers
- Uses Yelp owner data, Google, Hunter, and Apollo
- Creates ProspectContact records with email confidence scores

**Hunter Search**:
- Person-specific email lookup

**Apollo Search**:
- Domain-level email discovery

**Email Verification**:
- Validates found emails
- Returns confidence score (0-100), verification status (valid, invalid, risky, unknown)

### How to trigger:
- Single: Click "Find Email" on prospect detail
- Bulk: Select prospects → "Find Emails"
- Automatic: Growth Agent `find_emails` stage

### Contact fields set:
- `email` — the discovered email address
- `emailConfidence` — 0-100 confidence score
- `emailVerified` — boolean
- `emailVerificationStatus` — valid, invalid, risky, unknown
- `emailSource` — apollo, hunter, pattern, scraper, manual
- `title` — job title (GM, Executive Chef, Owner, etc.)
- `isDecisionMaker` — boolean flag

---

## 7. Outreach Templates

### URL: `/growth/outreach?tab=templates` (browse) or `/growth/outreach/templates/new` (create)

Templates are reusable message skeletons with merge variables.

### Creating a Template

1. **Name** — descriptive name (e.g., "Cold Outreach - Hotel GM")
2. **Channel** — email, SMS, LinkedIn, or Instagram DM
3. **Subject** (email only) — e.g., "Keeping {{company_name}} spotless"
4. **Body** — message text with merge variables
5. **Category** (optional) — for organization

### Merge Variables

Use these in templates — they get replaced with real data when generating outreach:

| Variable | Replaced With |
|----------|---------------|
| `{{company_name}}` | Prospect's company name |
| `{{contact_name}}` | Contact's full name |
| `{{contact_first_name}}` | Contact's first name |
| `{{location}}` | City from prospect's address |
| `{{your_name}}` | Sender's name |

### Channel Guidelines

| Channel | Style | Length |
|---------|-------|--------|
| Email | Professional, 3-4 paragraphs | Full message |
| SMS | Friendly, concise | Max 160 characters |
| LinkedIn | Professional, conversational | 2-3 paragraphs |
| Instagram DM | Brief, casual, sparse emojis | 2-3 sentences |

**Important:** Templates should NOT include closing signatures (no "Best," "Thanks," etc.) — the system appends the user's email signature automatically.

---

## 8. Outreach Sequences

### URL: `/growth/outreach?tab=sequences` (browse) or `/growth/outreach/sequences/new` (create)

Sequences are multi-step outreach campaigns with timed delays between steps.

### Creating a Sequence

1. **Name** — e.g., "Hotel GM Cold Outreach - 4 Step"
2. **Description** (optional) — notes about the sequence
3. **Tone** — professional, friendly, casual, or warm
4. **Add Steps:**
   - **Step 1**: Delay 0 days, Channel: email, Subject + Body (first contact)
   - **Step 2**: Delay 3 days, Channel: email, Subject + Body (follow-up)
   - **Step 3**: Delay 5 days, Channel: linkedin, Body (different channel touch)
   - **Step 4**: Delay 7 days, Channel: email, Subject + Body (final follow-up)

### AI Content Generation

For each step, click "Generate with AI" to auto-create content. The AI:
- Considers the step number and position in the sequence
- References previous steps to avoid repetition
- Follows channel-specific guidelines
- Uses the selected tone
- Includes Urban Simple's value proposition (hospitality cleaning, health code compliance, nightly deep cleaning)

You can generate individual steps or all at once, then edit manually as needed.

### Applying a Sequence to Prospects

**From Prospects List (bulk):**
1. Navigate to `/growth/prospects`
2. Select one or more prospects using the checkboxes
3. Click **More** → find your sequence name under the separator (with ⚡ icon)
4. Step 1 of the sequence is queued for human review in the Approval Queue
5. Steps 2+ are pre-approved and will auto-send via the executor on schedule

**From Prospect Detail Panel (single):**
1. Click on a prospect to open the detail panel
2. Click the **Sequence** button (⚡ icon) in the footer
3. Select the sequence to apply

**What happens when you apply a sequence:**
- A new campaign is created for that prospect
- Step 1: `approvalStatus: pending` → goes to Approval Queue for human review
- Steps 2+: `approvalStatus: approved`, `scheduledAt` calculated from cumulative delay days
- The executor cron (`/api/growth/outreach/executor`) processes approved follow-ups automatically
- If the prospect replies with a positive outcome, remaining steps are cancelled
- Duplicate protection: cannot apply the same sequence to a prospect that already has it active

> **IMPORTANT for AI operators:** Always review Step 1 messages in the Approval Queue before they are sent. Follow-up steps send automatically after approval.

---

## 9. Composing & Sending Outreach

### URL: `/growth/outreach?tab=compose`

### Quick Compose (Ad-hoc Messages)

1. **Select prospect** from dropdown
2. **Choose channel** (email, SMS, LinkedIn, Instagram DM)
3. **Optionally select a template** to pre-fill content
4. **Generate with AI** or write manually
5. Choose one of:
   - **Queue for Review** (recommended) — sends the message to the Approval Queue for human review before sending
   - **Send Now** — sends immediately without review (use with caution)
   - **Schedule** — set a date/time for sending

> **IMPORTANT for AI operators:** Always use **Queue for Review** instead of Send Now. This ensures all outreach is reviewed by a human before delivery. The "Send Now" button bypasses the approval queue entirely.

### AI Generation Options

When generating with AI:
- **Tone**: professional, friendly, casual, warm
- **Purpose**: cold_outreach, follow_up, re_engagement
- **Template**: optionally use a template as the base
- **Custom Instructions**: add specific guidance (e.g., "mention their new rooftop bar")

### Sending

**Email:**
- Sent via Resend API
- Automatically includes your email signature and logo
- Creates activity log on the prospect
- Updates `lastContactedAt`

**LinkedIn / SMS / Instagram DM:**
- Message is marked as "sent" in the system
- You manually copy the message and send it through the actual platform
- Activity is logged for tracking

---

## 10. Approval Queue

### URL: `/growth/outreach` (Messages tab shows approval queue)

### What Goes to Approval

**Only Step 1 (first-contact) messages require approval.** Follow-up messages in a sequence skip the queue.

Messages land here when:
- You click **Queue for Review** in Quick Compose
- You generate outreach for a prospect
- The Growth Agent generates outreach automatically
- A sequence is applied to a prospect (step 1 only)

### Tabs

| Tab | What It Shows |
|-----|---------------|
| **Pending Review** | Step 1 (first-contact) messages awaiting human approval |
| **Ready to Send** | Approved messages that can be sent right now (step 1 approved, or follow-ups whose scheduled date has arrived) |
| **Scheduled** | Follow-up steps (2, 3, 4...) that are pre-approved but waiting for their scheduled date. Shows step number, scheduled date, and sequence name. Each can be cancelled individually. |
| **Sent** | History of all sent messages |

### Approval Actions

| Action | What It Does |
|--------|--------------|
| **Approve** | Marks message ready to send |
| **Approve All** | Bulk approves all pending messages |
| **Edit** | Modify subject/body before approving (clears AI-generated flag) |
| **Regenerate** | Get a fresh AI-generated version (with optional custom instructions) |
| **Reject** | Remove from queue (won't be sent) |
| **Send** | Send approved messages (email via Resend, others logged for manual send) |
| **Cancel** (Scheduled tab) | Cancel a scheduled follow-up step |

### Message Lifecycle

```
Step 1:  pending_review → approved → ready_to_send → sent
Step 2+: approved → scheduled (waiting for date) → ready_to_send → sent
```

- "Send All" in Ready to Send only sends messages that are actually due — it cannot fire future-scheduled steps
- The executor cron also respects `scheduledAt` dates for automatic follow-up delivery

### Merge Tags

When a sequence is applied to a prospect, merge tags in message templates are automatically resolved:

| Tag | Replaced With |
|-----|---------------|
| `{{company_name}}` / `{{business_name}}` | Prospect's company name |
| `{{contact_name}}` | Primary contact's full name |
| `{{first_name}}` / `{{last_name}}` | Contact's first or last name |
| `{{title}}` | Contact's job title |
| `{{location}}` / `{{city}}` / `{{state}}` | Prospect's address info |

Tags are resolved at apply time, so the Pending Review and Scheduled tabs show the actual text that will be sent.

### Workflow

1. Review pending messages in the queue
2. For each message: read, edit if needed, approve
3. Once approved, click "Send" to deliver
4. For non-email channels (LinkedIn, SMS, Instagram), copy the message text and send manually through those platforms
5. Check the "Scheduled" tab to see upcoming follow-ups and cancel any if needed

---

## 11. Growth Agent (Autonomous Pipeline)

### URL: `/growth/agent`

The Growth Agent runs autonomously on a 15-minute cron cycle, processing prospects through the 5-stage pipeline.

### Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| **isEnabled** | false | Master on/off switch |
| **isDryRun** | true | Safe mode — logs operations but doesn't create records. Turn off when ready for real runs. |
| **targetLocations** | — | Array of {city, state} to search (e.g., Austin, TX) |
| **targetBusinessTypes** | — | Business types to find (restaurant, hotel, bar, etc.) |
| **targetSources** | google_places, yelp | Discovery APIs to use |
| **minRating** | null | Minimum Google/Yelp rating |
| **priceLevels** | all | Filter by $, $$, $$$, $$$$ |
| **minScoreForOutreach** | 60 | Minimum AI score to generate outreach |
| **batchSize** | 5 | Items processed per cycle |
| **maxDiscoveriesPerDay** | 20 | Rate limit: discoveries |
| **maxEmailsPerDay** | 10 | Rate limit: email lookups |
| **maxOutreachPerDay** | 10 | Rate limit: outreach messages |
| **outreachTone** | professional | Tone for generated messages |
| **outreachChannel** | email | Default outreach channel |
| **activeHoursStart/End** | — | Restrict processing to business hours |
| **timezone** | America/Chicago | For active hours calculation |

### Processing Modes

| Mode | Behavior |
|------|----------|
| **all** | Processes everything from discovery. Requires targetLocations + targetBusinessTypes. |
| **filtered** | Only processes prospects matching filterCriteria (businessTypes, priceLevels, cities, tags, sources) |
| **queued** | Only processes prospects manually marked with "Queue for Agent". No discovery — bring your own prospects. |

### Pipeline Stages

The agent processes ONE stage per 15-minute cycle, in priority order:

**Stage 1: discover**
- Searches Google Places and Yelp for businesses matching your criteria
- Creates new prospects with source: `ai_discovery`
- Respects `maxDiscoveriesPerDay`

**Stage 2: enrich**
- Fetches detailed business data (ratings, reviews, categories)
- Runs AI analysis for size, revenue, and value estimation
- Sets `aiEnriched: true`

**Stage 3: find_emails**
- Discovers owner/decision-maker emails
- Uses Hunter, Apollo, Yelp, Google
- Creates ProspectContact records
- Respects `maxEmailsPerDay`

**Stage 4: score**
- AI scores prospects 0-100 on fit
- Sets priority based on score
- Only prospects scoring ≥ `minScoreForOutreach` proceed

**Stage 5: generate_outreach**
- Creates personalized outreach messages
- Messages go to Approval Queue (step 1, approvalStatus: pending)
- Respects `maxOutreachPerDay`
- **Human must approve before sending** (safety rail)

### Manual Triggers

From the dashboard (`/growth/agent`):
- **Trigger Specific Stage** — run one stage immediately
- **Trigger Full Pipeline** — run all stages until no work remains
- **Override Dry Run** — force a real run even if isDryRun is true

### Monitoring

The dashboard shows:
- **Pipeline Funnel**: total → enriched → with emails → scored → with outreach → pending approval
- **Today's Activity**: discoveries, enrichments, emails found, scores, outreach generated
- **Rate Limit Usage**: discoveries used/max, emails used/max, outreach used/max
- **Run History**: past executions with success/failure counts

---

## 12. Daily Operations Workflow

### Morning Routine

1. **Check Daily Planner** (`/growth`)
   - Review "Priority Outreach" — prospects overdue for contact (>7 days)
   - Check today's scheduled tasks and follow-ups
   - Review pipeline stats

2. **Process Approval Queue** (`/growth/outreach` → Messages tab)
   - Review any pending first-contact messages
   - Edit/approve/reject as needed
   - Send approved messages

3. **Check Growth Agent Stats** (`/growth/agent`)
   - Review overnight discoveries and enrichments
   - Check for any failed runs
   - Adjust rate limits if needed

### Ongoing Tasks

4. **Respond to Engagement**
   - Move prospects to "engaged" when they reply
   - Log activities (calls, meetings, notes)
   - Send follow-up messages

5. **Import New Leads** (`/growth/prospects/import`)
   - Upload new spreadsheets with batch tags + source name
   - Map columns, import

6. **Apply Sequences** (`/growth/prospects`)
   - Select prospects ready for outreach (use "Has email" filter)
   - Click More → select a sequence to apply
   - Step 1 messages go to Approval Queue for review

7. **Pipeline Review** (`/growth/pipeline`)
   - Drag prospects through stages as deals progress
   - Set lost reasons for dead leads
   - Convert won prospects to clients

### Weekly Review

7. **Outreach Dashboard** (`/growth/outreach`)
   - Review messages sent this week
   - Check response rate
   - Identify hot prospects (recent engagement)

8. **Adjust Agent Config** (`/growth/agent`)
   - Update target locations or business types
   - Adjust score thresholds
   - Enable/disable dry run mode

---

## 13. Key Concepts & Field Reference

### Prospect Fields

| Field | Type | Description |
|-------|------|-------------|
| companyName | string (required) | Business name |
| legalName | string | Legal/registered name |
| industry | string | General industry (restaurant, hospitality, retail) |
| businessType | string | Specific type (fine dining, hotel, cafe, bar) |
| address | JSON | { street, city, state, zip } |
| website | string | Business website URL |
| phone | string | Business phone |
| status | string | Pipeline status (see table above) |
| priority | string | Interest level: urgent, high, medium, low |
| estimatedValue | decimal | Estimated deal value in dollars |
| source | string | How the prospect was found (manual, csv_import, ai_discovery, referral, website, meta) |
| sourceDetail | string | Specific origin (spreadsheet name, campaign, referrer) |
| tags | string[] | Array of free-form tags for categorization |
| notes | text | Internal notes |
| aiEnriched | boolean | Whether AI enrichment has been run |
| aiScore | number | AI fit score (0-100) |
| aiScoreReason | text | Explanation of the score |
| priceLevel | string | $, $$, $$$, or $$$$ |
| estimatedSize | string | small, medium, or large |
| agentQueued | boolean | Whether queued for Growth Agent processing |
| lastContactedAt | datetime | Last time a contact activity was logged |
| assignedToId | string | Team member assigned to this prospect |

### Activity Types

| Type | Channel Options | Tracked Fields |
|------|----------------|----------------|
| call | phone, in_person | duration (seconds), outcome |
| email | email | subject, messageBody, sentAt |
| meeting | in_person, phone | scheduledAt, completedAt, outcome |
| note | — | description (internal only, doesn't update lastContactedAt) |
| status_change | — | auto-logged when status changes |
| linkedin | linkedin | messageBody |
| sms | sms | messageBody |
| instagram_dm | instagram | messageBody |

### Outcome Values

| Outcome | When to Use |
|---------|-------------|
| connected | Reached the person, had a conversation |
| voicemail | Left a voicemail |
| no_answer | Called, no answer, no voicemail |
| interested | They expressed interest |
| not_interested | They declined |
| follow_up | Need to follow up later |

### Outreach Message Statuses

| Status | Meaning |
|--------|---------|
| pending | Not yet sent |
| sent | Successfully sent |
| delivered | Confirmed delivery |
| opened | Recipient opened |
| clicked | Recipient clicked a link |
| replied | Recipient replied |
| failed | Send attempt failed |

### Approval Statuses

| Status | Meaning |
|--------|---------|
| pending | Awaiting human review |
| approved | Approved, ready to send |
| rejected | Rejected, won't be sent |
