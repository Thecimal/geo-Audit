import { getProject } from "@/lib/data/getProject";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ConfidenceMeter } from "@/components/ui/ConfidenceMeter";
import { RelationshipChain } from "@/components/RelationshipChain";
import type { BusinessProfileData, FieldValue } from "@/lib/scoring/types";

const FIELD_LABELS: Record<keyof BusinessProfileData, string> = {
  companyName: "Company name",
  tagline: "Tagline",
  description: "Description",
  industry: "Industry",
  foundedYear: "Founded",
  headquarters: "Headquarters",
  services: "Services",
  targetAudience: "Target audience",
  valueProposition: "Value proposition",
  phone: "Phone",
  email: "Email",
  socialProfiles: "Social profiles",
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  return String(value);
}

function statusTone(status: FieldValue<unknown>["status"]) {
  if (status === "confirmed") return "cyan" as const;
  if (status === "inferred") return "amber" as const;
  return "coral" as const;
}

export default async function KnowledgePage() {
  const project = await getProject();
  const { businessProfile, entities, relationships } = project.data;

  const entityCounts = entities.reduce<Record<string, number>>((acc, e) => {
    acc[e.type] = (acc[e.type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text-high">Knowledge profile</h1>
        <p className="mt-1 text-sm text-text-mid">What the crawler was able to confirm about {project.displayName}, and how confidently.</p>
      </div>

      <Card>
        <CardHeader title="Business profile fields" sub="Status + confidence per discovered fact" />
        <CardBody className="space-y-2">
          {(Object.keys(FIELD_LABELS) as (keyof BusinessProfileData)[]).map((key) => {
            const field = businessProfile[key];
            return (
              <div key={key} className="flex items-center gap-4 rounded-md border border-ink-line bg-ink-surface px-3 py-2.5">
                <div className="w-40 shrink-0">
                  <p className="text-xs text-text-low">{FIELD_LABELS[key]}</p>
                </div>
                <p className="min-w-0 flex-1 truncate text-sm text-text-high">{formatValue(field.value)}</p>
                <ConfidenceMeter ratio={field.confidence} />
                <Badge tone={statusTone(field.status)}>{field.status}</Badge>
              </div>
            );
          })}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Entities"
          sub={Object.entries(entityCounts).map(([t, n]) => `${n} ${t.toLowerCase()}`).join(" · ")}
        />
        <CardBody>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {entities.map((e) => (
              <div key={e.id} className="rounded-md border border-ink-line bg-ink-surface px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-text-high">{e.name}</p>
                  <span className="font-data text-[10px] uppercase text-text-low">{e.type}</span>
                </div>
                {e.description && <p className="mt-1 text-xs text-text-mid">{e.description}</p>}
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Relationship graph" sub={`${relationships.length} relationships mapped`} />
        <CardBody>
          <RelationshipChain entities={entities} relationships={relationships} />
        </CardBody>
      </Card>
    </div>
  );
}
