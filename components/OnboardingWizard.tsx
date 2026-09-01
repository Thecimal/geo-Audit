"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight } from "lucide-react";
import type { BusinessProfileData } from "@/lib/scoring/types";

export function OnboardingWizard({ profile, url }: { profile: BusinessProfileData; url: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [checkedServices, setCheckedServices] = useState<Set<string>>(new Set(profile.services.value));

  const toggleService = (s: string) => {
    setCheckedServices((prev) => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  };

  const steps = ["We found your business", "Confirm your services", "You're set"];

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-8 flex items-center gap-2">
        {steps.map((label, i) => (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-data text-[11px] ${
                i < step ? "bg-signal-cyan text-ink" : i === step ? "border border-signal-cyan text-signal-cyan" : "border border-ink-line text-text-low"
              }`}
            >
              {i < step ? <Check size={12} /> : i + 1}
            </div>
            {i < steps.length - 1 && <div className={`h-px flex-1 ${i < step ? "bg-signal-cyan" : "bg-ink-line"}`} />}
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-ink-line bg-ink-panel p-6">
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-text-high">We found your business</h2>
              <p className="mt-1 text-sm text-text-mid">Crawled from {url.replace(/^https?:\/\//, "")}. Everything here is editable — confirm or adjust.</p>
            </div>
            <LabeledInput label="Company name" defaultValue={profile.companyName.value} />
            <LabeledInput label="Tagline" defaultValue={profile.tagline.value} />
            <LabeledTextarea label="Description" defaultValue={profile.description.value} />
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-text-high">Confirm your services</h2>
              <p className="mt-1 text-sm text-text-mid">We detected these from your site. Uncheck anything that's not accurate.</p>
            </div>
            <div className="space-y-2">
              {profile.services.value.map((s) => (
                <label key={s} className="flex items-center gap-2.5 rounded-md border border-ink-line bg-ink-surface px-3 py-2.5 text-sm text-text-high">
                  <input
                    type="checkbox"
                    checked={checkedServices.has(s)}
                    onChange={() => toggleService(s)}
                    className="h-4 w-4 accent-signal-cyan"
                  />
                  {s}
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-signal-cyan/10 text-signal-cyan">
              <Check size={22} />
            </div>
            <h2 className="font-display text-lg font-semibold text-text-high">You're set</h2>
            <p className="text-sm text-text-mid">Your GEO Health dashboard is ready.</p>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={() => (step < 2 ? setStep(step + 1) : router.push("/overview"))}
            className="flex items-center gap-1.5 rounded-md bg-signal-cyan px-4 py-2 text-sm font-medium text-ink hover:opacity-90"
          >
            {step < 2 ? "Continue" : "Go to dashboard"}
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function LabeledInput({ label, defaultValue }: { label: string; defaultValue: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-text-low">{label}</label>
      <input defaultValue={defaultValue} className="w-full rounded-md border border-ink-line bg-ink-surface px-3 py-2 text-sm text-text-high" />
    </div>
  );
}

function LabeledTextarea({ label, defaultValue }: { label: string; defaultValue: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-text-low">{label}</label>
      <textarea
        defaultValue={defaultValue}
        rows={3}
        className="w-full rounded-md border border-ink-line bg-ink-surface px-3 py-2 text-sm text-text-high"
      />
    </div>
  );
}
