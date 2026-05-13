"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  calculateFormula,
  CLASSIC_RATIOS,
  getFermentationPaceNote,
  ratioToInoculationPercent,
  type BuildMode,
  type RatioPreset,
} from "./calculator";

type MeasureUnit = "cup" | "g" | "oz";
type JarUnit = "g" | "oz" | "L";
type StarterType = "liquid" | "stiff" | "custom";
type FeedHydration = "100" | "75" | "60" | "custom";
type FormulaIngredient = "flour" | "starter" | "water";

const GRAMS_PER_OUNCE = 28.349523125;
const GRAMS_PER_LITER = 1000;
const VOLUME_UNITS = new Set<MeasureUnit>(["cup"]);
const CUP_FRACTIONS = [
  { label: "1/4", value: 1 / 4 },
  { label: "1/3", value: 1 / 3 },
  { label: "1/2", value: 1 / 2 },
  { label: "2/3", value: 2 / 3 },
  { label: "3/4", value: 3 / 4 },
];

const MEASURE_UNITS: Array<{
  label: string;
  shortLabel: string;
  value: MeasureUnit;
}> = [
  { label: "Cups", shortLabel: "cups", value: "cup" },
  { label: "Grams", shortLabel: "g", value: "g" },
  { label: "Ounces", shortLabel: "oz", value: "oz" },
];

const INOCULATION_PRESETS = [
  { label: "10%", value: 10, helper: "slower" },
  { label: "20%", value: 20, helper: "balanced" },
  { label: "25%", value: 25, helper: "balanced" },
  { label: "33%", value: 100 / 3, helper: "faster" },
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
    label: "Custom Starter",
    description: "set hydration",
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

function isVolumeUnit(unit: MeasureUnit) {
  return VOLUME_UNITS.has(unit);
}

function gramsPerVolumeUnit(
  unit: MeasureUnit,
  ingredient: FormulaIngredient,
  starterType: StarterType,
) {
  if (!isVolumeUnit(unit)) {
    return unit === "oz" ? GRAMS_PER_OUNCE : 1;
  }

  if (ingredient === "flour") {
    return 120;
  }

  if (ingredient === "starter" && starterType === "stiff") {
    return 180;
  }

  return 240;
}

function measureToGrams(
  value: string,
  unit: MeasureUnit,
  ingredient: FormulaIngredient,
  starterType: StarterType,
) {
  const amount = Math.max(toNumber(value), 0);
  return amount * gramsPerVolumeUnit(unit, ingredient, starterType);
}

function gramsToMeasure(
  grams: number,
  unit: MeasureUnit,
  ingredient: FormulaIngredient,
  starterType: StarterType,
) {
  return grams / gramsPerVolumeUnit(unit, ingredient, starterType);
}

function unitShortLabel(unit: MeasureUnit) {
  return (
    MEASURE_UNITS.find((option) => option.value === unit)?.shortLabel ?? unit
  );
}

function nearestCupFractionLabel(fractionalCups: number) {
  const exactMatch = CUP_FRACTIONS.find(
    (fraction) => Math.abs(fractionalCups - fraction.value) < 0.025,
  );

  if (exactMatch) {
    return { carry: 0, label: exactMatch.label };
  }

  if (fractionalCups <= 0.4) {
    return { carry: 0, label: "1/4" };
  }

  if (fractionalCups < 0.585) {
    return { carry: 0, label: "1/2" };
  }

  if (fractionalCups < 0.71) {
    return { carry: 0, label: "2/3" };
  }

  if (fractionalCups < 0.875) {
    return { carry: 0, label: "3/4" };
  }

  return { carry: 1, label: "" };
}

function formatCupMeasure(cups: number) {
  const safeCups = Math.max(cups, 0);
  const wholeCups = Math.floor(safeCups);
  const fractionalCups = safeCups - wholeCups;

  if (safeCups === 0) {
    return "0 cups";
  }

  if (fractionalCups < 0.025) {
    return `${wholeCups} ${wholeCups === 1 ? "cup" : "cups"}`;
  }

  const fraction = nearestCupFractionLabel(fractionalCups);
  const adjustedWholeCups = wholeCups + fraction.carry;

  if (!fraction.label) {
    return `${adjustedWholeCups} ${
      adjustedWholeCups === 1 ? "cup" : "cups"
    }`;
  }

  if (adjustedWholeCups === 0) {
    return `${fraction.label} cup`;
  }

  return `${adjustedWholeCups} ${fraction.label} cups`;
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
  return {
    label: `${cleanNumber(starter, 2)}:${cleanNumber(flour, 2)}:${cleanNumber(
      water,
      2,
    )}`,
    starter,
    flour,
    water,
  };
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
  const headerRef = useRef<HTMLElement | null>(null);
  const [mode, setMode] = useState<BuildMode>("flour");
  const [measureUnit, setMeasureUnit] = useState<MeasureUnit>("g");
  const [amount, setAmount] = useState("100");
  const [inoculation, setInoculation] = useState(25);
  const [customInoculation, setCustomInoculation] = useState("25");
  const [customRatio, setCustomRatio] = useState("1:4:4");
  const [advancedOpen, setAdvancedOpen] = useState(false);
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
  const amountIngredient: FormulaIngredient =
    mode === "flour" ? "flour" : "starter";
  const amountGrams = useMemo(
    () => measureToGrams(amount, measureUnit, amountIngredient, starterType),
    [amount, amountIngredient, measureUnit, starterType],
  );
  const activeClassicRatio = CLASSIC_RATIOS.find(
    (preset) =>
      Math.abs(ratioToInoculationPercent(preset) - inoculation) < 0.15 &&
      Math.abs((preset.water / preset.flour) * 100 - currentFeedHydration) <
        0.15,
  )?.label;
  const hasJarCapacity =
    jarCapacity.trim().length > 0 && jarCapacityGrams > 0;
  const outputDecimals = measureUnit === "oz" ? 2 : 0;
  const amountLabel =
    mode === "flour" ? "New flour to feed" : "Final starter amount";
  const customRatioError =
    customRatio.trim().length > 0 && !parseRatio(customRatio)
      ? "Use starter:flour:water, like 1:4:4."
      : "";
  const showVolumeNote = isVolumeUnit(measureUnit);

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

  function measuredAmount(grams: number, ingredient: FormulaIngredient) {
    const converted = gramsToMeasure(
      grams,
      measureUnit,
      ingredient,
      starterType,
    );
    const value =
      measureUnit === "cup"
        ? formatCupMeasure(converted)
        : `${formatDisplay(converted, outputDecimals)} ${unitShortLabel(
            measureUnit,
          )}`;

    return {
      detail: showVolumeNote
        ? `${formatDisplay(grams, 0)} g estimated`
        : undefined,
      value,
    };
  }

  const currentStarterHydration = starterHydrationPercent(
    starterType,
    customStarterHydration,
  );
  const starterHydrationFraction = currentStarterHydration / 100;
  const starterWaterContribution =
    starterHydrationFraction > 0
      ? results.starter *
        (starterHydrationFraction / (1 + starterHydrationFraction))
      : 0;
  const rawDisplayedWaterGrams = results.water - starterWaterContribution;
  const displayedWaterGrams = Math.max(rawDisplayedWaterGrams, 0);
  const starterCoversAllWater =
    results.water > 0 && rawDisplayedWaterGrams <= 0;

  const starterAmount = measuredAmount(results.starter, "starter");
  const flourAmount = measuredAmount(results.flour, "flour");
  const waterAmount = measuredAmount(displayedWaterGrams, "water");
  const finalTotalAmount = measuredAmount(results.finalTotal, "starter");
  const finalTotalDisplayValue =
    measureUnit === "cup"
      ? finalTotalAmount.value.replace(/ cups?$/, "")
      : finalTotalAmount.value.split(" ")[0];
  const finalTotalDisplayUnit =
    measureUnit === "cup"
      ? finalTotalAmount.value.endsWith(" cup")
        ? "cup"
        : "cups"
      : unitShortLabel(measureUnit);

  const flourishLeftRef = useRef<HTMLDivElement | null>(null);
  const flourishRightRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const header = headerRef.current;
    const flourishLeft = flourishLeftRef.current;
    const flourishRight = flourishRightRef.current;
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (motionQuery.matches) {
      return;
    }

    let scrollOffset = 0;
    let pointerX = 0;
    let pointerY = 0;
    let frame = 0;

    function apply() {
      frame = 0;
      if (header) {
        header.style.transform = `translate3d(${pointerX * 4}px, ${
          scrollOffset + pointerY * 2
        }px, 0)`;
      }
      if (flourishLeft) {
        flourishLeft.style.transform = `translate3d(${pointerX * -14}px, ${
          pointerY * -8
        }px, 0) rotate(${pointerX * -2}deg)`;
      }
      if (flourishRight) {
        flourishRight.style.transform = `scaleX(-1) translate3d(${
          pointerX * 14
        }px, ${pointerY * -8}px, 0) rotate(${pointerX * 2}deg)`;
      }
    }

    function schedule() {
      if (frame) return;
      frame = requestAnimationFrame(apply);
    }

    function onScroll() {
      scrollOffset = Math.min(window.scrollY * 0.4, 40);
      schedule();
    }

    function onPointerMove(event: PointerEvent) {
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      pointerX = (event.clientX / w) * 2 - 1;
      pointerY = (event.clientY / h) * 2 - 1;
      schedule();
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointerMove);
      if (frame) cancelAnimationFrame(frame);
      if (header) header.style.removeProperty("transform");
      if (flourishLeft) flourishLeft.style.removeProperty("transform");
      if (flourishRight) flourishRight.style.removeProperty("transform");
    };
  }, []);

  function changeMode(nextMode: BuildMode) {
    if (nextMode === mode) {
      return;
    }

    const nextIngredient = nextMode === "flour" ? "flour" : "starter";
    setAmount(
      cleanNumber(
        gramsToMeasure(amountGrams, measureUnit, nextIngredient, starterType),
        2,
      ),
    );
    setMode(nextMode);
  }

  function changeMeasureUnit(nextUnit: MeasureUnit) {
    if (nextUnit === measureUnit) {
      return;
    }

    setAmount(
      cleanNumber(
        gramsToMeasure(amountGrams, nextUnit, amountIngredient, starterType),
        2,
      ),
    );
    setMeasureUnit(nextUnit);
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
  }

  function updateInoculation(value: number) {
    const safeValue = Math.max(value, 0);
    setInoculation(safeValue);
    setCustomInoculation(cleanNumber(safeValue, 2));
    setCustomRatio(ratioEquivalentLabel(safeValue, currentFeedHydration));
  }

  function updateCustomInoculation(value: string) {
    setCustomInoculation(value);
    const safeValue = Math.max(toNumber(value), 0);
    setInoculation(safeValue);
    setCustomRatio(ratioEquivalentLabel(safeValue, currentFeedHydration));
  }

  function chooseFeedHydration(nextFeedHydration: FeedHydration) {
    setFeedHydration(nextFeedHydration);
    const nextFeedHydrationValue =
      nextFeedHydration === "custom"
        ? Math.max(toNumber(customFeedHydration), 0)
        : Number(nextFeedHydration);

    setCustomRatio(ratioEquivalentLabel(inoculation, nextFeedHydrationValue));
  }

  function updateCustomFeedHydration(value: string) {
    setCustomFeedHydration(value);
    setCustomRatio(
      ratioEquivalentLabel(inoculation, Math.max(toNumber(value), 0)),
    );
  }

  function selectRatio(ratio: RatioPreset) {
    const nextInoculation = ratioToInoculationPercent(ratio);

    setInoculation(nextInoculation);
    setCustomInoculation(cleanNumber(nextInoculation, 2));
    setCustomRatio(ratio.label);
  }

  function updateCustomRatio(value: string) {
    setCustomRatio(value);

    const ratio = parseRatio(value);
    if (ratio) {
      selectRatio(ratio);
    }
  }

  function updateStarterType(nextStarterType: StarterType) {
    if (
      mode === "total" &&
      isVolumeUnit(measureUnit) &&
      nextStarterType !== starterType
    ) {
      setAmount(
        cleanNumber(
          gramsToMeasure(
            amountGrams,
            measureUnit,
            "starter",
            nextStarterType,
          ),
          2,
        ),
      );
    }

    setStarterType(nextStarterType);

    if (nextStarterType === "liquid" && currentFeedHydration !== 100) {
      chooseFeedHydration("100");
    } else if (nextStarterType === "stiff" && currentFeedHydration !== 60) {
      chooseFeedHydration("60");
    }
  }

  function selectJarDefault(size: "small" | "large") {
    const value =
      jarUnit === "L"
        ? size === "small"
          ? "1"
          : "1.5"
        : jarUnit === "oz"
          ? size === "small"
            ? "32"
            : "48"
          : size === "small"
            ? "1000"
            : "1500";
    setJarCapacity(value);
    setJarCapacityGrams(jarToGrams(value, jarUnit));
  }

  return (
    <main className="starter-page min-h-screen text-[#3b2618]">
      <nav className="sjs-topnav">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
          <a
            className="sjs-topnav-back group flex items-center gap-2"
            href="https://southjerseysourdough.com"
          >
            <svg
              aria-hidden="true"
              className="sjs-topnav-arrow"
              fill="none"
              height="12"
              viewBox="0 0 14 12"
              width="14"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M13 6H1M1 6L6 1M1 6L6 11"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.6"
              />
            </svg>
            <span>southjerseysourdough.com</span>
          </a>
          <a
            className="sjs-topnav-shop"
            href="https://southjerseysourdough.com/collections"
          >
            Shop Starters
          </a>
        </div>
      </nav>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-6 sm:px-8 lg:px-12">
        <header
          className="starter-header relative space-y-4 pt-2 sm:pt-6"
          ref={headerRef}
        >
          <div
            aria-hidden="true"
            className="hero-flourish hero-flourish--left"
            ref={flourishLeftRef}
          >
            <WheatFlourish />
          </div>
          <div
            aria-hidden="true"
            className="hero-flourish hero-flourish--right"
            ref={flourishRightRef}
          >
            <WheatFlourish />
          </div>
          <p className="starter-eyebrow">South Jersey Sourdough</p>
          <div className="max-w-3xl space-y-3">
            <h1 className="display-heading text-5xl leading-[1.05] sm:text-6xl">
              Starter Feeding Calculator
            </h1>
            <p className="lede max-w-2xl text-lg leading-8 sm:text-xl">
              Build a feeding formula by flour amount or final starter weight,
              using familiar ratios with hydration, inoculation, and jar rise
              in view.
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
                  className="build-mode-toggle grid gap-2 rounded-md border border-[#c8a98c] bg-[#f4e6d7] p-1 sm:grid-cols-2"
                  data-mode={mode}
                  role="group"
                >
                  <SegmentButton
                    active={mode === "flour"}
                    helper="Use this when you know how much fresh flour you want to add."
                    label="Feed by flour amount"
                    onClick={() => changeMode("flour")}
                  />
                  <SegmentButton
                    active={mode === "total"}
                    helper="Use this when you know how much starter you want to end up with."
                    label="Build to final amount"
                    onClick={() => changeMode("total")}
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
                      {unitShortLabel(measureUnit)}
                    </span>
                  </div>
                </label>

                <div className="grid gap-2">
                  <label className="grid gap-2">
                    <span className="field-label">Unit</span>
                    <select
                      className="input-standard"
                      onChange={(event) =>
                        changeMeasureUnit(event.target.value as MeasureUnit)
                      }
                      value={measureUnit}
                    >
                      {MEASURE_UNITS.map((unit) => (
                        <option key={unit.value} value={unit.value}>
                          {unit.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {showVolumeNote ? (
                    <p className="text-sm font-semibold leading-6 text-[#76563e]">
                      Volume measurements are estimates. For best accuracy, use
                      grams.
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <span className="field-label">Feeding Ratio</span>
                  <p className="helper-copy max-w-xl text-sm leading-6 text-[#76563e]">
                    Ratio means starter : flour : water. This is the way most
                    bakers describe a feeding.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
                  {CLASSIC_RATIOS.map((preset) => {
                    const mappedInoculation =
                      ratioToInoculationPercent(preset);

                    return (
                      <button
                        className={`preset-control min-h-16 rounded-md border px-2 py-2 text-center transition ${
                          activeClassicRatio === preset.label
                            ? "starter-active-control shadow-sm"
                            : "border-dashed border-[#c8a98c] bg-[#fffaf4] text-[#4a2f1d] hover:border-[#8c5f3f] hover:bg-[#f4e6d7] hover:shadow-sm"
                        }`}
                        key={preset.label}
                        onClick={() => selectRatio(preset)}
                        type="button"
                      >
                        <span className="block text-lg font-bold">
                          {preset.label}
                        </span>
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
                    aria-describedby={
                      customRatioError ? "custom-ratio-error" : undefined
                    }
                    aria-invalid={customRatioError ? "true" : "false"}
                    aria-label="Custom ratio"
                    className="input-standard"
                    inputMode="decimal"
                    onChange={(event) => updateCustomRatio(event.target.value)}
                    placeholder="e.g. 1:3:5"
                    type="text"
                    value={customRatio}
                  />
                </label>
                {customRatioError ? (
                  <p
                    className="text-sm font-bold leading-6 text-[#8f321f]"
                    id="custom-ratio-error"
                  >
                    {customRatioError}
                  </p>
                ) : null}
                <p className="helper-copy text-sm font-semibold leading-6 text-[#76563e]">
                  Equivalent inoculation:{" "}
                  <span className="font-bold text-[#321f14]">
                    {formatDisplay(inoculation, 1)}%
                  </span>
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
                        onClick={() => updateStarterType(option.value)}
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
                        onClick={() => chooseFeedHydration(option.value)}
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
                          updateCustomFeedHydration(event.target.value)
                        }
                        type="text"
                        value={customFeedHydration}
                      />
                    </label>
                  ) : null}
                </div>
              </div>

              <details
                className="advanced-options rounded-lg border border-dotted border-[#d4b89f] bg-[#fff7ef] p-4"
                onToggle={(event) =>
                  setAdvancedOpen(event.currentTarget.open)
                }
                open={advancedOpen}
              >
                <summary className="advanced-summary field-label cursor-pointer list-none">
                  Advanced Options
                </summary>
                <div className="advanced-options-content mt-4 grid gap-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <span className="field-label">
                      Use inoculation percentage instead
                    </span>
                    <p className="helper-copy max-w-xl text-sm leading-6 text-[#76563e]">
                      Inoculation is the amount of mature starter compared to
                      the new flour. Lower percentages slow the build; higher
                      percentages speed it up.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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
                      onClick={() =>
                        updateInoculation(toNumber(customInoculation))
                      }
                    />
                  </div>

                  <label className="grid gap-2 sm:max-w-xs">
                    <span className="text-sm font-bold text-[#76563e]">
                      Custom inoculation
                    </span>
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
                  <p className="helper-copy text-sm font-semibold leading-6 text-[#76563e]">
                    Equivalent ratio at this feed hydration:{" "}
                    <span className="font-bold text-[#321f14]">
                      {equivalentRatio}
                    </span>
                  </p>
                </div>
              </details>

              <div className="grid gap-3">
                <div className="flex items-baseline justify-between gap-4">
                  <label className="field-label" htmlFor="room-temperature">
                    Room Temperature
                  </label>
                  <span className="temperature-value text-lg font-bold text-[#321f14]">
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
                  className="pace-note rounded-md px-4 py-3 text-sm font-semibold leading-6 text-[#6f4f39]"
                  id="pace-note"
                  key={fermentationNote}
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
                    onClick={() => selectJarDefault("small")}
                    type="button"
                  >
                    {jarUnit === "L"
                      ? "1L = 1000g"
                      : jarUnit === "oz"
                        ? "32oz ≈ 1000g"
                        : "1000g"}
                  </button>
                  <button
                    className="preset-control rounded-md border border-dashed border-[#c8a98c] bg-[#fffaf4] px-3 py-3 text-sm font-bold text-[#4a2f1d] transition hover:border-[#8c5f3f] hover:bg-[#f4e6d7]"
                    onClick={() => selectJarDefault("large")}
                    type="button"
                  >
                    {jarUnit === "L"
                      ? "1.5L = 1500g"
                      : jarUnit === "oz"
                        ? "48oz ≈ 1500g"
                        : "1500g"}
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

          <aside className="starter-result border border-[#c8a98c] p-5 transition sm:p-6">
            <GrainMark className="corner-mark corner-mark--tl" />
            <GrainMark className="corner-mark corner-mark--tr" />
            <GrainMark className="corner-mark corner-mark--bl" />
            <GrainMark className="corner-mark corner-mark--br" />
            <div className="relative flex h-full flex-col gap-5">
              <output
                aria-live="polite"
                className="final-weight-card rounded-lg border border-[#d5b69b] p-5"
              >
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8c5f3f]">
                  Final Starter Weight
                </p>
                <p className="mt-2 flex items-baseline gap-2 transition-all">
                  <span
                    className="hero-number result-value text-6xl sm:text-7xl"
                    key={finalTotalDisplayValue}
                  >
                    {finalTotalDisplayValue}
                  </span>
                  <span className="hero-unit text-2xl">
                    {finalTotalDisplayUnit}
                  </span>
                </p>
                {finalTotalAmount.detail ? (
                  <p className="mt-2 text-sm font-semibold text-[#76563e]">
                    {finalTotalAmount.detail}
                  </p>
                ) : null}
              </output>

              <div className="grid gap-2" aria-live="polite">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#8c5f3f]">
                  Feeding Formula
                </p>
                <ResultRow label="Ratio" prominent value={equivalentRatio} />
                <ResultRow
                  label="Inoculation"
                  value={`${formatDisplay(inoculation, 1)}%`}
                />
                <ResultRow
                  label="Starter"
                  detail={starterAmount.detail}
                  value={starterAmount.value}
                />
                <ResultRow
                  label="Flour"
                  detail={flourAmount.detail}
                  value={flourAmount.value}
                />
                <ResultRow
                  label="Water to Add"
                  detail={
                    starterCoversAllWater
                      ? "Starter provides sufficient hydration."
                      : waterAmount.detail
                  }
                  value={waterAmount.value}
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
                  detail={finalTotalAmount.detail}
                  value={finalTotalAmount.value}
                />
              </div>
              {showVolumeNote ? (
                <p className="rounded-md border border-dotted border-[#d7b99e] bg-[#fffaf4] px-3 py-2 text-sm font-semibold leading-6 text-[#6f4f39]">
                  Volume measurements are estimates. For best accuracy, use
                  grams.
                </p>
              ) : null}

              {hasJarCapacity ? (
                <div className="jar-fill-card grid gap-4 rounded-lg border border-dotted border-[#d6b99e] bg-[#fffaf4] p-4">
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

      </div>

      <footer className="sjs-footer">
        <div className="sjs-footer-inner mx-auto w-full max-w-6xl px-5 sm:px-8 lg:px-12">
          <div className="sjs-footer-grid">
            {/* Brand column */}
            <div className="sjs-footer-brand">
              <a
                className="sjs-footer-logo-link"
                href="https://southjerseysourdough.com"
                aria-label="South Jersey Sourdough — home"
              >
                <SJSJarIcon />
                <div>
                  <p className="sjs-footer-name">South Jersey<br />Sourdough</p>
                  <p className="sjs-footer-verse">John 6:35</p>
                </div>
              </a>
              <p className="sjs-footer-tagline">
                Handcrafted sourdough starters made with patience, tradition, and care.
              </p>
            </div>

            {/* Navigate column */}
            <div>
              <p className="sjs-footer-col-heading">Navigate</p>
              <ul className="sjs-footer-links">
                <li><a href="https://southjerseysourdough.com">Home</a></li>
                <li><a href="https://southjerseysourdough.com/collections">Shop</a></li>
                <li><a href="https://southjerseysourdough.com/pages/recipes">Recipes</a></li>
                <li><a href="https://southjerseysourdough.com/pages/instructions">Starter Guide</a></li>
                <li><a href="https://southjerseysourdough.com/pages/bakers-guide">The Baker's Guide</a></li>
                <li><a href="https://southjerseysourdough.com/pages/about">About</a></li>
                <li><a href="https://southjerseysourdough.com/pages/contact">Contact</a></li>
              </ul>
            </div>

            {/* Support column */}
            <div>
              <p className="sjs-footer-col-heading">Support</p>
              <ul className="sjs-footer-links">
                <li><a href="https://southjerseysourdough.com/pages/contact">Contact Us</a></li>
                <li><a href="https://southjerseysourdough.com/pages/starter-care">Starter Care</a></li>
                <li><a href="mailto:help@southjerseysourdough.com">help@southjerseysourdough.com</a></li>
              </ul>
            </div>

            {/* Policies column */}
            <div>
              <p className="sjs-footer-col-heading">Policies</p>
              <ul className="sjs-footer-links">
                <li><a href="https://southjerseysourdough.com/policies/shipping-policy">Shipping Policy</a></li>
                <li><a href="https://southjerseysourdough.com/policies/refund-policy">Refund Policy</a></li>
                <li><a href="https://southjerseysourdough.com/policies/privacy-policy">Privacy Policy</a></li>
                <li><a href="https://southjerseysourdough.com/policies/terms-of-service">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          <div className="sjs-footer-divider" aria-hidden="true">
            <span className="sjs-footer-ornament">✦ ❧ ✦</span>
          </div>

          <p className="sjs-footer-copy">
            © {new Date().getFullYear()} South Jersey Sourdough. Made with patience and flour.
          </p>
        </div>
      </footer>
    </main>
  );
}

function SegmentButton({
  active,
  helper,
  label,
  onClick,
}: {
  active: boolean;
  helper?: string;
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
      <span className="block">{label}</span>
      {helper ? (
        <span className="mt-1 block text-xs font-semibold leading-5 opacity-80">
          {helper}
        </span>
      ) : null}
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

function ResultRow({
  detail,
  label,
  prominent = false,
  value,
}: {
  detail?: string;
  label: string;
  prominent?: boolean;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-dotted border-[#d9bfa8] py-2 last:border-b-0">
      <span className="text-base font-semibold text-[#4a2f1d]">{label}</span>
      <span className="text-right transition-all">
        <span
          key={`${label}-${value}-${detail ?? ""}`}
          className={`block font-semibold text-[#321f14] ${
            prominent ? "result-value text-2xl" : "result-value text-lg"
          }`}
        >
          {value}
        </span>
        {detail ? (
          <span className="block text-xs font-semibold text-[#76563e]">
            {detail}
          </span>
        ) : null}
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
          className={`text-sm font-bold tabular-nums ${
            tone === "warning" ? "text-[#8f321f]" : "text-[#6f4f39]"
          }`}
        >
          {formatDisplay(percent, 0)}%
        </span>
      </div>
      <div className="jar-fill-track">
        <div
          className={`jar-fill-bar ${
            tone === "warning" ? "jar-fill-bar--warning" : ""
          }`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  );
}

function WheatFlourish() {
  return (
    <svg
      width="92"
      height="180"
      viewBox="0 0 92 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        {/* central stem */}
        <path d="M46 178 C 48 140, 44 100, 50 62 C 54 32, 50 14, 48 4" strokeWidth="1.4" />
        {/* grain pairs */}
        <g strokeWidth="1.2" fill="currentColor" fillOpacity="0.22">
          <ellipse cx="38" cy="22" rx="5" ry="9" transform="rotate(-22 38 22)" />
          <ellipse cx="58" cy="22" rx="5" ry="9" transform="rotate(22 58 22)" />
          <ellipse cx="34" cy="42" rx="5.5" ry="10" transform="rotate(-22 34 42)" />
          <ellipse cx="62" cy="42" rx="5.5" ry="10" transform="rotate(22 62 42)" />
          <ellipse cx="32" cy="64" rx="6" ry="11" transform="rotate(-22 32 64)" />
          <ellipse cx="64" cy="64" rx="6" ry="11" transform="rotate(22 64 64)" />
          <ellipse cx="34" cy="86" rx="6" ry="11" transform="rotate(-22 34 86)" />
          <ellipse cx="62" cy="86" rx="6" ry="11" transform="rotate(22 62 86)" />
        </g>
        {/* side leaves */}
        <path d="M46 118 C 28 122, 18 132, 14 148" strokeWidth="1.2" fill="none" />
        <path d="M46 128 C 64 132, 74 140, 80 154" strokeWidth="1.2" fill="none" />
        <path d="M46 142 C 32 146, 24 154, 22 168" strokeWidth="1.1" fill="none" />
        <path d="M46 150 C 60 154, 68 160, 72 172" strokeWidth="1.1" fill="none" />
        {/* tip whisker */}
        <path d="M48 4 L 48 -2" strokeWidth="1" />
        <path d="M48 8 L 42 -1" strokeWidth="0.9" />
        <path d="M48 8 L 54 -1" strokeWidth="0.9" />
      </g>
    </svg>
  );
}

function SJSJarIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="56"
      viewBox="0 0 48 60"
      width="48"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        {/* jar body */}
        <path
          d="M10 22 C 8 24 7 28 7 34 C 7 46 11 54 24 54 C 37 54 41 46 41 34 C 41 28 40 24 38 22 Z"
          fill="currentColor"
          fillOpacity="0.08"
          strokeWidth="1.4"
        />
        {/* neck */}
        <path d="M14 22 L 14 16 C 14 14 16 13 18 13 L 30 13 C 32 13 34 14 34 16 L 34 22" strokeWidth="1.3" />
        {/* lid */}
        <rect x="12" y="10" width="24" height="4" rx="2" fill="currentColor" fillOpacity="0.15" strokeWidth="1.3" />
        {/* bubbles */}
        <circle cx="20" cy="36" r="2.2" fill="currentColor" fillOpacity="0.3" stroke="none" />
        <circle cx="28" cy="30" r="1.5" fill="currentColor" fillOpacity="0.25" stroke="none" />
        <circle cx="24" cy="42" r="1.8" fill="currentColor" fillOpacity="0.2" stroke="none" />
        <circle cx="17" cy="44" r="1.2" fill="currentColor" fillOpacity="0.18" stroke="none" />
        <circle cx="31" cy="40" r="1.4" fill="currentColor" fillOpacity="0.22" stroke="none" />
        {/* shine */}
        <path d="M 13 28 C 13 26 15 24 17 24" strokeWidth="1" opacity="0.4" />
      </g>
    </svg>
  );
}

function GrainMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 22 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <g stroke="currentColor" strokeWidth="1" strokeLinecap="round" fill="currentColor" fillOpacity="0.25">
        <ellipse cx="6" cy="6" rx="2.2" ry="3.6" transform="rotate(-30 6 6)" />
        <path d="M11 11 L 19 19" stroke="currentColor" strokeWidth="0.9" fill="none" />
        <path d="M9 13 L 13 17" stroke="currentColor" strokeWidth="0.7" fill="none" />
      </g>
    </svg>
  );
}
