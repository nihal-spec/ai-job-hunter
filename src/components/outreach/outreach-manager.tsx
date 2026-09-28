"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";

type Contact = { id: string; company: string; name: string | null; role: string | null; email: string | null };
type Outreach = {
  id: string;
  contactId: string;
  subject: string;
  body: string;
  status: "draft" | "ready" | "sent" | "replied" | "follow_up" | "closed";
  followUpCount: number;
  maxFollowUps: number;
};

export function OutreachManager() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messages, setMessages] = useState<Outreach[]>([]);
  const [company, setCompany] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const showToast = useToast();

  async function load() {
    const [contactsRes, outreachRes] = await Promise.all([
      fetch("/api/contacts", { cache: "no-store" }),
      fetch("/api/outreach", { cache: "no-store" }),
    ]);
    if (contactsRes.ok) setContacts(((await contactsRes.json()) as { data: Contact[] }).data);
    if (outreachRes.ok) setMessages(((await outreachRes.json()) as { data: Outreach[] }).data);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function addContact(event: React.FormEvent) {
    event.preventDefault();
    if (!company.trim()) return;
    const response = await fetch("/api/contacts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ company, name: name || null, email: email || null }),
    });
    if (response.ok) {
      setCompany("");
      setName("");
      setEmail("");
      await load();
    }
  }

  async function draft(contactId: string) {
    const response = await fetch("/api/outreach", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contactId }),
    });
    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      showToast(result?.error?.message ?? "Could not draft outreach.", "error");
      return;
    }
    showToast("Draft created. Review it below before sending.", "success");
    await load();
  }

  async function approveAndSend(outreach: Outreach) {
    const approveResponse = await fetch(`/api/outreach/${outreach.id}/approve`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subject: outreach.subject, body: outreach.body }),
    });
    if (!approveResponse.ok) {
      showToast("Could not approve this draft.", "error");
      return;
    }
    const sendResponse = await fetch(`/api/outreach/${outreach.id}/send`, { method: "POST" });
    if (!sendResponse.ok) {
      const result = (await sendResponse.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
      showToast(
        result?.error?.code === "GMAIL_NOT_CONNECTED" ? "Connect Gmail first." : (result?.error?.message ?? "Send failed."),
        "error",
      );
      return;
    }
    showToast("Outreach sent.", "success");
    await load();
  }

  return (
    <div className="grid gap-8">
      <section>
        <h2 className="m-0 text-xl font-semibold text-ink">Contacts</h2>
        <form onSubmit={addContact} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end">
          <Label>
            Company
            <Input value={company} onChange={(e) => setCompany(e.target.value)} required />
          </Label>
          <Label>
            Name (optional)
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Label>
          <Label>
            Email (optional)
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Label>
          <Button type="submit" size="sm">
            Add contact
          </Button>
        </form>

        {contacts.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No contacts yet. Add one above to draft outreach.</p>
        ) : (
          <ul className="mt-4 grid gap-2">
            {contacts.map((contact) => (
              <li key={contact.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface p-3">
                <div>
                  <p className="m-0 font-semibold text-ink">{contact.name ?? contact.company}</p>
                  <p className="m-0 text-sm text-muted">
                    {contact.company} · {contact.email ?? "no email"}
                  </p>
                </div>
                <Button type="button" size="sm" variant="secondary" disabled={!contact.email} onClick={() => draft(contact.id)}>
                  Draft outreach
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="m-0 text-xl font-semibold text-ink">Outreach</h2>
        {messages.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="No outreach yet." description="Draft a message to a contact above to get started." />
          </div>
        ) : (
          <ul className="mt-4 grid gap-3">
            {messages.map((message) => (
              <li key={message.id} className="rounded-xl border border-line bg-surface p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="m-0 font-semibold text-ink">{message.subject}</p>
                  <Badge tone={message.status === "sent" ? "accent" : "neutral"}>{message.status}</Badge>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{message.body}</p>
                {message.status === "draft" ? (
                  <Button type="button" size="sm" className="mt-3" onClick={() => approveAndSend(message)}>
                    Approve and send
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
