import type { Job } from "@/server/db/schema";
import type { VerifiedCandidateFacts } from "@/server/assistant/contracts";
import type { OutreachStructured } from "@/server/outreach/contracts";

export function generateOutreachContent(
  facts: VerifiedCandidateFacts,
  job: Job | null,
  contact: { name: string | null; company: string; role: string | null },
): OutreachStructured {
  const candidateName = facts.candidateName || "there";
  const topSkills = facts.skills.slice(0, 3).map((s) => s.name);
  const greeting = contact.name ? `Hi ${contact.name},` : `Hi,`;
  const roleLine = job ? ` the ${job.title} role at ${contact.company}` : ` opportunities at ${contact.company}`;

  const body = [
    greeting,
    "",
    `My name is ${candidateName}${facts.professionalSummary ? `, ${facts.professionalSummary}` : ""}. I'm reaching out about${roleLine}.`,
    topSkills.length
      ? `My background includes verified experience with ${topSkills.join(", ")}, which I believe would let me contribute quickly.`
      : `I'd welcome the chance to share more about my background and how it fits the team's needs.`,
    "Would you be open to a short conversation? I'm happy to work around your schedule.",
    "",
    `Best regards,\n${candidateName}`,
  ].join("\n");

  return {
    subject: job ? `Interest in the ${job.title} role at ${contact.company}` : `Interest in opportunities at ${contact.company}`,
    body,
  };
}
