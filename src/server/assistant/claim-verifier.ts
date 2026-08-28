import type {
  ClaimVerificationResult,
  CoverLetterStructured,
  ScreeningAnswersStructured,
  TailoredResumeStructured,
  VerifiedCandidateFacts,
} from "@/server/assistant/contracts";
import { buildAllowlistEntities, type AllowlistEntities } from "@/server/assistant/facts";

function normalize(str: string): string {
  return str.trim().toLowerCase().replace(/\s+/g, " ");
}

export function verifyClaimsAgainstFacts(
  text: string,
  facts: VerifiedCandidateFacts,
  allowlist?: AllowlistEntities,
): ClaimVerificationResult {
  const list = allowlist ?? buildAllowlistEntities(facts);
  const unverifiedClaims: string[] = [];
  const warnings: string[] = [];
  let citedFactsCount = 0;

  // Check which verified skills appear in text
  for (const skill of list.skills) {
    if (skill.length > 2 && text.toLowerCase().includes(skill)) {
      citedFactsCount++;
    }
  }

  // Check for company citations
  for (const company of list.companies) {
    if (company.length > 2 && text.toLowerCase().includes(company)) {
      citedFactsCount++;
    }
  }

  // Check for project citations
  for (const project of list.projects) {
    if (project.length > 2 && text.toLowerCase().includes(project)) {
      citedFactsCount++;
    }
  }

  // Check for suspicious inflated experience claims (e.g. "10+ years of experience" when candidate has 2)
  if (facts.yearsExperience !== null) {
    const yearsMatches = text.matchAll(/(\d+)(?:\+)?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:experience|exp)/gi);
    for (const match of yearsMatches) {
      const claimedYears = parseInt(match[1], 10);
      if (claimedYears > facts.yearsExperience + 1) {
        unverifiedClaims.push(
          `Claimed ${claimedYears} years of experience, but verified experience is ${facts.yearsExperience} years.`,
        );
      }
    }
  }

  const isValid = unverifiedClaims.length === 0;
  const truthfulnessScore = isValid ? Math.min(100, 80 + citedFactsCount * 4) : Math.max(0, 70 - unverifiedClaims.length * 25);

  return {
    isValid,
    truthfulnessScore,
    citedFactsCount,
    unverifiedClaims,
    warnings,
  };
}

export function verifyCoverLetter(
  structured: CoverLetterStructured,
  facts: VerifiedCandidateFacts,
): ClaimVerificationResult {
  const allowlist = buildAllowlistEntities(facts);
  const unverifiedClaims: string[] = [];
  const warnings: string[] = [];

  for (const skill of structured.highlightedSkills) {
    const norm = normalize(skill);
    if (!allowlist.skills.has(norm)) {
      unverifiedClaims.push(`Highlighted skill '${skill}' is not in candidate's verified skills list.`);
    }
  }

  const baseResult = verifyClaimsAgainstFacts(structured.fullText, facts, allowlist);

  return {
    isValid: unverifiedClaims.length === 0 && baseResult.isValid,
    truthfulnessScore: unverifiedClaims.length === 0 ? baseResult.truthfulnessScore : Math.max(0, baseResult.truthfulnessScore - unverifiedClaims.length * 20),
    citedFactsCount: baseResult.citedFactsCount + structured.citedFactIds.length,
    unverifiedClaims: [...unverifiedClaims, ...baseResult.unverifiedClaims],
    warnings: [...warnings, ...baseResult.warnings],
  };
}

export function verifyTailoredResume(
  structured: TailoredResumeStructured,
  facts: VerifiedCandidateFacts,
): ClaimVerificationResult {
  const allowlist = buildAllowlistEntities(facts);
  const unverifiedClaims: string[] = [];
  const warnings: string[] = [];

  for (const skill of structured.skillsToEmphasize) {
    const norm = normalize(skill);
    if (!allowlist.skills.has(norm)) {
      unverifiedClaims.push(`Recommended skill '${skill}' is not among verified candidate skills.`);
    }
  }

  for (const project of structured.projectsToHighlight) {
    const norm = normalize(project);
    if (!allowlist.projects.has(norm)) {
      warnings.push(`Project '${project}' should match candidate's recorded projects.`);
    }
  }

  const baseResult = verifyClaimsAgainstFacts(structured.fullText, facts, allowlist);

  return {
    isValid: unverifiedClaims.length === 0 && baseResult.isValid,
    truthfulnessScore: unverifiedClaims.length === 0 ? baseResult.truthfulnessScore : Math.max(0, baseResult.truthfulnessScore - unverifiedClaims.length * 20),
    citedFactsCount: baseResult.citedFactsCount,
    unverifiedClaims: [...unverifiedClaims, ...baseResult.unverifiedClaims],
    warnings: [...warnings, ...baseResult.warnings],
  };
}

export function verifyScreeningAnswers(
  structured: ScreeningAnswersStructured,
  facts: VerifiedCandidateFacts,
): ClaimVerificationResult {
  const allowlist = buildAllowlistEntities(facts);
  let totalCited = 0;
  const unverifiedClaims: string[] = [];
  const warnings: string[] = [];

  for (const ans of structured.answers) {
    const check = verifyClaimsAgainstFacts(ans.suggestedAnswer, facts, allowlist);
    totalCited += check.citedFactsCount + ans.sourceFactReferences.length;
    unverifiedClaims.push(...check.unverifiedClaims);
    warnings.push(...check.warnings);
  }

  return {
    isValid: unverifiedClaims.length === 0,
    truthfulnessScore: unverifiedClaims.length === 0 ? Math.min(100, 85 + totalCited * 3) : Math.max(0, 60 - unverifiedClaims.length * 20),
    citedFactsCount: totalCited,
    unverifiedClaims,
    warnings,
  };
}
