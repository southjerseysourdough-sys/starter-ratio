export type BuildMode = "flour" | "total";

export type FormulaInput = {
  amountGrams: number;
  feedHydrationPercent: number;
  inoculationPercent: number;
  mode: BuildMode;
};

export type FormulaResult = {
  finalTotal: number;
  flour: number;
  starter: number;
  water: number;
};

export type RatioPreset = {
  flour: number;
  label: string;
  starter: number;
  water: number;
};

export const CLASSIC_RATIOS: RatioPreset[] = [
  { label: "1:1:1", starter: 1, flour: 1, water: 1 },
  { label: "1:2:2", starter: 1, flour: 2, water: 2 },
  { label: "1:3:3", starter: 1, flour: 3, water: 3 },
  { label: "1:4:4", starter: 1, flour: 4, water: 4 },
  { label: "1:5:5", starter: 1, flour: 5, water: 5 },
  { label: "1:10:10", starter: 1, flour: 10, water: 10 },
];

export function ratioToInoculationPercent(ratio: RatioPreset) {
  return (ratio.starter / ratio.flour) * 100;
}

export function calculateFormula({
  amountGrams,
  feedHydrationPercent,
  inoculationPercent,
  mode,
}: FormulaInput): FormulaResult {
  const feedHydration = Math.max(feedHydrationPercent, 0) / 100;
  const inoculation = Math.max(inoculationPercent, 0) / 100;
  const amount = Math.max(amountGrams, 0);

  const flour =
    mode === "flour" ? amount : amount / (1 + inoculation + feedHydration);

  // Inoculation is mature starter as a percentage of the new flour added.
  const starter = flour * inoculation;
  const water = flour * feedHydration;
  const finalTotal = starter + flour + water;

  return { starter, flour, water, finalTotal };
}

export function getFermentationPaceNote(
  inoculationPercent: number,
  roomTemperature: number,
) {
  if (inoculationPercent >= 33 && roomTemperature >= 82) {
    return "Very fast build. This may peak quickly and need feeding sooner.";
  }

  if (inoculationPercent <= 15 && roomTemperature <= 70) {
    return "Slow build. Good for overnight feeding or a cooler kitchen.";
  }

  if (inoculationPercent >= 33 || roomTemperature >= 80) {
    return "Fast build. Watch for an early peak.";
  }

  if (
    inoculationPercent >= 18 &&
    inoculationPercent <= 30 &&
    roomTemperature >= 72 &&
    roomTemperature <= 78
  ) {
    return "Balanced build. Good everyday feeding range.";
  }

  return "Balanced build. Good everyday feeding range.";
}
