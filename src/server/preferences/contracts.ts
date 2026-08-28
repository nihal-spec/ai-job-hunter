import { z } from "zod";

const list = (max: number) => z.array(z.string().trim().min(1).max(100)).max(max);

export const scoringWeights = z
  .object({
    skills: z.number().min(0).max(1),
    experience: z.number().min(0).max(1),
    responsibilities: z.number().min(0).max(1),
    preferences: z.number().min(0).max(1),
    location: z.number().min(0).max(1),
    education: z.number().min(0).max(1),
    other: z.number().min(0).max(1),
  })
  .refine(
    (weights) =>
      Math.abs(Object.values(weights).reduce((sum, value) => sum + value, 0) - 1) < 0.0001,
    {
      message: "Scoring weights must add up to 1.",
    },
  );

export const preferenceInput = z.object({
  name: z.string().trim().min(1).max(100),
  workplaceModes: z
    .array(z.enum(["remote", "hybrid", "onsite"]))
    .max(3)
    .default([]),
  locations: list(30).default([]),
  minSalary: z.number().min(0).max(999999999).nullable().default(null),
  salaryCurrency: z.string().trim().length(3).toUpperCase().nullable().default(null),
  maxExperienceYears: z.number().min(0).max(99.9).nullable().default(null),
  employmentTypes: list(10).default([]),
  excludedKeywords: list(50).default([]),
  preferredCompanies: list(50).default([]),
  roles: list(20).default([]),
  skills: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(100),
        weight: z.number().min(0).max(1).default(1),
      }),
    )
    .max(100)
    .default([]),
  scoringWeights: scoringWeights.default({
    skills: 0.35,
    experience: 0.2,
    responsibilities: 0.2,
    preferences: 0.1,
    location: 0.05,
    education: 0.05,
    other: 0.05,
  }),
});

export type PreferenceInput = z.infer<typeof preferenceInput>;
