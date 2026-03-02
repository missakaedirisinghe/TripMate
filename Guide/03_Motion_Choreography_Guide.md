
# TripMate Motion Choreography Guide
(Framer Motion Implementation Strategy)

---

Global Animation Rules:
- Duration: 0.3s–0.5s
- Ease: easeInOut
- No bounce effects
- Subtle, controlled motion

---

## Page Transitions

Initial:
  opacity: 0
  y: 20

Animate:
  opacity: 1
  y: 0

Exit:
  opacity: 0
  y: -10

---

## Card Hover

WhileHover:
  scale: 1.02
  y: -4
  transition: 0.2s

---

## Button Click

WhileTap:
  scale: 0.97

---

## Modal Animation

Initial:
  opacity: 0
  scale: 0.95

Animate:
  opacity: 1
  scale: 1

Exit:
  opacity: 0
  scale: 0.95

---

## Accordion Expand

Initial:
  height: 0
  opacity: 0

Animate:
  height: auto
  opacity: 1

Transition:
  duration: 0.35s

---

## Sidebar Collapse

Expanded → width 260px
Collapsed → width 80px
Transition duration: 0.3s

---

## AI Panel Slide-In

Initial:
  x: 100%

Animate:
  x: 0

Exit:
  x: 100%

Duration: 0.4s

---

## Staggered Lists

Parent:
  staggerChildren: 0.08

Child:
  opacity: 0 → 1
  y: 10 → 0
