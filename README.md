# South Jersey Sourdough Starter Feeding Calculator

A client-side starter feeding and inoculation calculator for South Jersey Sourdough.

The app helps bakers build a feeding formula by either new flour amount or desired final starter weight. It supports both inoculation percentages and classic sourdough ratios, so bakers can use whichever mental model they prefer.

## What It Calculates

- Mature starter to use
- New flour to add
- New water to add
- Final starter weight
- Mixed jar fill
- Estimated peak jar fill based on expected rise
- Qualitative fermentation pace guidance from inoculation and room temperature

## Calculator Model

Inoculation means mature starter as a percentage of the new flour added.

```txt
starter grams = new flour grams * inoculation percentage
new water grams = new flour grams * feed hydration percentage
final starter weight = starter + flour + water
```

For final-total mode:

```txt
flour = desired final total / (1 + inoculation + feed hydration)
```

Percentages are converted to decimals in the formula.

## Ratio Compatibility

Classic ratios are treated as `starter:flour:water`.

```txt
inoculation percentage = starter / flour * 100
feed hydration percentage = water / flour * 100
```

Examples:

- `1:2:2` maps to `50%` inoculation
- `1:5:5` maps to `20%` inoculation
- `1:10:10` maps to `10%` inoculation

The UI allows both percentage presets/custom percentages and ratio presets/custom ratios. Choosing one updates the displayed equivalent of the other.

## Current Features

- Build by Flour Amount
- Build by Final Total
- Inoculation presets: `10%`, `20%`, `25%`, `33%`, `50%`, and custom
- Classic ratio presets: `1:1:1`, `1:2:2`, `1:3:3`, `1:5:5`, `1:10:10`, and custom
- Starter type display: liquid `100%`, stiff `50%`, or custom hydration
- Feed hydration: `100%`, `75%`, `60%`, or custom
- Room temperature guidance from `65°F` to `85°F`
- Jar capacity in grams, ounces, or liters
- Expected rise options: `2x`, `2.5x`, `3x`
- Overflow warnings when estimated peak fill exceeds `80%` or `100%`

## Stack

- Next.js `16.2.6` App Router
- React `19.2.4`
- TypeScript
- Tailwind CSS v4
- Client-side state only

## Project Structure

```txt
src/app/page.tsx        Main calculator UI
src/app/calculator.ts  Formula helpers and pace guidance
src/app/globals.css    Global styles and Tailwind v4 import
src/app/layout.tsx     App metadata and root layout
```

## Run Locally

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). If port `3000` is already in use, Next.js may choose another local port.

## Verify

```bash
npm run lint
npm run build
```

Useful manual checks:

- `100g` flour at `25%` inoculation and `100%` feed hydration should produce `25g` starter, `100g` flour, `100g` water, `225g` total.
- `100g` flour at `20%` inoculation should produce `20g` starter, `100g` flour, `100g` water, `220g` total.
- Ratio preset `1:2:2` should show `50%` inoculation.
- Ratio preset `1:5:5` should show `20%` inoculation.
- `225g` final starter in a `1L` jar with `2.5x` expected rise should show about `56%` estimated peak fill.
- Final-total mode should back-calculate starter, flour, and water from the desired total.

## Agent Notes

Claude and Codex share project context through `AGENT_MEMORY.md`. Read `AGENTS.md` and `AGENT_MEMORY.md` before making substantial changes.

This project intentionally has no login, database, backend, accounts, or saved history.
