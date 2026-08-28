import { z } from "zod";

export const materialTypes = [
  "cover_letter",
  "tailored_resume_recommendations",
  "screening_answers",
] as const;

export const materialTypeSchema = z.enum(materialTypes);
export type MaterialType = z.infer<typeof materialTypeSchema>;

export const verifiedSkillSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  normalizedName: z.string(),
  category: z.string(),
  source: z.string().default("resume"),
  verified: z.boolean().default(true),
  confidence: z.string().optional(),
});

export const verifiedExperienceSchema = z.object({
  id: z.string().optional(),
  organization: z.string(),
  title: z.string(),
  locationText: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  isCurrent: z.boolean().default(false),
  description: z.string().nullable().optional(),
  highlights: z.array(z.string()).default([]),
});

export const verifiedEducationSchema = z.object({
  id: z.string().optional(),
  institution: z.string(),
  qualification: z.string().nullable().optional(),
  fieldOfStudy: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  grade: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

export const verifiedProjectSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  highlights: z.array(z.string()).default([]),
  technologies: z.array(z.string()).default([]),
});

export const verifiedCertificationSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  issuer: z.string().nullable().optional(),
  issuedAt: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  credentialId: z.string().nullable().optional(),
  credentialUrl: z.string().nullable().optional(),
});

export const verifiedLanguageSchema = z.object({
  id: z.string().optional(),
  language: z.string(),
  proficiency: z.string().nullable().optional(),
});

export const verifiedCandidateFactsSchema = z.object({
  profileId: z.string(),
  candidateName: z.string().nullable(),
  candidateEmail: z.string().nullable(),
  candidatePhone: z.string().nullable(),
  locationText: z.string().nullable(),
  countryCode: z.string().nullable(),
  professionalSummary: z.string().nullable(),
  yearsExperience: z.number().nullable(),
  skills: z.array(verifiedSkillSchema).default([]),
  experiences: z.array(verifiedExperienceSchema).default([]),
  education: z.array(verifiedEducationSchema).default([]),
  projects: z.array(verifiedProjectSchema).default([]),
  certifications: z.array(verifiedCertificationSchema).default([]),
  languages: z.array(verifiedLanguageSchema).default([]),
});

export type VerifiedCandidateFacts = z.infer<typeof verifiedCandidateFactsSchema>;

export const generateCoverLetterInputSchema = z.object({
  tone: z.enum(["professional", "enthusiastic", "technical", "concise"]).default("professional"),
  customEmphasis: z.string().trim().max(1000).optional(),
});
export type GenerateCoverLetterInput = z.infer<typeof generateCoverLetterInputSchema>;

export const generateTailoredResumeInputSchema = z.object({
  focusArea: z.string().trim().max(500).optional(),
});
export type GenerateTailoredResumeInput = z.infer<typeof generateTailoredResumeInputSchema>;

export const generateScreeningAnswersInputSchema = z.object({
  questions: z.array(z.string().trim().min(2).max(1000)).min(1).max(20),
});
export type GenerateScreeningAnswersInput = z.infer<typeof generateScreeningAnswersInputSchema>;

export const updateMaterialInputSchema = z.object({
  content: z.string().min(1).max(20000),
  structuredContent: z.record(z.string(), z.unknown()).optional(),
  markReviewed: z.boolean().default(false),
});
export type UpdateMaterialInput = z.infer<typeof updateMaterialInputSchema>;

export const coverLetterStructuredSchema = z.object({
  recipient: z.string().default("Hiring Team"),
  companyName: z.string(),
  jobTitle: z.string(),
  salutation: z.string(),
  opening: z.string(),
  bodyParagraphs: z.array(z.string()).min(1),
  closing: z.string(),
  signoff: z.string(),
  citedFactIds: z.array(z.string()).default([]),
  highlightedSkills: z.array(z.string()).default([]),
  fullText: z.string(),
});
export type CoverLetterStructured = z.infer<typeof coverLetterStructuredSchema>;

export const bulletSuggestionSchema = z.object({
  section: z.enum(["experience", "project", "summary", "skills"]),
  itemTitle: z.string(),
  originalFact: z.string(),
  suggestedBullet: z.string(),
  reason: z.string(),
  alignedJobRequirement: z.string(),
});
export type BulletSuggestion = z.infer<typeof bulletSuggestionSchema>;

export const tailoredResumeStructuredSchema = z.object({
  summaryRecommendation: z.string(),
  bulletSuggestions: z.array(bulletSuggestionSchema).default([]),
  skillsToEmphasize: z.array(z.string()).default([]),
  projectsToHighlight: z.array(z.string()).default([]),
  verifiedQualificationsMatched: z.array(z.string()).default([]),
  potentialGapsToAddress: z.array(z.string()).default([]),
  fullText: z.string(),
});
export type TailoredResumeStructured = z.infer<typeof tailoredResumeStructuredSchema>;

export const screeningAnswerItemSchema = z.object({
  question: z.string(),
  suggestedAnswer: z.string(),
  keyEvidence: z.array(z.string()).default([]),
  sourceFactReferences: z.array(z.string()).default([]),
});

export const screeningAnswersStructuredSchema = z.object({
  answers: z.array(screeningAnswerItemSchema),
  fullText: z.string(),
});
export type ScreeningAnswersStructured = z.infer<typeof screeningAnswersStructuredSchema>;

export interface ClaimVerificationResult {
  isValid: boolean;
  truthfulnessScore: number;
  citedFactsCount: number;
  unverifiedClaims: string[];
  warnings: string[];
}
