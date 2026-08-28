import type { Job } from "@/server/db/schema";
import type {
  BulletSuggestion,
  CoverLetterStructured,
  GenerateCoverLetterInput,
  GenerateScreeningAnswersInput,
  GenerateTailoredResumeInput,
  ScreeningAnswersStructured,
  TailoredResumeStructured,
  VerifiedCandidateFacts,
} from "@/server/assistant/contracts";
import { sanitizePromptInput } from "@/server/assistant/facts";

export const ASSISTANT_PROMPT_VERSION = "2026.08.assistant-v1";
export const DEFAULT_AI_PROVIDER = "job-hunter-ai";
export const DEFAULT_AI_MODEL = "assistant-turbo-v1";

function findRelevantSkills(facts: VerifiedCandidateFacts, job: Job): string[] {
  const jobText = `${job.title} ${job.description} ${JSON.stringify(job.skills)} ${JSON.stringify(job.requirements)}`.toLowerCase();
  return facts.skills
    .filter((s) => jobText.includes(s.normalizedName.toLowerCase()) || jobText.includes(s.name.toLowerCase()))
    .map((s) => s.name);
}

function findRelevantExperiences(facts: VerifiedCandidateFacts, job: Job) {
  const jobText = `${job.title} ${job.description}`.toLowerCase();
  return facts.experiences.filter((e) => {
    const expText = `${e.title} ${e.organization} ${e.description || ""} ${e.highlights.join(" ")}`.toLowerCase();
    const commonWords = jobText.split(/\W+/).filter((w) => w.length > 4 && expText.includes(w));
    return commonWords.length > 0;
  });
}

function findRelevantProjects(facts: VerifiedCandidateFacts, job: Job) {
  const jobText = `${job.title} ${job.description}`.toLowerCase();
  return facts.projects.filter((p) => {
    const projText = `${p.name} ${p.description || ""} ${p.technologies.join(" ")}`.toLowerCase();
    const commonWords = jobText.split(/\W+/).filter((w) => w.length > 4 && projText.includes(w));
    return commonWords.length > 0;
  });
}

export function generateCoverLetterContent(
  facts: VerifiedCandidateFacts,
  job: Job,
  input: GenerateCoverLetterInput = { tone: "professional" },
): CoverLetterStructured {
  const candidateName = facts.candidateName || "Candidate";
  const companyName = job.companyName;
  const jobTitle = job.title;
  const salutation = `Dear Hiring Team at ${companyName},`;

  const relevantSkills = findRelevantSkills(facts, job);
  const relevantExperiences = findRelevantExperiences(facts, job);
  const relevantProjects = findRelevantProjects(facts, job);

  const topSkills = (relevantSkills.length > 0 ? relevantSkills : facts.skills.map((s) => s.name)).slice(0, 4);
  const primaryExp = relevantExperiences[0] ?? facts.experiences[0];
  const primaryProj = relevantProjects[0] ?? facts.projects[0];

  const toneAdjective = input.tone === "enthusiastic" ? "eager and energetic" : input.tone === "technical" ? "technically rigorous" : "professional";
  const opening = `I am writing to express my ${toneAdjective} enthusiasm for the ${jobTitle} position at ${companyName}. With a proven foundation in ${topSkills.slice(0, 2).join(" and ") || "software engineering"}${facts.yearsExperience ? ` and over ${facts.yearsExperience} years of experience` : ""}, I am eager to contribute effectively to your team.`;

  const bodyParagraphs: string[] = [];

  if (primaryExp) {
    const highlight = primaryExp.highlights[0] ? ` Specifically, ${primaryExp.highlights[0]}.` : "";
    const desc = primaryExp.description ? ` In this role, I focused on ${primaryExp.description}.` : "";
    bodyParagraphs.push(
      `During my time as ${primaryExp.title} at ${primaryExp.organization}, I applied key engineering principles to solve complex problems and deliver measurable results.${desc}${highlight}`,
    );
  }

  if (primaryProj) {
    const tech = primaryProj.technologies.length > 0 ? ` using ${primaryProj.technologies.join(", ")}` : "";
    bodyParagraphs.push(
      `Additionally, in my project "${primaryProj.name}", I served as ${primaryProj.role || "Developer"}${tech}. ${primaryProj.description || "I built and deployed reliable features that directly address user requirements."}`,
    );
  }

  if (topSkills.length > 0) {
    bodyParagraphs.push(
      `My verified competencies in ${topSkills.join(", ")} closely align with the requirements for the ${jobTitle} role. I value building resilient, maintainable solutions and collaborating across teams.`,
    );
  }

  if (bodyParagraphs.length === 0) {
    bodyParagraphs.push(
      `I am dedicated to continuous learning and applying my technical background to help ${companyName} achieve its engineering and product goals.`,
    );
  }

  const closing = `Thank you for considering my application. I look forward to the opportunity to discuss how my background, verified skills, and passion for engineering align with your goals at ${companyName}.`;
  const signoff = `Sincerely,\n${candidateName}`;

  const fullText = [
    salutation,
    "",
    opening,
    "",
    ...bodyParagraphs.map((p) => `${p}\n`),
    closing,
    "",
    signoff,
  ].join("\n").trim();

  const citedFactIds: string[] = [];
  if (primaryExp?.id) citedFactIds.push(primaryExp.id);
  if (primaryProj?.id) citedFactIds.push(primaryProj.id);
  for (const s of facts.skills) {
    if (topSkills.includes(s.name) && s.id) citedFactIds.push(s.id);
  }

  return {
    recipient: "Hiring Team",
    companyName,
    jobTitle,
    salutation,
    opening,
    bodyParagraphs,
    closing,
    signoff,
    citedFactIds,
    highlightedSkills: topSkills,
    fullText,
  };
}

export function generateTailoredResumeRecommendationsContent(
  facts: VerifiedCandidateFacts,
  job: Job,
  input: GenerateTailoredResumeInput = {},
): TailoredResumeStructured {
  const relevantSkills = findRelevantSkills(facts, job);
  const relevantExperiences = findRelevantExperiences(facts, job);
  const relevantProjects = findRelevantProjects(facts, job);

  const skillsToEmphasize = relevantSkills.length > 0 ? relevantSkills : facts.skills.slice(0, 5).map((s) => s.name);
  const projectsToHighlight = relevantProjects.length > 0 ? relevantProjects.map((p) => p.name) : facts.projects.slice(0, 2).map((p) => p.name);

  const bulletSuggestions: BulletSuggestion[] = [];

  for (const exp of relevantExperiences.slice(0, 2)) {
    const rawBullet = exp.highlights[0] || exp.description || `Delivered engineering work as ${exp.title}`;
    bulletSuggestions.push({
      section: "experience",
      itemTitle: `${exp.title} at ${exp.organization}`,
      originalFact: rawBullet,
      suggestedBullet: `Engineered scalable solutions as ${exp.title}, applying ${skillsToEmphasize.slice(0, 2).join(" & ") || "core technical capabilities"} to ${rawBullet.toLowerCase().startsWith("engineer") ? rawBullet : `deliver: ${rawBullet}`}`,
      reason: `Directly highlights your verified experience at ${exp.organization} aligned to ${job.title} expectations.`,
      alignedJobRequirement: job.title,
    });
  }

  for (const proj of relevantProjects.slice(0, 2)) {
    const rawBullet = proj.highlights[0] || proj.description || `Built ${proj.name}`;
    bulletSuggestions.push({
      section: "project",
      itemTitle: proj.name,
      originalFact: rawBullet,
      suggestedBullet: `Architected "${proj.name}" utilizing ${proj.technologies.slice(0, 3).join(", ") || "modern tech stack"} to solve key requirements: ${rawBullet}`,
      reason: `Spotlights verified hands-on implementation and technology stack matches.`,
      alignedJobRequirement: `Hands-on proficiency in ${proj.technologies.slice(0, 2).join(", ") || "relevant stack"}`,
    });
  }

  const verifiedQualificationsMatched: string[] = [
    ...skillsToEmphasize.map((s) => `Verified Skill: ${s}`),
  ];
  if (facts.yearsExperience !== null) {
    verifiedQualificationsMatched.push(`Verified Experience: ${facts.yearsExperience} years total`);
  }

  const jobReqs = Array.isArray(job.requirements) ? (job.requirements as string[]) : [];
  const candidateSkillNames = new Set(facts.skills.map((s) => s.normalizedName.toLowerCase()));
  const potentialGapsToAddress = jobReqs
    .filter((req) => typeof req === "string" && !candidateSkillNames.has(req.toLowerCase()))
    .slice(0, 3)
    .map((gap) => `Job mentions "${gap}" - emphasize related transferable skills during discussions without claiming unverified expertise.`);

  const focusClause = input.focusArea ? ` with a focus on ${input.focusArea}` : "";
  const summaryRecommendation = `For the ${job.title} position at ${job.companyName}, tailor your resume${focusClause} by leading with your verified competencies in ${skillsToEmphasize.join(", ") || "your core skills"} and spotlighting ${projectsToHighlight[0] || "your primary project"}. Never invent unheld credentials.`;

  const fullTextParts: string[] = [
    `# Tailored Resume Optimization for ${job.title} at ${job.companyName}`,
    "",
    `## Strategic Summary`,
    summaryRecommendation,
    "",
    `## Top Skills to Spotlight`,
    ...skillsToEmphasize.map((s) => `- **${s}** (Verified on profile)`),
    "",
    `## Recommended Bullet Point Enhancements`,
    ...bulletSuggestions.map(
      (b) => `### ${b.itemTitle} (${b.section.toUpperCase()})\n- **Original:** ${b.originalFact}\n- **Recommended:** ${b.suggestedBullet}\n- *Rationale:* ${b.reason}`,
    ),
    "",
    `## Projects to Feature`,
    ...projectsToHighlight.map((p) => `- ${p}`),
  ];

  if (potentialGapsToAddress.length > 0) {
    fullTextParts.push("", `## Transparent Gap Guidance`, ...potentialGapsToAddress.map((g) => `- ${g}`));
  }

  return {
    summaryRecommendation,
    bulletSuggestions,
    skillsToEmphasize,
    projectsToHighlight,
    verifiedQualificationsMatched,
    potentialGapsToAddress,
    fullText: fullTextParts.join("\n"),
  };
}

export function generateScreeningAnswersContent(
  facts: VerifiedCandidateFacts,
  job: Job,
  input: GenerateScreeningAnswersInput,
): ScreeningAnswersStructured {
  const answers = input.questions.map((rawQ) => {
    const question = sanitizePromptInput(rawQ);
    const qLower = question.toLowerCase();

    let suggestedAnswer = "";
    const keyEvidence: string[] = [];
    const sourceFactReferences: string[] = [];

    if (qLower.includes("years") || qLower.includes("experience") || qLower.includes("how long")) {
      if (facts.yearsExperience !== null) {
        suggestedAnswer = `I have approximately ${facts.yearsExperience} years of professional engineering experience.`;
        keyEvidence.push(`${facts.yearsExperience} years total verified experience`);
      } else if (facts.experiences.length > 0) {
        suggestedAnswer = `I have worked in professional engineering roles across ${facts.experiences.length} positions, including as ${facts.experiences[0].title} at ${facts.experiences[0].organization}.`;
        keyEvidence.push(`${facts.experiences[0].title} at ${facts.experiences[0].organization}`);
        if (facts.experiences[0].id) sourceFactReferences.push(facts.experiences[0].id);
      } else {
        suggestedAnswer = `I have completed hands-on software development projects showcasing core engineering abilities.`;
      }
    } else if (qLower.includes("salary") || qLower.includes("compensation") || qLower.includes("expected")) {
      suggestedAnswer = `My salary expectations are flexible and open to discussion based on the total compensation package and role responsibilities.`;
      keyEvidence.push("Standard flexible compensation posture");
    } else if (qLower.includes("authorized") || qLower.includes("sponsorship") || qLower.includes("visa") || qLower.includes("work in")) {
      suggestedAnswer = `I am legally eligible and authorized to work in ${facts.countryCode || "the required location"}.`;
      keyEvidence.push(`Location/Country: ${facts.countryCode || facts.locationText || "Standard authorization"}`);
    } else if (qLower.includes("project") || qLower.includes("tell us about a time") || qLower.includes("challenge")) {
      const proj = facts.projects[0];
      if (proj) {
        suggestedAnswer = `In my project "${proj.name}" (Role: ${proj.role || "Developer"}), I worked with ${proj.technologies.slice(0, 3).join(", ") || "modern tools"} to build ${proj.description || "a robust solution"}.${proj.highlights[0] ? ` A major achievement was: ${proj.highlights[0]}` : ""}`;
        keyEvidence.push(`Project: ${proj.name}`);
        if (proj.id) sourceFactReferences.push(proj.id);
      } else {
        suggestedAnswer = `In my previous engineering assignments, I prioritized thorough problem diagnosis, structured implementation, and cross-team communication.`;
      }
    } else {
      // General question: align with top verified skills
      const matched = facts.skills.filter((s) => qLower.includes(s.normalizedName.toLowerCase()));
      if (matched.length > 0) {
        suggestedAnswer = `Yes, I have verified experience with ${matched.map((s) => s.name).join(", ")}. In my practical work, I have applied these skills to deliver reliable software.`;
        for (const s of matched) {
          keyEvidence.push(`Skill: ${s.name}`);
          if (s.id) sourceFactReferences.push(s.id);
        }
      } else {
        const top3 = facts.skills.slice(0, 3).map((s) => s.name).join(", ");
        suggestedAnswer = `Based on my background in ${top3 || "software development"} and hands-on project work, I approach challenges methodically and communicate transparently.`;
        keyEvidence.push(`Core competencies: ${top3 || "Software engineering"}`);
      }
    }

    return {
      question: rawQ,
      suggestedAnswer,
      keyEvidence,
      sourceFactReferences,
    };
  });

  const fullText = answers
    .map(
      (a, i) =>
        `### Question ${i + 1}: ${a.question}\n**Suggested Answer:**\n${a.suggestedAnswer}\n*Evidence:* ${a.keyEvidence.join(", ")}`,
    )
    .join("\n\n");

  return {
    answers,
    fullText,
  };
}
