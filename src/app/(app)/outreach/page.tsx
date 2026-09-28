import { OutreachManager } from "@/components/outreach/outreach-manager";
import { requireSession } from "@/server/auth/session";

export default async function OutreachPage() {
  await requireSession();
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-8">
      <OutreachManager />
    </main>
  );
}
