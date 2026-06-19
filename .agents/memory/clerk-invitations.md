---
name: Clerk email invitations via @clerk/express
description: How to send Clerk email invitations from the Express backend
---

## The rule
`clerkClient` is available from `@clerk/express` and supports `clerkClient.invitations.createInvitation({ emailAddress })`.

```typescript
import { clerkClient } from "@clerk/express";

await clerkClient.invitations.createInvitation({ emailAddress: "user@example.com" });
```

**Why:** `@clerk/express` is already installed in the api-server and exposes the backend client. No separate `@clerk/backend` install needed.

**How to apply:** Wrap in try/catch; Clerk errors are in `err.errors[0].message`. Return 400 with `{ success: false, message }` on error.
