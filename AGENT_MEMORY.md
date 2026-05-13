# Shared Agent Memory

This file is shared context for Codex and Claude. Keep it concise and update it when substantial direction changes.

## Project

South Jersey Sourdough Starter Feeding Calculator.

Brand direction: warm South Jersey Sourdough artisan feel. Use cream backgrounds, warm brown accents, readable typography, calm premium layout, tactile but restrained controls. Do not turn it into a generic SaaS dashboard or a busy landing page.

## Stack

- Next.js 16.2.6 App Router with React 19.2.4.
- Tailwind CSS v4 via `@import "tailwindcss"` in `src/app/globals.css`.
- Main client UI currently lives in `src/app/page.tsx`.
- Formula helpers live in `src/app/calculator.ts`.
- Read relevant docs in `node_modules/next/dist/docs/` before coding because this repo explicitly warns that this Next version may differ from assumptions.

## Current Calculator Direction

The calculator has been refactored from "starter to keep" into a starter feeding and inoculation tool.

The primary user-facing method is now feeding ratio. Most users should start from ratios like `1:4:4`; inoculation percentage is still supported as an advanced/pro control.

Users can work either way:
- Feeding ratio presets/custom input in the main flow.
- Inoculation percentage presets/custom input inside collapsed Advanced Options.

These are equivalent controls. Do not remove inoculation or frame it as wrong. If users choose a ratio, show the mapped inoculation percentage. If they choose an inoculation percentage, show the equivalent ratio.

Core definitions:
- Inoculation means mature starter as a percentage of new flour added.
- Formula: `starter grams = flour grams * inoculation percent`.
- Feed hydration means new water as a percentage of new flour.
- Formula: `new water grams = new flour grams * feed hydration percent`.
- Total: `starter + flour + water`.

Build modes:
- Build by Flour Amount: user enters new flour amount; calculator derives starter, water, total.
- Build by Final Total: user enters desired final starter weight; calculator back-calculates flour, starter, water.

Final-total back calculation:
- `flour = final total / (1 + inoculation + feed hydration)` where percentages are decimals.

Ratio mapping:
- Ratio means `starter:flour:water`.
- `inoculation percentage = starter / flour * 100`.
- Feed hydration from ratio is `water / flour * 100`.
- Examples: `1:2:2 = 50%`, `1:5:5 = 20%`, `1:10:10 = 10%`.
- Default visible ratio is `1:4:4` / `25%` inoculation.

Measurement units:
- Internal formula math stays gram-based.
- Main amount and results support cups, grams, and ounces.
- Volume units are estimates and should show a gentle note: "Volume measurements are estimates. For best accuracy, use grams."
- Cup result displays use American kitchen fractions, not decimals, for example `1/2 cup` and `1 1/3 cups`.
- Gram result displays round to whole grams; ounces keep two decimals.
- Flour estimate: 1 cup = 120g.
- Water estimate: 1 cup = 240g.
- Liquid starter estimate: 1 cup = 240g.
- Stiff starter estimate: 1 cup = 180g.
- Custom starter volume display currently uses the liquid-starter estimate unless stiff starter is selected.

Starter type:
- Liquid Starter, 100% hydration.
- Stiff Starter, 50% hydration.
- Custom Hydration.
- Current implementation displays starter type context but does not decompose mature starter into component flour/water.

Stiff starter ratio presets:
- Show only `1:2:1` and `1:2:1.2`.
- Default stiff starter selection is `1:2:1`.
- Stiff preset buttons show feed hydration on line 2 (`50% hydration`, `60% hydration`) rather than inoculation.
- Other stiff ratios stay available only through the custom ratio field.

Jar logic:
- `1L = 1000g` assumption.
- Mixed fill: `final total / jar capacity`.
- Estimated peak fill: `final total * expected rise / jar capacity`.
- Expected rise options: `2x`, `2.5x`, `3x`; default `2.5x`.
- Warn over 80%: "Use a larger jar. This build may overflow once it peaks."
- Warn over 100%: "Overflow likely. Increase jar size or reduce the build."

Temperature guidance:
- Room temperature slider from 65°F to 85°F, default 75°F.
- Guidance is qualitative only, not exact peak time prediction.

## Recent Verification

Manual math checks run with Node:
- `100g flour @ 25% inoculation, 100% feed hydration = 25g starter, 100g flour, 100g water, 225g total`.
- `100g flour @ 20% inoculation = 20g starter, 100g flour, 100g water, 220g total`.
- `225g final @ 25% inoculation, 100% feed hydration back-calculates to 25g starter, 100g flour, 100g water`.
- `1:2:2 = 50% inoculation`.
- `1:5:5 = 20% inoculation`.
- `225g final in 1L jar at 2.5x rise = 56.25% estimated peak fill`.

Commands passed after the refactor:
- `npm run lint`
- `npm run build`

Latest ratio-first redesign verification:
- `100g flour @ 1:4:4, liquid starter, 100% feed hydration = 25g starter, 100g flour, 100g water, 225g total, 25% inoculation`.
- `100g flour @ 1:2:2 = 50g starter, 100g flour, 100g water, 250g total, 50% inoculation`.
- `225g final @ 1:4:4 = 25g starter, 100g flour, 100g water`.
- `20% advanced inoculation = equivalent ratio 1:5:5 and 20g starter for 100g flour`.
- Cup formatting checks: `0.5 cups = 1/2 cup`, `1.333 cups = 1 1/3 cups`, `0.4 cups = 1/4 cup`, `0.6 cups = 2/3 cup`.

There was already a dev server running on `http://localhost:3000` during the last session.

## Implementation Files To Review

Recent app work is represented in:
- `src/app/page.tsx`
- `src/app/calculator.ts`
- `src/app/globals.css`
- `src/app/layout.tsx`

As of this memory update, the currently uncommitted shared-memory changes are:
- `AGENTS.md`
- `AGENT_MEMORY.md`

Check `git status --short` before continuing.
