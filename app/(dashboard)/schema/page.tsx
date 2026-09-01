import { getProject } from "@/lib/data/getProject";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { jsonLdTypes } from "@/lib/scoring/text-utils";

export default async function SchemaPage() {
  const project = await getProject();
  const { pages } = project.data;

  const withSchema = pages.filter((p) => p.jsonLd.length > 0);
  const withoutSchema = pages.filter((p) => p.jsonLd.length === 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text-high">Structured data</h1>
        <p className="mt-1 text-sm text-text-mid">
          {withSchema.length} of {pages.length} pages carry JSON-LD. This directly drives the Structured Data KPI.
        </p>
      </div>

      <Card>
        <CardHeader title="Pages with schema" />
        <CardBody className="space-y-2">
          {withSchema.map((p) => (
            <details key={p.url} className="group rounded-md border border-ink-line bg-ink-surface px-3 py-2.5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                <span className="truncate font-data text-xs text-text-mid">{p.url.replace(/^https?:\/\//, "")}</span>
                <div className="flex shrink-0 gap-1.5">
                  {jsonLdTypes(p).map((t, i) => (
                    <Badge key={i} tone="cyan">
                      {t}
                    </Badge>
                  ))}
                </div>
              </summary>
              <pre className="mt-2 max-h-72 overflow-auto rounded bg-ink-panel p-3 font-data text-[11px] leading-relaxed text-text-mid scrollbar-thin">
                {JSON.stringify(p.jsonLd, null, 2)}
              </pre>
            </details>
          ))}
          {withSchema.length === 0 && <p className="text-sm text-text-low">No pages have structured data yet.</p>}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Missing schema opportunities" sub="Pages with no JSON-LD at all" />
        <CardBody className="space-y-1.5">
          {withoutSchema.map((p) => (
            <div key={p.url} className="flex items-center justify-between rounded-md border border-signal-amber/30 bg-signal-amber/5 px-3 py-2">
              <span className="truncate font-data text-xs text-text-mid">{p.url.replace(/^https?:\/\//, "")}</span>
              <Badge tone="amber">no schema</Badge>
            </div>
          ))}
          {withoutSchema.length === 0 && <p className="text-sm text-text-low">Every crawled page carries structured data.</p>}
        </CardBody>
      </Card>
    </div>
  );
}
