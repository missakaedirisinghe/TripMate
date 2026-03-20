---
description: How to add voting UI to the Trip Workspace
---

# Add Voting UI

## Steps

1. Create `e:\TripMate\frontend\src\components\workspace\VotingPanel.tsx`
   - Fetch existing votes from `GET /api/trips/:id/votes`
   - Display vote tallies grouped by type (destination, route, activity)
   - Allow casting a new vote with `POST /api/trips/:id/votes`
   - Allow retracting own vote with `DELETE /api/trips/:id/votes/:vid`
   - Show voter names and counts per option
   - Use thumbs up/down or star-based voting UI

2. Add "Votes" tab to the Trip Workspace page (`app/trip/[id]/page.tsx`)

3. Wire the voting panel to the existing `votesApi` methods in `src/lib/api.ts`

4. Test: create a vote, verify tally updates, retract vote
