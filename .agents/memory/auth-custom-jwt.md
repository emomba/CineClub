---
name: Custom JWT Auth
description: Clerk was removed; replaced with username+password auth using bcryptjs + jsonwebtoken. Token stored in localStorage.
---

# Custom JWT Auth

Clerk has been fully removed from both backend and frontend.

## Backend

- `artifacts/api-server/src/lib/auth.ts` — `createToken(userId)`, `verifyToken(token)`, `requireAuth` middleware (reads `Authorization: Bearer`), `getClerkUserId(req)`.
- `artifacts/api-server/src/routes/auth.ts` — `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `PATCH /api/auth/password`.
- `lib/db/src/schema/users.ts` — `passwordHash text` column added (nullable; null = old unclaimed Clerk account).
- The `clerkId` column is kept but now stores UUIDs generated at registration (`user_<32hex>`).

**Why:** User requested username-only registration, no email, no Clerk dependency.

**How to apply:** All protected routes use `requireAuth` middleware. `getClerkUserId(req)` returns the userId string from the JWT payload.

## Frontend

- `artifacts/cineclub/src/lib/auth.tsx` — `AuthProvider`, `useAuth()` hook (`{ user, isLoaded, isSignedIn, signIn, signUp, signOut }`), `getAuthToken()` exported helper.
- Token stored in `localStorage` under key `cc_auth_token`.
- `setAuthTokenGetter(() => Promise.resolve(getAuthToken()))` called in AuthProvider `useEffect` — this wires up the generated API client hooks automatically.
- Pages that make raw `fetch()` calls use `getAuthToken()` directly for the Authorization header.
- Login: `/login` route → `Login.tsx`. Register: `/register` route → `Register.tsx`.

## Migration path for old Clerk accounts

If a username exists in DB but has no `passwordHash`, registering with that username sets the password and claims the account (no data loss).
