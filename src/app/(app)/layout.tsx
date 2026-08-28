import Link from "next/link";

import { requireSession } from "@/server/auth/session";

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireSession();
  return (
    <div className="app-frame">
      <nav className="app-nav" aria-label="Product navigation">
        <Link className="app-brand" href="/dashboard">
          AI Job Hunter
        </Link>
        <div>
          <Link href="/dashboard">Workspace</Link>
          <Link href="/jobs">Discover jobs</Link>
          <Link href="/saved">Saved jobs</Link>
          <Link href="/applications">Applications</Link>
        </div>
      </nav>
      {children}
    </div>
  );
}
