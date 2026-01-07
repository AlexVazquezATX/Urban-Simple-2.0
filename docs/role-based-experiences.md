# Role-Based User Experiences

## Overview
Each user role has a completely different experience tailored to their needs. This is NOT just filtered access to the same pages - each role has unique dashboards, navigation, and features.

## Role Definitions

### SUPER_ADMIN & ADMIN (Business Operations)
**Purpose:** Full business management and oversight

**Dashboard Shows:**
- Company-wide metrics and KPIs
- AR Outstanding and revenue
- Operations overview across all locations
- Team performance analytics
- Recent activity feed

**Key Features:**
- Full access to all tools
- Chat Analytics with AI insights
- Team management
- Client and location management
- Billing and invoicing
- Schedule creation for managers
- Report generation

**Navigation:**
- Admin Tools: Dashboard, Chat Analytics
- Operations: All items
- Client Relations: Clients, Locations
- Administrative: Billing & AR, Invoices

---

### MANAGER (Nightly Operations)
**Purpose:** On-site service quality oversight and reporting

**Dashboard Shows:**
- Tonight's route (locations to review)
- Review progress (X of Y completed)
- Recent issues and pain points
- Quick access to start reviews
- Past review history
- Team assignments for their locations

**Key Features:**
- **Mobile-first Nightly Review System** (PRIMARY TOOL)
  - Location-by-location reviews
  - Checklist verification
  - Pain points tracking with severity
  - Photo uploads
  - Auto-notification of critical issues
- Team chat
- Schedule viewing (their assignments)
- Location details

**Navigation:**
- Admin Tools: Dashboard only
- Operations: Operations, Nightly Reviews, Team Chat, Team, Schedule, Assignments, Checklists
- Client Relations: Clients, Locations
- Administrative: Hidden

**Workflow:**
1. Arrive at scheduled location
2. Open "Tonight's Route"
3. Select location to review
4. Complete checklist verification
5. Report any pain points
6. Add photos if needed
7. Submit review
8. System auto-notifies clients of critical issues

---

### ASSOCIATE (Field Work)
**Purpose:** Daily task execution and checklist completion

**Dashboard Shows:**
- Today's assignments and schedule
- Active checklists to complete
- Clock in/out status
- Recent completed tasks
- Quick actions (start shift, view checklist)

**Key Features:**
- Shift clock in/out
- Checklist viewing and completion
- Assignment details
- Team chat (communication with manager)
- Schedule viewing (their shifts only)

**Navigation:**
- Admin Tools: Dashboard only
- Operations: Team Chat, Assignments, Checklists
- Client Relations: Hidden
- Administrative: Hidden

**Workflow:**
1. Clock in at location
2. View assigned checklist
3. Complete tasks
4. Mark checklist items complete
5. Clock out
6. Manager reviews their work later

---

### CLIENT_USER (Service Oversight)
**Purpose:** Monitor service quality at their properties

**Dashboard Shows:**
- Their locations' service status
- Recent service reviews and ratings
- Quality metrics and trends
- Outstanding issues and resolutions
- Recent photos from service
- Contact information for account manager

**Key Features:**
- View service reports for their properties
- See manager reviews and ratings
- View pain points and issue resolution
- Communication center (messages with account team)
- Billing and invoicing for their account only
- Service history and trends

**Navigation:**
- Admin Tools: Dashboard only
- Operations: Hidden
- Client Relations: Hidden (or limited to their own locations)
- Administrative: Hidden (or limited to their invoices)

**Workflow:**
1. Login to see all their locations
2. View recent service quality scores
3. Read manager notes from nightly reviews
4. See any reported issues and status
5. Communicate with account manager
6. Review and pay invoices

---

## Implementation Strategy

### Dashboard Routing
Main `/` route should detect user role and render appropriate dashboard:

```typescript
// app/(app)/page.tsx
export default async function DashboardPage() {
  const user = await getCurrentUser()

  switch (user.role) {
    case 'SUPER_ADMIN':
    case 'ADMIN':
      return <AdminDashboard />
    case 'MANAGER':
      return <ManagerDashboard />
    case 'ASSOCIATE':
      return <AssociateDashboard />
    case 'CLIENT_USER':
      return <ClientDashboard />
  }
}
```

### Data Visibility Rules

**SUPER_ADMIN/ADMIN:**
- See ALL data across entire company

**MANAGER:**
- See only locations assigned to them in schedules
- See only their own reviews
- See team members assigned to their shifts

**ASSOCIATE:**
- See only their own shifts and assignments
- See only checklists for their assigned locations

**CLIENT_USER:**
- See only locations belonging to their client company
- See only reviews for their locations
- See only their invoices and billing

---

## Testing Requirements

### Test Data Needed
1. **Test Manager Account:**
   - Email: manager@urbansimple.net
   - Role: MANAGER
   - Assigned to specific locations via Schedule

2. **Test Associate Account:**
   - Email: associate@urbansimple.net
   - Role: ASSOCIATE
   - Assigned to shifts created by admin

3. **Test Client Account:**
   - Email: client@testclient.com
   - Role: CLIENT_USER
   - Linked to specific Client company
   - Client has locations with service

4. **Connected Test Data:**
   - Client company with 2-3 locations
   - Schedule assigning Manager to those locations
   - Shifts for Associate at those locations
   - Sample service reviews from Manager
   - Sample pain points and issues

### Testing Workflow
1. As SUPER_ADMIN: Create schedule with Manager assigned to locations
2. Switch to MANAGER role using role switcher
3. See "Tonight's Route" with scheduled locations
4. Complete nightly reviews
5. Switch back to SUPER_ADMIN
6. View manager's submitted reviews in admin interface
7. Switch to CLIENT_USER
8. See the service reviews for their locations

---

## Next Steps
1. ✅ Build Manager Nightly Review System
2. ✅ Create test data seed script (manager, associate, client user accounts)
3. ✅ Build Schedule UI with vertical week view (columns for each day)
4. ✅ Implement multi-location shift support with ShiftLocation model
5. ✅ Add shift deletion capability
6. ⏳ Build Manager Dashboard
7. ⏳ Build Admin view of Manager Reviews
8. ⏳ Build Associate Dashboard
9. ⏳ Build Client Dashboard
10. ⏳ Build Associate shift/checklist interface
11. ⏳ Build Client service reports view
