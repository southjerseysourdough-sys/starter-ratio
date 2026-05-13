export type BuildMode = "flour" | "total";

export type FormulaInput = {
  amountGrams: number;
  feedHydrationPercent: number;
  inoculationPercent: number;
  mode: BuildMode;
  starterHydrationPercent: number;
};

export type FormulaResult = {
  finalTotal: number;
  flour: number;
  starter: number;
  totalWater: number;
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

export const STIFF_RATIOS: RatioPreset[] = [
  { label: "1:2:1", starter: 1, flour: 2, water: 1 },
  { label: "1:2:1.2", starter: 1, flour: 2, water: 1.2 },
];

export const LIQUID_DEFAULT_RATIO: RatioPreset = CLASSIC_RATIOS[3];
export const STIFF_DEFAULT_RATIO: RatioPreset = STIFF_RATIOS[0];

export function ratioToInoculationPercent(ratio: RatioPreset) {
  return (ratio.starter / ratio.flour) * 100;
}

export function calculateFormula({
  amountGrams,
  feedHydrationPercent,
  inoculationPercent,
  mode,
  starterHydrationPercent,
}: FormulaInput): FormulaResult {
  const feedHydration = Math.max(feedHydrationPercent, 0) / 100;
  const inoculation = Math.max(inoculationPercent, 0) / 100;
  const starterHydration = Math.max(starterHydrationPercent, 0) / 100;
  const amount = Math.max(amountGrams, 0);

  const flour =
    mode === "flour" ? amount : amount / (1 + inoculation + feedHydration);

  const starter = flour * inoculation;
  const totalWater = flour * feedHydration;
  const waterInStarter =
    1 + starterHydration > 0
      ? (starter * starterHydration) / (1 + starterHydration)
      : 0;
  const water = Math.max(totalWater - waterInStarter, 0);
  const finalTotal = starter + flour + totalWater;

  return { starter, flour, totalWater, water, finalTotal };
}

export function getFermentationPaceNote(
  _inoculationPercent: number,
  roomTemperature: number,
) {
  if (roomTemperature < 68) {
    return "Slower build. Expect extended ferment time before peak.";
  }

  if (roomTemperature <= 72) {
    return "Moderate build. Good everyday feeding range.";
  }

  if (roomTemperature <= 77) {
    return "Balanced build. Good everyday feeding range.";
  }

  if (roomTemperature <= 82) {
    return "Fast build. Watch for an early peak.";
  }

  return "Very fast build. This may peak quickly and need feeding sooner.";
}
