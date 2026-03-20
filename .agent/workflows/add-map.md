---
description: How to add the Leaflet.js interactive map to the Trip Workspace
---

# Add Interactive Map to Workspace

## Steps

1. Install `react-leaflet` and `leaflet` dependencies:
   ```
   cd e:\TripMate\frontend
   npm install react-leaflet leaflet @types/leaflet
   ```

2. Create `e:\TripMate\frontend\src\components\workspace\TripMap.tsx`
   - Use `MapContainer`, `TileLayer`, `Marker`, `Popup` from react-leaflet
   - Accept `activities` prop to plot markers from itinerary activities that have `lat`/`lng`
   - Accept `destinations` prop for general destination markers
   - Use OpenStreetMap tile layer (free, no API key required)
   - Style with glassmorphism card wrapper matching existing design

3. Import Leaflet CSS in `e:\TripMate\frontend\app\layout.tsx`:
   ```tsx
   import 'leaflet/dist/leaflet.css';
   ```

4. Add the map to the Trip Workspace page (`app/trip/[id]/page.tsx`):
   - Add a "Map" tab alongside existing tabs
   - Fetch destinations from `/api/destinations` for general markers
   - Plot itinerary activities that have coordinates

5. Verify the map renders correctly in the browser
