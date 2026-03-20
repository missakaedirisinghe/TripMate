---
description: How to add social login icons and trip status management
---

# Social Login Icons + Trip Status UI

## Steps

### Social Login Icons
1. Add Google and Facebook icon buttons to `app/login/page.tsx` and `app/register/page.tsx`
   - Use divider "or continue with"
   - Icons are non-functional placeholders (show "Coming soon" toast on click)
   - Style with glassmorphism icon buttons consistent with existing design

### Trip Status Management
2. Add a status dropdown or button group to the Trip Workspace header
   - Show current status as a badge
   - Allow transitioning: Planning → Active → Completed
   - Call `PUT /api/trips/:id` with `{ status: "active" }` etc.
   - Refresh trip data after status change
