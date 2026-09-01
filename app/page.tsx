import Link from "next/link";
import { Gauge, Network, ListChecks } from "lucide-react";
import { LandingHero } from "@/components/LandingHero";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-ink bg-instrument-grid">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-signal-cyan/10 text-signal-cyan">
            <Gauge size={16} strokeWidth={2.5} />
          </div>
          <span className="font-display text-sm font-semibold text-text-high">GEO Health</span>
        </div>
        <Link href="/overview" className="text-xs text-text-mid hover:text-text-high">
          View demo dashboard →
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-24 pt-16 text-center">
        <h1 className="font-display text-4xl font-semibold leading-tight text-text-high sm:text-5xl">
          Is your business <span className="text-signal-cyan">legible</span> to AI?
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-text-mid">
          ChatGPT, Perplexity, and AI Overviews read your site differently than a search engine does. GEO Health scores how clearly they
          can find, understand, and cite your business — then generates the fixes.
        </p>

        <div className="mt-10">
          <LandingHero />
        </div>

        <div className="mt-20 grid grid-cols-1 gap-4 text-left sm:grid-cols-3">
          <FeatureCard
            icon={Gauge}
            title="9 GEO KPIs"
            body="Entity clarity, answer readiness, structured data, and six more — each broken into evidence-backed components, never a guessed number."
          />
          <FeatureCard
            icon={Network}
            title="Knowledge graph"
            body="See exactly what an AI model could extract about your business: entities, relationships, and how confidently each was found."
          />
          <FeatureCard
            icon={ListChecks}
            title="Ready-to-use fixes"
            body="Every gap becomes a concrete fix — JSON-LD, FAQ copy, or an outline — ranked by impact and effort."
          />
        </div>
      </main>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, body }: { icon: typeof Gauge; title: string; body: string }) {
  return (
    <div className="rounded-lg border border-ink-line bg-ink-panel p-4">
      <Icon size={18} className="text-signal-cyan" />
      <h3 className="mt-2 font-display text-sm font-medium text-text-high">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-text-mid">{body}</p>
    </div>
  );
}
