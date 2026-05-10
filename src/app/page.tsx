"use client";

import { useMemo, useState } from "react";

type Ratio = {
  starter: number;
  flour: number;
  water: number;
};

type WeightUnit = "g" | "oz";
type JarUnit = "g" | "oz" | "L";

const GRAMS_PER_OUNCE = 28.349523125;
const GRAMS_PER_LITER = 1000;

const PRESET_RATIOS: Array<{ label: string; ratio: Ratio }> = [
  { label: "1:1:1", ratio: { starter: 1, flour: 1, water: 1 } },
  { label: "1:2:2", ratio: { starter: 1, flour: 2, water: 2 } },
  { label: "1:3:3", ratio: { starter: 1, flour: 3, water: 3 } },
  { label: "1:5:5", ratio: { starter: 1, flour: 5, water: 5 } },
  { label: "1:10:10", ratio: { starter: 1, flour: 10, water: 10 } },
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

function parseRatio(value: string): Ratio | null {
  const parts = value
    .trim()
    .split(":")
    .map((part) => part.trim());

  if (parts.length !== 3 || parts.some((part) => part.length === 0)) {
    return null;
  }

  const [starter, flour, water] = parts.map(Number);

  if (
    !Number.isFinite(starter) ||
    !Number.isFinite(flour) ||
    !Number.isFinite(water) ||
    starter <= 0 ||
    flour <= 0 ||
    water <= 0
  ) {
    return null;
  }

  return { starter, flour, water };
}

function ratiosMatch(first: Ratio, second: Ratio) {
  return (
    Math.abs(first.starter - second.starter) < 0.0001 &&
    Math.abs(first.flour - second.flour) < 0.0001 &&
    Math.abs(first.water - second.water) < 0.0001
  );
}

function ratioLabel(ratio: Ratio) {
  return `${cleanNumber(ratio.starter)}:${cleanNumber(ratio.flour)}:${cleanNumber(
    ratio.water,
  )}`;
}

export default function Home() {
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("g");
  const [starterAmount, setStarterAmount] = useState("25");
  const [starterGrams, setStarterGrams] = useState(25);
  const [jarCapacity, setJarCapacity] = useState("1");
  const [jarUnit, setJarUnit] = useState<JarUnit>("L");
  const [jarCapacityGrams, setJarCapacityGrams] = useState(1000);
  const [ratio, setRatio] = useState<Ratio>({ starter: 1, flour: 2, water: 2 });
  const [customOpen, setCustomOpen] = useState(false);
  const [customRatio, setCustomRatio] = useState("1:2:2");

  const hasJarCapacity =
    jarCapacity.trim().length > 0 && jarCapacityGrams > 0;
  const activePreset = PRESET_RATIOS.find((preset) =>
    ratiosMatch(preset.ratio, ratio),
  )?.label;
  const parsedCustomRatio = parseRatio(customRatio);
  const customRatioInvalid =
    customOpen && customRatio.trim().length > 0 && parsedCustomRatio === null;

  const results = useMemo(() => {
    const flour = starterGrams * (ratio.flour / ratio.starter);
    const water = starterGrams * (ratio.water / ratio.starter);
    const total = starterGrams + flour + water;

    return { flour, water, total };
  }, [ratio, starterGrams]);

  const capacityUsed = hasJarCapacity
    ? (results.total / jarCapacityGrams) * 100
    : 0;
  const isOverCapacity = hasJarCapacity && results.total > jarCapacityGrams;
  const outputDecimals = weightUnit === "oz" ? 2 : 1;
  const outputUnit = weightUnit;

  function changeWeightUnit(nextUnit: WeightUnit) {
    if (nextUnit === weightUnit) {
      return;
    }

    setStarterAmount(cleanNumber(gramsToWeight(starterGrams, nextUnit), 2));
    setWeightUnit(nextUnit);
  }

  function changeJarUnit(nextUnit: JarUnit) {
    if (nextUnit === jarUnit) {
      return;
    }

    setJarCapacity(cleanNumber(gramsToJar(jarCapacityGrams, nextUnit), 2));
    setJarUnit(nextUnit);
  }

  function selectPreset(preset: { label: string; ratio: Ratio }) {
    setRatio(preset.ratio);
    setCustomRatio(preset.label);
    setCustomOpen(false);
  }

  function updateCustomRatio(value: string) {
    setCustomRatio(value);

    const parsed = parseRatio(value);
    if (parsed) {
      setRatio(parsed);
    }
  }

  function selectJarDefault(liters: "1" | "1.5") {
    setJarUnit("L");
    setJarCapacity(liters);
    setJarCapacityGrams(jarToGrams(liters, "L"));
  }

  return (
    <main className="min-h-screen bg-[#f5f0eb] px-5 py-6 text-[#3b2618] sm:px-8 lg:px-12">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="space-y-3 pt-2 sm:pt-6">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#8c5f3f]">
            South Jersey Sourdough
          </p>
          <div className="max-w-3xl space-y-3">
            <h1 className="text-4xl font-semibold leading-tight text-[#321f14] sm:text-5xl">
              Starter Feeding Calculator
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-[#6f4f39]">
              Dial in your feeding ratio and keep your jar right where you want
              it.
            </p>
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="rounded-lg border border-dashed border-[#b28a68] bg-[#fffaf4]/85 p-5 shadow-[0_18px_60px_rgba(69,43,24,0.08)] sm:p-6">
            <div className="grid gap-5">
              <label className="grid gap-2">
                <span className="text-sm font-bold uppercase tracking-[0.16em] text-[#7a563d]">
                  Starter to keep
                </span>
                <div className="relative">
                  <input
                    className="h-14 w-full rounded-md border border-[#d8c4b2] bg-[#fffcf8] px-4 pr-16 text-3xl font-semibold text-[#321f14] outline-none transition focus:border-[#9b6a45] focus:ring-4 focus:ring-[#b7794b]/15"
                    inputMode="decimal"
                    onChange={(event) => {
                      setStarterAmount(event.target.value);
                      setStarterGrams(
                        weightToGrams(event.target.value, weightUnit),
                      );
                    }}
                    type="text"
                    value={starterAmount}
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lg font-bold text-[#8c6b54]">
                    {outputUnit}
                  </span>
                </div>
              </label>

              <div className="grid gap-2">
                <span className="text-sm font-bold uppercase tracking-[0.16em] text-[#7a563d]">
                  Weight unit
                </span>
                <div
                  aria-label="Weight unit"
                  className="grid grid-cols-2 rounded-md border border-[#c8a98c] bg-[#f4e6d7] p-1"
                  role="group"
                >
                  <UnitButton
                    active={weightUnit === "g"}
                    label="Grams"
                    onClick={() => changeWeightUnit("g")}
                  />
                  <UnitButton
                    active={weightUnit === "oz"}
                    label="US Standard (oz)"
                    onClick={() => changeWeightUnit("oz")}
                  />
                </div>
              </div>

              <div className="grid gap-3">
                <span className="text-sm font-bold uppercase tracking-[0.16em] text-[#7a563d]">
                  Feeding ratio
                </span>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {PRESET_RATIOS.map((preset) => (
                    <button
                      className={`min-h-11 rounded-md border px-2 text-base font-bold transition ${
                        activePreset === preset.label
                          ? "starter-active-control shadow-sm"
                          : "border-dashed border-[#c8a98c] bg-[#fffaf4] text-[#4a2f1d] hover:border-[#8c5f3f] hover:bg-[#f4e6d7]"
                      }`}
                      key={preset.label}
                      onClick={() => selectPreset(preset)}
                      type="button"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-dotted border-[#c9aa90] bg-[#fbf2e8]">
                <button
                  aria-expanded={customOpen}
                  className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm font-bold uppercase tracking-[0.16em] text-[#7a563d]"
                  onClick={() => setCustomOpen((open) => !open)}
                  type="button"
                >
                  <span>Custom ratio</span>
                  <span
                    aria-hidden="true"
                    className={`text-lg transition-transform ${
                      customOpen ? "rotate-90" : ""
                    }`}
                  >
                    ▸
                  </span>
                </button>

                {customOpen ? (
                  <div className="grid gap-2 border-t border-dotted border-[#d4b89f] px-4 pb-4 pt-3">
                    <label className="grid gap-2">
                      <span className="sr-only">Custom ratio value</span>
                      <input
                        aria-invalid={customRatioInvalid}
                        className={`h-12 w-full rounded-md border bg-[#fffcf8] px-4 text-xl font-semibold text-[#321f14] outline-none transition focus:ring-4 ${
                          customRatioInvalid
                            ? "border-[#b45335] focus:border-[#b45335] focus:ring-[#b45335]/15"
                            : "border-[#d8c4b2] focus:border-[#9b6a45] focus:ring-[#b7794b]/15"
                        }`}
                        inputMode="decimal"
                        onChange={(event) =>
                          updateCustomRatio(event.target.value)
                        }
                        type="text"
                        value={customRatio}
                      />
                    </label>
                    <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-semibold text-[#80624a]">
                        starter : flour : water
                      </p>
                      {customRatioInvalid ? (
                        <p className="font-semibold text-[#b45335]">
                          Use three positive numbers, like 1:3:3.
                        </p>
                      ) : parsedCustomRatio ? (
                        <p className="font-semibold text-[#6f4f39]">
                          Applying {ratioLabel(parsedCustomRatio)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="grid gap-3">
                <div className="flex items-end justify-between gap-3">
                  <label className="grid flex-1 gap-2">
                    <span className="text-sm font-bold uppercase tracking-[0.16em] text-[#7a563d]">
                      Jar capacity
                    </span>
                    <input
                      className="h-13 w-full rounded-md border border-[#d8c4b2] bg-[#fffcf8] px-4 text-2xl font-semibold text-[#321f14] outline-none transition focus:border-[#9b6a45] focus:ring-4 focus:ring-[#b7794b]/15"
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
                  <div className="grid w-32 gap-2">
                    <span className="text-sm font-bold uppercase tracking-[0.16em] text-[#7a563d]">
                      Unit
                    </span>
                    <select
                      aria-label="Jar capacity unit"
                      className="h-13 rounded-md border border-[#d8c4b2] bg-[#fffcf8] px-3 text-lg font-bold text-[#321f14] outline-none transition focus:border-[#9b6a45] focus:ring-4 focus:ring-[#b7794b]/15"
                      onChange={(event) =>
                        changeJarUnit(event.target.value as JarUnit)
                      }
                      value={jarUnit}
                    >
                      <option value="g">g</option>
                      <option value="oz">oz</option>
                      <option value="L">L</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    className="rounded-md border border-dashed border-[#c8a98c] bg-[#fffaf4] px-3 py-2 text-sm font-bold text-[#4a2f1d] transition hover:border-[#8c5f3f] hover:bg-[#f4e6d7]"
                    onClick={() => selectJarDefault("1")}
                    type="button"
                  >
                    1L = 1000g
                  </button>
                  <button
                    className="rounded-md border border-dashed border-[#c8a98c] bg-[#fffaf4] px-3 py-2 text-sm font-bold text-[#4a2f1d] transition hover:border-[#8c5f3f] hover:bg-[#f4e6d7]"
                    onClick={() => selectJarDefault("1.5")}
                    type="button"
                  >
                    1.5L = 1500g
                  </button>
                </div>
              </div>
            </div>
          </div>

          <aside
            className={`rounded-lg border border-dashed p-5 shadow-[0_18px_60px_rgba(69,43,24,0.08)] transition sm:p-6 ${
              isOverCapacity
                ? "border-[#b45335] bg-[#fff5ed]"
                : "border-[#b28a68] bg-[#fffaf4]"
            }`}
          >
            <div className="flex h-full flex-col gap-5">
              <div className="rounded-lg border border-dotted border-[#c9aa90] bg-[#fbf2e8] p-4">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#8c5f3f]">
                  Total after feeding
                </p>
                <p className="mt-2 text-6xl font-semibold tracking-normal text-[#321f14]">
                  {formatDisplay(
                    gramsToWeight(results.total, outputUnit),
                    outputDecimals,
                  )}
                  <span className="ml-2 text-2xl text-[#76563e]">
                    {outputUnit}
                  </span>
                </p>
              </div>

              <div className="grid gap-2">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#8c5f3f]">
                  Feeding receipt
                </p>
                <ResultRow
                  label="Starter"
                  unit={outputUnit}
                  value={gramsToWeight(starterGrams, outputUnit)}
                  valueDecimals={outputDecimals}
                />
                <ResultRow
                  label="Flour"
                  unit={outputUnit}
                  value={gramsToWeight(results.flour, outputUnit)}
                  valueDecimals={outputDecimals}
                />
                <ResultRow
                  label="Water"
                  unit={outputUnit}
                  value={gramsToWeight(results.water, outputUnit)}
                  valueDecimals={outputDecimals}
                />
              </div>

              {hasJarCapacity ? (
                <div className="grid gap-3 rounded-lg border border-dotted border-[#d9bfa8] bg-[#fffcf8] p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#8c5f3f]">
                      Jar fill
                    </p>
                    <p
                      className={`text-sm font-bold ${
                        isOverCapacity ? "text-[#b45335]" : "text-[#6f4f39]"
                      }`}
                    >
                      {formatDisplay(capacityUsed, 0)}%
                    </p>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-[#e7d5c2]">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isOverCapacity ? "bg-[#b45335]" : "bg-[#8d704d]"
                      }`}
                      style={{ width: `${Math.min(capacityUsed, 100)}%` }}
                    />
                  </div>
                  <p
                    className={`text-sm font-semibold ${
                      isOverCapacity ? "text-[#b45335]" : "text-[#6f4f39]"
                    }`}
                  >
                    {isOverCapacity
                      ? `Total exceeds jar capacity by ${formatDisplay(
                          gramsToWeight(
                            results.total - jarCapacityGrams,
                            outputUnit,
                          ),
                          outputDecimals,
                        )} ${outputUnit}.`
                      : `Total uses ${formatDisplay(
                          capacityUsed,
                          0,
                        )}% of your jar capacity.`}
                  </p>
                </div>
              ) : (
                <p className="text-sm font-semibold text-[#6f4f39]">
                  Enter a jar capacity to check fill level.
                </p>
              )}
            </div>
          </aside>
        </section>

        <footer className="border-t border-dotted border-[#c9aa90] py-4 text-center text-sm font-semibold uppercase tracking-[0.22em] text-[#7a563d]">
          South Jersey Sourdough
        </footer>
      </div>
    </main>
  );
}

function UnitButton({
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

function ResultRow({
  label,
  unit,
  value,
  valueDecimals,
}: {
  label: string;
  unit: WeightUnit;
  value: number;
  valueDecimals: number;
}) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-dotted border-[#d9bfa8] py-2 last:border-b-0">
      <span className="text-lg font-semibold text-[#4a2f1d]">{label}</span>
      <span className="text-2xl font-semibold text-[#321f14]">
        {formatDisplay(value, valueDecimals)}
        <span className="ml-1 text-base text-[#76563e]">{unit}</span>
      </span>
    </div>
  );
}
