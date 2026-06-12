---
name: Clerk version compatibility
description: @clerk/react and @clerk/shared version pairing — which versions work together and which break.
---

## Rule

`@clerk/react@6.x` must be paired with `@clerk/shared@4.x`. The `@clerk/react@5.x` line paired with `@clerk/shared@3.x` is effectively EOL — `@clerk/shared@3.47.7` (latest 3.x) is missing exports that `@clerk/react@5.54.0` imports (`loadClerkUiScript`), so the pairing silently breaks at runtime even though pnpm resolves it.

**Why:** pnpm resolved `@clerk/react@5.54.0` to `@clerk/shared@3.47.7` because that was the workspace-pinned 3.x. But 5.54.0 was built against a version of 3.x that doesn't exist yet/was never released — causing missing export errors at Vite bundle time.

**How to apply:** When setting up Clerk for web apps, always install `@clerk/react@^6.x` (current latest is 6.9.1) and `@clerk/shared@^4.x`. Do NOT use `@clerk/react@5.x` even if the catalog pins to it.

## API differences v5→v6

- `Show` component: EXISTS in v6 (not `SignedIn`/`SignedOut` — those are v5 names that don't exist in v6 either)
- `publishableKeyFromHost`: re-exported from `@clerk/react/internal` in v6 ✓
- `addListener` in `useClerk()`: the callback `({ user })` parameter needs explicit typing to avoid `implicit any`

## Working setup (verified)

- `@clerk/react@6.9.1` + `@clerk/shared@4.17.1` — both installed as devDeps in the cineclub artifact
- `@clerk/express@2.1.26` + `@clerk/shared@4.17.1` — api-server
- No pnpm overrides needed for Clerk when using the 6.x / 4.x pairing
