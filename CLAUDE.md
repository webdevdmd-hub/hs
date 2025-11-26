# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

### Frontend (Vite + React)
```bash
npm run dev      # Start dev server on port 3000
npm run build    # Production build to /dist
npm run preview  # Preview production build locally
```

### Cloud Functions
```bash
cd functions
npm run build              # Compile TypeScript
npm run serve              # Build + start Firebase emulator
firebase deploy --only functions  # Deploy to Firebase
```

### Firebase
```bash
firebase deploy --only firestore:rules  # Deploy Firestore security rules
```

## Architecture Overview

### Tech Stack
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS (CDN)
- **Backend**: Firebase (Auth, Firestore, Cloud Functions, Storage)
- **State Management**: React Context API (no Redux)

### Core Data Flow
Two main context providers wrap the app:
- `AuthProvider` (useAuth.tsx) - Authentication, users, roles, permissions
- `CRMProvider` (useCRM.tsx) - All CRM data with Firestore real-time sync

### Permission System
The app uses a granular permission-based access control:
- Permissions defined as enum in `types.ts` (66+ permissions)
- Roles have arrays of permissions (hardcoded in useAuth.tsx)
- Use `hasPermission(Permission.XXX)` to check access
- Four default roles: Admin, Sales Manager, Sales Executive, Accountant Head

### Firestore Structure
```
/users/{userId}                    - User profiles with roleId
/crm/main/{subCollection}/{docId}  - Main CRM data (leads, tasks, etc.)
/calendars/{calendarId}            - User calendars
/calendar_shares/{shareId}         - Calendar sharing
/bookings/{bookingId}              - Booking records
/user_schedules/{userId}           - Working hours/availability
```

### Security Rules Pattern
- CRM write access restricted to roles: admin, sales_manager, sales_executive
- Users can read all profiles but only edit their own
- Admin can create/delete any user
- `canWriteCRM()` helper function checks role-based write access

## Key Patterns and Conventions

### Component Organization
- Feature-based folders: `/components/sales/`, `/components/admin/`, etc.
- Reusable UI components in `/components/ui/` (Button, Card, Modal)
- Icons as individual SVG components in `/components/icons/Icons.tsx`

### State Management Pattern
```tsx
// Context provides data + methods
const { leads, addLead, updateLead } = useCRM();
const { hasPermission, currentUser, users } = useAuth();

// Real-time sync with Firestore onSnapshot
useEffect(() => {
  const unsubscribe = onSnapshot(collection(db, "collectionName"), (snapshot) => {
    // Update local state from snapshot
  });
  return () => unsubscribe();
}, []);
```

### Permission Gating Pattern
```tsx
{hasPermission(Permission.CREATE_LEADS) && (
  <Button onClick={handleCreate}>Add Lead</Button>
)}
```

### Firestore CRUD Pattern
All CRM operations go through useCRM hook methods which handle:
1. Firestore write (setDoc/updateDoc/deleteDoc)
2. Local state update for optimistic UI
3. Real-time listener keeps data in sync

### Type Definitions
All types in `types.ts`:
- Core: User, Role, Permission enum
- CRM: Lead, Customer, Project, Task, Quotation, Invoice
- Calendar: Calendar, CalendarEvent, CalendarShare, UserSchedule, Booking

### UI Conventions
- Tailwind utility classes throughout
- Responsive design with sm/md/lg breakpoints
- Modal-based forms for create/edit operations
- Dropdown menus for status changes and actions
- Card component wraps content sections

## Important Files

- `types.ts` - All TypeScript type definitions
- `hooks/useAuth.tsx` - Auth context, permission checking, role management
- `hooks/useCRM.tsx` - CRM data context with Firestore integration
- `firestore.rules` - Security rules (role-based access control)
- `firebase.ts` - Firebase initialization and exports
- `App.tsx` - Main routing/view switching logic

## Notes

- No linting or test configuration exists
- Roles and default permissions are hardcoded in useAuth.tsx MOCK_ROLES
- Calendar system is extensive with sharing, booking pages, and availability finder
- Cloud Functions in `/functions` require separate `npm install`
