# 01 · Design Tokens — `src/app/globals.css`

Replace the font import, the brand scales, and the semantic mappings in the `@theme` block and the `.dark` override. Keep the file's structure (Tailwind v4 `@theme` + `.dark` class via next-themes) — only values change. Legacy scales (`cream/bronze/charcoal/sage/terracotta/ocean/plum/honey/lime/warm`) should be REPLACED by the scales below; keep a `--color-brand-*` alias pointing at `gold` for any stragglers.

## Fonts

```css
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Instrument+Sans:ital,wght@0,400..700;1,400..700&family=Spline+Sans+Mono:wght@400;500;600&display=swap');

--font-display: 'Bricolage Grotesque', sans-serif;
--font-sans: 'Instrument Sans', system-ui, sans-serif;
--font-mono: 'Spline Sans Mono', monospace;
```

Rules: display = headings & big numerals only. Mono = ALL money/figures (`font-variant-numeric: tabular-nums`), kicker labels (uppercase, letter-spacing 1.4–2.4px, 10–11px), and table meta. Body for everything else. Heading defaults in `@layer base` stay, but cap page `h1` at `text-3xl` inside the app shell (30px) — the current 4xl–6xl responsive ramp is for the marketing site only.

## New scales

```css
/* Gold — THE brand accent (replaces lime, honey, bronze) */
--color-gold-50:  #FBF6E8;
--color-gold-100: #F6ECD4;
--color-gold-200: #EDDCA8;
--color-gold-300: #E9C878;
--color-gold-400: #E9B84F;  /* dark-mode primary */
--color-gold-500: #C2932F;
--color-gold-600: #9C7418;  /* light-mode primary */
--color-gold-700: #7E5D12;
--color-gold-800: #5C440E;
--color-gold-900: #3D2D09;

/* Ink — warm near-black (replaces charcoal) */
--color-ink-950: #0F0E0B;   /* dark bg */
--color-ink-900: #15130F;   /* dark raised/sidebar */
--color-ink-850: #191713;   /* dark card */
--color-ink-800: #1E1B16;   /* dark card-2 / secondary */
--color-ink-700: #262219;   /* dark border */
--color-ink-600: #3A352A;
--color-ink-500: #6F6A5E;   /* dark muted text */
--color-ink-400: #A8A294;   /* dark secondary text */
--color-ink-300: #C9C3B4;
--color-ink-100: #211C12;   /* light-mode foreground (warm ink) */

/* Cream — warm light neutrals (replaces warm + cream) */
--color-cream-50:  #FCFAF5;  /* portal bg / light sidebar */
--color-cream-100: #F6F2E8;  /* light admin bg */
--color-cream-200: #F3EEE0;  /* light muted/secondary */
--color-cream-300: #ECE6D4;
--color-cream-400: #E4DCC6;  /* light border */
--color-cream-500: #C9BFA4;
--color-cream-600: #9C937E;  /* light muted text */
--color-cream-700: #6E6655;  /* light secondary text */

/* Teal — informational (replaces ocean) */
--color-teal-300: #52D6C3;  /* dark mode */
--color-teal-600: #2E7D6E;  /* light mode */

/* Coral — attention, non-destructive (replaces most reds) */
--color-coral-300: #F08070;  /* dark mode */
--color-coral-600: #B3502E;  /* light mode */

/* Green — success */
--color-green-300: #8FCC85;  /* dark mode */
--color-green-600: #4E7D47;  /* light mode */

/* Portal pastels (tiles on light surfaces) */
--color-sage-bg: #E3EBD9;  --color-sage-line: #D3DFC6;  --color-sage-deep: #46663C;
--color-sky-bg:  #DFE9EC;  --color-sky-line:  #CEDDE1;  --color-sky-deep:  #3E6470;
--color-peach-bg:#F4E0D6;  --color-peach-line:#EDD2BC;  --color-peach-deep:#9E4A26;

/* Status (keep keys, new values) */
--color-status-success: #4E7D47;  --color-status-success-light: #E9F1E4;
--color-status-warning: #C2932F;  --color-status-warning-light: #F6ECD4;
--color-status-error:   #B3502E;  --color-status-error-light:   #F4E0D6;
--color-status-info:    #2E7D6E;  --color-status-info-light:    #DFE9EC;

/* True destructive red — confirm dialogs + AR 90+ bucket ONLY */
--color-danger: #C04437;
```

Dim/line helpers used everywhere (define as utilities or inline): accent at 10–12% alpha for fills, 25–30% alpha for borders. E.g. dark `goldDim rgba(233,184,79,.12)` / `goldLine rgba(233,184,79,.25)`; light `rgba(156,116,24,.10)` / `.30`.

## Semantic mapping — light (default `@theme`)

```css
--color-background: var(--color-cream-100);      /* portal pages: cream-50 */
--color-foreground: var(--color-ink-100);
--color-card: #FFFFFF;
--color-card-foreground: var(--color-ink-100);
--color-primary: var(--color-gold-600);
--color-primary-foreground: var(--color-cream-50);
--color-secondary: var(--color-cream-200);
--color-secondary-foreground: var(--color-ink-100);
--color-muted: var(--color-cream-200);
--color-muted-foreground: var(--color-cream-600);
--color-accent: var(--color-cream-200);
--color-accent-foreground: var(--color-ink-100);
--color-destructive: var(--color-danger);
--color-border: var(--color-cream-400);
--color-input: var(--color-cream-400);
--color-ring: var(--color-gold-600);
--color-sidebar: var(--color-cream-50);
--color-sidebar-primary: var(--color-gold-600);
--color-sidebar-accent: rgba(156,116,24,0.10);
--color-sidebar-border: var(--color-cream-300);
--color-chart-1: var(--color-gold-500);
--color-chart-2: var(--color-teal-600);
--color-chart-3: var(--color-cream-500);
--color-chart-4: var(--color-coral-600);
--color-chart-5: var(--color-green-600);
```

## Semantic mapping — `.dark`

```css
--color-background: var(--color-ink-950);
--color-foreground: #F3EFE6;
--color-card: var(--color-ink-850);
--color-card-foreground: #F3EFE6;
--color-primary: var(--color-gold-400);
--color-primary-foreground: #191407;
--color-secondary: var(--color-ink-800);
--color-secondary-foreground: #F3EFE6;
--color-muted: var(--color-ink-800);
--color-muted-foreground: var(--color-ink-500);
--color-accent: rgba(233,184,79,0.12);
--color-accent-foreground: var(--color-gold-400);
--color-destructive: #D85B4B;
--color-border: var(--color-ink-700);
--color-input: var(--color-ink-700);
--color-ring: var(--color-gold-400);
--color-sidebar: var(--color-ink-900);
--color-sidebar-primary: var(--color-gold-400);
--color-sidebar-accent: rgba(233,184,79,0.12);
--color-sidebar-border: #1F1C16;
--color-chart-1: var(--color-gold-400);
--color-chart-2: var(--color-teal-300);
--color-chart-3: var(--color-ink-600);
--color-chart-4: var(--color-coral-300);
--color-chart-5: var(--color-green-300);
```

## Radius & shadows
Keep the radius scale (sm 6 / md 12 / lg 16 / xl 20). Default surfaces: cards 14px, modals 18px, pills 999. Shadows: keep `--shadow-soft/card`; on dark mode prefer borders over shadows (shadows read as mud on near-black).

## Also retire
- `.btn-lime`, `.card-ramp`, `.heading-ramp`, `.btn-outline-warm` utility classes (grep for usages; replace with Button/Card variants).
- `gradient-text`, `bg-gradient-bronze` (off-system).
- Search the codebase for raw hex usage of `#EAC435`, `#A67C52`, `#14B8B8` family — replace with tokens.
