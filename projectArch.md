# Photographer Client Gallery Platform

You are a Senior Full Stack Engineer.

Build a production-ready backend and admin dashboard for a photographer website.

The public portfolio website already exists. Your task is to build everything behind it including the backend, admin dashboard, authentication, media management, client gallery, and download system.

The project should be clean, scalable, secure, and easy to maintain.

---

# Tech Stack

## Backend

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

## Admin Dashboard

- React
- Vite
- TypeScript
- Tailwind CSS
- TanStack Query
- Zustand
- React Hook Form
- Zod

---

# Project Structure

Use a clean architecture.

```
backend/

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

frontend-admin/

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

---

# Overview

The photographer creates photo sessions.

Example:

Wedding of Ahmed & Sara

Each session contains:

- Images
- Videos

The photographer uploads all media from the Admin Dashboard.

Customers visit the website.

They login using their phone number.

After verification they can only access their own gallery.

Customers can:

- View photos
- View videos
- Download individual files
- Download multiple selected files
- Download the entire wedding as a ZIP archive

---

# User Roles

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

---

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

---

# Authentication

## Admin

Email + Password

Requirements:

- bcrypt password hashing
- JWT Access Token
- Refresh Token

---

## Client

Login using:

Phone Number

Example:

+971501234567

Flow:

1. Enter phone number + password

2. Receive Access Token

3. Receive Refresh Token

A client registers with full name, phone number, and password, or is created by
the admin. A forgotten password is reset by the admin
(`PUT /admin/clients/:id/password`) — there is no self-service reset, since no
OTP or email channel exists to deliver a link over.

---

# Database

Design a complete Prisma schema.

Tables:

- Admin
- Client
- Session
- Media
- RefreshToken
- DownloadHistory

---

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

---

## Client

Fields:

- id
- name
- phone
- sessionId
- createdAt

One session may contain multiple clients.

Example:

Bride

Groom

Parents

Family Members

Each phone number can access the gallery.

---

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

---

## Download History

Store:

- client
- session
- downloaded media
- download type
- timestamp
- IP Address

---

# Cloud Storage

Use:

Cloudflare R2

Requirements:

- Upload
- Delete
- Signed URLs
- Private Bucket

Never expose direct storage URLs.

Generate signed URLs for downloads.

---

# Upload System

Admin uploads:

- Images
- Videos

Support:

- Drag & Drop
- Multiple Upload
- Folder Upload
- Upload Progress

Images:

Automatically create:

- Original
- Optimized version
- Thumbnail

Videos:

Automatically create:

- Thumbnail
- Metadata
- Duration
- Resolution

Store metadata inside PostgreSQL.

---

# Gallery

Client Gallery

Requirements:

- Responsive Grid
- Lazy Loading
- Infinite Scroll
- Image Preview
- Video Player
- Download Button

---

# Download System

Support:

- Download single image
- Download single video
- Download multiple selected files
- Download entire session

Entire session download should produce:

ZIP Archive

Workflow:

User clicks

Download Wedding

↓

Server creates ZIP archive

↓

Return download link

If the ZIP already exists and the gallery hasn't changed, reuse the existing ZIP instead of regenerating it.

---

# Gallery Settings

Admin can configure:

- Allow Downloads
- Disable Downloads
- Watermark Preview Images
- Hide Original File Names
- Password Protected Gallery (optional)
- Gallery Expiration Date

---

# Admin Dashboard

Pages:

- Login
- Dashboard
- Sessions
- Clients
- Uploads
- Downloads
- Settings

---

# Dashboard

Statistics Cards:

- Total Sessions
- Total Clients
- Total Images
- Total Videos
- Total Downloads
- Storage Usage

---

# Sessions Page

Features:

- Create
- Edit
- Delete
- Archive
- Search
- Pagination
- Filters
- Upload Media
- Assign Clients

---

# Upload Page

Features:

- Drag & Drop
- Multi Upload
- Upload Progress
- Retry Failed Uploads

---

# Clients Page

Manage:

- Name
- Phone Number
- Assigned Session

---

# Website APIs

Authentication

POST

/auth/login

/auth/verify

/auth/refresh

---

Gallery

GET

/gallery

/gallery/:sessionId

/media/:id

/download/:mediaId

/download/session/:sessionId

---

Admin

Full CRUD for:

- Sessions
- Clients
- Media
- Dashboard Statistics
- Downloads

---

# Validation

Use Zod.

Validate:

- Request Body
- Params
- Query
- Responses

---

# Security

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

---

# Logging

Use Pino.

Log:

- Uploads
- Downloads
- Authentication
- Errors

---

# API Documentation

Generate complete Swagger documentation.

Every endpoint must be documented.

---

# Environment Variables

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

---

# Code Quality

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

---

# Deliverables

Build the project incrementally.

Start with:

1. Overall Architecture
2. Folder Structure
3. Prisma Database Schema
4. Authentication Flow
5. Cloud Storage Integration
6. REST API Design
7. Backend Implementation
8. Admin Dashboard
9. API Documentation
10. Seed Data
11. README

Do **not** generate the entire project in one response.

Complete one module at a time while keeping the application runnable after each step.

Always explain architectural decisions before implementing them.