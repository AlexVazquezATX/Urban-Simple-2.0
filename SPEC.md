# Urban Simple - Product Specification

**Version:** 2.0
**Last Updated:** January 3, 2026
**Vision:** AI-powered business management that actually simplifies your life

---

## 🎯 Core Mission

**Replace complexity with clarity. Replace multiple tools with one intelligent system.**

Urban Simple is an AI-first business management platform that eliminates the need for QuickBooks, spreadsheets, and fragmented tools. Instead of learning accounting jargon, you just ask questions in plain English and get clear answers.

---

## 🌟 Why Urban Simple Exists

**The Problem:**
- Small business owners juggle 5-10 different tools
- QuickBooks is complex and intimidating
- Simple questions require digging through reports
- Tax time is stressful and confusing
- Bookkeepers are expensive ($200-500/month)

**The Solution:**
- One beautiful app for everything
- AI assistant that speaks plain English
- Automatic categorization and tracking
- Tax-ready reports with one click
- $2-5/month in AI costs vs. $30-90/month for QB

---

## 🤖 AI-First Architecture

### The AI Assistant (Powered by Gemini 2.0 Flash)

**Always Available, Always Helpful:**
```
User: "How much did I make last month?"
AI: "You made $8,141 in December from 5 clients.
     Your biggest client was Austin Storage at $2,500."

User: "Show me who owes me money"
AI: [Generates visual chart]
    "3 clients owe you $4,250 total:
     - Austin Storage: $2,500 (45 days overdue)
     - Dallas Office: $1,200 (15 days overdue)
     - Houston Retail: $550 (on time)"

User: "Can I deduct this laptop?"
AI: "Yes! Business equipment is 100% deductible.
     I've added it to your Equipment expenses."

User: "Am I profitable?"
AI: "Yes! In Q4 2025:
     Revenue: $24,423
     Expenses: $8,450
     Profit: $15,973 (65.4% margin)
     You're doing great!"
```

### AI Capabilities

**Natural Language Understanding:**
- Ask questions in plain English
- No need to learn where reports are
- Conversational follow-ups
- Context-aware responses

**Smart Data Analysis:**
- Revenue trends and patterns
- Client profitability insights
- Cash flow forecasting
- Anomaly detection

**Intelligent Automation:**
- Auto-categorize expenses from receipts
- Suggest invoice amounts based on history
- Flag unusual transactions
- Predict upcoming cash crunches

**Tax Intelligence:**
- Real-time deduction tracking
- Quarterly tax estimates
- Schedule C data export
- Plain-English explanations

---

## 📋 Core Features

### 1. Client Management
**What It Does:**
- Store client contact info
- Track multiple locations per client
- View client revenue history
- See all invoices and payments

**AI Enhancement:**
- "Show me my top 5 clients"
- "Who hasn't paid in 60+ days?"
- "What's the average revenue per client?"

### 2. Service Agreements (Recurring Billing)
**What It Does:**
- Set up monthly/annual contracts
- Define billing frequency
- Track MRR (Monthly Recurring Revenue)
- Auto-generate invoices

**AI Enhancement:**
- "How much recurring revenue do I have?"
- "Which agreements are up for renewal?"
- "Should I raise prices on this client?"

### 3. Invoice Generation & Management
**What It Does:**
- Create beautiful invoices
- Send via email (Resend integration)
- Track sent/paid/overdue status
- Automated monthly generation

**AI Enhancement:**
- "Create an invoice for Austin Storage"
- "Send all overdue invoice reminders"
- "Show me unpaid invoices from December"

### 4. Payment Tracking
**What It Does:**
- Record check/ACH/wire payments
- Partial payment support
- Auto-update invoice balances
- Payment history per client

**AI Enhancement:**
- "Log a $1,000 payment from Austin Storage"
- "Show me payments received this week"
- "Which clients pay on time?"

### 5. AR Aging & Collections
**What It Does:**
- 0-30, 31-60, 61-90, 90+ day buckets
- Visual aging reports
- Outstanding balance tracking
- Client payment patterns

**AI Enhancement:**
- "Who should I follow up with today?"
- "Show me my collections priority list"
- "Draft a payment reminder email"

### 6. Expense Tracking (Coming Soon)
**What It Does:**
- Photo upload of receipts
- Manual expense entry
- Categorization (auto + manual)
- Vendor tracking
- Mileage logging

**AI Enhancement:**
- Take photo → AI reads receipt → Auto-categorizes
- "Is this tax deductible?"
- "Show me all software expenses"
- "What did I spend on gas last month?"

### 7. Tax Intelligence (Coming Soon)
**What It Does:**
- Real-time deduction tracking
- Quarterly tax estimates
- Schedule C export
- CPA-ready reports
- Audit trail

**AI Enhancement:**
- "Prepare my Q1 tax summary"
- "What do I owe in estimated taxes?"
- "Show me my biggest deductions"
- "Is my recordkeeping IRS-compliant?"

### 8. Financial Reports
**What It Does:**
- Revenue by client
- Revenue by month
- Profit & Loss (simplified)
- Cash flow statements
- Client profitability

**AI Enhancement:**
- "Show me my best month last year"
- "Am I more profitable than last quarter?"
- "What's my revenue trend?"

### 9. Dashboard & Insights
**What It Does:**
- Revenue overview
- Outstanding payments
- Recent activity
- Quick actions
- Key metrics

**AI Enhancement:**
- "What should I focus on today?"
- "Give me my weekly business summary"
- "What's trending up or down?"

---

## 🎨 Design Philosophy

### Simplicity Over Features
- Every screen has ONE clear purpose
- No accounting jargon (unless you want it)
- Plain English labels
- Beautiful, not busy

### Mobile-First
- Works perfectly on phones
- Quick actions accessible
- Responsive design
- Fast loading

### Accessible & Inclusive
- WCAG 2.1 AA compliant
- Keyboard navigation
- Screen reader friendly
- High contrast mode

### Delightful Details
- Smooth animations
- Helpful empty states
- Contextual tooltips
- Encouraging feedback

---

## 🏗️ Technical Architecture

### Frontend Stack
- **Framework:** Next.js 14 (App Router)
- **UI Library:** shadcn/ui + Radix UI
- **Styling:** Tailwind CSS
- **State:** React Server Components + Server Actions
- **Icons:** Lucide React

### Backend Stack
- **Runtime:** Node.js (Next.js API Routes)
- **Database:** PostgreSQL (via Supabase)
- **ORM:** Prisma
- **Auth:** Supabase Auth
- **File Storage:** Supabase Storage

### AI Integration
- **Model:** Google Gemini 2.0 Flash
- **SDK:** @google/generative-ai
- **Cost:** ~$2-5/month for typical usage
- **Features:**
  - Natural language queries
  - Receipt OCR
  - Smart categorization
  - Report generation
  - Tax guidance

### Email Service
- **Provider:** Resend
- **Templates:** React Email
- **Cost:** Free tier (3,000 emails/month)

### Deployment
- **Hosting:** Vercel
- **Database:** Supabase (managed Postgres)
- **CDN:** Vercel Edge Network
- **SSL:** Auto-provisioned

---

## 📊 Data Model

### Core Entities

**Client**
- Basic info (name, email, phone)
- Multiple locations
- Billing preferences
- Payment history

**Location**
- Address
- Contact person
- Site-specific notes

**ServiceAgreement**
- Client + Location
- Service type
- Billing amount & frequency
- Start/end dates
- Auto-renewal settings

**Invoice**
- Invoice number
- Issue/due dates
- Line items
- Amounts (total, paid, balance)
- Status (draft, sent, paid, overdue)
- Email tracking

**Payment**
- Amount, date, method
- Applied to invoice(s)
- Reference number
- Notes

**Expense** (Coming Soon)
- Amount, date, vendor
- Category
- Receipt image
- Tax deductible flag
- Notes

**EmailLog**
- Recipient, subject, body
- Sent timestamp
- Status (sent, failed, bounced)
- Opens/clicks (future)

**AIConversation** (Coming Soon)
- User message
- AI response
- Context/metadata
- Timestamp

---

## 🚀 Development Roadmap

### Phase 1: Core Billing ✅ COMPLETE
- [x] Client & location management
- [x] Service agreements
- [x] Invoice generation
- [x] Payment tracking
- [x] AR aging reports
- [x] Email invoice sending
- [x] Dashboard overview

### Phase 2: AI Assistant 🔄 IN PROGRESS
- [ ] Gemini 2.0 Flash integration
- [ ] Chat sidebar UI
- [ ] Natural language query system
- [ ] Database context injection
- [ ] Response formatting
- [ ] Conversation history

### Phase 3: Smart Expenses
- [ ] Expense entry (manual + photo)
- [ ] Receipt OCR with AI
- [ ] Auto-categorization
- [ ] Vendor management
- [ ] Expense reports
- [ ] Mileage tracking

### Phase 4: Tax Intelligence
- [ ] Category-to-tax-code mapping
- [ ] Quarterly tax estimates
- [ ] Schedule C export
- [ ] Deduction maximizer
- [ ] Audit trail reports
- [ ] CPA collaboration tools

### Phase 5: Advanced AI
- [ ] Predictive insights
- [ ] Cash flow forecasting
- [ ] Anomaly detection
- [ ] Business advice
- [ ] Voice interface
- [ ] Automated bookkeeping

### Phase 6: Integrations (Optional)
- [ ] QuickBooks export (one-way)
- [ ] Stripe for online payments
- [ ] Bank account syncing
- [ ] Calendar integration
- [ ] Zapier webhooks

---

## 💰 Business Model

### Target Market
- Solo entrepreneurs
- Small service businesses
- Freelancers
- Property management companies
- Janitorial/cleaning services
- Anyone who hates QuickBooks

### Pricing Strategy
**Freemium Approach:**
- **Free Tier:** Up to 3 clients, 10 invoices/month
- **Pro Tier:** $29/month - Unlimited everything + AI
- **Enterprise:** $99/month - Multi-user + advanced features

**Cost Structure:**
- Gemini AI: $2-5/month per user
- Database: $25/month (covers ~100 users)
- Email: Free tier → $10/month at scale
- Hosting: $20/month → $100/month at scale

**Unit Economics:**
- Customer Acquisition Cost: $50-100
- Lifetime Value: $300-500
- Churn Target: <5%/month
- Profit Margin: 70-80%

### Competitive Advantage
1. **AI-First:** Nobody else has conversational bookkeeping
2. **Simplicity:** Easier than QuickBooks
3. **Price:** 1/3 the cost of QB + bookkeeper
4. **Modern UX:** Beautiful, mobile-first design
5. **No Learning Curve:** Just ask questions

---

## 📈 Success Metrics

### User Engagement
- Daily Active Users (DAU)
- Weekly AI queries per user
- Time spent in app
- Feature adoption rates

### Business Health
- Monthly Recurring Revenue (MRR)
- Customer Acquisition Cost (CAC)
- Lifetime Value (LTV)
- Churn rate
- Net Promoter Score (NPS)

### Product Quality
- Bug rate (bugs per 1000 sessions)
- Page load time (<2s target)
- AI response accuracy (>95% target)
- Email deliverability (>98% target)

---

## 🔐 Security & Compliance

### Data Protection
- Encryption at rest (AES-256)
- Encryption in transit (TLS 1.3)
- SOC 2 Type II compliance (future)
- Regular security audits

### Privacy
- GDPR compliant
- CCPA compliant
- No selling user data
- Data export on demand
- Account deletion support

### Financial Compliance
- IRS recordkeeping standards
- GAAP principles (simplified)
- Audit trail for all transactions
- 7-year data retention

---

## 🎓 User Education

### Onboarding Flow
1. Welcome video (2 min)
2. Import first client
3. Create first invoice
4. Send first invoice
5. Meet the AI assistant
6. Set up first service agreement

### Help Resources
- AI assistant (always available)
- Video tutorials
- Written guides
- Email support
- Community forum

---

## 🌍 Long-Term Vision

### Year 1 (2026)
- 1,000 active users
- $30k MRR
- All core features shipped
- Mobile app (iOS/Android)

### Year 2 (2027)
- 10,000 active users
- $300k MRR
- Multi-user support
- Bank integration
- International support

### Year 3 (2028)
- 50,000 active users
- $1.5M MRR
- Industry-specific versions
- API for developers
- Ecosystem of add-ons

### Ultimate Goal
**Replace QuickBooks for small businesses worldwide.**

Make business finances so simple that anyone can understand them. Use AI to eliminate the need for expensive bookkeepers and accountants for routine tasks. Empower entrepreneurs to focus on their business, not their books.

---

## 🤝 Contributing

We're building this in public. Want to help?

1. **Use it and give feedback** - You're our best critic
2. **Report bugs** - GitHub issues
3. **Suggest features** - What would make your life easier?
4. **Spread the word** - Tell other small business owners
5. **Contribute code** - PRs welcome!

---

## 📞 Contact & Support

- **Website:** urbansimple.net
- **Email:** support@urbansimple.net
- **GitHub:** github.com/AlexVazquezATX/Urban-Simple-2.0
- **Twitter:** @UrbanSimpleApp

---

## 📝 License

Proprietary - All rights reserved (for now)

Future: Considering open-source core + paid hosting model

---

**Let's simplify business in 2026 and beyond. 🚀**
