import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();
const optionalDate = z.string().date().nullable().optional();

export const profileSkillInput = z.object({
  name: z.string().trim().min(1).max(100),
  category: z.string().trim().min(1).max(50),
});

export const profileExperienceInput = z.object({
  organization: z.string().trim().min(1).max(200),
  title: z.string().trim().min(1).max(200),
  locationText: optionalText(200),
  startDate: optionalDate,
  endDate: optionalDate,
  isCurrent: z.boolean().default(false),
  description: optionalText(4000),
  highlights: z.array(z.string().trim().min(1).max(500)).max(20).default([]),
});

export const profileEducationInput = z.object({
  institution: z.string().trim().min(1).max(200),
  qualification: optionalText(200),
  fieldOfStudy: optionalText(200),
  startDate: optionalDate,
  endDate: optionalDate,
  grade: optionalText(100),
  description: optionalText(2000),
});

export const profileProjectInput = z.object({
  name: z.string().trim().min(1).max(200),
  description: optionalText(4000),
  role: optionalText(200),
  url: z.url().max(500).nullable().optional(),
  startDate: optionalDate,
  endDate: optionalDate,
  highlights: z.array(z.string().trim().min(1).max(500)).max(20).default([]),
  technologies: z.array(z.string().trim().min(1).max(100)).max(50).default([]),
});

export const profileCertificationInput = z.object({
  name: z.string().trim().min(1).max(200),
  issuer: optionalText(200),
  issuedAt: optionalDate,
  expiresAt: optionalDate,
  credentialId: optionalText(200),
  credentialUrl: z.url().max(500).nullable().optional(),
});

export const profileLanguageInput = z.object({
  language: z.string().trim().min(1).max(100),
  proficiency: optionalText(100),
});

export const profileLinkInput = z.object({
  type: z.string().trim().min(1).max(50),
  label: optionalText(100),
  url: z.url({ protocol: /^https?$/ }).max(500),
});

export const profileInput = z.object({
  name: optionalText(200),
  email: z.email().max(254).nullable().optional(),
  phone: optionalText(50),
  locationText: optionalText(200),
  countryCode: z.string().trim().length(2).toUpperCase().nullable().optional(),
  professionalSummary: optionalText(4000),
  yearsExperience: z.number().min(0).max(99.9).nullable().optional(),
  skills: z.array(profileSkillInput).max(100).default([]),
  experiences: z.array(profileExperienceInput).max(30).default([]),
  education: z.array(profileEducationInput).max(20).default([]),
  projects: z.array(profileProjectInput).max(50).default([]),
  certifications: z.array(profileCertificationInput).max(50).default([]),
  languages: z.array(profileLanguageInput).max(30).default([]),
  links: z.array(profileLinkInput).max(30).default([]),
});

export type ProfileInput = z.infer<typeof profileInput>;
