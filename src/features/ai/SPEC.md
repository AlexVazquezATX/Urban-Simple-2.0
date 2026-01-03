# AI Assistant Feature Specification

**Feature:** Conversational AI Business Assistant
**Model:** Google Gemini 2.0 Flash
**Status:** Phase 2 - In Development

---

## 🎯 Feature Overview

An always-available AI assistant that answers business questions in plain English, eliminating the need to navigate through complex reports and menus.

### User Experience

**Before AI:**
```
1. Go to Reports → Revenue
2. Select date range
3. Filter by client
4. Export to Excel
5. Calculate totals manually
6. Compare to last quarter
```

**With AI:**
```
User: "How much did Austin Storage pay me last quarter?"
AI: "Austin Storage paid you $7,500 in Q4 2025.
     That's up 15% from Q3. Great progress!"
```

---

## 🏗️ Technical Architecture

### Components

```
src/features/ai/
├── SPEC.md                          # This file
├── components/
│   ├── ai-chat-sidebar.tsx          # Main chat interface
│   ├── ai-message.tsx               # Individual message component
│   ├── ai-chat-input.tsx            # Input field with suggestions
│   └── ai-thinking-indicator.tsx    # Loading state
├── lib/
│   ├── gemini-client.ts             # Gemini API wrapper
│   ├── context-builder.ts           # Build DB context for AI
│   ├── query-parser.ts              # Parse user intent
│   └── response-formatter.ts        # Format AI responses
├── actions/
│   └── chat-actions.ts              # Server actions for chat
└── types/
    └── ai-types.ts                  # TypeScript definitions
```

### API Routes

```
app/api/ai/
├── chat/
│   └── route.ts                     # Main chat endpoint
├── context/
│   └── route.ts                     # Get business context
└── suggestions/
    └── route.ts                     # Query suggestions
```

---

## 💬 Chat Interface

### UI Layout

**Sidebar Design:**
```
┌─────────────────────────────────┐
│  💬 AI Assistant                │
│  ─────────────────────────────  │
│                                 │
│  User: How much revenue last    │
│        month?                   │
│                                 │
│  AI: You made $8,141 in         │
│      December from 5 clients.   │
│      [View Details →]           │
│                                 │
│  User: Show top clients         │
│                                 │
│  AI: [Chart showing top 5]      │
│      1. Austin Storage: $2,500  │
│      2. Dallas Office: $2,100   │
│      ...                        │
│                                 │
│  ─────────────────────────────  │
│  [Type a question...]      [→] │
└─────────────────────────────────┘
```

### Suggested Prompts

**On Empty Chat:**
- "How much did I make last month?"
- "Who owes me money?"
- "Show my top clients"
- "What's my revenue trend?"

**Context-Aware (on Invoice page):**
- "Summarize this invoice"
- "When was this sent?"
- "Has the client paid on time before?"

**Context-Aware (on Client page):**
- "Show revenue from this client"
- "Are they profitable?"
- "Payment history"

---

## 🧠 AI Capabilities

### Natural Language Understanding

**Revenue Queries:**
```javascript
"How much did I make last month?"
"Show me December revenue"
"What's my total income for 2025?"
"Revenue by client"
"Who's my biggest client?"
```

**AR & Collections:**
```javascript
"Who owes me money?"
"Show overdue invoices"
"What's aging 60+ days?"
"Which clients pay on time?"
"Collections priority list"
```

**Client Insights:**
```javascript
"Tell me about Austin Storage"
"Revenue from Dallas Office"
"My most profitable client"
"Client payment patterns"
```

**Business Health:**
```javascript
"Am I profitable?"
"Show my expenses"
"What's my profit margin?"
"Cash flow forecast"
```

**Trend Analysis:**
```javascript
"Is revenue growing?"
"Compare Q4 to Q3"
"Best month last year"
"Revenue trend chart"
```

---

## 🔧 Implementation Details

### 1. Context Building

Before sending query to Gemini, build context with relevant data:

```typescript
interface BusinessContext {
  // Current business snapshot
  stats: {
    totalRevenue: number
    outstandingAR: number
    clientCount: number
    invoiceCount: number
    avgInvoiceAmount: number
  }

  // Recent activity
  recentInvoices: Invoice[]
  recentPayments: Payment[]

  // Client data (if relevant)
  clients: Client[]

  // Time period data
  monthlyRevenue: Record<string, number>

  // Current page context
  currentPage: string
  currentEntity?: {
    type: 'client' | 'invoice' | 'agreement'
    id: string
    data: any
  }
}
```

### 2. Query Processing Flow

```
1. User types question
   ↓
2. Parse intent (revenue, AR, client, etc.)
   ↓
3. Build relevant context from DB
   ↓
4. Construct Gemini prompt with context
   ↓
5. Call Gemini 2.0 Flash
   ↓
6. Parse response
   ↓
7. Format for display (text, chart, table, etc.)
   ↓
8. Render in chat
   ↓
9. Save to conversation history
```

### 3. Prompt Engineering

```typescript
const systemPrompt = `
You are a helpful business assistant for Urban Simple,
a business management platform. You help users understand
their finances in plain English.

Current Business Context:
- Total Revenue: $XX,XXX
- Outstanding AR: $X,XXX
- Active Clients: X
- Current Date: ${new Date().toLocaleDateString()}

Guidelines:
1. Be concise and friendly
2. Use plain English, not accounting jargon
3. Include specific numbers when available
4. Offer to show more details
5. Proactively suggest related insights
6. Format currency as $X,XXX.XX
7. If unsure, say so and ask clarifying questions

User Question: ${userQuery}
`
```

### 4. Response Types

**Text Response:**
```
AI: "You made $8,141 in December from 5 clients."
```

**Text + Chart:**
```
AI: "Here's your revenue trend:"
[Line chart showing last 6 months]
```

**Text + Table:**
```
AI: "Your top 5 clients:"
┌────────────────┬─────────┐
│ Austin Storage │ $2,500  │
│ Dallas Office  │ $2,100  │
│ ...            │         │
└────────────────┴─────────┘
```

**Text + Action:**
```
AI: "Austin Storage owes $2,500."
    [Send Reminder] [View Invoice]
```

---

## 📊 Data Access Layer

### Query Functions

```typescript
// Revenue queries
async function getRevenueByPeriod(startDate: Date, endDate: Date)
async function getRevenueByClient(clientId: string)
async function getRevenueTrend(months: number)

// AR queries
async function getOutstandingInvoices()
async function getAgingBuckets()
async function getOverdueByClient()

// Client queries
async function getClientStats(clientId: string)
async function getTopClients(limit: number)
async function getClientPaymentHistory(clientId: string)

// Trend analysis
async function compareRevenue(period1: DateRange, period2: DateRange)
async function getGrowthRate(metric: string)
```

---

## 🎨 UI Components

### AIChatSidebar

**Props:**
```typescript
interface AIChatSidebarProps {
  isOpen: boolean
  onClose: () => void
  initialContext?: PageContext
}
```

**Features:**
- Slide-in from right
- Persistent conversation history
- Keyboard shortcuts (Cmd+K to open)
- Auto-scroll to latest message
- Loading states
- Error handling

### AIMessage

**Props:**
```typescript
interface AIMessageProps {
  message: {
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
    attachments?: Attachment[]
  }
}
```

**Features:**
- Markdown rendering
- Code syntax highlighting
- Chart embedding
- Table formatting
- Copy to clipboard
- Regenerate response

### AIChatInput

**Features:**
- Auto-resize textarea
- Suggested prompts
- Voice input (future)
- File upload (for receipts)
- Command palette
- Keyboard shortcuts

---

## 🚀 Deployment Checklist

### Phase 1: Basic Chat (Day 1)
- [ ] Install Gemini SDK
- [ ] Create API route
- [ ] Build chat sidebar UI
- [ ] Implement basic Q&A
- [ ] Test with revenue queries

### Phase 2: Context Awareness (Day 2)
- [ ] Build context builder
- [ ] Add page-specific context
- [ ] Implement query parser
- [ ] Enhanced prompts
- [ ] Test accuracy

### Phase 3: Advanced Features (Day 3)
- [ ] Chart generation
- [ ] Table formatting
- [ ] Quick actions
- [ ] Conversation history
- [ ] Performance optimization

---

## 📈 Success Metrics

**Engagement:**
- Queries per user per week
- Response accuracy rate
- User satisfaction (thumbs up/down)
- Feature adoption (% of users who try AI)

**Performance:**
- Average response time (<2s target)
- API costs per query (<$0.001 target)
- Error rate (<1% target)

**Business Impact:**
- Reduction in support tickets
- Time saved per user
- Feature discoverability
- User retention

---

## 🔐 Security & Privacy

**Data Handling:**
- Never send sensitive data (SSNs, passwords)
- Anonymize client names in logs
- Encrypt API keys
- Rate limiting (10 queries/min per user)

**Privacy:**
- Conversations stored in user's database
- Option to delete conversation history
- No training on user data
- GDPR compliant

---

## 💰 Cost Estimates

**Gemini 2.0 Flash Pricing:**
- Input: $0.075 per 1M tokens
- Output: $0.30 per 1M tokens

**Typical Usage:**
```
Average query:
- Context: ~500 tokens
- Question: ~20 tokens
- Response: ~200 tokens
- Total: ~720 tokens

Cost per query: ~$0.00022

1,000 queries/month: $0.22
10,000 queries/month: $2.20
100,000 queries/month: $22.00
```

**Very affordable!**

---

## 🎓 User Education

**First-Time User:**
```
AI: "Hi! I'm your AI business assistant.
     I can help you understand your finances.

     Try asking:
     - How much did I make last month?
     - Who owes me money?
     - Show my top clients

     What would you like to know?"
```

**Help Command:**
```
User: "help"
AI: "I can answer questions about:

     💰 Revenue & Income
     - Monthly/quarterly revenue
     - Revenue by client
     - Trend analysis

     📊 AR & Collections
     - Outstanding invoices
     - Aging reports
     - Payment patterns

     👥 Clients
     - Client profitability
     - Payment history
     - Revenue breakdown

     📈 Business Health
     - Profit margins
     - Growth trends
     - Forecasts

     Just ask in plain English!"
```

---

## 🔄 Future Enhancements

**Phase 4: Smart Actions**
- "Send payment reminder to overdue clients"
- "Create invoice for Austin Storage"
- "Generate monthly report"

**Phase 5: Proactive Insights**
- Daily/weekly digest emails
- Anomaly alerts
- Opportunity suggestions

**Phase 6: Voice Interface**
- Speech-to-text input
- Text-to-speech responses
- Mobile voice commands

**Phase 7: Advanced AI**
- Predictive analytics
- Cash flow forecasting
- Business advice
- Competitive analysis

---

## 📝 Implementation Notes

**Start Simple:**
- Focus on revenue queries first
- Get the basics working perfectly
- Iterate based on user feedback

**Test Extensively:**
- Create test suite with common queries
- Measure accuracy
- Optimize prompts

**Monitor Costs:**
- Track API usage
- Optimize context size
- Cache common queries

**Gather Feedback:**
- Thumbs up/down on responses
- Track which queries work well
- Identify gaps in capabilities

---

**Let's build the future of business management! 🚀**
