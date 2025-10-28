# Mini Landing Page Plan — 3D Micro‑Course Pilot

Purpose: keep the core game as a showcase, and spin up a focused, buyer‑oriented landing page reachable via a modal from the in‑game Partnerships info card.


## Goals & Principles
- Separate “play” and “pitch”: the game stays non‑salesy; the landing page carries the commercial story.
- Value equation upfront: outcome + likelihood + speed + low effort.
- Fast to consume: scannable sections, minimal copy, clear CTA.
- Light assets: short looped video/GIF; avoid heavy embeds to preserve performance.


## Page Architecture (Route)
- Route: `/offer` (SSR/SSG OK). Shares styles with site UI.
- Page width: content width ~720–900px, centered; optional hero goes wider.
- Optional background: static hero image or short looping video showing gameplay; avoid live WebGL for perf.


## Section Outline (no markup, presentation ideas only)
1) Hero — Outcome + Avatar + Mechanism
- Headline: “Launch a branded 3D micro‑course that 2–3× learner completion in 7 days.”
- Subhead: who it’s for (UX/UI bootcamps, L&D for product/design).
- Visual: 8–12s autoplay‑muted loop (topic confirm → answer feedback → difficulty ramp).
- Social proof strip: small logos or “Early pilots open” badge.
- Primary CTA: “Book a 15‑min scoping call”. Secondary: “See a 60‑sec demo”. Slot‑cap badge.

2) Proof & Metrics
- 3 compact stat cards: completion %, avg time on task, correct‑answer rate. If no live data, show target ranges (“typical pilot targets”).
- 1–2 short quotes (student/instructor) or “as seen at” logos.

3) Outcome Pillars
- 3 columns with micro visuals:
  - Higher completion (micro‑runs, instant feedback)
  - Faster onboarding (short paths, no login complexity)
  - Measurable learning (exportable metrics)

4) 7‑Day Pilot Plan (DWY)
- Horizontal timeline: Day 1 scope → Days 2–5 build/brand/content → Day 6 QA/embedding → Day 7 launch/analytics.
- Short bullets per day; include buyer responsibilities in-line (content handoff, brand assets, LMS access).

5) How It Works (Mechanism)
- Flow: Source content → Question bank → 3D run → Feedback loop → Analytics.
- Visual: simple 5‑step diagram; one sentence each. Name the tech stack (React Three Fiber, Rapier).

6) Pricing & Scope (Value‑based)
- Pilot range: a clear bracket (e.g., “Low five‑figures”), or “Contact for pilot pricing”.
- What’s included: 1 level, up to N questions, branding, LMS embed pack, analytics snapshot.
- What’s not included: custom art at scale, multi‑level campaigns, large integrations.

7) Bonuses (Objection‑killers)
- LMS Embed Pack (iframe + theme sheet)
- Question Bank Starter (30 UX/AI questions with citations)
- Analytics Snapshot (14‑day export)
- Brand Kit (color/logo theming)

8) Guarantees (Risk reversal)
- Unconditional: 14‑day “not a fit” refund on the pilot.
- Conditional: “If completion doesn’t increase ≥50% on one target module within 30 days, extend or credit the fee.”

9) Who It’s For / Not For
- For: bootcamps, L&D teams with <40% completion on dry modules.
- Not for: compliance, long‑form lecture content, or procurement‑heavy enterprise pilots without stakeholder access.

10) FAQ
- Typical questions: LMS compatibility, device performance, accessibility, content sourcing, maintenance.

11) CTA Section
- Restate outcome; single decisive CTA (calendar embed). Backup mailto.
- Light urgency: “2 pilot slots per month; early‑adopter pricing ends [date].”

12) Footer
- Contact, lightweight legal, small note linking to the public demo.


## Modal Integration From Game (Partnerships)
- Trigger location:
  - Update the Partnerships card in `components/platform/home/HomeElements.tsx` to add a “See Pilot Offer” button near existing email text.
  - Suggested insertion point: within the Partnerships card content block (same grid cell), using a distinct button style.

- Modal behavior:
  - Full‑screen overlay rendered in the UI layer (outside the 3D canvas) for readability and performance.
  - Content source options:
    1) Inline: a `PilotOfferContent` React component that mirrors `/offer` content.
    2) Iframe: embed route `/offer` inside the modal to avoid duplication; preferred for decoupling.
  - Controls: close button + ESC + backdrop click. “Return to game” label on close.

- Game state while modal is open:
  - Pause motion/audio: set terrain speed to 0 and mute SFX; resume on close.
  - Keep canvas visible in the background for continuity, but do not block scroll of modal.
  - Consider dimming the canvas with a semi‑transparent backdrop.

- Accessibility & performance:
  - Focus trap inside modal; restore focus on close.
  - Avoid per‑frame allocations; the modal runs in the DOM UI layer.
  - Lazy‑load heavy media (the hero video/GIF) when the modal opens.

- Telemetry (optional):
  - Events: open_offer_modal, view_offer_section, click_book_call, close_offer_modal.


## Asset Checklist
- 8–12s gameplay loop (web‑optimized), 3 small illustrative GIFs (topic confirm, answer feedback, difficulty ramp).
- 1–2 short quotes; any partner logos.
- Brandable color pairings, logo.


## Implementation Phases
1) Build `/offer` route with sections above (static assets, no heavy interactivity).
2) Add `Modal` in UI layer with iframe to `/offer` and state wiring (pause/mute behavior).
3) Insert “See Pilot Offer” button into Partnerships card and wire to open modal.
4) Add minimal tracking; set up calendar link/embed.


## Non‑Goals (to keep the core demo clean)
- No persistent sales banners in the main game UI.
- No forced interstitials; offer is only opened by explicit user action from Partnerships.
