You are a Senior Backend Engineer.

Build a production-ready backend for a photographer client gallery platform.

A public portfolio website already exists (see `../web`). Your task is to build everything behind it: authentication, session/media management, client gallery APIs, and the download system. The admin dashboard (see `../admin`) will consume this API.

The project should be clean, scalable, secure, and easy to maintain.

--------------------------------------------------

TECH STACK

- Node.js
- Express.js
- TypeScript
- PostgreSQL
- Prisma ORM
- JWT Authentication
- Cloudflare R2 (preferred) or AWS S3
- Sharp
- FFmpeg
- Multer
- Zod
- Pino Logger
- Swagger / OpenAPI

--------------------------------------------------

PROJECT STRUCTURE

Use a clean architecture.

```
server/
  src/
    config/
    controllers/
    middleware/
    routes/
    services/
    repositories/
    prisma/
    types/
    utils/
    storage/
    auth/
    validations/
    uploads/
    docs/
```

--------------------------------------------------

OVERVIEW

The photographer creates photo sessions.

Example:

Wedding of Ahmed & Sara

Each session contains:

- Images
- Videos

The photographer uploads all media from the Admin Dashboard.

Customers visit the public website.

They log in using their phone number.

After verification they can only access their own gallery.

Customers can:

- View photos
- View videos
- Download individual files
- Download multiple selected files
- Download the entire wedding as a ZIP archive

--------------------------------------------------

USER ROLES

## Admin

The photographer.

Permissions:

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

## Client

Permissions:

- Register with full name, phone number, and password
- Login using phone number + password
- Change their own password
- View assigned gallery
- Download files

Cannot:

- Upload files
- Access other galleries
- Access admin APIs

--------------------------------------------------

AUTHENTICATION

## Admin

Email + Password

Requirements:

- bcrypt password hashing
- JWT Access Token
- Refresh Token

## Client

Login using Phone Number.

Example: +971501234567

Flow:

1. Enter phone number + password
2. Receive Access Token
3. Receive Refresh Token

A forgotten password is reset by the admin (`PUT /admin/clients/:id/password`);
there is no self-service reset channel.

--------------------------------------------------

DATABASE

Design a complete Prisma schema.

Tables:

- Admin
- Client
- Session
- Media
- RefreshToken
- DownloadHistory

## Session

Fields:

- id
- title
- slug
- coverImage
- eventDate
- location
- description
- status
- createdAt
- updatedAt

## Client

Fields:

- id
- name
- phone
- sessionId
- createdAt

One session may contain multiple clients.

Example: Bride, Groom, Parents, Family Members.

Each phone number can access the gallery.

## Media

Fields:

- id
- sessionId
- type (image/video)
- originalName
- storageKey
- thumbnail
- mimeType
- size
- width
- height
- duration
- createdAt

## Download History

Store:

- client
- session
- downloaded media
- download type
- timestamp
- IP Address

--------------------------------------------------

CLOUD STORAGE

Use Cloudflare R2.

Requirements:

- Upload
- Delete
- Signed URLs
- Private Bucket

Never expose direct storage URLs.

Generate signed URLs for downloads.

--------------------------------------------------

UPLOAD SYSTEM

Admin uploads:

- Images
- Videos

Support:

- Drag & Drop
- Multiple Upload
- Folder Upload
- Upload Progress

Images — automatically create:

- Original
- Optimized version
- Thumbnail

Videos — automatically create:

- Thumbnail
- Metadata
- Duration
- Resolution

Store metadata inside PostgreSQL.

--------------------------------------------------

DOWNLOAD SYSTEM

Support:

- Download single image
- Download single video
- Download multiple selected files
- Download entire session

Entire session download should produce a ZIP Archive.

Workflow:

User clicks "Download Wedding" → Server creates ZIP archive → Return download link.

If the ZIP already exists and the gallery hasn't changed, reuse the existing ZIP instead of regenerating it.

--------------------------------------------------

GALLERY SETTINGS

Admin can configure:

- Allow Downloads
- Disable Downloads
- Watermark Preview Images
- Hide Original File Names
- Password Protected Gallery (optional)
- Gallery Expiration Date

--------------------------------------------------

API DESIGN

## Authentication

POST /auth/login

POST /auth/verify

POST /auth/refresh

## Gallery (client-facing)

GET /gallery

GET /gallery/:sessionId

GET /media/:id

GET /download/:mediaId

GET /download/session/:sessionId

## Admin

Full CRUD for:

- Sessions
- Clients
- Media
- Dashboard Statistics
- Downloads

--------------------------------------------------

VALIDATION

Use Zod.

Validate:

- Request Body
- Params
- Query
- Responses

--------------------------------------------------

SECURITY

Implement:

- Helmet
- CORS
- Rate Limiting
- JWT Authentication
- Refresh Tokens
- Input Validation
- File Size Limits
- Allowed MIME Types
- Download Authorization
- Secure Signed URLs

--------------------------------------------------

LOGGING

Use Pino.

Log:

- Uploads
- Downloads
- Authentication
- Errors

--------------------------------------------------

API DOCUMENTATION

Generate complete Swagger / OpenAPI documentation.

Every endpoint must be documented.

--------------------------------------------------

ENVIRONMENT VARIABLES

```
PORT=

DATABASE_URL=

JWT_SECRET=

JWT_REFRESH_SECRET=

R2_ENDPOINT=

R2_BUCKET=

R2_ACCESS_KEY=

R2_SECRET_KEY=


```

--------------------------------------------------

CODE QUALITY

Requirements:

- Strict TypeScript
- ESLint
- Prettier
- Clean Architecture
- Repository Pattern
- Reusable Services
- Typed API Responses
- Proper Error Handling
- Modular Code
- Production Ready

--------------------------------------------------

DELIVERABLES

Build the project incrementally.

Start with:

1. Overall Architecture
2. Folder Structure
3. Prisma Database Schema
4. Authentication Flow
5. Cloud Storage Integration
6. REST API Design
7. Backend Implementation
8. API Documentation (Swagger)
9. Seed Data
10. README

Do **not** generate the entire project in one response.

Complete one module at a time while keeping the application runnable after each step.

Always explain architectural decisions before implementing them.
