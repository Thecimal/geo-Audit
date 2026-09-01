import { getProject } from "@/lib/data/getProject";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CrawlTree } from "@/components/CrawlTree";

function StatusRow({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-ink-line bg-ink-surface px-3 py-2.5">
      <div>
        <p className="text-sm text-text-high">{label}</p>
        <p className="text-xs text-text-low">{detail}</p>
      </div>
      <Badge tone={ok ? "cyan" : "coral"}>{ok ? "OK" : "Missing"}</Badge>
    </div>
  );
}

export default async function TechnicalPage() {
  const project = await getProject();
  const tf = project.data.technicalFindings;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text-high">Technical</h1>
        <p className="mt-1 text-sm text-text-mid">Crawl graph and the technical findings that feed AI Discoverability and Technical Accessibility.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatusRow label="robots.txt" ok={tf.robotsTxtFound} detail={tf.robotsTxtFound ? "Found and permissive" : "Not found"} />
        <StatusRow label="sitemap.xml" ok={tf.sitemapFound} detail={tf.sitemapFound ? `${tf.sitemapUrls.length} URLs listed` : "Not found"} />
        <StatusRow label="llms.txt" ok={tf.llmsTxtFound} detail={tf.llmsTxtFound ? "Found" : "Not found — an emerging AI-crawler convention"} />
        <StatusRow label="HTTPS" ok={tf.httpsUsed} detail={tf.httpsUsed ? "Served over HTTPS site-wide" : "Not fully HTTPS"} />
      </div>

      <Card>
        <CardHeader
          title="Crawl findings"
          sub={`${tf.totalPages} pages, ${tf.brokenLinks.length} broken links, ${tf.orphanPages.length} orphans, ${
            tf.duplicateTitles.length + tf.duplicateDescriptions.length
          } duplicate groups`}
        />
        <CardBody className="space-y-3">
          {tf.brokenLinks.map((b, i) => (
            <div key={i} className="flex items-center justify-between rounded-md border border-signal-coral/30 bg-signal-coral/5 px-3 py-2 font-data text-xs">
              <span className="truncate text-text-mid">
                {b.from.replace(/^https?:\/\//, "")} → {b.to.replace(/^https?:\/\//, "")}
              </span>
              <span className="text-signal-coral">{b.status}</span>
            </div>
          ))}
          {tf.duplicateTitles.map((group, i) => (
            <div key={`dt-${i}`} className="rounded-md border border-signal-amber/30 bg-signal-amber/5 px-3 py-2">
              <p className="mb-1 font-data text-[11px] text-signal-amber">Duplicate title</p>
              {group.map((url) => (
                <p key={url} className="truncate font-data text-xs text-text-mid">
                  {url.replace(/^https?:\/\//, "")}
                </p>
              ))}
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Crawl tree" sub={`${project.data.pages.length} pages by depth`} />
        <CardBody>
          <CrawlTree pages={project.data.pages} orphanUrls={tf.orphanPages} />
        </CardBody>
      </Card>
    </div>
  );
}
