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
 * The seam for a real LLM call (see architecture.md section 8). This build
 * has no live model key wired into the server, so it generates
 * template-based content, grounded in the same crawl evidence + KnowledgeProfile
 * fields an LLM prompt would use.
 *
 * To wire up a real model: replace this function's body with a server-side
 * call to the Anthropic API using ANTHROPIC_API_KEY (never exposed to the
 * browser), built from `issue.evidence`, `project.businessProfile`, and the
 * source page content — i.e. exactly the inputs already used below.
 * Everything downstream (Copy/Download/Regenerate buttons, the panel UI) is
 * unchanged either way.
 */
export function generateSolution(issue: DerivedIssue, project: ProjectData): GeneratedSolution {
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
