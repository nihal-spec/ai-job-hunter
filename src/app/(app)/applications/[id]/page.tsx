import { AssistantWorkspace } from "@/components/applications/assistant-workspace";

export default async function ApplicationDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  return (
    <main className="application-detail-shell" style={{ padding: "2rem 1.5rem" }}>
      <AssistantWorkspace applicationId={id} />
    </main>
  );
}
