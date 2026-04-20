import {
  AdminAutomationSection,
  AdminConsoleSection,
  AdminLoginGate,
  AdminPlansSection,
  AdminQueuesSection,
} from "@/components/admin-sections";
import { getCurrentSession } from "@/lib/server/auth";
import { buildAdminPageViewModel } from "@/lib/server/admin-view-model";
import { getAdminOverview } from "@/lib/server/services";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reason?: string }>;
}) {
  const session = await getCurrentSession();
  const resolved = await searchParams;

  if (!session || session.kind !== "admin") {
    return <AdminLoginGate error={resolved.error} />;
  }

  const overview = await getAdminOverview();
  const viewModel = await buildAdminPageViewModel({ overview });

  return (
    <main className="page-shell py-10 space-y-8">
      <AdminConsoleSection
        overview={overview}
        viewModel={viewModel}
        error={resolved.error}
        reason={resolved.reason}
      />
      <AdminPlansSection
        overview={overview}
        error={resolved.error}
        reason={resolved.reason}
      />
      <AdminAutomationSection overview={overview} viewModel={viewModel} />
      <AdminQueuesSection overview={overview} viewModel={viewModel} />
    </main>
  );
}
