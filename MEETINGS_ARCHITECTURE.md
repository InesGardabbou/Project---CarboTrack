# Microsoft Teams Meetings - Architecture & Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    CARBOTRACK FRONTEND                          │
│                    (React + TypeScript)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Pages/Meetings.tsx                                      │  │
│  │  - Displays meeting list                                │  │
│  │  - Shows loading/error states                           │  │
│  │  - Renders join buttons                                 │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │ uses                                    │
│  ┌────────────────────▼─────────────────────────────────────┐  │
│  │  hooks/useMeetings.ts                                    │  │
│  │  - Manages state (loading, error, meetings)             │  │
│  │  - Fetches data on mount                                │  │
│  │  - Provides refetch function                            │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │ calls                                   │
│  ┌────────────────────▼─────────────────────────────────────┐  │
│  │  services/meetingService.ts                              │  │
│  │  - getMeetings()                                         │  │
│  │  - createMeeting()                                       │  │
│  │  - updateMeeting()                                       │  │
│  │  - deleteMeeting()                                       │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │ HTTP requests                           │
└───────────────────────┼───────────────────────────────────────┘
                        │
                        │ (via REST API)
                        │
┌───────────────────────▼───────────────────────────────────────┐
│               YOUR BACKEND API                                 │
│          (Firebase / Node.js / Python / etc.)                 │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  POST /api/meetings   → Create Teams Meeting           │  │
│  │  GET /api/meetings    → Fetch User's Meetings          │  │
│  │  GET /api/meetings/:id → Get Meeting Details           │  │
│  │  PATCH /api/meetings/:id → Update Meeting              │  │
│  │  DELETE /api/meetings/:id → Delete Meeting             │  │
│  └───────┬──────────────────────────────────────┬─────────┘  │
│          │                                      │              │
│          │ calls Microsoft Graph API            │ reads/writes │
│          │                                      │              │
│  ┌───────▼──────────────────┐     ┌────────────▼──────────┐  │
│  │  Microsoft Graph API     │     │  Database             │  │
│  │ (Create/Join Meetings)   │     │  (Firebase/MongoDB/   │  │
│  │ onlineMeetings endpoints │     │   PostgreSQL)         │  │
│  └──────────────────────────┘     └───────────────────────┘  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
                        │
                        │
┌───────────────────────▼───────────────────────────────────────┐
│            MICROSOFT 365 / TEAMS                              │
│         (Meeting Creation & Management)                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. User Opens "Planned Meetings"

```
User clicks "Planned Meetings" in sidebar
              ↓
  Component: Meetings.tsx renders
              ↓
  Hook: useMeetings() runs
              ↓
  Service: meetingService.getMeetings() called
              ↓
  HTTP GET /api/meetings
              ↓
  Backend queries database / Microsoft Graph
              ↓
  Returns: Array of Meeting objects
              ↓
  Display meetings in list
```

### 2. User Clicks "Join Meeting"

```
User clicks join button
              ↓
  joinWebUrl from meeting object
              ↓
  Opens in new tab
              ↓
  Microsoft Teams app/web opens
              ↓
  User joins meeting
```

### 3. User Creates Meeting (with backend)

```
Admin/User submits form with:
  - title
  - start time
  - end time
              ↓
  Service: meetingService.createMeeting()
              ↓
  HTTP POST /api/meetings
              ↓
  Backend calls Microsoft Graph API
              ↓
  Teams meeting created
              ↓
  Response with joinWebUrl
              ↓
  Save to database
              ↓
  Display in list
```

---

## Component Hierarchy

```
App.tsx
├── Routes
│   └── /meetings
│       └── ProtectedRoute
│           └── Meetings.tsx
│               ├── Layout (header/sidebar wrapper)
│               │   └── useMeetings hook
│               │
│               ├── Loading skeleton
│               ├── Error message
│               ├── Empty state
│               └── Meetings list
│                   ├── Card
│                   │   ├── Meeting details
│                   │   ├── Badge (status)
│                   │   └── Join button
│                   │
│                   └── Refresh button
```

---

## State Management

### useMeetings Hook State

```typescript
{
  meetings: Meeting[],  // Array of meeting objects
  loading: boolean,     // true while fetching
  error: string | null, // error message if failed
  refetch: Function     // manual refresh function
}
```

### Meeting Object Structure

```typescript
{
  id: string,                        // Unique identifier
  subject: string,                   // Meeting title
  startDateTime: string,             // ISO format: "2026-01-25T14:00:00Z"
  endDateTime: string,               // ISO format: "2026-01-25T15:00:00Z"
  joinWebUrl: string,                // Teams meeting link
  organizer?: string,                // Optional: organizer name
  participants?: number              // Optional: participant count
}
```

---

## API Endpoints

### Currently Using
- None (mock data in frontend)

### When Backend Ready

```
Backend API Base: /api

GET /api/meetings
├── Auth: Bearer token (required)
├── Returns: Meeting[]
└── Example: GET /api/meetings

POST /api/meetings
├── Auth: Bearer token (required)
├── Body: { startDateTime, endDateTime, subject, userId }
├── Returns: Meeting
└── Example: POST /api/meetings

GET /api/meetings/:id
├── Auth: Bearer token (required)
├── Params: id (meeting ID)
├── Returns: Meeting
└── Example: GET /api/meetings/abc123

PATCH /api/meetings/:id
├── Auth: Bearer token (required)
├── Params: id (meeting ID)
├── Body: partial Meeting object
├── Returns: Meeting
└── Example: PATCH /api/meetings/abc123

DELETE /api/meetings/:id
├── Auth: Bearer token (required)
├── Params: id (meeting ID)
├── Returns: { success: true }
└── Example: DELETE /api/meetings/abc123
```

---

## Authentication Flow

```
User logs in to CarboTrack
              ↓
  Auth token stored (Firebase Auth / Your auth system)
              ↓
  Token passed with each request
              ↓
  Authorization header: "Bearer {token}"
              ↓
  Backend verifies token
              ↓
  Returns user's meetings
```

---

## Error Handling

```
API Call
    ↓
Network Error? → Show "Failed to fetch meetings"
    ↓
401 Unauthorized? → Show "Please log in"
    ↓
500 Server Error? → Show "Server error, try later"
    ↓
No Meetings? → Show "No meetings planned"
    ↓
Success? → Display meetings list
```

---

## Integration Checklist

### Frontend (✅ DONE)
- [x] Meetings page created
- [x] API service created
- [x] Custom hook created
- [x] Navigation integrated
- [x] UI components built
- [x] Mock data included
- [x] Error handling
- [x] Loading states

### Backend (⏳ TO DO - Choose one)
- [ ] Firebase Cloud Functions
- [ ] Node.js/Express
- [ ] Python/Flask
- [ ] Your existing backend

### Microsoft Integration (⏳ TO DO)
- [ ] Register Azure AD app
- [ ] Get credentials
- [ ] Implement OAuth
- [ ] Call Graph API

---

## Key Files & Their Roles

| File | Purpose | Status |
|------|---------|--------|
| `src/pages/Meetings.tsx` | UI & rendering | ✅ |
| `src/services/meetingService.ts` | API client | ✅ |
| `src/hooks/useMeetings.ts` | State management | ✅ |
| `src/components/layout/Sidebar.tsx` | Navigation | ✅ |
| `src/App.tsx` | Routing | ✅ |
| Backend API | Data serving | ⏳ |
| Microsoft Graph | Meeting creation | ⏳ |
| Database | Data persistence | ⏳ |

---

## Development Mode (Current)

```
Frontend (Mock Data)
    ↓
Shows sample meetings
    ↓
No backend needed
    ↓
Perfect for UI testing
```

## Production Mode (Future)

```
Frontend
    ↓
Real Backend API
    ↓
Microsoft Graph API
    ↓
Real Teams Meetings
```

---

Last Updated: January 18, 2026
