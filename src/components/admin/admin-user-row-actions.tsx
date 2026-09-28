"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function AdminUserRowActions({ userId, disabled }: { userId: string; disabled: boolean }) {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function toggle() {
    setPending(true);
    await fetch(`/api/admin/users/${userId}/${disabled ? "enable" : "disable"}`, { method: "POST" });
    setPending(false);
    router.refresh();
  }

  return (
    <Button type="button" size="sm" variant={disabled ? "primary" : "danger"} onClick={toggle} disabled={pending}>
      {disabled ? "Enable" : "Disable"}
    </Button>
  );
}
