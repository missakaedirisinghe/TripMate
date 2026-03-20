---
description: How to add weather and YouTube video panels to the Trip Workspace
---

# Add Weather & Video Panels

## Steps

1. Create `e:\TripMate\frontend\src\components\workspace\WeatherPanel.tsx`
   - Fetch weather from `/api/weather/<destination>` on mount
   - Display 5-day forecast cards with temp, icon, humidity
   - Handle 503 gracefully (show "Weather unavailable" with setup hint)
   - Use glassmorphism card style consistent with AI Planner

2. Create `e:\TripMate\frontend\src\components\workspace\VideoPanel.tsx`
   - Fetch videos from `/api/videos/<destination>` on mount
   - Display video cards with thumbnail, title, channel, YouTube link
   - Handle 503 gracefully
   - Responsive grid layout (1 col mobile, 2 col desktop)

3. Add both panels to the Trip Workspace page:
   - Add "Weather" and "Videos" tabs (or integrate into overview)
   - Pass trip destination as prop

4. Test with and without API keys configured:
   - Without keys: should show friendly "not configured" message
   - With keys: should show real weather and videos
