---
description: How to add UX polish items (404 page, toasts, loading skeletons, mobile nav)
---

# UX Polish

## Steps

### 404 Page
1. Create `e:\TripMate\frontend\app\not-found.tsx`
   - Styled error page with illustration and "Go Home" button
   - Matches dark theme + glassmorphism design

### Toast Notifications
2. Create `e:\TripMate\frontend\src\components\ui\Toast.tsx`
   - Small notification popup with success/error variants
   - Auto-dismisses after 3 seconds
   - Uses Framer Motion for slide-in animation

3. Create `e:\TripMate\frontend\src\lib\toast-context.tsx`
   - Context provider for triggering toasts from any component
   - Wrap in root layout

4. Add toasts to key actions:
   - Trip created/deleted, expense added, member invited, profile saved

### Loading Skeletons
5. Create `e:\TripMate\frontend\src\components\ui\Skeleton.tsx`
   - Reusable shimmer component with pulse animation
   - Replace "Loading..." text with skeleton cards on dashboard and trips pages

### Mobile Navigation
6. Add mobile hamburger menu to DashboardLayout
   - Slide-out drawer on mobile with same nav items as sidebar
   - Currently sidebar is `hidden md:flex` — need mobile alternative

### Favicon + Meta
7. Add favicon to `public/favicon.ico`
8. Add OG meta tags to `app/layout.tsx` for social sharing
