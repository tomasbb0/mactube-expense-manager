# 🃏 Maktub — Platform Card Anatomy

> Complete dissection of every visual layer, CSS property, and structural difference between the 5 platform cards in `hub.html`.

---

## Table of Contents

1. [The 3 Card Types](#the-3-card-types)
2. [Shared DNA — What ALL Cards Have in Common](#shared-dna)
3. [Layer-by-Layer Cross-Section](#layer-by-layer-cross-section)
4. [Per-Card Deep Dive](#per-card-deep-dive)
5. [Structural Comparison Table](#structural-comparison-table)
6. [What Each Layer Does in Practice](#what-each-layer-does-in-practice)
7. [What Makes Each Card Different](#what-makes-each-card-different)
8. [Dead Code & Myths](#dead-code--myths)

---

## The 3 Card Types

Every card in the hub falls into one of **3 visual types**, determined by what's inside the preview area:

| Type                 | Preview Content                     | Example Cards                                  | Purpose                  |
| -------------------- | ----------------------------------- | ---------------------------------------------- | ------------------------ |
| **Full Preview**     | Mini-dashboard UI filling 100%      | Despesas, Utilizadores, Projetos               | Show data at a glance    |
| **Pedir Plataforma** | Single ➕ icon, centered            | Pedir Plataforma                               | Request action           |
| **Empty Preview**    | Icon + optional text on bare `#111` | Any PLATFORMS entry without a custom dashboard | Launch external platform |

### Where Cards Come From

| Source                     | Cards                                  | Lockable? | Access Controls? |
| -------------------------- | -------------------------------------- | --------- | ---------------- |
| `PLATFORMS` array (loop)   | Expense Manager + any future platforms | Yes       | Yes (admin)      |
| Hardcoded in `renderHub()` | Utilizadores (admin), Projetos, Pedir  | No        | No               |

---

## Shared DNA

**Every single card** gets the CSS class `platform-card` and **nothing else** (except `.locked` when access is denied for PLATFORMS cards). This means:

### `.platform-card` — The Outer Shell

```
┌─────────────────────────────────────────────┐
│  background: rgba(255, 255, 255, 0.015)     │  ← Almost invisible white tint
│  backdrop-filter: blur(10px) saturate(180%)  │  ← Frosted glass effect
│  border: 1px solid rgba(255,255,255, 0.06)  │  ← Faint white border
│  border-radius: 12px                        │  ← Rounded corners
│  overflow: hidden                           │  ← Clips children to corners
│  box-shadow:                                │
│    0 8px 32px rgba(0,0,0,0.2)     [outer]   │  ← Soft drop shadow
│    inset 0 1px 0 rgba(255,255,255,0.04)     │  ← Top edge highlight
│    inset 0 -1px 0 rgba(0,0,0,0.08)         │  ← Bottom edge darkness
│  display: flex; flex-direction: column       │  ← Stacks preview on top, info below
│  position: relative                         │  ← For pseudo-element positioning
│  cursor: pointer                            │
│  transition: all 0.3s cubic-bezier(...)     │  ← Smooth hover animation
└─────────────────────────────────────────────┘
```

### `.platform-card::before` — Shine Sweep

```
                    ┌──────────────────────┐
                    │  A horizontal white  │
 left: -100% ────► │  gradient bar that   │ ────► left: 100%
  (hidden)          │  sweeps right on     │      (on hover)
                    │  hover               │
                    └──────────────────────┘

  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)
  z-index: 1         ← Sits above all card content
  pointer-events: none  ← Doesn't block clicks
  transition: left 0.8s ease
```

**This applies to ALL 5 cards identically.** When you hover any card, you get the same glass shine sweep.

### `.platform-card` on Hover

When hovered (and not `.locked` or `.disabled`):

| What changes   | Default                    | Hover                                                 |
| -------------- | -------------------------- | ----------------------------------------------------- |
| `transform`    | none                       | `translateY(-4px)` — card floats up                   |
| `background`   | `rgba(255,255,255, 0.015)` | `rgba(255,255,255, 0.025)` — slightly brighter        |
| `border-color` | `rgba(255,255,255, 0.06)`  | `rgba(255,255,255, 0.1)` — more visible border        |
| `box-shadow`   | 1 outer + 2 inset          | Bigger outer + green glow + stronger inset highlights |

The green glow on hover:

```
0 0 20px rgba(51,233,51, 0.06)    ← Subtle green halo
0 0 40px rgba(51,233,51, 0.03)    ← Extended green atmosphere
```

---

## Layer-by-Layer Cross-Section

Every card is a stack of exactly **3 visual layers** (from bottom to top). But the **content** of Layer 2 splits them into **3 distinct types**:

| Type                 | Cards                                                    | Preview Content                             |
| -------------------- | -------------------------------------------------------- | ------------------------------------------- |
| **Full Preview**     | Despesas, Utilizadores, Projetos                         | Mini-dashboard UI filling 100% of preview   |
| **Pedir Plataforma** | Pedir Plataforma                                         | Just a ➕ icon — request action card        |
| **Empty Preview**    | Any platform without a dashboard (e.g. future platforms) | Just an icon + optional text on bare `#111` |

### Three-Way Comparison: Full vs Pedir vs Empty

```
      TYPE 1: FULL PREVIEW               TYPE 2: PEDIR PLATAFORMA            TYPE 3: EMPTY PREVIEW
   (Despesas / Users / Projects)         (Request new platform)              (Icon + text, no dashboard)

╔═════════════════════════════╗    ╔═════════════════════════════╗    ╔═════════════════════════════╗
║                             ║    ║                             ║    ║                             ║
║ L3: ::before (shine sweep)  ║    ║ L3: ::before (shine sweep)  ║    ║ L3: ::before (shine sweep)  ║
║                             ║    ║                             ║    ║                             ║
║ ⚡ CSS is IDENTICAL on all  ║    ║ ⚡ CSS is IDENTICAL on all  ║    ║ ⚡ CSS is IDENTICAL on all  ║
║    3 types, BUT...          ║    ║    3 types, BUT...          ║    ║    3 types, BUT...          ║
║                             ║    ║                             ║    ║                             ║
║ 👁️ VISIBLE — the sweep     ║    ║ 👻 NEARLY INVISIBLE —      ║    ║ 👻 NEARLY INVISIBLE —      ║
║   passes over sub-elements  ║    ║   8% white over flat dark   ║    ║   8% white over flat dark   ║
║   (headers, stats, rows)    ║    ║   #111 background is        ║    ║   #111 background is        ║
║   that create contrast,     ║    ║   practically undetectable  ║    ║   practically undetectable  ║
║   making the shine catch    ║    ║   to the human eye          ║    ║   to the human eye          ║
║                             ║    ║                             ║    ║                             ║
╠═════════════════════════════╣    ╠═════════════════════════════╣    ╠═════════════════════════════╣
║                             ║    ║                             ║    ║                             ║
║ L2: Content                 ║    ║ L2: Content                 ║    ║ L2: Content                 ║
║                             ║    ║                             ║    ║                             ║
║ ┌─────────────────────┐    ║    ║ ┌─────────────────────┐    ║    ║ ┌─────────────────────┐    ║
║ │ .platform-preview   │    ║    ║ │ .platform-preview   │    ║    ║ │ .platform-preview   │    ║
║ │ bg: #111 (OPAQUE)   │    ║    ║ │ bg: #111 (OPAQUE)   │    ║    ║ │ bg: #111 (OPAQUE)   │    ║
║ │                     │    ║    ║ │                     │    ║    ║ │                     │    ║
║ │ ┌─────────────────┐│    ║    ║ │                     │    ║    ║ │                     │    ║
║ │ │ .mini-dashboard ││    ║    ║ │                     │    ║    ║ │                     │    ║
║ │ │ or .mini-users  ││    ║    ║ │                     │    ║    ║ │      🧪 / 🎵 / ...  │    ║
║ │ │ or .mini-project││    ║    ║ │        ➕           │    ║    ║ │    (centered icon)   │    ║
║ │ │                 ││    ║    ║ │   (centered icon)   │    ║    ║ │   "Platform Name"    │    ║
║ │ │ FILLS 100%      ││    ║    ║ │   font: 2.5rem     │    ║    ║ │   (optional text)    │    ║
║ │ │                 ││    ║    ║ │                     │    ║    ║ │                     │    ║
║ │ │ Sub-elements:   ││    ║    ║ │   SINGLE ELEMENT    │    ║    ║ │   MOSTLY BARE #111  │    ║
║ │ │  • headers      ││    ║    ║ │   on bare #111      │    ║    ║ │   icon + maybe text  │    ║
║ │ │  • stat chips   ││    ║    ║ │                     │    ║    ║ │                     │    ║
║ │ │  • data rows    ││    ║    ║ │   NO sub-layers     │    ║    ║ │   NO sub-layers     │    ║
║ │ │  • toggles/dots ││    ║    ║ │   NO blur effects   │    ║    ║ │   NO blur effects   │    ║
║ │ │  • badges       ││    ║    ║ │   NO colors         │    ║    ║ │   NO colors         │    ║
║ │ │                 ││    ║    ║ │                     │    ║    ║ │                     │    ║
║ │ │ Each has:       ││    ║    ║ │                     │    ║    ║ │                     │    ║
║ │ │  bg: rgba(0.015)││    ║    ║ │                     │    ║    ║ │                     │    ║
║ │ │  blur(6px)      ││    ║    ║ │                     │    ║    ║ │                     │    ║
║ │ │  (⚠️wasted blur)││    ║    ║ │                     │    ║    ║ │                     │    ║
║ │ └─────────────────┘│    ║    ║ │                     │    ║    ║ │                     │    ║
║ └─────────────────────┘    ║    ║ └─────────────────────┘    ║    ║ └─────────────────────┘    ║
║                             ║    ║                             ║    ║                             ║
║ ┌─────────────────────┐    ║    ║ ┌─────────────────────┐    ║    ║ ┌─────────────────────┐    ║
║ │ .platform-info      │    ║    ║ │ .platform-info      │    ║    ║ │ .platform-info      │    ║
║ │ bg: transparent     │    ║    ║ │ bg: transparent     │    ║    ║ │ bg: transparent     │    ║
║ │                     │    ║    ║ │                     │    ║    ║ │                     │    ║
║ │ Structure varies:   │    ║    ║ │ FLAT structure:     │    ║    ║ │ Structure varies:   │    ║
║ │                     │    ║    ║ │                     │    ║    ║ │                     │    ║
║ │ PLATFORMS cards:    │    ║    ║ │ .platform-name      │    ║    ║ │ PLATFORMS cards:    │    ║
║ │  .info-row wrapper  │    ║    ║ │ .platform-desc      │    ║    ║ │  .info-row wrapper  │    ║
║ │  + access controls  │    ║    ║ │                     │    ║    ║ │  + access controls  │    ║
║ │  + access panel     │    ║    ║ │ NO .info-row        │    ║    ║ │  + access panel     │    ║
║ │                     │    ║    ║ │ NO access controls  │    ║    ║ │                     │    ║
║ │ Manual cards:       │    ║    ║ │                     │    ║    ║ │ Manual cards:       │    ║
║ │  flat .name + .desc │    ║    ║ │                     │    ║    ║ │  flat .name + .desc │    ║
║ │  no access controls │    ║    ║ │                     │    ║    ║ │  no access controls │    ║
║ └─────────────────────┘    ║    ║ └─────────────────────┘    ║    ║ └─────────────────────┘    ║
║                             ║    ║                             ║    ║                             ║
╠═════════════════════════════╣    ╠═════════════════════════════╣    ╠═════════════════════════════╣
║                             ║    ║                             ║    ║                             ║
║ L1: .platform-card (shell)  ║    ║ L1: .platform-card (shell)  ║    ║ L1: .platform-card (shell)  ║
║   bg: rgba(w, 0.015)       ║    ║   bg: rgba(w, 0.015)       ║    ║   bg: rgba(w, 0.015)       ║
║   blur(10px) sat(180%)     ║    ║   blur(10px) sat(180%)     ║    ║   blur(10px) sat(180%)     ║
║   border + box-shadow      ║    ║   border + box-shadow      ║    ║   border + box-shadow      ║
║   IDENTICAL on all 3       ║    ║   IDENTICAL on all 3       ║    ║   IDENTICAL on all 3       ║
║                             ║    ║                             ║    ║                             ║
╚═════════════════════════════╝    ╚═════════════════════════════╝    ╚═════════════════════════════╝
```

### Summary of What's Different Per Type

```
TYPE 1 (Full Preview):           TYPE 2 (Pedir):                TYPE 3 (Empty Preview):
✦ Preview filled 100%            ✦ Single ➕ icon               ✦ Icon + maybe text
✦ Many sub-elements              ✦ No sub-elements              ✦ No sub-elements
  with glass styling             ✦ No colors                    ✦ No colors
✦ Colors (green/red/             ✦ Flat info, no controls       ✦ Info depends on source:
  orange/blue)                   ✦ Never lockable                 PLATFORMS → has access
✦ Info depends on source:        ✦ Purpose: REQUEST action        controls + lockable
  PLATFORMS → has access                                          Manual → flat, no controls
  controls + lockable
  Manual → flat, no controls
✦ Purpose: SHOW data            ✦ Purpose: REQUEST action       ✦ Purpose: LAUNCH external
```

### ⚠️ The Shine Sweep Perception Problem

**L3 (the `::before` shine sweep)** has **identical CSS** on all 3 types — the same gradient, same transition, same z-index. But **you can't actually see it** on Type 2 (Pedir) and Type 3 (Empty) cards.

Why? The shine is `rgba(255, 255, 255, 0.08)` — just **8% white opacity** sweeping over the card in **0.5 seconds**. On Type 1 (Full Preview), the sub-elements inside (headers, stat chips, rows, badges) create tiny contrast differences that let you **perceive** the light passing over texture. On Type 2 and 3, the preview is mostly flat `#111111` dark space — 8% white over pure dark is effectively invisible to the human eye.

```
TYPE 1 (Full Preview):          TYPE 2/3 (Pedir / Empty):

┌──────────────────────┐        ┌──────────────────────┐
│ ░░▓▓░░▓▓░░▓▓░░      │        │                      │
│ ▓header▓ ▓stat▓     │        │                      │
│ ░░▓▓░░▓▓░░▓▓░░      │        │        ➕ / 🧪        │
│ ▓▓ row ▓▓ row ▓▓    │        │                      │
│ ░░▓▓░░▓▓░░▓▓░░      │        │                      │
└──────────────────────┘        └──────────────────────┘
  ↑ Texture = shine is           ↑ Flat dark = shine
    perceptible as it              passes unnoticed
    catches on edges               (8% white on #111)
```

**So the document is correct:** the code is identical, but the visual experience is different. L1 and L3 are technically the same, but L3 is **only perceptible on Full Preview cards** due to the textural contrast.

### The Opaque Preview Problem

`.platform-preview` has `background: #111111` — this is **fully opaque**. This means:

- The card's `backdrop-filter: blur(10px)` **only affects the `.platform-info` area** at the bottom
- The preview area is visually "blocked" — you can't see any blur through it
- Sub-elements inside preview (`.mini-stat`, `.mini-table`, etc.) have their own `backdrop-filter: blur(6px)` but this **does nothing visually** because they sit on an opaque background, not a transparent one

```
What you'd EXPECT:              What ACTUALLY happens:

┌──────────────────┐            ┌──────────────────┐
│  Blurred bg      │            │  Solid #111111   │   ← Opaque. No blur visible.
│  shows through   │            │  (looks dark)    │
│  all card areas  │            │                  │
│                  │            │                  │
├──────────────────┤            ├──────────────────┤
│  Blurred bg      │            │  Blur IS visible │   ← Only here: transparent bg
│  shows through   │            │  (card glass)    │      lets blur come through
└──────────────────┘            └──────────────────┘
```

---

## Per-Card Deep Dive

---

### Type 1 — Full Preview: Gestão de Despesas (Expense Manager)

**HTML Tree:**

```
.platform-card
 ├─ .platform-preview
 │   ├─ .mini-dashboard
 │   │   ├─ .mini-dash-header
 │   │   │   ├─ SVG chart icon
 │   │   │   └─ <span> "Resumo"
 │   │   └─ .mini-dash-body
 │   │       ├─ .mini-stat-row
 │   │       │   ├─ .mini-stat → .mini-stat-val ("1200€") + .mini-stat-label ("Total")
 │   │       │   ├─ .mini-stat → .mini-stat-val ("3") + .mini-stat-label ("Registos")
 │   │       │   └─ .mini-stat → .mini-stat-val ("Pendente") [RED] + .mini-stat-label ("Estado")
 │   │       └─ .mini-table
 │   │           └─ .mini-table-row × 5
 │   │               └─ .mini-table-cell × 3
 │   └─ .lock-overlay (only if locked — shows 🔒)
 └─ .platform-info
     └─ .platform-info-row
         ├─ .platform-info-text
         │   ├─ .platform-name → "💰 Gestão de Despesas"
         │   └─ .platform-desc → "Gerir e acompanhar despesas"
         └─ .access-toggle-btn (admin only) → "▾"
     └─ .access-panel (admin only, hidden by default)
```

**Preview Content CSS:**

| Element             | Visual Effect                                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------------- |
| `.mini-dashboard`   | Fills 100% of preview area                                                                           |
| `.mini-dash-header` | Top bar with `bg: rgba(255,255,255, 0.015)` + `backdrop-filter: blur(6px)`                           |
| `.mini-stat`        | Small glass chips: `bg: rgba(255,255,255, 0.015)` + `blur(6px)` + `border-radius: 4px`               |
| `.mini-stat-val`    | **Green** text (`color: var(--accent)`) except "Pendente" which is **red** (`color: #ff4444` inline) |
| `.mini-stat-label`  | Muted gray text at `0.4rem`                                                                          |
| `.mini-table`       | Glass container with fake data rows                                                                  |
| `.mini-table-cell`  | Tiny `3px` tall bars in dark gray (`opacity: 0.25`) simulating table data                            |

**What you see:** A realistic miniature dashboard with fake stats and a data table, filling the entire preview. The most complex preview of all cards.

---

### Type 1 — Full Preview: Gestão de Utilizadores (Admin Only)

**HTML Tree:**

```
.platform-card
 ├─ .platform-preview
 │   └─ .mini-users
 │       ├─ .mini-users-header
 │       │   ├─ <span> "Utilizadores"
 │       │   └─ <span> "+ Novo" (green text)
 │       └─ .mini-users-body
 │           ├─ .mini-user-row (active)
 │           │   ├─ .mini-avatar (green-bordered circle)
 │           │   ├─ .mini-user-info → .mini-user-bar × 2
 │           │   └─ .mini-toggle (green, active)
 │           ├─ .mini-user-row (active)
 │           │   └─ (same as above)
 │           └─ .mini-user-row (inactive)
 │               ├─ .mini-avatar
 │               ├─ .mini-user-info → .mini-user-bar × 2
 │               └─ .mini-toggle (gray, inactive — inline styled)
 └─ .platform-info                    ← ⚠️ DIFFERENT structure
     ├─ .platform-name → "👥 Gestão de Utilizadores"
     └─ .platform-desc → "Gerir acessos e permissões"
```

**Preview Content CSS:**

| Element              | Visual Effect                                                  |
| -------------------- | -------------------------------------------------------------- |
| `.mini-users`        | Fills entire preview                                           |
| `.mini-users-header` | Glass header bar: `bg: rgba(255,255,255, 0.015)` + `blur(6px)` |
| `.mini-user-row`     | Individual glass rows with user placeholders                   |
| `.mini-avatar`       | 14px green-bordered circle using `var(--accent-dim)`           |
| `.mini-user-bar`     | Placeholder name/info bars (3px tall, gray)                    |
| `.mini-toggle`       | Tiny switch: green = active, gray = inactive                   |

**What you see:** A miniature user management panel with 3 user rows, each having an avatar, info bars, and an active/inactive toggle.

**⚠️ Structural difference:** `.platform-info` has `.platform-name` and `.platform-desc` as **direct children** — no `.platform-info-row` wrapper, no `.platform-info-text` wrapper, no access controls.

---

### Type 1 — Full Preview: Projetos & Pedidos

**HTML Tree:**

```
.platform-card
 ├─ .platform-preview
 │   └─ .mini-projects
 │       ├─ <div> (inline-styled header) → "Projetos & Pedidos"
 │       ├─ .mini-project-row (real project)
 │       │   ├─ .mini-project-dot.live (green)
 │       │   ├─ .mini-project-bar (name placeholder)
 │       │   └─ .mini-project-status → "Live" (green badge)
 │       ├─ .mini-project-row (real project)
 │       │   ├─ .mini-project-dot.pending (orange)
 │       │   ├─ .mini-project-bar
 │       │   └─ .mini-project-status → "Pendente" (orange badge)
 │       ├─ .mini-project-row (real project)
 │       │   ├─ .mini-project-dot.dev (blue)
 │       │   ├─ .mini-project-bar
 │       │   └─ .mini-project-status → "Dev" (blue badge)
 │       └─ .mini-project-row × N (filler rows)
 └─ .platform-info                    ← ⚠️ DIFFERENT structure
     ├─ .platform-name → "📋 Projetos & Pedidos"
     └─ .platform-desc → "Ver estado dos projetos e pedidos"
```

**Preview Content CSS:**

| Element                     | Visual Effect                                                                |
| --------------------------- | ---------------------------------------------------------------------------- |
| `.mini-projects`            | Fills preview, `padding: 12px`, `gap: 6px`                                   |
| Header div                  | Inline-styled: `font-size: 0.5rem`, `padding: 6px 8px`, `margin-bottom: 2px` |
| `.mini-project-row`         | Glass rows: `bg: rgba(255,255,255, 0.015)` + `blur(6px)`                     |
| `.mini-project-dot.live`    | 🟢 Green dot with green glow                                                 |
| `.mini-project-dot.pending` | 🟡 Orange dot with orange glow                                               |
| `.mini-project-dot.dev`     | 🔵 Blue dot with blue glow                                                   |
| `.mini-project-bar`         | Placeholder bar (4px tall, `rgba(255,255,255, 0.08)`)                        |
| `.mini-project-status`      | Tiny colored badge: `font-size: 0.45rem`, colored bg+text                    |

**What you see:** A project status board with colored dots (live/pending/dev), name placeholders, and status badges. The most colorful preview.

**⚠️ Structural difference:** Same as Utilizadores — flat `.platform-info`, no access controls.

---

### Type 2 — Pedir Plataforma

**HTML Tree:**

```
.platform-card
 ├─ .platform-preview (inline: justify-content:center; align-items:center)
 │   └─ span.icon (inline: font-size:2.5rem) → "➕"
 └─ .platform-info                    ← ⚠️ DIFFERENT structure
     ├─ .platform-name → "➕ Pedir Plataforma"
     └─ .platform-desc → "Solicitar nova plataforma"
```

**Preview Content CSS:**

| Element | Visual Effect                                          |
| ------- | ------------------------------------------------------ |
| `.icon` | `2.5rem` (inline-overridden from CSS default `3.5rem`) |

**What you see:** Just a ➕ emoji centered on the dark preview. The simplest card.

**⚠️ Structural difference:** Flat `.platform-info`, no access controls. Also — inline styles on the preview override defaults (redundant `justify-content` and `align-items` that are already set in CSS).

---

### Type 3 — Empty Preview (PLATFORMS without dashboards)

Any entry in the `PLATFORMS` array that doesn't have a custom mini-dashboard gets an "empty" preview with just an icon and optional text. These are rendered by the `PLATFORMS.forEach()` loop.

**HTML Tree (generic):**

```
.platform-card  (or .platform-card.locked)
 ├─ .platform-preview
 │   ├─ span.icon → "🧪" / "🎵" / etc.
 │   ├─ span.preview-name → "Platform Name" (optional)
 │   └─ .lock-overlay (only if locked — shows 🔒)
 └─ .platform-info
     └─ .platform-info-row
         ├─ .platform-info-text
         │   ├─ .platform-name → "🧪 Platform Name"
         │   └─ .platform-desc → "Description text"
         └─ .access-toggle-btn (admin only) → "▾"
     └─ .access-panel (admin only, hidden by default)
```

**Preview Content CSS:**

| Element         | Visual Effect                                             |
| --------------- | --------------------------------------------------------- |
| `.icon`         | `font-size: 3.5rem` (desktop) / `2.5rem` (≤600px)         |
| `.preview-name` | `font-size: 0.8rem`, `color: var(--text-muted)`, centered |

**What you see:** A centered icon and text on the dark `#111` preview background. Most of the preview area is empty dark space.

**Key difference from Pedir:** These come from the `PLATFORMS` array, so they **have** `.platform-info-row`, access controls, and can be locked. Pedir is hardcoded and has none of that.

---

## Structural Comparison Table

### Card-Level Properties (ALL IDENTICAL)

| Property          | Value                               | Notes                       |
| ----------------- | ----------------------------------- | --------------------------- |
| `background`      | `rgba(255,255,255, 0.015)`          | Almost invisible white tint |
| `backdrop-filter` | `blur(10px) saturate(180%)`         | Glass frosting effect       |
| `border`          | `1px solid rgba(255,255,255, 0.06)` | Faint white border          |
| `border-radius`   | `12px`                              | Rounded corners             |
| `box-shadow`      | outer shadow + 2 inset edges        | Depth + edge highlights     |
| `overflow`        | `hidden`                            | Clips to border-radius      |
| `::before`        | Shine sweep gradient                | Same on all 5               |
| `::after`         | ❌ Does not exist                   | No gradient border          |
| Hover behavior    | float + brighten + green glow       | Same on all 5               |

### Preview-Level Properties (ALL IDENTICAL)

| Property       | Value              | Notes               |
| -------------- | ------------------ | ------------------- |
| `background`   | `#111111` (opaque) | Same dark bg on all |
| `aspect-ratio` | `4/3`              | Same shape          |
| `overflow`     | `hidden`           | Content clipped     |
| `::after`      | ❌ Does not exist  | No glass overlay    |

### What's DIFFERENT Between the 3 Types

| Dimension                 | Type 1: Full Preview              | Type 2: Pedir Plataforma   | Type 3: Empty Preview          |
| ------------------------- | --------------------------------- | -------------------------- | ------------------------------ |
| **Preview content**       | Mini-dashboard / users / projects | Single ➕ icon             | Icon + optional text           |
| **Preview fills space?**  | ✅ 100% filled                    | ❌ Single centered element | ❌ Centered items on bare #111 |
| **Has colored elements?** | ✅ Green, red, orange, blue       | ❌ Just emoji              | ❌ Monochrome (gray text)      |
| **Sub-element glass?**    | ✅ blur(6px) on stats/rows        | ❌ None                    | ❌ None                        |
| **Info structure**        | Varies by source (see below)      | Flat: .name + .desc only   | Varies by source (see below)   |
| **Has access controls?**  | PLATFORMS: ✅ / Manual: ❌        | ❌ Never                   | PLATFORMS: ✅ / Manual: ❌     |
| **Can be locked?**        | PLATFORMS: ✅ / Manual: ❌        | ❌ Never                   | PLATFORMS: ✅ / Manual: ❌     |
| **Complexity**            | ⭐⭐⭐⭐⭐                        | ⭐                         | ⭐                             |

---

## What Each Layer Does in Practice

### If you change `.platform-card` background...

| Change                           | Visual Result                                                                                                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Increase alpha (e.g. `0.05`)     | All 5 cards get a more visible white tint — but only the `.platform-info` area shows it clearly. The preview is opaque `#111` so the card background is hidden behind it. |
| Set to solid color (e.g. `#222`) | Cards become opaque rectangles. `backdrop-filter` becomes useless since nothing shows through.                                                                            |
| Set to `transparent`             | Cards become pure glass — only the blur/border/shadow create the card shape. The `.platform-info` text floats on blurred background.                                      |

### If you change `backdrop-filter` on `.platform-card`...

| Change                            | Visual Result                                                                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Increase blur (e.g. `blur(20px)`) | The `.platform-info` area at the bottom becomes more heavily frosted. The preview area is unaffected (opaque).                  |
| Remove entirely                   | The `.platform-info` area shows whatever is behind the card without any frosting — just the faint white tint from `background`. |
| Add `brightness()`                | Makes the glass area brighter or darker. Only visible in the info section.                                                      |

### If you change `.platform-preview` background...

| Change                  | Visual Result                                                                                                                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Make transparent        | **Big change.** The preview area would become see-through, and the card's `backdrop-filter` would blur whatever is behind it. The sub-element blur effects (`.mini-stat`, etc.) would also start actually working. |
| Change to another color | The dark background behind all preview content changes. Icons and text would sit on the new color.                                                                                                                 |
| Add gradient            | Could create a subtle vignette or mood behind the preview content.                                                                                                                                                 |

### If you change `.platform-card::before` (shine sweep)...

| Change                | Visual Result                                                |
| --------------------- | ------------------------------------------------------------ |
| Change gradient color | The hover sweep becomes tinted (e.g. green, gold).           |
| Increase opacity      | More visible/dramatic hover sweep.                           |
| Remove entirely       | No shine animation on hover — cards just float and brighten. |
| Change direction      | Sweep could go vertical, diagonal, etc.                      |

### If you change `.platform-card` hover...

| Change                              | Visual Result                                    |
| ----------------------------------- | ------------------------------------------------ |
| Increase `translateY` (e.g. `-8px`) | Cards float higher on hover — more dramatic.     |
| Remove green glow                   | More subtle hover — just floating + brightening. |
| Add `scale(1.02)`                   | Cards slightly grow on hover — playful feel.     |

### If you change `.platform-info` padding/background...

| Change                | Visual Result                                                                  |
| --------------------- | ------------------------------------------------------------------------------ |
| Add background color  | The info section gets a distinct band at the bottom.                           |
| Increase padding      | More space around card names/descriptions.                                     |
| Add border-top        | Creates a visible separator between preview and info.                          |
| Add `backdrop-filter` | Extra frosting on the info section specifically (stacks with card-level blur). |

### If you change `.lock-overlay`...

| Change                        | Visual Result                                                                                     |
| ----------------------------- | ------------------------------------------------------------------------------------------------- |
| Reduce opacity                | Locked cards become more visible (less blocked out).                                              |
| Change background color       | Could use red, dark gradient, etc. instead of black.                                              |
| Add `backdrop-filter: blur()` | The lock overlay itself becomes frosted — content behind it is blurred rather than just darkened. |

---

## What Makes Each Type Different

### The ONLY things creating visual differences are:

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  1. PREVIEW CONTENT (what's inside .platform-preview)            │
│                                                                  │
│     TYPE 1 (Full):  mini-dashboard / mini-users / mini-projects  │
│                     Complex sub-elements filling 100% of preview │
│                                                                  │
│     TYPE 2 (Pedir): Single ➕ icon centered on bare #111         │
│                     Simplest possible content                    │
│                                                                  │
│     TYPE 3 (Empty): Icon + optional text centered on bare #111   │
│                     e.g. 🧪 + "The Burnay Labs"                  │
│                                                                  │
│  2. INFO STRUCTURE (what's inside .platform-info)                │
│     • PLATFORMS cards: .info-row > .info-text + access controls  │
│     • Manual cards: flat .name + .desc, no access controls       │
│     (This is about SOURCE, not type — any type can be either)   │
│                                                                  │
│  3. LOCK CAPABILITY (only PLATFORMS cards)                       │
│     • .locked class + .lock-overlay element                      │
│     • Manual cards can never be locked                           │
│                                                                  │
│  That's it. Everything else — card background, border, shadow,   │
│  border-radius, hover effects, shine sweep — is 100% identical.  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Visual Formula: What Makes Type X?

```
TYPE 1 (Full)   =  SAME SHELL  +  📊 complex mini-UI  +  (source determines access/lock)
TYPE 2 (Pedir)  =  SAME SHELL  +  ➕ icon only         +  no access, no lock
TYPE 3 (Empty)  =  SAME SHELL  +  🧪 icon + text       +  (source determines access/lock)
```

---

## Dead Code & Myths

Things that **DO NOT EXIST** despite previous assumptions:

| What                          | Status                    | Reality                                                                                                                                            |
| ----------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.pedir-card` class           | ❌ Doesn't exist          | Not in CSS or JS. Card 5 is just `.platform-card`.                                                                                                 |
| `.empty-card` class           | ❌ Doesn't exist          | Not in CSS or JS. No card uses this.                                                                                                               |
| `.empty-preview` class        | ❌ Doesn't exist          | Not in CSS or JS. All previews are `.platform-preview`.                                                                                            |
| `.platform-card::after`       | ❌ Doesn't exist          | No gradient border pseudo-element on cards.                                                                                                        |
| `.platform-preview::after`    | ❌ Doesn't exist          | No glass overlay on the preview area.                                                                                                              |
| `.platform-card.disabled`     | ⚠️ CSS exists, JS doesn't | The CSS rule is defined (opacity: 0.5) but **no JS code ever applies this class**. Dead code.                                                      |
| Sub-element `backdrop-filter` | ⚠️ Exists but useless     | `.mini-stat`, `.mini-table`, `.mini-user-row`, `.mini-project-row` all have `blur(6px)` but sit on opaque `#111` — the blur does nothing visually. |

---

## CSS Reference Lines

Quick reference for finding each element in `hub.html`:

| Element                   | Approximate Line |
| ------------------------- | ---------------- |
| `.platform-card`          | ~1048            |
| `.platform-card::before`  | ~1069            |
| `.platform-card:hover`    | ~1091            |
| `.platform-card.locked`   | ~1103            |
| `.platform-card.disabled` | ~1108            |
| `.platform-preview`       | ~1113            |
| `.mini-dashboard`         | ~1127            |
| `.mini-stat`              | ~1150            |
| `.mini-table`             | ~1175            |
| `.mini-users`             | ~1205            |
| `.mini-user-row`          | ~1225            |
| `.mini-projects`          | ~1260            |
| `.mini-project-row`       | ~1275            |
| `.lock-overlay`           | ~1346            |
| `.platform-info`          | ~1382            |
| `.platform-name`          | ~1388            |
| `.platform-desc`          | ~1395            |
| `.platform-info-row`      | ~1400            |
| `.access-toggle-btn`      | ~1410            |
| `.access-panel`           | ~1420            |

---

_Document generated from deep CSS audit of `hub.html` on the `feat/platform-info-blur` branch._
_Last updated: July 2025_
