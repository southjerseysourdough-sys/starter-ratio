"use client";

import { useMemo, useState } from "react";
import {
  calculateFormula,
  CLASSIC_RATIOS,
  getFermentationPaceNote,
  ratioToInoculationPercent,
  type BuildMode,
  type RatioPreset,
} from "./calculator";

type WeightUnit = "g" | "oz";
type JarUnit = "g" | "oz" | "L";
type StarterType = "liquid" | "stiff" | "custom";
type FeedHydration = "100" | "75" | "60" | "custom";

const GRAMS_PER_OUNCE = 28.349523125;
const GRAMS_PER_LITER = 1000;

const INOCULATION_PRESETS = [
  { label: "10%", value: 10, helper: "slower" },
  { label: "20%", value: 20, helper: "balanced" },
  { label: "25%", value: 25, helper: "balanced" },
  { label: "33%", value: 33, helper: "faster" },
  { label: "50%", value: 50, helper: "faster" },
];

const STARTER_TYPES: Array<{
  description: string;
  label: string;
  value: StarterType;
}> = [
  {
    label: "Liquid Starter",
    description: "100% hydration",
    value: "liquid",
  },
  {
    label: "Stiff Starter",
    description: "50% hydration",
    value: "stiff",
  },
  {
    label: "Custom Hydration",
    description: "set your starter",
    value: "custom",
  },
];

const FEED_HYDRATIONS: Array<{
  label: string;
  value: FeedHydration;
}> = [
  { label: "100% hydration feed", value: "100" },
  { label: "75% hydration feed", value: "75" },
  { label: "60% hydration feed", value: "60" },
  { label: "Custom", value: "custom" },
];

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function cleanNumber(value: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
    useGrouping: false,
  }).format(Math.max(value, 0));
}

function formatDisplay(value: number, maximumFractionDigits = 1) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
  }).format(Math.max(value, 0));
}

function weightToGrams(value: string, unit: WeightUnit) {
  const amount = Math.max(toNumber(value), 0);
  return unit === "oz" ? amount * GRAMS_PER_OUNCE : amount;
}

function gramsToWeight(grams: number, unit: WeightUnit) {
  return unit === "oz" ? grams / GRAMS_PER_OUNCE : grams;
}

function jarToGrams(value: string, unit: JarUnit) {
  const amount = Math.max(toNumber(value), 0);

  if (unit === "oz") {
    return amount * GRAMS_PER_OUNCE;
  }

  if (unit === "L") {
    return amount * GRAMS_PER_LITER;
  }

  return amount;
}

function gramsToJar(grams: number, unit: JarUnit) {
  if (unit === "oz") {
    return grams / GRAMS_PER_OUNCE;
  }

  if (unit === "L") {
    return grams / GRAMS_PER_LITER;
  }

  return grams;
}

function starterHydrationPercent(
  starterType: StarterType,
  customHydration: string,
) {
  if (starterType === "stiff") {
    return 50;
  }

  if (starterType === "custom") {
    return Math.max(toNumber(customHydration), 0);
  }

  return 100;
}

function starterTypeLabel(starterType: StarterType, customHydration: string) {
  const hydration = starterHydrationPercent(starterType, customHydration);

  if (starterType === "stiff") {
    return "Stiff Starter, 50%";
  }

  if (starterType === "custom") {
    return `Custom Starter, ${formatDisplay(hydration, 1)}%`;
  }

  return "Liquid Starter, 100%";
}

function feedHydrationPercent(
  feedHydration: FeedHydration,
  customHydration: string,
) {
  return feedHydration === "custom"
    ? Math.max(toNumber(customHydration), 0)
    : Number(feedHydration);
}

function parseRatio(value: string): RatioPreset | null {
  const parts = value
    .trim()
    .split(":")
    .map((part) => Number(part.trim()));

  if (
    parts.length !== 3 ||
    parts.some((part) => !Number.isFinite(part) || part <= 0)
  ) {
    return null;
  }

  const [starter, flour, water] = parts;
  return { label: value, starter, flour, water };
}

function ratioEquivalentLabel(
  inoculationPercent: number,
  feedHydrationPercentValue: number,
) {
  if (inoculationPercent <= 0) {
    return "1:0:0";
  }

  const inoculation = inoculationPercent / 100;
  const feedHydrationValue = feedHydrationPercentValue / 100;

  return `1:${cleanNumber(1 / inoculation, 2)}:${cleanNumber(
    feedHydrationValue / inoculation,
    2,
  )}`;
}

export default function Home() {
  const [mode, setMode] = useState<BuildMode>("flour");
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("g");
  const [amount, setAmount] = useState("100");
  const [amountGrams, setAmountGrams] = useState(100);
  const [inoculation, setInoculation] = useState(25);
  const [customInoculation, setCustomInoculation] = useState("25");
  const [customRatio, setCustomRatio] = useState("1:4:4");
  const [starterType, setStarterType] = useState<StarterType>("liquid");
  const [customStarterHydration, setCustomStarterHydration] = useState("100");
  const [feedHydration, setFeedHydration] = useState<FeedHydration>("100");
  const [customFeedHydration, setCustomFeedHydration] = useState("100");
  const [roomTemperature, setRoomTemperature] = useState(75);
  const [jarCapacity, setJarCapacity] = useState("1");
  const [jarUnit, setJarUnit] = useState<JarUnit>("L");
  const [jarCapacityGrams, setJarCapacityGrams] = useState(1000);
  const [expectedRise, setExpectedRise] = useState(2.5);

  const activeInoculationPreset = INOCULATION_PRESETS.find(
    (preset) => Math.abs(preset.value - inoculation) < 0.001,
  )?.value;
  const currentFeedHydration = feedHydrationPercent(
    feedHydration,
    customFeedHydration,
  );
  const activeClassicRatio = CLASSIC_RATIOS.find(
    (preset) =>
      Math.abs(ratioToInoculationPercent(preset) - inoculation) < 0.15 &&
      Math.abs((preset.water / preset.flour) * 100 - currentFeedHydration) <
        0.15,
  )?.label;
  const hasJarCapacity =
    jarCapacity.trim().length > 0 && jarCapacityGrams > 0;
  const outputDecimals = weightUnit === "oz" ? 2 : 1;
  const amountLabel =
    mode === "flour" ? "New Flour Amount" : "Desired Final Total";

  const results = useMemo(
    () =>
      calculateFormula({
        amountGrams,
        feedHydrationPercent: currentFeedHydration,
        inoculationPercent: inoculation,
        mode,
      }),
    [amountGrams, currentFeedHydration, inoculation, mode],
  );

  const mixedFill = hasJarCapacity
    ? (results.finalTotal / jarCapacityGrams) * 100
    : 0;
  const peakFill = hasJarCapacity
    ? ((results.finalTotal * expectedRise) / jarCapacityGrams) * 100
    : 0;
  const jarWarning =
    hasJarCapacity && peakFill > 100
      ? "Overflow likely. Increase jar size or reduce the build."
      : hasJarCapacity && peakFill > 80
        ? "Use a larger jar. This build may overflow once it peaks."
        : "";
  const fermentationNote = getFermentationPaceNote(
    inoculation,
    roomTemperature,
  );
  const equivalentRatio = ratioEquivalentLabel(
    inoculation,
    currentFeedHydration,
  );

  function changeWeightUnit(nextUnit: WeightUnit) {
    if (nextUnit === weightUnit) {
      return;
    }

    setAmount(cleanNumber(gramsToWeight(amountGrams, nextUnit), 2));
    setWeightUnit(nextUnit);
  }

  function changeJarUnit(nextUnit: JarUnit) {
    if (nextUnit === jarUnit) {
      return;
    }

    setJarCapacity(cleanNumber(gramsToJar(jarCapacityGrams, nextUnit), 2));
    setJarUnit(nextUnit);
  }

  function updateAmount(value: string) {
    setAmount(value);
    setAmountGrams(weightToGrams(value, weightUnit));
  }

  function updateInoculation(value: number) {
    const safeValue = Math.max(value, 0);
    setInoculation(safeValue);
    setCustomInoculation(cleanNumber(safeValue, 2));
  }

  function updateCustomInoculation(value: string) {
    setCustomInoculation(value);
    setInoculation(Math.max(toNumber(value), 0));
  }

  function setFeedHydrationPercentValue(nextFeedHydration: number) {
    const rounded = cleanNumber(nextFeedHydration, 2);

    if (Math.abs(nextFeedHydration - 100) < 0.001) {
      setFeedHydration("100");
    } else if (Math.abs(nextFeedHydration - 75) < 0.001) {
      setFeedHydration("75");
    } else if (Math.abs(nextFeedHydration - 60) < 0.001) {
      setFeedHydration("60");
    } else {
      setFeedHydration("custom");
    }

    setCustomFeedHydration(rounded);
  }

  function selectRatio(ratio: RatioPreset) {
    const nextInoculation = ratioToInoculationPercent(ratio);
    const nextFeedHydration = (ratio.water / ratio.flour) * 100;

    setInoculation(nextInoculation);
    setCustomInoculation(cleanNumber(nextInoculation, 2));
    setCustomRatio(ratio.label);
    setFeedHydrationPercentValue(nextFeedHydration);
  }

  function updateCustomRatio(value: string) {
    setCustomRatio(value);

    const ratio = parseRatio(value);
    if (ratio) {
      selectRatio(ratio);
    }
  }

  function selectJarDefault(liters: "1" | "1.5") {
    setJarUnit("L");
    setJarCapacity(liters);
    setJarCapacityGrams(jarToGrams(liters, "L"));
  }

  return (
    <main className="starter-page min-h-screen px-5 py-6 text-[#3b2618] sm:px-8 lg:px-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="space-y-3 pt-2 sm:pt-6">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#8c5f3f]">
            South Jersey Sourdough
          </p>
          <div className="max-w-3xl space-y-3">
            <h1 className="text-4xl font-semibold leading-tight text-[#321f14] sm:text-5xl">
              Starter Feeding Calculator
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-[#6f4f39]">
              Build a feeding formula by flour amount or final starter weight,
              with inoculation, hydration, and jar rise in view.
            </p>
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_410px]">
          <div className="starter-panel rounded-lg border border-[#d6bda6] bg-[#fffaf4]/90 p-5 shadow-[0_18px_40px_rgba(69,43,24,0.08),0_4px_14px_rgba(69,43,24,0.06)] sm:p-6">
            <div className="grid gap-6">
              <div className="grid gap-3">
                <span className="field-label">Build Mode</span>
                <div
                  aria-label="Build mode"
                  className="grid gap-2 rounded-md border border-[#c8a98c] bg-[#f4e6d7] p-1 sm:grid-cols-2"
                  role="group"
                >
                  <SegmentButton
                    active={mode === "flour"}
                    label="Build by Flour Amount"
                    onClick={() => setMode("flour")}
                  />
                  <SegmentButton
                    active={mode === "total"}
                    label="Build by Final Total"
                    onClick={() => setMode("total")}
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_220px]">
                <label className="grid gap-2">
                  <span className="field-label">{amountLabel}</span>
                  <div className="relative">
                    <input
                      className="input-large pr-16"
                      inputMode="decimal"
                      onChange={(event) => updateAmount(event.target.value)}
                      type="text"
                      value={amount}
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lg font-bold text-[#8c6b54]">
                      {weightUnit}
                    </span>
                  </div>
                </label>

                <div className="grid gap-2">
                  <span className="field-label">Weight Unit</span>
                  <div
                    aria-label="Weight unit"
                    className="grid grid-cols-2 rounded-md border border-[#c8a98c] bg-[#f4e6d7] p-1"
                    role="group"
                  >
                    <SegmentButton
                      active={weightUnit === "g"}
                      label="Grams"
                      onClick={() => changeWeightUnit("g")}
                    />
                    <SegmentButton
                      active={weightUnit === "oz"}
                      label="Ounces"
                      onClick={() => changeWeightUnit("oz")}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <span className="field-label">Inoculation Percentage</span>
                  <p className="max-w-xl text-sm leading-6 text-[#76563e]">
                    Use percentages or ratios, whichever feels natural. They
                    drive the same formula and stay easy to translate.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
                  {INOCULATION_PRESETS.map((preset) => (
                    <PresetButton
                      active={activeInoculationPreset === preset.value}
                      helper={preset.helper}
                      key={preset.label}
                      label={preset.label}
                      onClick={() => updateInoculation(preset.value)}
                    />
                  ))}
                  <PresetButton
                    active={!activeInoculationPreset}
                    helper="set exact"
                    label="Custom"
                    onClick={() => updateInoculation(toNumber(customInoculation))}
                  />
                </div>

                <label className="grid gap-2 sm:max-w-xs">
                  <span className="sr-only">Custom inoculation percentage</span>
                  <div className="relative">
                    <input
                      aria-label="Custom inoculation percentage"
                      className="input-standard pr-12"
                      inputMode="decimal"
                      onChange={(event) =>
                        updateCustomInoculation(event.target.value)
                      }
                      type="text"
                      value={customInoculation}
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-base font-bold text-[#8c6b54]">
                      %
                    </span>
                  </div>
                </label>
                <p className="text-sm font-semibold leading-6 text-[#76563e]">
                  Equivalent ratio at this feed hydration:{" "}
                  <span className="font-bold text-[#321f14]">
                    {equivalentRatio}
                  </span>
                </p>
                <p className="text-sm leading-6 text-[#76563e]">
                  Inoculation is the amount of mature starter used compared to
                  the new flour added. A lower percentage slows the build. A
                  higher percentage speeds it up.
                </p>
              </div>

              <div className="grid gap-5 xl:grid-cols-2">
                <div className="grid gap-3">
                  <span className="field-label">Starter Type</span>
                  <div className="grid gap-2">
                    {STARTER_TYPES.map((option) => (
                      <OptionButton
                        active={starterType === option.value}
                        description={option.description}
                        key={option.value}
                        label={option.label}
                        onClick={() => setStarterType(option.value)}
                      />
                    ))}
                  </div>
                  {starterType === "custom" ? (
                    <label className="grid gap-2">
                      <span className="text-sm font-bold text-[#76563e]">
                        Starter hydration percentage
                      </span>
                      <input
                        className="input-standard"
                        inputMode="decimal"
                        onChange={(event) =>
                          setCustomStarterHydration(event.target.value)
                        }
                        type="text"
                        value={customStarterHydration}
                      />
                    </label>
                  ) : null}
                </div>

                <div className="grid gap-3">
                  <span className="field-label">Feed Hydration</span>
                  <div className="grid gap-2">
                  {FEED_HYDRATIONS.map((option) => (
                      <OptionButton
                        active={feedHydration === option.value}
                        key={option.value}
                        label={option.label}
                        onClick={() => setFeedHydration(option.value)}
                      />
                    ))}
                  </div>
                  {feedHydration === "custom" ? (
                    <label className="grid gap-2">
                      <span className="text-sm font-bold text-[#76563e]">
                        Feed hydration percentage
                      </span>
                      <input
                        className="input-standard"
                        inputMode="decimal"
                        onChange={(event) =>
                          setCustomFeedHydration(event.target.value)
                        }
                        type="text"
                        value={customFeedHydration}
                      />
                    </label>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3">
                <span className="field-label">Classic Ratio Presets</span>
                <p className="text-sm leading-6 text-[#76563e]">
                  Ratio means starter : flour : water. Pick a ratio and the
                  calculator sets both inoculation and feed hydration.
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {CLASSIC_RATIOS.map((preset) => {
                    const mappedInoculation =
                      ratioToInoculationPercent(preset);

                    return (
                      <button
                        className={`preset-control min-h-14 rounded-md border px-2 text-sm font-bold transition ${
                          activeClassicRatio === preset.label
                            ? "starter-active-control shadow-sm"
                            : "border-dashed border-[#c8a98c] bg-[#fffaf4] text-[#4a2f1d] hover:border-[#8c5f3f] hover:bg-[#f4e6d7] hover:shadow-sm"
                        }`}
                        key={preset.label}
                        onClick={() => selectRatio(preset)}
                        type="button"
                      >
                        <span className="block text-base">{preset.label}</span>
                        <span className="block text-xs font-semibold opacity-80">
                          {formatDisplay(mappedInoculation, 1)}%
                        </span>
                      </button>
                    );
                  })}
                </div>
                <label className="grid gap-2 sm:max-w-xs">
                  <span className="text-sm font-bold text-[#76563e]">
                    Custom ratio
                  </span>
                  <input
                    aria-label="Custom ratio"
                    className="input-standard"
                    inputMode="decimal"
                    onChange={(event) => updateCustomRatio(event.target.value)}
                    type="text"
                    value={customRatio}
                  />
                </label>
              </div>

              <div className="grid gap-3">
                <div className="flex items-baseline justify-between gap-4">
                  <label className="field-label" htmlFor="room-temperature">
                    Room Temperature
                  </label>
                  <span className="text-lg font-bold text-[#321f14]">
                    {roomTemperature}°F
                  </span>
                </div>
                <input
                  aria-describedby="pace-note"
                  className="starter-range"
                  id="room-temperature"
                  max="85"
                  min="65"
                  onChange={(event) =>
                    setRoomTemperature(Number(event.target.value))
                  }
                  type="range"
                  value={roomTemperature}
                />
                <p
                  className="rounded-md border border-dotted border-[#d7b99e] bg-[#fbf2e8] px-4 py-3 text-sm font-semibold leading-6 text-[#6f4f39]"
                  id="pace-note"
                >
                  {fermentationNote}
                </p>
              </div>

              <div className="grid gap-4 border-t border-dotted border-[#d4b89f] pt-5">
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_150px]">
                  <label className="grid gap-2">
                    <span className="field-label">Jar Capacity</span>
                    <input
                      className="input-standard"
                      inputMode="decimal"
                      onChange={(event) => {
                        setJarCapacity(event.target.value);
                        setJarCapacityGrams(
                          jarToGrams(event.target.value, jarUnit),
                        );
                      }}
                      type="text"
                      value={jarCapacity}
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="field-label">Unit</span>
                    <select
                      className="input-standard"
                      onChange={(event) =>
                        changeJarUnit(event.target.value as JarUnit)
                      }
                      value={jarUnit}
                    >
                      <option value="g">g</option>
                      <option value="oz">oz</option>
                      <option value="L">L</option>
                    </select>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    className="preset-control rounded-md border border-dashed border-[#c8a98c] bg-[#fffaf4] px-3 py-3 text-sm font-bold text-[#4a2f1d] transition hover:border-[#8c5f3f] hover:bg-[#f4e6d7]"
                    onClick={() => selectJarDefault("1")}
                    type="button"
                  >
                    1L = 1000g
                  </button>
                  <button
                    className="preset-control rounded-md border border-dashed border-[#c8a98c] bg-[#fffaf4] px-3 py-3 text-sm font-bold text-[#4a2f1d] transition hover:border-[#8c5f3f] hover:bg-[#f4e6d7]"
                    onClick={() => selectJarDefault("1.5")}
                    type="button"
                  >
                    1.5L = 1500g
                  </button>
                </div>

                <div className="grid gap-2">
                  <span className="field-label">Expected Rise</span>
                  <div
                    aria-label="Expected rise"
                    className="grid grid-cols-3 rounded-md border border-[#c8a98c] bg-[#f4e6d7] p-1"
                    role="group"
                  >
                    {[2, 2.5, 3].map((rise) => (
                      <SegmentButton
                        active={expectedRise === rise}
                        key={rise}
                        label={`${rise}x`}
                        onClick={() => setExpectedRise(rise)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside className="starter-result rounded-lg border border-[#c8a98c] bg-[#fcf1e4] p-5 shadow-[0_24px_60px_rgba(69,43,24,0.12),0_8px_18px_rgba(69,43,24,0.08)] transition sm:p-6">
            <div className="flex h-full flex-col gap-5">
              <output
                aria-live="polite"
                className="rounded-lg border border-[#d5b69b] bg-[#fff7ef] p-4"
              >
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#8c5f3f]">
                  Final Starter Weight
                </p>
                <p className="mt-2 text-5xl font-semibold tracking-normal text-[#321f14] transition-all sm:text-6xl">
                  {formatDisplay(
                    gramsToWeight(results.finalTotal, weightUnit),
                    outputDecimals,
                  )}
                  <span className="ml-2 text-2xl text-[#76563e]">
                    {weightUnit}
                  </span>
                </p>
              </output>

              <div className="grid gap-2" aria-live="polite">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#8c5f3f]">
                  Feeding Formula
                </p>
                <ResultRow
                  label="Inoculation"
                  value={`${formatDisplay(inoculation, 1)}%`}
                />
                <ResultRow label="Ratio" value={equivalentRatio} />
                <ResultRow
                  label="Starter"
                  value={`${formatDisplay(
                    gramsToWeight(results.starter, weightUnit),
                    outputDecimals,
                  )} ${weightUnit}`}
                />
                <ResultRow
                  label="Flour"
                  value={`${formatDisplay(
                    gramsToWeight(results.flour, weightUnit),
                    outputDecimals,
                  )} ${weightUnit}`}
                />
                <ResultRow
                  label="Water"
                  value={`${formatDisplay(
                    gramsToWeight(results.water, weightUnit),
                    outputDecimals,
                  )} ${weightUnit}`}
                />
                <ResultRow
                  label="Feed Hydration"
                  value={`${formatDisplay(currentFeedHydration, 1)}%`}
                />
                <ResultRow
                  label="Starter Type"
                  value={starterTypeLabel(starterType, customStarterHydration)}
                />
                <ResultRow
                  label="Total"
                  value={`${formatDisplay(
                    gramsToWeight(results.finalTotal, weightUnit),
                    outputDecimals,
                  )} ${weightUnit}`}
                />
              </div>

              {hasJarCapacity ? (
                <div className="grid gap-4 rounded-lg border border-dotted border-[#d6b99e] bg-[#fffaf4] p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#8c5f3f]">
                      Jar Fill
                    </p>
                    <p className="text-sm font-bold text-[#6f4f39]">
                      {expectedRise}x expected rise
                    </p>
                  </div>

                  <JarMeter
                    label="Mixed fill"
                    percent={mixedFill}
                    tone="mixed"
                  />
                  <JarMeter
                    label="Estimated peak fill"
                    percent={peakFill}
                    tone={peakFill > 80 ? "warning" : "mixed"}
                  />

                  {jarWarning ? (
                    <p
                      className={`rounded-md border px-3 py-2 text-sm font-bold leading-6 ${
                        peakFill > 100
                          ? "border-[#a33f2a] bg-[#fff2eb] text-[#8f321f]"
                          : "border-[#b8792d] bg-[#fff6df] text-[#835019]"
                      }`}
                      role="status"
                    >
                      {jarWarning}
                    </p>
                  ) : (
                    <p className="text-sm font-semibold leading-6 text-[#6f4f39]">
                      The jar has comfortable room for this build at the
                      selected rise.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm font-semibold text-[#6f4f39]">
                  Enter a jar capacity to check mixed fill and peak fill.
                </p>
              )}
            </div>
          </aside>
        </section>

        <footer className="border-t border-dotted border-[#c9aa90] py-5 text-center text-sm font-semibold text-[#7a563d]">
          Built for real sourdough feeding by South Jersey Sourdough.
        </footer>
      </div>
    </main>
  );
}

function SegmentButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`min-h-11 rounded px-3 text-sm font-bold transition ${
        active
          ? "starter-active-control shadow-sm"
          : "text-[#4a2f1d] hover:bg-[#fffaf4]"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function PresetButton({
  active,
  helper,
  label,
  onClick,
}: {
  active: boolean;
  helper: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`preset-control min-h-16 rounded-md border px-2 py-2 text-center transition ${
        active
          ? "starter-active-control shadow-sm"
          : "border-dashed border-[#c8a98c] bg-[#fffaf4] text-[#4a2f1d] hover:border-[#8c5f3f] hover:bg-[#f4e6d7] hover:shadow-sm"
      }`}
      onClick={onClick}
      type="button"
    >
      <span className="block text-lg font-bold">{label}</span>
      <span className="block text-xs font-semibold opacity-80">{helper}</span>
    </button>
  );
}

function OptionButton({
  active,
  description,
  label,
  onClick,
}: {
  active: boolean;
  description?: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`preset-control rounded-md border px-4 py-3 text-left transition ${
        active
          ? "starter-active-control shadow-sm"
          : "border-dashed border-[#c8a98c] bg-[#fffaf4] text-[#4a2f1d] hover:border-[#8c5f3f] hover:bg-[#f4e6d7] hover:shadow-sm"
      }`}
      onClick={onClick}
      type="button"
    >
      <span className="block text-sm font-bold">{label}</span>
      {description ? (
        <span className="block text-xs font-semibold opacity-80">
          {description}
        </span>
      ) : null}
    </button>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-dotted border-[#d9bfa8] py-2 last:border-b-0">
      <span className="text-base font-semibold text-[#4a2f1d]">{label}</span>
      <span className="text-right text-lg font-semibold text-[#321f14] transition-all">
        {value}
      </span>
    </div>
  );
}

function JarMeter({
  label,
  percent,
  tone,
}: {
  label: string;
  percent: number;
  tone: "mixed" | "warning";
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-bold text-[#4a2f1d]">{label}</span>
        <span
          className={`text-sm font-bold ${
            tone === "warning" ? "text-[#8f321f]" : "text-[#6f4f39]"
          }`}
        >
          {formatDisplay(percent, 0)}%
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-[#e7d5c2]">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            tone === "warning" ? "bg-[#b45335]" : "bg-[#8d704d]"
          }`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  );
}
