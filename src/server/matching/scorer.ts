import type { MatchInput, MatchResult } from "@/server/matching/contracts";

const ignoredTokens = new Set([
  "and",
  "the",
  "with",
  "for",
  "from",
  "that",
  "this",
  "will",
  "your",
  "our",
  "are",
  "you",
  "job",
  "role",
]);

function normalized(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}+#.]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function tokens(value: string) {
  return new Set(
    normalized(value)
      .split(" ")
      .filter((token) => token.length > 2 && !ignoredTokens.has(token)),
  );
}

function round(value: number) {
  return Math.round(Math.max(0, Math.min(100, value)) * 100) / 100;
}

function category(score: number): MatchResult["category"] {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Strong";
  if (score >= 70) return "Good";
  if (score >= 60) return "Moderate";
  return "Low";
}

export function scoreMatch(input: MatchInput): MatchResult {
  const verifiedSkills = new Set(
    input.candidate.skills.filter((skill) => skill.verified).map((skill) => normalized(skill.name)),
  );
  const inferredSkills = new Set(
    input.candidate.skills
      .filter((skill) => !skill.verified)
      .map((skill) => normalized(skill.name)),
  );
  const matchedSkills: string[] = [];
  const partialSkills: string[] = [];
  const missingRequiredSkills: string[] = [];
  const missingPreferredSkills: string[] = [];
  let skillPoints = 0;
  let skillPossible = 0;

  for (const skill of input.job.skills) {
    const name = normalized(skill.name);
    const weight = skill.required ? 2 : 1;
    skillPossible += weight;
    if (verifiedSkills.has(name)) {
      skillPoints += weight;
      matchedSkills.push(skill.name);
    } else if (inferredSkills.has(name)) {
      skillPoints += weight * 0.4;
      partialSkills.push(skill.name);
    } else if (skill.required) {
      missingRequiredSkills.push(skill.name);
    } else {
      missingPreferredSkills.push(skill.name);
    }
  }
  const skills = skillPossible ? round((skillPoints / skillPossible) * 100) : 50;

  let experience = 50;
  let experienceText = "The job does not state a comparable experience requirement.";
  if (input.job.experienceMinYears !== null && input.candidate.yearsExperience !== null) {
    if (input.candidate.yearsExperience >= input.job.experienceMinYears) {
      experience = 100;
      experienceText = `Candidate experience meets the ${input.job.experienceMinYears}+ year requirement.`;
    } else {
      experience = round(
        (input.candidate.yearsExperience / Math.max(1, input.job.experienceMinYears)) * 100,
      );
      experienceText = `Candidate experience is below the stated ${input.job.experienceMinYears}+ year requirement.`;
    }
  }

  const candidateTokens = tokens(input.candidate.experienceText.join(" "));
  const responsibilityItems = input.job.responsibilities.length
    ? input.job.responsibilities
    : [input.job.description];
  const matchedResponsibilities = responsibilityItems.filter((item) => {
    const itemTokens = tokens(item);
    return itemTokens.size > 0 && [...itemTokens].some((token) => candidateTokens.has(token));
  });
  const responsibilities =
    candidateTokens.size === 0
      ? 50
      : round((matchedResponsibilities.length / Math.max(1, responsibilityItems.length)) * 100);

  const preferenceConflicts: string[] = [];
  const haystack = normalized(
    `${input.job.title} ${input.job.companyName} ${input.job.description}`,
  );
  const excluded = input.preferences.excludedKeywords.filter((keyword) =>
    haystack.includes(normalized(keyword)),
  );
  if (excluded.length) preferenceConflicts.push(`Excluded keywords: ${excluded.join(", ")}`);

  const roleMatch =
    input.preferences.roles.length === 0 ||
    input.preferences.roles.some(
      (role) =>
        normalized(input.job.title).includes(normalized(role)) ||
        normalized(role).includes(normalized(input.job.title)),
    );
  const workplaceMatch =
    input.preferences.workplaceModes.length === 0 ||
    !input.job.workplaceMode ||
    input.preferences.workplaceModes.includes(normalized(input.job.workplaceMode));
  const employmentMatch =
    input.preferences.employmentTypes.length === 0 ||
    !input.job.employmentType ||
    input.preferences.employmentTypes.some(
      (type) => normalized(type) === normalized(input.job.employmentType!),
    );
  if (!roleMatch) preferenceConflicts.push("Title is outside the target roles.");
  if (!workplaceMatch) preferenceConflicts.push("Workplace mode conflicts with preferences.");
  if (!employmentMatch) preferenceConflicts.push("Employment type conflicts with preferences.");
  const preferences = round(
    ([roleMatch, workplaceMatch, employmentMatch].filter(Boolean).length / 3) * 100,
  );

  let location = 50;
  let locationText = "Job location is unknown or no location preference was set.";
  if (input.preferences.locations.length && input.job.locationText) {
    const matched = input.preferences.locations.some(
      (place) =>
        normalized(input.job.locationText!).includes(normalized(place)) ||
        normalized(place).includes(normalized(input.job.locationText!)),
    );
    location = matched ? 100 : 0;
    locationText = matched
      ? "Job location matches a preferred location."
      : "Job location does not match preferred locations.";
  }

  const educationRequired = /\b(degree|bachelor|master|phd|education)\b/i.test(
    input.job.description,
  );
  const education = educationRequired ? (input.candidate.educationCount > 0 ? 100 : 0) : 50;
  const companyPreferred = input.preferences.preferredCompanies.some(
    (company) => normalized(company) === normalized(input.job.companyName),
  );
  const preferredSkillCount = input.preferences.preferredSkills.filter((skill) =>
    verifiedSkills.has(normalized(skill)),
  ).length;
  const other =
    input.preferences.preferredCompanies.length || input.preferences.preferredSkills.length
      ? round(
          (((companyPreferred ? 1 : 0) +
            preferredSkillCount / Math.max(1, input.preferences.preferredSkills.length)) /
            2) *
            100,
        )
      : 50;

  const components = {
    skills,
    experience,
    responsibilities,
    preferences,
    location,
    education,
    other,
  };
  const weights = input.preferences.weights;
  let overallScore = round(
    Object.entries(components).reduce(
      (sum, [key, value]) => sum + value * weights[key as keyof typeof weights],
      0,
    ),
  );
  const disqualified = excluded.length > 0;
  if (disqualified) overallScore = Math.min(overallScore, 20);

  const strengths = [...matchedSkills, ...matchedResponsibilities.slice(0, 5)];
  const gaps = [...missingRequiredSkills, ...preferenceConflicts];
  const resultCategory = category(overallScore);
  return {
    overallScore,
    category: resultCategory,
    components,
    strengths,
    partialMatches: partialSkills,
    gaps,
    evidence: {
      matchedSkills,
      partialSkills,
      missingRequiredSkills,
      missingPreferredSkills,
      matchedResponsibilities,
      preferenceConflicts,
      experience: experienceText,
      location: locationText,
    },
    recommendation: disqualified
      ? "Low recommendation because the job contains an excluded preference."
      : `${resultCategory} internal recommendation score based on verified profile and normalized job data.`,
    disqualified,
  };
}
