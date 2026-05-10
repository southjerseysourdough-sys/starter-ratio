"use client";

import { useMemo, useState } from "react";

type Ratio = {
  starter: number;
  flour: number;
  water: number;
};

const PRESET_RATIOS: Array<{ label: string; ratio: Ratio }> = [
  { label: "1:1:1", ratio: { starter: 1, flour: 1, water: 1 } },
  { label: "1:2:2", ratio: { starter: 1, flour: 2, water: 2 } },
  { label: "1:3:3", ratio: { starter: 1, flour: 3, water: 3 } },
  { label: "1:5:5", ratio: { starter: 1, flour: 5, water: 5 } },
];

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatGrams(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value < 10 ? 1 : 0,
  }).format(Math.max(value, 0));
}

export default function Home() {
  const [starterAmount, setStarterAmount] = useState("25");
  const [jarCapacity, setJarCapacity] = useState("500");
  const [ratio, setRatio] = useState<Ratio>({ starter: 1, flour: 2, water: 2 });

  const starter = Math.max(toNumber(starterAmount), 0);
  const jar = Math.max(toNumber(jarCapacity), 0);
  const hasJarCapacity = jarCapacity.trim().length > 0 && jar > 0;
  const activePreset = PRESET_RATIOS.find(
    (preset) =>
      preset.ratio.starter === ratio.starter &&
      preset.ratio.flour === ratio.flour &&
      preset.ratio.water === ratio.water,
  )?.label;

  const results = useMemo(() => {
    const starterParts = ratio.starter > 0 ? ratio.starter : 1;
    const flour = starter * (Math.max(ratio.flour, 0) / starterParts);
    const water = starter * (Math.max(ratio.water, 0) / starterParts);
    const total = starter + flour + water;

    return { flour, water, total };
  }, [ratio, starter]);

  const capacityUsed = hasJarCapacity ? (results.total / jar) * 100 : 0;
  const isOverCapacity = hasJarCapacity && results.total > jar;

  function updateRatio(part: keyof Ratio, value: string) {
    setRatio((current) => ({
      ...current,
      [part]: Math.max(toNumber(value), part === "starter" ? 0.1 : 0),
    }));
  }

  return (
    <main className="min-h-screen bg-[#f5f0eb] px-5 py-8 text-[#3b2618] sm:px-8 lg:px-12">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="space-y-4 pt-2 sm:pt-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#8c5f3f]">
            South Jersey Sourdough
          </p>
          <div className="max-w-3xl space-y-4">
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
          <div className="rounded-lg border border-dashed border-[#b28a68] bg-[#fffaf4]/85 p-5 shadow-[0_18px_60px_rgba(69,43,24,0.08)] sm:p-7">
            <div className="grid gap-6">
              <label className="grid gap-2">
                <span className="text-sm font-bold uppercase tracking-[0.16em] text-[#7a563d]">
                  Starter to keep
                </span>
                <div className="relative">
                  <input
                    className="h-16 w-full rounded-md border border-[#d8c4b2] bg-[#fffcf8] px-4 pr-14 text-3xl font-semibold text-[#321f14] outline-none transition focus:border-[#9b6a45] focus:ring-4 focus:ring-[#b7794b]/15"
                    inputMode="decimal"
                    min="0"
                    onChange={(event) => setStarterAmount(event.target.value)}
                    type="number"
                    value={starterAmount}
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lg font-bold text-[#8c6b54]">
                    g
                  </span>
                </div>
              </label>

              <div className="grid gap-3">
                <span className="text-sm font-bold uppercase tracking-[0.16em] text-[#7a563d]">
                  Feeding ratio
                </span>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {PRESET_RATIOS.map((preset) => (
                    <button
                      className={`min-h-12 rounded-md border px-3 text-base font-bold transition ${
                        activePreset === preset.label
                          ? "border-[#70462b] bg-[#70462b] text-[#fffaf4] shadow-sm"
                          : "border-dashed border-[#c8a98c] bg-[#fffaf4] text-[#4a2f1d] hover:border-[#8c5f3f] hover:bg-[#f4e6d7]"
                      }`}
                      key={preset.label}
                      onClick={() => setRatio(preset.ratio)}
                      type="button"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <fieldset className="grid gap-3 rounded-lg border border-dotted border-[#c9aa90] bg-[#fbf2e8] p-4">
                <legend className="px-2 text-sm font-bold uppercase tracking-[0.16em] text-[#7a563d]">
                  Custom ratio
                </legend>
                <div className="grid min-w-0 grid-cols-3 gap-3">
                  <RatioInput
                    label="Starter"
                    onChange={(value) => updateRatio("starter", value)}
                    value={ratio.starter}
                  />
                  <RatioInput
                    label="Flour"
                    onChange={(value) => updateRatio("flour", value)}
                    value={ratio.flour}
                  />
                  <RatioInput
                    label="Water"
                    onChange={(value) => updateRatio("water", value)}
                    value={ratio.water}
                  />
                </div>
              </fieldset>

              <label className="grid gap-2">
                <span className="text-sm font-bold uppercase tracking-[0.16em] text-[#7a563d]">
                  Jar capacity
                </span>
                <div className="relative">
                  <input
                    className="h-14 w-full rounded-md border border-[#d8c4b2] bg-[#fffcf8] px-4 pr-14 text-2xl font-semibold text-[#321f14] outline-none transition focus:border-[#9b6a45] focus:ring-4 focus:ring-[#b7794b]/15"
                    inputMode="decimal"
                    min="0"
                    onChange={(event) => setJarCapacity(event.target.value)}
                    placeholder="Optional"
                    type="number"
                    value={jarCapacity}
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-base font-bold text-[#8c6b54]">
                    g
                  </span>
                </div>
              </label>
            </div>
          </div>

          <aside className="rounded-lg border border-dashed border-[#b28a68] bg-[#fffaf4] p-5 shadow-[0_18px_60px_rgba(69,43,24,0.08)] sm:p-7">
            <div className="flex h-full flex-col gap-6">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#8c5f3f]">
                  Feed with
                </p>
                <div className="mt-4 grid gap-3">
                  <ResultRow label="Starter" value={starter} />
                  <ResultRow label="Flour" value={results.flour} />
                  <ResultRow label="Water" value={results.water} />
                </div>
              </div>

              <div className="rounded-lg border border-dotted border-[#c9aa90] bg-[#fbf2e8] p-4">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#8c5f3f]">
                  Total after feeding
                </p>
                <p className="mt-2 text-5xl font-semibold tracking-normal text-[#321f14]">
                  {formatGrams(results.total)}
                  <span className="ml-2 text-2xl text-[#76563e]">g</span>
                </p>
              </div>

              {hasJarCapacity ? (
                <div className="grid gap-3">
                  <div className="h-3 overflow-hidden rounded-full bg-[#e7d5c2]">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isOverCapacity ? "bg-[#a4452f]" : "bg-[#8d704d]"
                      }`}
                      style={{ width: `${Math.min(capacityUsed, 100)}%` }}
                    />
                  </div>
                  <p
                    className={`text-sm font-semibold ${
                      isOverCapacity ? "text-[#a4452f]" : "text-[#6f4f39]"
                    }`}
                  >
                    {isOverCapacity
                      ? `Over jar capacity by ${formatGrams(results.total - jar)} g`
                      : `${formatGrams(capacityUsed)}% of jar capacity`}
                  </p>
                </div>
              ) : (
                <p className="text-sm font-semibold text-[#6f4f39]">
                  Add a jar capacity for a fill warning.
                </p>
              )}
            </div>
          </aside>
        </section>

        <footer className="border-t border-dotted border-[#c9aa90] py-5 text-center text-sm font-semibold uppercase tracking-[0.22em] text-[#7a563d]">
          South Jersey Sourdough
        </footer>
      </div>
    </main>
  );
}

function RatioInput({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: number;
}) {
  return (
    <label className="grid min-w-0 gap-2">
      <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#7a563d]">
        {label}
      </span>
      <input
        className="h-12 w-full min-w-0 rounded-md border border-[#d8c4b2] bg-[#fffcf8] px-3 text-center text-xl font-bold text-[#321f14] outline-none transition focus:border-[#9b6a45] focus:ring-4 focus:ring-[#b7794b]/15"
        inputMode="decimal"
        min="0"
        onChange={(event) => onChange(event.target.value)}
        step="0.1"
        type="number"
        value={value}
      />
    </label>
  );
}

function ResultRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-dotted border-[#d9bfa8] pb-3">
      <span className="text-lg font-semibold text-[#4a2f1d]">{label}</span>
      <span className="text-3xl font-semibold text-[#321f14]">
        {formatGrams(value)}
        <span className="ml-1 text-lg text-[#76563e]">g</span>
      </span>
    </div>
  );
}
