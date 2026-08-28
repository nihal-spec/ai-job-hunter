import type { CandidateProfileDetail } from "@/server/profile/repository";
import type { VerifiedCandidateFacts } from "@/server/assistant/contracts";

export interface AllowlistEntities {
  skills: Set<string>;
  companies: Set<string>;
  titles: Set<string>;
  institutions: Set<string>;
  degrees: Set<string>;
  projects: Set<string>;
  certifications: Set<string>;
  languages: Set<string>;
  yearsOfExperience: number | null;
}

export function extractVerifiedFacts(profile: CandidateProfileDetail): VerifiedCandidateFacts {
  return {
    profileId: profile.profile.id,
    candidateName: profile.profile.name,
    candidateEmail: profile.profile.email,
    candidatePhone: profile.profile.phone,
    locationText: profile.profile.locationText,
    countryCode: profile.profile.countryCode,
    professionalSummary: profile.profile.professionalSummary,
    yearsExperience: profile.profile.yearsExperience ? Number(profile.profile.yearsExperience) : null,
    skills: profile.skills.map((s) => ({
      id: s.id,
      name: s.name,
      normalizedName: s.normalizedName,
      category: s.category,
      source: s.source,
      verified: s.verified,
      confidence: s.confidence ?? undefined,
    })),
    experiences: profile.experiences.map((e) => ({
      id: e.id,
      organization: e.organization,
      title: e.title,
      locationText: e.locationText,
      startDate: e.startDate,
      endDate: e.endDate,
      isCurrent: e.isCurrent,
      description: e.description,
      highlights: (e.highlights as string[]) ?? [],
    })),
    education: profile.education.map((ed) => ({
      id: ed.id,
      institution: ed.institution,
      qualification: ed.qualification,
      fieldOfStudy: ed.fieldOfStudy,
      startDate: ed.startDate,
      endDate: ed.endDate,
      grade: ed.grade,
      description: ed.description,
    })),
    projects: profile.projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      role: p.role,
      url: p.url,
      startDate: p.startDate,
      endDate: p.endDate,
      highlights: (p.highlights as string[]) ?? [],
      technologies: (p.technologies as string[]) ?? [],
    })),
    certifications: profile.certifications.map((c) => ({
      id: c.id,
      name: c.name,
      issuer: c.issuer,
      issuedAt: c.issuedAt,
      expiresAt: c.expiresAt,
      credentialId: c.credentialId,
      credentialUrl: c.credentialUrl,
    })),
    languages: profile.languages.map((l) => ({
      id: l.id,
      language: l.language,
      proficiency: l.proficiency,
    })),
  };
}

export function buildAllowlistEntities(facts: VerifiedCandidateFacts): AllowlistEntities {
  const normalize = (val: string) => val.trim().toLowerCase().replace(/\s+/g, " ");

  const skills = new Set<string>();
  for (const s of facts.skills) {
    skills.add(normalize(s.name));
    skills.add(normalize(s.normalizedName));
  }
  for (const p of facts.projects) {
    for (const tech of p.technologies) {
      skills.add(normalize(tech));
    }
  }

  const companies = new Set<string>();
  const titles = new Set<string>();
  for (const exp of facts.experiences) {
    companies.add(normalize(exp.organization));
    titles.add(normalize(exp.title));
  }

  const institutions = new Set<string>();
  const degrees = new Set<string>();
  for (const edu of facts.education) {
    institutions.add(normalize(edu.institution));
    if (edu.qualification) degrees.add(normalize(edu.qualification));
    if (edu.fieldOfStudy) degrees.add(normalize(edu.fieldOfStudy));
  }

  const projects = new Set<string>();
  for (const proj of facts.projects) {
    projects.add(normalize(proj.name));
  }

  const certifications = new Set<string>();
  for (const cert of facts.certifications) {
    certifications.add(normalize(cert.name));
    if (cert.issuer) certifications.add(normalize(cert.issuer));
  }

  const languages = new Set<string>();
  for (const lang of facts.languages) {
    languages.add(normalize(lang.language));
  }

  return {
    skills,
    companies,
    titles,
    institutions,
    degrees,
    projects,
    certifications,
    languages,
    yearsOfExperience: facts.yearsExperience,
  };
}

export function sanitizePromptInput(input: string): string {
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/(system prompt|ignore previous instructions|disregard instructions|jailbreak)/gi, "[redacted]")
    .trim();
}

export function formatFactsForContext(facts: VerifiedCandidateFacts): string {
  const sections: string[] = [];

  sections.push(`CANDIDATE: ${facts.candidateName || "Candidate"}`);
  if (facts.professionalSummary) {
    sections.push(`SUMMARY: ${facts.professionalSummary}`);
  }
  if (facts.yearsExperience !== null) {
    sections.push(`TOTAL YEARS OF EXPERIENCE: ${facts.yearsExperience} years`);
  }

  if (facts.skills.length > 0) {
    const skillList = facts.skills.map((s) => `${s.name} (${s.category})`).join(", ");
    sections.push(`VERIFIED SKILLS: ${skillList}`);
  }

  if (facts.experiences.length > 0) {
    const expLines = facts.experiences.map((exp) => {
      const dates = `${exp.startDate || "N/A"} - ${exp.isCurrent ? "Present" : exp.endDate || "N/A"}`;
      const highlights = exp.highlights.length ? ` Highlights: ${exp.highlights.join("; ")}` : "";
      return `- ${exp.title} at ${exp.organization} (${dates}): ${exp.description || ""}${highlights}`;
    });
    sections.push(`WORK EXPERIENCE:\n${expLines.join("\n")}`);
  }

  if (facts.projects.length > 0) {
    const projLines = facts.projects.map((p) => {
      const tech = p.technologies.length ? ` [Tech: ${p.technologies.join(", ")}]` : "";
      const highlights = p.highlights.length ? ` Highlights: ${p.highlights.join("; ")}` : "";
      return `- ${p.name} (${p.role || "Developer"})${tech}: ${p.description || ""}${highlights}`;
    });
    sections.push(`PROJECTS:\n${projLines.join("\n")}`);
  }

  if (facts.education.length > 0) {
    const eduLines = facts.education.map((edu) => {
      const field = edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : "";
      return `- ${edu.qualification || "Degree"}${field} from ${edu.institution} (${edu.startDate || "N/A"} - ${edu.endDate || "N/A"})`;
    });
    sections.push(`EDUCATION:\n${eduLines.join("\n")}`);
  }

  if (facts.certifications.length > 0) {
    const certLines = facts.certifications.map((c) => `- ${c.name} (Issued by: ${c.issuer || "N/A"})`);
    sections.push(`CERTIFICATIONS:\n${certLines.join("\n")}`);
  }

  return sections.join("\n\n");
}
