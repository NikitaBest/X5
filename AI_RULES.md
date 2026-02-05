# AI Rules (Cursor) — Mobile-only Telegram WebApp

## Project stack
- Vite + React 19
- React Router
- Telegram WebApp integration (window.Telegram.WebApp)
- Camera via getUserMedia (used later)
- Styling: (choose one) CSS Modules or plain CSS + tokens (currently plain CSS)

## Hard constraints (DO NOT BREAK)
1) Mobile-only: all pages MUST render inside `MobileAppShell` (max-width 430, safe-area, 100dvh).
2) All pages MUST use `<Page>` wrapper for consistent padding/gap. Pages must not define their own outer padding.
3) No desktop breakpoints. Only mobile widths (360–430). 
4) Telegram WebApp init MUST stay working (ready/expand/themeChanged).
5) Camera page MUST keep stopping tracks on unmount.

## Architecture
- `src/layout/` — MobileAppShell, Page, Header, BottomNav
- `src/ui/` — reusable UI (Button, Card, Input, RadioCard, Modal, BottomSheet, ProgressDots)
- `src/components/` — feature components (BiomarkerCard, ResultCircle, ScanButton, etc.)
- `src/pages/` — screen composition only, no reusable UI inside pages

## Styling rules
- Use CSS variables tokens in `src/styles/tokens.css`
- Global base styles in `src/styles/globals.css`
- Component styles: co-locate or in ui folder (avoid global leakage)
- Prefer flex/grid and responsive `%` widths.

## Deliverables priority
1) tokens + typography
2) Button + Card + Input + RadioCard + ProgressDots
3) Header + BottomNav + FAB Scan button
4) Modal + BottomSheet
5) Onboarding screens (01-03)
6) Calibration screens
7) Dashboard screens
