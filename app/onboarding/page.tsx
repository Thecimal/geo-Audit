import { getProject } from "@/lib/data/getProject";
import { OnboardingWizard } from "@/components/OnboardingWizard";

export default async function OnboardingPage() {
  const project = await getProject();

  return (
    <div className="min-h-screen bg-ink bg-instrument-grid px-6 py-16">
      <OnboardingWizard profile={project.data.businessProfile} url={project.url} />
    </div>
  );
}
