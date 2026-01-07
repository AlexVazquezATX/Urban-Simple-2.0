# Schedule System Documentation

## Overview
The schedule system manages manager shifts and their multi-location review routes. It provides a visual week-at-a-glance calendar view and supports assigning managers to multiple locations in a single shift.

## Features

### Week View Calendar
- **Vertical column layout**: Days of the week displayed as columns (Monday-Sunday, left to right)
- **Week navigation**: Previous/Next week buttons, "This Week" shortcut
- **Day highlighting**: Current day highlighted with border and "Today" badge
- **Past days**: Grayed out with "Past" badge, edit/add buttons hidden

### Multi-Location Shifts
Manager shifts support multiple locations in a single route:
- Select 5-10 locations per shift (typical nightly review route)
- Locations stored in `ShiftLocation` join table with sort order
- Display shows all locations with bullet points
- Badge shows "X stops" when multiple locations selected

### Shift Management
- **Create shifts**: Modal form to schedule manager review routes
- **Edit shifts**: Update time, date, locations, manager
- **Delete shifts**: Red delete button in edit modal with confirmation
- **Location selection**: Scrollable checkbox list grouped by client

### Data Model

#### Shift Model
```prisma
model Shift {
  id               String   @id @default(cuid())
  locationId       String?  // Nullable - backward compatibility
  branchId         String
  associateId      String?  // Nullable - supports manager-only shifts
  managerId        String?
  date             DateTime
  startTime        String   // "21:00"
  endTime          String   // "02:00"
  status           String   // scheduled, in_progress, completed, missed, cancelled

  location       Location?
  branch         Branch
  associate      User?
  manager        User?
  shiftLocations ShiftLocation[]  // NEW: Multiple locations support
  serviceLogs    ServiceLog[]
}
```

#### ShiftLocation Model
```prisma
model ShiftLocation {
  id         String   @id @default(cuid())
  shiftId    String
  locationId String
  sortOrder  Int      @default(0)  // Order for route planning

  shift    Shift
  location Location

  @@unique([shiftId, locationId])
}
```

## API Endpoints

### GET /api/shifts
List all shifts with filters:
- `startDate`, `endDate`: Date range
- `locationId`: Filter by location
- `associateId`: Filter by associate
- `managerId`: Filter by manager
- `status`: Filter by status

Includes: `location`, `shiftLocations`, `associate`, `manager`, `serviceLogs` count

### POST /api/shifts
Create new shift:
```json
{
  "locationIds": ["loc1", "loc2", "loc3"],  // Array of location IDs
  "managerId": "mgr1",
  "date": "2026-01-06",
  "startTime": "21:00",
  "endTime": "02:00",
  "status": "scheduled",
  "notes": "Optional notes"
}
```

Creates:
1. Shift record with first locationId (backward compatibility)
2. ShiftLocation records for all selected locations with sortOrder

### PUT /api/shifts/[id]
Update existing shift:
- Updates shift fields
- Deletes all existing ShiftLocation records
- Creates new ShiftLocation records for selected locations
- Maintains sortOrder based on selection order

### DELETE /api/shifts/[id]
Delete shift:
- Cascades to ShiftLocation records (onDelete: Cascade)
- Requires confirmation in UI

## UI Components

### Schedule Page (`/operations/schedule`)
- Server component fetching shifts for selected week
- Grid layout: 7 columns (one per day)
- Each day column shows:
  - Day header with date number and name
  - Shifts stacked vertically
  - "Add Shift" button (hidden for past days)

### Shift Card
Compact display in day column:
- Manager name
- Time range
- Location list (bullet points)
- Status badge
- "X stops" badge (if multiple locations)
- Edit button

### Shift Form Modal
- Location selection with scrollable checkbox list
- Manager dropdown (filtered to MANAGER/ADMIN roles)
- Associate dropdown (disabled when manager selected)
- Date picker
- Time pickers (start/end)
- Notes textarea
- Footer:
  - Delete button (red, left side, only when editing)
  - Cancel/Save buttons (right side)

## Business Rules

### Manager Shifts
- Require manager selection
- Support multiple locations (typically 5-10)
- No associate required
- Used for nightly review routes

### Associate Shifts
- Require associate selection
- Typically single location
- No manager required
- Used for regular work assignments

### Validation
- At least one location required
- Either manager OR associate required (not both)
- Start time must be before end time
- Date cannot be in the past (for new shifts)

## Testing

### Test Data
Created via `scripts/seed-test-data.ts`:
- **Manager**: manager@urbansimple.net / TestManager123!
- **Associate**: associate@urbansimple.net / TestAssociate123!
- **Client User**: client@testclient.com / TestClient123!
- **Test Client**: "Test Client Company" with 3 locations in Austin

### Test Workflow
1. Login as SUPER_ADMIN
2. Navigate to Schedule
3. Create shift for Test Manager with 3 test locations
4. Verify all locations appear in shift card
5. Edit shift, change locations
6. Verify updates persist
7. Delete shift, verify removal

## Migration Notes

### Schema Changes
1. Made `Shift.associateId` nullable to support manager-only shifts
2. Added `ShiftLocation` table for many-to-many relationship
3. Kept `Shift.locationId` nullable for backward compatibility

### Database Migration
```bash
npx prisma db push
```

### Breaking Changes
None - backward compatible:
- Old shifts with single `locationId` still work
- New shifts use both `locationId` (first location) and `shiftLocations` array
- Display logic checks `shiftLocations` first, falls back to `location`

## Future Enhancements
- Route optimization (sort locations by geography)
- Recurring shift templates
- Shift assignment notifications
- Manager availability calendar
- Shift swap/trade requests
- Export to calendar (iCal)
