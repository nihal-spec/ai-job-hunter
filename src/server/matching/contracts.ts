import { z } from "zod";

export const matchWeights = z.object({
  skills: z.number().min(0).max(1),
  experience: z.number().min(0).max(1),
  responsibilities: z.number().min(0).max(1),
  preferences: z.number().min(0).max(1),
  location: z.number().min(0).max(1),
  education: z.number().min(0).max(1),
  other: z.number().min(0).max(1),
});

export const defaultMatchWeights = {
  skills: 0.35,
  experience: 0.2,
  responsibilities: 0.2,
  preferences: 0.1,
  location: 0.05,
  education: 0.05,
  other: 0.05,
} satisfies MatchWeights;

export type MatchWeights = z.infer<typeof matchWeights>;

export type CandidateSkill = {
  name: string;
  verified: boolean;
  source: "resume" | "user" | "ai_inference";
};

export type JobSkill = {
  name: string;
  required: boolean;
};

export type MatchInput = {
  candidate: {
    skills: CandidateSkill[];
    yearsExperience: number | null;
    experienceText: string[];
    educationCount: number;
  };
  job: {
    title: string;
    companyName: string;
    description: string;
    responsibilities: string[];
    skills: JobSkill[];
    experienceMinYears: number | null;
    experienceMaxYears: number | null;
    locationText: string | null;
    workplaceMode: string | null;
    employmentType: string | null;
  };
  preferences: {
    roles: string[];
    locations: string[];
    workplaceModes: string[];
    employmentTypes: string[];
    excludedKeywords: string[];
    preferredCompanies: string[];
    preferredSkills: string[];
    weights: MatchWeights;
  };
  vectorSimilarity?: number | null;
};

export type MatchEvidence = {
  matchedSkills: string[];
  partialSkills: string[];
  missingRequiredSkills: string[];
  missingPreferredSkills: string[];
  matchedResponsibilities: string[];
  preferenceConflicts: string[];
  experience: string;
  location: string;
};

export type MatchResult = {
  overallScore: number;
  category: "Excellent" | "Strong" | "Good" | "Moderate" | "Low";
  components: {
    skills: number;
    experience: number;
    responsibilities: number;
    preferences: number;
    location: number;
    education: number;
    other: number;
  };
  vectorSimilarity: number | null;
  strengths: string[];
  partialMatches: string[];
  gaps: string[];
  evidence: MatchEvidence;
  recommendation: string;
  disqualified: boolean;
};
