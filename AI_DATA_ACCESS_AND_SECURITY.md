# AI Assistant - Data Access & Security Model

## 🔒 **Access Control: SUPER ADMIN ONLY**

As of this update, the AI Assistant is **restricted to SUPER_ADMIN users only**.

### Authentication Flow:
1. User makes request to `/api/ai/chat`
2. System checks if user is authenticated (logged in)
3. System verifies user role is `SUPER_ADMIN`
4. If not → Returns `401 Unauthorized` or `403 Forbidden`
5. If yes → Proceeds with AI request

### Who Can Access:
- ✅ **SUPER_ADMIN** - Full access to AI assistant
- ❌ **ADMIN** - No access
- ❌ **MANAGER** - No access
- ❌ **ASSOCIATE** - No access
- ❌ **CLIENT_USER** - No access

---

## 📊 **Data the AI Has Access To**

When a SUPER_ADMIN uses the AI, it receives comprehensive business context:

### **1. Financial Data (Complete Access)**

**Revenue & Billing:**
- Total revenue (all paid/partial invoices)
- Outstanding AR (accounts receivable)
- Average invoice amount
- Monthly Recurring Revenue (MRR from service agreements)

**AR Aging Breakdown:**
- Current (0-30 days)
- 31-60 days late
- 61-90 days late
- 90+ days late

**Recent Activity:**
- Last 10 invoices (numbers, amounts, clients, status, due dates)
- Last 10 payments (amounts, dates, clients)
- Top 5 clients by revenue (total revenue + invoice count)
- Last 6 months revenue trend

**Overdue Details:**
- Up to 10 oldest overdue invoices
- Client names, amounts, invoice numbers
- Days overdue for each

---

### **2. Operations Data (Complete Access)**

**Scheduling:**
- Upcoming shifts for next 7 days
  - Associate names
  - Location(s) for each shift
  - Start/end times
  - Status (scheduled, in_progress, completed, etc.)
- Total count of scheduled shifts this week

**Location Assignments:**
- Up to 10 active assignments
  - Associate → Location mapping
  - Monthly pay amount (SENSITIVE!)
  - Assignment start date

**Service History:**
- Last 10 service logs
  - Location names
  - Associate names
  - Service dates
  - Hours worked
  - Status (in_progress, completed, partial)

---

### **3. Team Performance (Complete Access)**

**Current Month Metrics:**
- Average service rating (0-5.0 stars)
- Total services completed
- Shift completion rate percentage

**Team Overview:**
- Total active associates count
- Active locations count

---

### **4. Issues & Quality (Complete Access)**

**Open Issues (up to 10):**
- Issue title and description
- Category (quality, equipment, communication, safety, other)
- Severity (low, medium, high, critical)
- Location name
- Client name
- Who reported it (associate name)
- Days since issue opened

**Issue Summary:**
- Total count of open issues

---

## 🔐 **What This Means for Privacy**

### ✅ **Good News:**
- Only SUPER_ADMIN can access AI assistant
- Non-admin users cannot see sensitive data through AI
- All queries are logged with user email for audit trail

### ⚠️ **Sensitive Data Exposed to SUPER_ADMIN:**
- **Associate monthly pay rates** - Visible in location assignments
- **All client financial data** - AR, revenue, overdue amounts
- **Team performance** - Individual service ratings and hours
- **All client names and locations**

### 📝 **Audit Trail:**
Every AI request logs:
- User email
- User role (verified as SUPER_ADMIN)
- Query intent (finance, schedule, team, etc.)
- Timestamp
- Detected language

---

## 🎯 **Data Scope: COMPANY-WIDE**

Currently, the AI pulls **ALL data for the entire company**:
- ✅ All clients (no filtering)
- ✅ All locations (no filtering)
- ✅ All associates (no filtering)
- ✅ All invoices and payments (no filtering)

**No Branch Filtering:**
Even though your schema supports multiple branches (Austin, Dallas, San Antonio), the AI currently shows data from **all branches combined**.

**This is appropriate for a SUPER_ADMIN** who oversees the entire company.

---

## 🚀 **Future Enhancements (Optional)**

### **1. Role-Based Data Filtering**

If you want to open AI to other roles in the future:

**ADMIN Role:**
- See data for their branch only
- No access to payroll/pay rates
- Limited financial visibility

**MANAGER Role:**
- See only their team's data
- Locations they manage
- No financial data except invoices for their locations
- No pay rate visibility

**ASSOCIATE Role:**
- See only their own schedule
- Their own performance metrics
- No financial data
- No visibility to other associates' data

### **2. Branch-Specific Context**

Add branch filtering to context builder:
```typescript
// Only show data for user's branch
const context = await buildBusinessContext(user.id, user.branchId)
```

### **3. Data Redaction Options**

Allow hiding sensitive fields:
```typescript
// Hide pay rates for ADMIN role
if (user.role !== 'SUPER_ADMIN') {
  context.activeAssignments = context.activeAssignments.map(a => ({
    ...a,
    monthlyPay: null // Redact pay information
  }))
}
```

### **4. Query Logging & Analytics**

Track what questions are being asked:
- Most common queries
- Failed queries (couldn't answer)
- Response quality feedback
- Usage by user/role

---

## 📋 **Current Implementation Summary**

### Security Checklist:
- ✅ Authentication required
- ✅ Role verification (SUPER_ADMIN only)
- ✅ Audit logging (user email, timestamp)
- ❌ No branch filtering (shows all branches)
- ❌ No data redaction (all fields visible)
- ❌ No rate limiting
- ❌ No query analytics

### Data Access:
- ✅ Financial: Full access
- ✅ Operations: Full access
- ✅ Team: Full access (including pay rates)
- ✅ Issues: Full access
- ✅ Clients: Full access

### Recommendations:
1. ✅ **Keep as SUPER_ADMIN only** - Current setup is appropriate for your use case
2. 🔜 **Add branch filtering** - If you expand to multiple branches
3. 🔜 **Add rate limiting** - Prevent abuse (e.g., 100 requests/hour per user)
4. 🔜 **Log queries to database** - For analytics and audit trail
5. 🔜 **Add feedback mechanism** - Thumbs up/down for response quality

---

## 💡 **Best Practices**

### For You (SUPER_ADMIN):
- ✅ AI has access to **everything** - treat it like internal company data
- ✅ Don't share AI responses externally (they contain client names, amounts)
- ✅ Be aware pay rates are visible when asking about assignments
- ✅ Use for strategic insights, not just basic queries

### For Future Development:
- 🔐 Never lower the access requirement below SUPER_ADMIN without implementing data filtering
- 🔐 Always redact sensitive fields (pay, SSN, etc.) if opening to other roles
- 🔐 Implement branch-specific filtering before allowing ADMIN access
- 🔐 Add query logging to database for compliance and analytics

---

## 🎯 **TL;DR**

**Current State:**
- AI Assistant = SUPER_ADMIN only ✅
- Full access to ALL company data (finance, ops, team, issues) ✅
- No branch filtering (sees all branches) ⚠️
- Pay rates visible in location assignments ⚠️
- Perfect for owner/CEO use case ✅

**This is YOUR assistant** - designed for complete business visibility and strategic decision-making.
