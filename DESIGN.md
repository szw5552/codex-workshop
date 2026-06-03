# Design System

## Style Summary

A dusk field-report aesthetic: pure white reading surfaces, deep harbor blue as the archival anchor, graphite ink, and a restrained brass accent. The interface should feel like a well-edited conference notebook rather than a software console.

## Color Tokens

Use OKLCH values only.

```css
:root {
  --bg: oklch(1 0 0);
  --surface: oklch(0.965 0.006 230);
  --surface-strong: oklch(0.925 0.014 230);
  --ink: oklch(0.185 0.018 230);
  --muted: oklch(0.43 0.018 230);
  --primary: oklch(0.35 0.09 230);
  --primary-soft: oklch(0.90 0.035 230);
  --accent: oklch(0.58 0.12 72);
  --accent-soft: oklch(0.91 0.055 72);
  --rule: oklch(0.86 0.01 230);
}
```

## Typography

Use a non-default serif/sans pairing that supports Traditional Chinese gracefully. Prefer a system CJK serif for display rhythm and a CJK sans for body readability, with English fallbacks that do not dominate the page.

- Display: `"Songti TC", "Noto Serif TC", serif`
- Body: `"PingFang TC", "Noto Sans TC", sans-serif`
- Mono only for file metadata and processing details.

## Layout

- Home page: archive index with one strong featured record and a compact list for older talks.
- Detail page: asymmetric hero, image strip/mosaic, summary and infographic near the top, full transcript in a comfortable single reading column.
- Avoid nested cards. Use rules, spacing, captions, and image crops to create hierarchy.

## Motion

Use one page-load reveal for hero content and image mosaic. All motion must have a `prefers-reduced-motion` fallback.
