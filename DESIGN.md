---
name: Procept
description: Constructeur familial exigeant, ouest parisien — maisons et rénovations clé en main
colors:
  primary: "#2c4a3e"
  primary-dark: "#1e3329"
  accent: "#c4a35a"
  accent-light: "#d4b86a"
  bg: "#faf8f5"
  bg-dark: "#1a1a1a"
  text: "#2d2d2d"
  text-light: "#6b6b6b"
  white: "#ffffff"
typography:
  display:
    fontFamily: "Quattrocento, Georgia, serif"
    fontSize: "clamp(2.75rem, 6vw, 4.25rem)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "normal"
  heading:
    fontFamily: "Quattrocento, Georgia, serif"
    fontSize: "clamp(1.75rem, 3vw, 2.5rem)"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "Josefin Sans, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Josefin Sans, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.12em"
  readable-a11y:
    fontFamily: "Verdana, Geneva, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
rounded:
  sm: "8px"
  md: "10px"
  lg: "14px"
  pill: "999px"
spacing:
  xs: "0.35rem"
  sm: "0.65rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2.5rem"
  section: "4rem"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.primary-dark}"
    rounded: "{rounded.pill}"
    padding: "0.85rem 1.5rem"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.white}"
    rounded: "{rounded.pill}"
    padding: "0.85rem 1.5rem"
  fab-chat:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.primary-dark}"
    size: "56px"
    rounded: "{rounded.pill}"
---

# DESIGN.md

## Overview

Procept is a brand-first marketing site for a family construction firm in western Paris (Saint-Germain-en-Laye, Yvelines, Hauts-de-Seine). The visual system is grounded, warm, and exacting: deep forest green, soft gold accent, cream paper background, serif display for the brand, geometric sans for UI and body.

Design serves trust and conversion (assistant, phone, contact form) without looking like generic AI SaaS or low-cost real-estate stock. One idea per section; real project photography over decorative abstraction.

## Colors

| Token | Hex | Role |
|-------|-----|------|
| `primary` | `#2c4a3e` | Brand green, nav, headings |
| `primary-dark` | `#1e3329` | Topbar, hero depth, contrast text on gold |
| `accent` | `#c4a35a` | CTAs, FAB, highlights, gold line |
| `accent-light` | `#d4b86a` | Gradients / hover lift |
| `bg` | `#faf8f5` | Page ground |
| `text` / `text-light` | `#2d2d2d` / `#6b6b6b` | Body / muted |

Do not introduce purple gradients, neon glows, or flat white-only SaaS palettes. Gold is an accent, not a wash.

## Typography

- **Display / brand:** Quattrocento (serif) — hero title, section titles, logo wordmark.
- **UI / body:** Josefin Sans — nav, buttons, paragraphs, forms.
- Prefer fewer sizes with clear contrast; fluid `clamp` on marketing headings only.
- Avoid Inter, Roboto, system-default stacks for brand surfaces.

## Elevation

- Soft ambient: `--shadow` / `--shadow-lg` for cards and FABs.
- Mega-menu and search dialog: deeper shadow (`0 28px 80px` + gold hairline) over a dim backdrop `rgba(14, 24, 20, 0.45)`.
- Header glass lives on a non-clipping layer (`::before`); mega panels stay above page content.

## Components

- **Buttons:** primary gold pill; outline for secondary (hero / mobile call).
- **Header:** fixed; topbar coords collapse on scroll; Services/Explorer mega with dim overlay on desktop.
- **Hero:** full-bleed atmosphere + product photography frame; brand name dominant.
- **FAB chat:** gold circle robot + nudge bubble; primary contact path.
- **Form:** « Formulaire de contact » — not framed as an instant quote PDF.
- **Stats / recap:** subtle top accent or hairline, never thick side-tab borders.

## Do's and Don'ts

**Do**
- Lead with Procept + west-Paris locality.
- Use real chantier photos and news as proof.
- Keep assistant, phone, and contact form available together.
- Respect `prefers-reduced-motion` and the a11y panel.

**Don't**
- AI-generic purple/indigo themes, glow stacks, card grids for everything.
- Cheap real-estate stock aesthetics or cold corporate admin chrome.
- Thick colored left borders on cards (Impeccable `side-tab`).
- Overuse em-dashes in marketing copy; say « demande de devis » when the team still prepares the quote.
