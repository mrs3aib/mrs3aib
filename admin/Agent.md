You are a Senior Frontend Engineer.

Build a production-ready admin dashboard for a photographer client gallery platform.

The public portfolio website already exists (see `../web`), and the backend API is built separately (see `../server`). Your task is to build the admin dashboard the photographer uses to manage sessions, clients, media, and downloads.

The project should be clean, scalable, secure, and easy to maintain.

--------------------------------------------------

TECH STACK

- React
- Vite
- TypeScript
- Tailwind CSS
- TanStack Query
- Zustand
- React Hook Form
- Zod

--------------------------------------------------

PROJECT STRUCTURE

Use a clean architecture.

```
admin/
  src/
    components/
    pages/
    layouts/
    hooks/
    services/
    store/
    types/
    utils/
```

--------------------------------------------------

OVERVIEW

The photographer (Admin) creates photo sessions.

Example:

Wedding of Ahmed & Sara

Each session contains images and videos, uploaded by the admin from this dashboard.

Customers log in on the public website with their phone number and password, and can only access their own gallery. This dashboard is where the admin manages that entire pipeline: sessions, client assignment, media uploads, gallery settings, and download tracking.

--------------------------------------------------

USER ROLE — ADMIN

The dashboard is admin-only (the photographer). Permissions:

- Login
- Create sessions
- Edit sessions
- Delete sessions
- Upload media
- Delete media
- Manage users
- Assign customers
- View downloads
- View statistics
- Update gallery settings

--------------------------------------------------

AUTHENTICATION

Admin logs in with Email + Password against the backend API.

Requirements:

- JWT Access Token stored securely (memory + refresh flow, not localStorage for the access token)
- Silent refresh using the Refresh Token
- Redirect to login on 401 / expired session
- Protected routes — unauthenticated users cannot reach any dashboard page

--------------------------------------------------

PAGES

- Login
- Dashboard
- Sessions
- Clients
- Uploads
- Downloads
- Settings

## Dashboard

Statistics Cards:

- Total Sessions
- Total Clients
- Total Images
- Total Videos
- Total Downloads
- Storage Usage

## Sessions Page

Features:

- Create
- Edit
- Delete
- Archive
- Search
- Pagination
- Filters
- Upload Media (per session)
- Assign Clients (per session)

Each session represents an event (e.g. "Wedding of Ahmed & Sara") with fields: title, slug, coverImage, eventDate, location, description, status.

## Upload Page

Features:

- Drag & Drop
- Multi Upload
- Folder Upload
- Upload Progress (per file)
- Retry Failed Uploads

Uploads target a specific session and can contain images and videos. Reflect server-side processing state (thumbnail/optimized version generation) once available.

## Clients Page

Manage:

- Name
- Phone Number
- Assigned Session

A session may have multiple clients (Bride, Groom, Parents, Family Members), each able to log into the same gallery via their own phone number.

## Downloads Page

View download history: client, session, downloaded media, download type (single/multiple/full ZIP), timestamp, IP address.

## Settings Page

Per-session gallery settings:

- Allow Downloads / Disable Downloads
- Watermark Preview Images
- Hide Original File Names
- Password Protected Gallery (optional)
- Gallery Expiration Date

--------------------------------------------------

API INTEGRATION

Consume the backend's admin REST API (full CRUD for Sessions, Clients, Media, Dashboard Statistics, Downloads). Use TanStack Query for all server state (fetching, caching, mutations, optimistic updates where sensible). Use Zustand only for client-only UI/app state (e.g. auth session, upload queue, UI toggles) — never duplicate server state into Zustand.

Uploads should call the backend's signed upload flow; never assume direct public storage URLs. Downloads should use the backend's signed download links.

--------------------------------------------------

VALIDATION

Use Zod schemas for all forms, paired with React Hook Form. Mirror the backend's validation rules so client-side errors surface before hitting the API.

--------------------------------------------------

SECURITY

- No secrets or storage credentials in frontend code
- All admin API calls authenticated with the JWT access token
- Handle token expiry / refresh transparently
- Sanitize any user-supplied content rendered in the UI
- File size / MIME type checks client-side as a first line of defense (server remains the source of truth)

--------------------------------------------------

CODE QUALITY

Requirements:

- Strict TypeScript
- ESLint
- Prettier
- Clean Architecture
- Reusable components and hooks
- Typed API responses (share/mirror backend types where practical)
- Proper error and loading states on every data-fetching view
- Modular code
- Production ready

--------------------------------------------------

DELIVERABLES

Build the project incrementally.

Start with:

1. Overall Architecture
2. Folder Structure
3. Auth Flow (Login, token refresh, protected routes)
4. API Client Layer (services/, typed, TanStack Query hooks)
5. Layout & Navigation Shell
6. Dashboard Page (statistics)
7. Sessions Page
8. Upload Page
9. Clients Page
10. Downloads Page
11. Settings Page
12. README

Do **not** generate the entire project in one response.

Complete one module at a time while keeping the application runnable after each step.

Always explain architectural decisions before implementing them.
