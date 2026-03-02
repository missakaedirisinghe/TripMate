
# TripMate High-Fidelity UI Hierarchy Map
(Pixel-Level Layout Strategy | 1440px Desktop Baseline)

---

## Global Layout Grid

Desktop Base Width: 1440px
Max Content Width: 1280px
Side Padding: 80px
Grid Columns: 12
Gutter: 24px
Section Vertical Spacing: 96px
Card Padding: 24px–32px
Border Radius: 20px–24px

---

## Landing Page Hierarchy

Hero Section (Height: 100vh)
- Background Layer (z-index: 0)
- Gradient Overlay (z-index: 1)
- Content Container (z-index: 2, centered, max-width 900px)

Headline:
- Font size: 56–64px
- Line height: 1.1
- Weight: Bold

Subheadline:
- 18–20px
- Max width 600px

CTA Group:
- Horizontal alignment
- 16px gap

---

Destination Grid Section

Container: 1280px centered
Grid: 3 columns desktop (gap 32px)
Card Height: 360px
Image overlay gradient bottom 40%

Text hierarchy inside card:
- Destination name: 24px bold
- Tags: 12px uppercase badge
- Budget preview: 14px semi-bold

---

## Dashboard Layout

Sidebar:
- Width: 260px expanded
- 80px collapsed

Top Navbar:
- Height: 72px
- Horizontal padding: 32px

Main Grid:
- 3-column layout
- Gap: 32px

Trip Cards:
- Height: 280px
- Banner image top 40%
- Content bottom 60%

---

## Trip Workspace Layout

Header Banner:
- Height: 320px
- Gradient overlay bottom

Trip Info Row:
- 4-column split:
  - Title (4 columns)
  - Dates (2 columns)
  - Budget summary (3 columns)
  - Members (3 columns)

Tabs:
- Height: 64px
- Underline active indicator (animated)

Content Area:
- Max width: 1100px
- Centered

---

## Itinerary Layout

Day Accordion:
- Header height: 64px
- Body padding: 24px

Activity Card:
- Height: 120px
- Thumbnail left (120x120px)
- Content right
- 16px internal spacing

---

## Expense Layout

Summary Cards:
- 3 cards per row
- Height: 160px

Expense Table:
- Row height: 64px

Chart Area:
- Height: 320px
