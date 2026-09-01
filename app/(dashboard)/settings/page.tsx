import { getProject } from "@/lib/data/getProject";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-text-low">{label}</label>
      <input
        readOnly
        value={value}
        className="w-full cursor-not-allowed rounded-md border border-ink-line bg-ink-surface px-3 py-2 text-sm text-text-mid"
      />
    </div>
  );
}

export default async function SettingsPage() {
  const project = await getProject();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text-high">Settings</h1>
        <p className="mt-1 text-sm text-text-mid">Project and crawl configuration.</p>
      </div>

      <Card>
        <CardHeader title="Project" />
        <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Display name" value={project.displayName} />
          <Field label="URL" value={project.url} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Crawl configuration" sub="Fixed for this demo project — see README" />
        <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Max pages" value="50" />
          <Field label="Max depth" value="3" />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="About this build" />
        <CardBody className="space-y-2 text-sm text-text-mid">
          <p>
            This is a demo build running against a fixed fixture (see <code className="font-data text-xs text-text-high">lib/data/fixtures</code>),
            not a live crawl of an arbitrary URL. The scoring engine, recommendation logic, and every page here are fully real — only the
            crawl and database connections are simulated.
          </p>
          <p>See the project README for the complete list of what's real vs. simulated in this build.</p>
        </CardBody>
      </Card>
    </div>
  );
}
