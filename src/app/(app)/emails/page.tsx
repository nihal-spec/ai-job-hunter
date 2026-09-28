import { EmailList } from "@/components/emails/email-list";
import { requireSession } from "@/server/auth/session";

export default async function EmailsPage() {
  await requireSession();
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-8">
      <EmailList />
    </main>
  );
}
