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

Users can work either way:
- Inoculation percentage presets/custom input.
- Classic ratio presets/custom ratio input.

These are equivalent controls. Do not lock the user into only inoculation percentages. If they choose a ratio, show the mapped inoculation percentage. If they choose an inoculation percentage, show the equivalent ratio.

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

Starter type:
- Liquid Starter, 100% hydration.
- Stiff Starter, 50% hydration.
- Custom Hydration.
- Current implementation displays starter type context but does not decompose mature starter into component flour/water.

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
