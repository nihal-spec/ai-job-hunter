import { AppHeader, type NavLink } from "@/components/ui/app-header";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { findUserAccessStatus } from "@/server/admin/repository";
import { requireSession } from "@/server/auth/session";

const baseNavLinks: NavLink[] = [
  { href: "/dashboard", label: "Workspace" },
  { href: "/jobs", label: "Discover jobs" },
  { href: "/saved", label: "Saved jobs" },
  { href: "/applications", label: "Applications" },
  { href: "/emails", label: "Emails" },
  { href: "/outreach", label: "Outreach" },
];

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await requireSession();
  const access = await findUserAccessStatus(session.user.id);
  const navLinks = access?.role === "admin" ? [...baseNavLinks, { href: "/admin", label: "Admin" }] : baseNavLinks;
  return (
    <div className="app-frame min-h-screen">
      <AppHeader links={navLinks} actions={<SignOutButton />} />
      {children}
    </div>
  );
}
