import "server-only";
import type { DerivedIssue } from "../recommendations";
import type { ProjectData } from "../scoring/types";

export type SolutionKind = "JSON_LD" | "COPY" | "FAQ" | "OUTLINE" | "TECHNICAL_FIX";

export interface GeneratedSolution {
  kind: SolutionKind;
  title: string;
  body: string;
}

const KIND_BY_COMPONENT: Record<string, SolutionKind> = {
  "organization-schema": "JSON_LD",
  "product-service-schema": "JSON_LD",
  "faq-howto-schema": "JSON_LD",
  "jsonld-present": "JSON_LD",
  "logo-schema": "JSON_LD",
  "faq-content": "FAQ",
  "question-headings": "FAQ",
  description: "COPY",
  "clear-vp": "COPY",
  positioning: "COPY",
  "about-page": "OUTLINE",
  "content-depth": "OUTLINE",
  chunking: "OUTLINE",
};

function kindFor(componentKey: string): SolutionKind {
  return KIND_BY_COMPONENT[componentKey] ?? "TECHNICAL_FIX";
}

/**
 * Deterministic, template-based fallback. Grounded in the same crawl
 * evidence + KnowledgeProfile fields a live LLM prompt uses (see
 * `buildPrompt` below). Used whenever ANTHROPIC_API_KEY isn't set, or the
 * live call fails for any reason, so the product always returns a solution.
 */
function generateTemplateSolution(issue: DerivedIssue, project: ProjectData): GeneratedSolution {
  const kind = kindFor(issue.componentKey);
  const companyName = project.businessProfile.companyName.value || "Your business";

  switch (issue.componentKey) {
    case "organization-schema":
    case "jsonld-present":
    case "logo-schema":
      return {
        kind: "JSON_LD",
        title: `Organization JSON-LD for ${companyName}`,
        body: JSON.stringify(
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: companyName,
            url: project.projectUrl,
            description: project.businessProfile.description.value || undefined,
            logo: `${project.projectUrl.replace(/\/$/, "")}/logo.png`,
            sameAs: project.businessProfile.socialProfiles.value || [],
          },
          null,
          2
        ),
      };

    case "product-service-schema": {
      const services = project.businessProfile.services.value?.length
        ? project.businessProfile.services.value
        : ["Primary service"];
      return {
        kind: "JSON_LD",
        title: `Service schema for ${companyName}`,
        body: JSON.stringify(
          services.map((s) => ({
            "@context": "https://schema.org",
            "@type": "Service",
            name: s,
            provider: { "@type": "Organization", name: companyName },
          })),
          null,
          2
        ),
      };
    }

    case "faq-howto-schema":
    case "faq-content":
      return {
        kind: "FAQ",
        title: `FAQ content for ${companyName}`,
        body: [
          `## Frequently asked questions`,
          ``,
          `**What does ${companyName} do?**`,
          project.businessProfile.description.value || "Describe the core offering in one or two sentences.",
          ``,
          `**Who is ${companyName} for?**`,
          project.businessProfile.targetAudience.value || "Describe the ideal customer.",
          ``,
          `**How is ${companyName} different?**`,
          project.businessProfile.valueProposition.value || "State the one thing that sets you apart.",
        ].join("\n"),
      };

    case "question-headings":
      return {
        kind: "FAQ",
        title: "Rewritten headings, phrased as questions",
        body: issue.evidence
          .map((e) => e)
          .concat([
            `Consider rewriting section headings as direct questions, e.g. "How does ${companyName} handle onboarding?" instead of "Onboarding".`,
          ])
          .join("\n"),
      };

    case "description":
    case "clear-vp":
    case "positioning":
      return {
        kind: "COPY",
        title: `Homepage description for ${companyName}`,
        body: `${companyName} helps ${project.businessProfile.targetAudience.value || "[target audience]"} ${
          project.businessProfile.valueProposition.value
            ? `by ${project.businessProfile.valueProposition.value.replace(/\.$/, "").toLowerCase()}`
            : "[value proposition]"
        }.`,
      };

    case "about-page":
      return {
        kind: "OUTLINE",
        title: "About page outline",
        body: [
          "# About",
          "## Our mission",
          "## What we do",
          "## Our team",
          "## Where we operate",
          "## Contact",
        ].join("\n"),
      };

    case "content-depth":
    case "chunking":
      return {
        kind: "OUTLINE",
        title: "Content restructuring outline",
        body: [
          "Break long sections into scannable chunks:",
          "- Lead each section with a one-sentence direct answer.",
          "- Follow with supporting detail in short paragraphs (2-3 sentences).",
          "- Use bulleted lists for anything enumerable (features, steps, requirements).",
        ].join("\n"),
      };

    default:
      return {
        kind: "TECHNICAL_FIX",
        title: issue.title,
        body: `${issue.description}\n\nEvidence:\n${issue.evidence.map((e) => `- ${e}`).join("\n")}`,
      };
  }
}

// --- Live LLM seam (architecture.md section 8) --------------------------
//
// generateSolution() below is the seam the README/architecture.md point
// to. When ANTHROPIC_API_KEY is set, it asks the model to draft the fix
// body, grounded in the issue's evidence and the project's
// BusinessProfile — the same inputs the template version uses. The
// `kind`/`title` stay deterministic (computed the same way regardless of
// path) so downstream UI (Copy/Download/Regenerate) never has to branch on
// which path produced the content. Any failure — no key, network error,
// non-2xx response, empty output — falls back to the template so the
// product never surfaces a broken action.

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

// Per-process cache so re-rendering /actions doesn't re-call the API for
// every issue on every request. Not a substitute for the Recommendation
// row + regenerate-on-demand model described in architecture.md section
// 2 — swap for a DB-backed cache once Recommendation is wired up.
const solutionCache = new Map<string, GeneratedSolution>();

function buildPrompt(issue: DerivedIssue, project: ProjectData, kind: SolutionKind): string {
  const companyName = project.businessProfile.companyName.value || "the business";
  return [
    `You are drafting a concrete, ready-to-use GEO (generative-engine optimization) fix for "${companyName}" (${project.projectUrl}).`,
    `Issue: ${issue.title}`,
    `Description: ${issue.description}`,
    `Evidence from the crawl:`,
    ...issue.evidence.map((e) => `- ${e}`),
    ``,
    `Output kind: ${kind}.`,
    `Write only the fix content itself (e.g. the JSON-LD block, the FAQ copy, the outline, or the corrected text) — no preamble, no explanation, no markdown code fences.`,
  ].join("\n");
}

async function callAnthropic(prompt: string): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
      // Solutions are generated server-side on page render; don't let a
      // slow/hung API call block the page indefinitely.
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as { content?: { type: string; text?: string }[] };
    const text = data.content
      ?.filter((block) => block.type === "text" && block.text)
      .map((block) => block.text)
      .join("\n")
      .trim();

    return text && text.length > 0 ? text : null;
  } catch {
    // Network error, timeout, or malformed response — caller falls back.
    return null;
  }
}

/**
 * Generates a fix for an issue. Tries a live Anthropic call when
 * ANTHROPIC_API_KEY is configured; always falls back to the deterministic
 * template so this never throws or returns empty content.
 */
export async function generateSolution(issue: DerivedIssue, project: ProjectData): Promise<GeneratedSolution> {
  const cacheKey = `${project.projectUrl}:${issue.id}`;
  const cached = solutionCache.get(cacheKey);
  if (cached) return cached;

  const template = generateTemplateSolution(issue, project);
  const liveText = await callAnthropic(buildPrompt(issue, project, template.kind));

  const solution: GeneratedSolution = liveText ? { ...template, body: liveText } : template;
  solutionCache.set(cacheKey, solution);
  return solution;
}
