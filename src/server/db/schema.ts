import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { customType } from "drizzle-orm/pg-core";

const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return "vector(1536)";
  },
  toDriver(value) {
    return `[${value.join(",")}]`;
  },
  fromDriver(value) {
    return String(value).slice(1, -1).split(",").map(Number);
  },
});

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const resumeStatus = pgEnum("resume_status", [
  "uploaded",
  "extracting",
  "parsing",
  "ready",
  "failed",
  "deleting",
]);

export const profileFactSource = pgEnum("profile_fact_source", ["resume", "user", "ai_inference"]);

export const workplaceMode = pgEnum("workplace_mode", ["remote", "hybrid", "onsite"]);
export const jobStatus = pgEnum("job_status", ["active", "inactive"]);
export const applicationStatus = pgEnum("application_status", [
  "discovered",
  "saved",
  "applying",
  "applied",
  "assessment",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
]);
export const processingStatus = pgEnum("processing_status", [
  "queued",
  "processing",
  "completed",
  "failed",
]);

export const emailCategory = pgEnum("email_category", [
  "application_confirmation",
  "interview_invitation",
  "assessment",
  "rejection",
  "offer",
  "recruiter_message",
  "application_follow_up",
  "other",
]);

export const emailMatchStatus = pgEnum("email_match_status", [
  "unmatched",
  "pending_confirmation",
  "matched",
  "ignored",
]);

export const contactSource = pgEnum("contact_source", ["job_posting", "company_info", "user"]);

export const outreachStatus = pgEnum("outreach_status", [
  "draft",
  "ready",
  "sent",
  "replied",
  "follow_up",
  "closed",
]);

export const outreachResponseCategory = pgEnum("outreach_response_category", [
  "positive",
  "negative",
  "neutral",
  "request_for_information",
  "interview",
  "other",
]);

export const userRole = pgEnum("user_role", ["user", "admin"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    emailNormalized: text("email_normalized"),
    emailVerified: boolean("email_verified").notNull().default(false),
    name: text("name").notNull(),
    image: text("image"),
    role: userRole("role").notNull().default("user"),
    disabledAt: timestamp("disabled_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [uniqueIndex("users_email_normalized_idx").on(table.emailNormalized)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("sessions_token_idx").on(table.token),
    index("sessions_user_id_idx").on(table.userId),
  ],
);

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: text("account_id").notNull(),
    issuer: text("issuer"),
    providerId: text("provider_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("accounts_provider_account_idx").on(table.providerId, table.accountId),
    index("accounts_user_id_idx").on(table.userId),
  ],
);

export const verifications = pgTable(
  "verifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [index("verifications_identifier_idx").on(table.identifier)],
);

export const gmailConnections = pgTable(
  "gmail_connections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    googleAccountId: text("google_account_id").notNull(),
    email: text("email").notNull(),
    accessTokenEncrypted: text("access_token_encrypted").notNull(),
    refreshTokenEncrypted: text("refresh_token_encrypted"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    scope: text("scope").notNull(),
    connectedAt: timestamp("connected_at", { withTimezone: true }).defaultNow().notNull(),
    lastRefreshedAt: timestamp("last_refreshed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("gmail_connections_user_idx").on(table.userId),
    uniqueIndex("gmail_connections_google_account_idx").on(table.googleAccountId),
  ],
);

export const resumes = pgTable(
  "resumes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    originalFileName: text("original_file_name").notNull(),
    storageKey: text("storage_key").notNull(),
    mediaType: text("media_type").notNull(),
    fileSizeBytes: integer("file_size_bytes").notNull(),
    sha256: varchar("sha256", { length: 64 }).notNull(),
    version: integer("version").notNull(),
    status: resumeStatus("status").notNull().default("uploaded"),
    rawText: text("raw_text"),
    parsedData: jsonb("parsed_data"),
    parserVersion: text("parser_version"),
    embedding: vector("embedding"),
    embeddingModel: text("embedding_model"),
    failureCode: text("failure_code"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("resumes_storage_key_idx").on(table.storageKey),
    uniqueIndex("resumes_user_version_idx").on(table.userId, table.version),
    index("resumes_user_created_idx").on(table.userId, table.createdAt),
    check("resumes_file_size_positive_check", sql`${table.fileSizeBytes} > 0`),
  ],
);

export const candidateProfiles = pgTable(
  "candidate_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sourceResumeId: uuid("source_resume_id").references(() => resumes.id, { onDelete: "set null" }),
    name: text("name"),
    email: text("email"),
    phone: text("phone"),
    locationText: text("location_text"),
    countryCode: varchar("country_code", { length: 2 }),
    professionalSummary: text("professional_summary"),
    yearsExperience: numeric("years_experience", { precision: 4, scale: 1 }),
    isActive: boolean("is_active").notNull().default(false),
    schemaVersion: integer("schema_version").notNull().default(1),
    embedding: vector("embedding"),
    embeddingModel: text("embedding_model"),
    ...timestamps,
  },
  (table) => [
    index("candidate_profiles_user_created_idx").on(table.userId, table.createdAt),
    uniqueIndex("candidate_profiles_active_user_idx")
      .on(table.userId)
      .where(sql`${table.isActive} = true`),
    check("candidate_profiles_experience_positive_check", sql`${table.yearsExperience} >= 0`),
  ],
);

export const candidateSkills = pgTable(
  "candidate_skills",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => candidateProfiles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    category: text("category").notNull(),
    source: profileFactSource("source").notNull(),
    evidence: text("evidence"),
    confidence: numeric("confidence", { precision: 4, scale: 3 }).notNull().default("1"),
    verified: boolean("verified").notNull().default(false),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("candidate_skills_profile_name_idx").on(
      table.profileId,
      table.normalizedName,
      table.category,
    ),
    check(
      "candidate_skills_confidence_check",
      sql`${table.confidence} >= 0 AND ${table.confidence} <= 1`,
    ),
  ],
);

const profileRecordFields = {
  id: uuid("id").defaultRandom().primaryKey(),
  profileId: uuid("profile_id")
    .notNull()
    .references(() => candidateProfiles.id, { onDelete: "cascade" }),
  source: profileFactSource("source").notNull(),
  verified: boolean("verified").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
};

export const candidateExperiences = pgTable(
  "candidate_experiences",
  {
    ...profileRecordFields,
    organization: text("organization").notNull(),
    title: text("title").notNull(),
    locationText: text("location_text"),
    startDate: date("start_date"),
    endDate: date("end_date"),
    isCurrent: boolean("is_current").notNull().default(false),
    description: text("description"),
    highlights: jsonb("highlights").notNull().default([]),
  },
  (table) => [index("candidate_experiences_profile_sort_idx").on(table.profileId, table.sortOrder)],
);

export const candidateEducation = pgTable(
  "candidate_education",
  {
    ...profileRecordFields,
    institution: text("institution").notNull(),
    qualification: text("qualification"),
    fieldOfStudy: text("field_of_study"),
    startDate: date("start_date"),
    endDate: date("end_date"),
    grade: text("grade"),
    description: text("description"),
  },
  (table) => [index("candidate_education_profile_sort_idx").on(table.profileId, table.sortOrder)],
);

export const candidateProjects = pgTable(
  "candidate_projects",
  {
    ...profileRecordFields,
    name: text("name").notNull(),
    description: text("description"),
    role: text("role"),
    url: text("url"),
    startDate: date("start_date"),
    endDate: date("end_date"),
    highlights: jsonb("highlights").notNull().default([]),
    technologies: jsonb("technologies").notNull().default([]),
  },
  (table) => [index("candidate_projects_profile_sort_idx").on(table.profileId, table.sortOrder)],
);

export const candidateCertifications = pgTable(
  "candidate_certifications",
  {
    ...profileRecordFields,
    name: text("name").notNull(),
    issuer: text("issuer"),
    issuedAt: date("issued_at"),
    expiresAt: date("expires_at"),
    credentialId: text("credential_id"),
    credentialUrl: text("credential_url"),
  },
  (table) => [
    index("candidate_certifications_profile_sort_idx").on(table.profileId, table.sortOrder),
  ],
);

export const candidateLanguages = pgTable(
  "candidate_languages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => candidateProfiles.id, { onDelete: "cascade" }),
    language: text("language").notNull(),
    proficiency: text("proficiency"),
    source: profileFactSource("source").notNull(),
    verified: boolean("verified").notNull().default(false),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("candidate_languages_profile_language_idx").on(table.profileId, table.language),
  ],
);

export const candidateLinks = pgTable(
  "candidate_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => candidateProfiles.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    label: text("label"),
    url: text("url").notNull(),
    source: profileFactSource("source").notNull(),
    verified: boolean("verified").notNull().default(false),
    ...timestamps,
  },
  (table) => [uniqueIndex("candidate_links_profile_url_idx").on(table.profileId, table.url)],
);

export const jobPreferences = pgTable(
  "job_preferences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    isActive: boolean("is_active").notNull().default(false),
    workplaceModes: jsonb("workplace_modes").notNull().default([]),
    locations: jsonb("locations").notNull().default([]),
    minSalary: numeric("min_salary", { precision: 14, scale: 2 }),
    salaryCurrency: varchar("salary_currency", { length: 3 }),
    maxExperienceYears: numeric("max_experience_years", { precision: 4, scale: 1 }),
    employmentTypes: jsonb("employment_types").notNull().default([]),
    excludedKeywords: jsonb("excluded_keywords").notNull().default([]),
    preferredCompanies: jsonb("preferred_companies").notNull().default([]),
    preferredSkills: jsonb("preferred_skills").notNull().default([]),
    scoringWeights: jsonb("scoring_weights").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("job_preferences_user_name_idx").on(table.userId, table.name),
    uniqueIndex("job_preferences_active_user_idx")
      .on(table.userId)
      .where(sql`${table.isActive} = true`),
  ],
);

export const preferenceRoles = pgTable(
  "preference_roles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    preferenceId: uuid("preference_id")
      .notNull()
      .references(() => jobPreferences.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    normalizedRole: text("normalized_role").notNull(),
    priority: integer("priority").notNull().default(0),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("preference_roles_normalized_idx").on(table.preferenceId, table.normalizedRole),
  ],
);

export const preferenceSkills = pgTable(
  "preference_skills",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    preferenceId: uuid("preference_id")
      .notNull()
      .references(() => jobPreferences.id, { onDelete: "cascade" }),
    skill: text("skill").notNull(),
    normalizedSkill: text("normalized_skill").notNull(),
    weight: numeric("weight", { precision: 4, scale: 3 }).notNull().default("1"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("preference_skills_normalized_idx").on(table.preferenceId, table.normalizedSkill),
    check("preference_skills_weight_check", sql`${table.weight} >= 0 AND ${table.weight} <= 1`),
  ],
);

export const jobSources = pgTable(
  "job_sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    adapterType: text("adapter_type").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    configuration: jsonb("configuration").notNull().default({}),
    enabled: boolean("enabled").notNull().default(false),
    lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
    lastFailureAt: timestamp("last_failure_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [uniqueIndex("job_sources_slug_idx").on(table.slug)],
);

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyName: text("company_name").notNull(),
    companyNormalized: text("company_normalized").notNull(),
    title: text("title").notNull(),
    titleNormalized: text("title_normalized").notNull(),
    description: text("description").notNull(),
    responsibilities: jsonb("responsibilities").notNull().default([]),
    requirements: jsonb("requirements").notNull().default([]),
    skills: jsonb("skills").notNull().default([]),
    locationText: text("location_text"),
    locationNormalized: text("location_normalized"),
    countryCode: varchar("country_code", { length: 2 }),
    workplaceMode: workplaceMode("workplace_mode"),
    employmentType: text("employment_type"),
    experienceMinYears: numeric("experience_min_years", { precision: 4, scale: 1 }),
    experienceMaxYears: numeric("experience_max_years", { precision: 4, scale: 1 }),
    salaryMin: numeric("salary_min", { precision: 14, scale: 2 }),
    salaryMax: numeric("salary_max", { precision: 14, scale: 2 }),
    salaryCurrency: varchar("salary_currency", { length: 3 }),
    canonicalApplicationUrl: text("canonical_application_url").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    status: jobStatus("status").notNull().default("active"),
    normalizationVersion: text("normalization_version").notNull(),
    contentHash: text("content_hash").notNull(),
    embedding: vector("embedding"),
    embeddingModel: text("embedding_model"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("jobs_canonical_application_url_idx").on(table.canonicalApplicationUrl),
    index("jobs_status_published_idx").on(table.status, table.publishedAt),
    index("jobs_company_title_location_idx").on(
      table.companyNormalized,
      table.titleNormalized,
      table.locationNormalized,
    ),
    index("jobs_content_hash_idx").on(table.contentHash),
  ],
);

export const jobSourceRecords = pgTable(
  "job_source_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => jobSources.id),
    sourceJobId: text("source_job_id").notNull(),
    applicationUrl: text("application_url").notNull(),
    rawData: jsonb("raw_data").notNull(),
    rawHash: text("raw_hash").notNull(),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).defaultNow().notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
    active: boolean("active").notNull().default(true),
  },
  (table) => [
    uniqueIndex("job_source_records_source_job_idx").on(table.sourceId, table.sourceJobId),
    index("job_source_records_job_idx").on(table.jobId),
  ],
);

export const jobIngestionRuns = pgTable(
  "job_ingestion_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => jobSources.id, { onDelete: "cascade" }),
    status: processingStatus("status").notNull().default("queued"),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    fetchedCount: integer("fetched_count").notNull().default(0),
    createdCount: integer("created_count").notNull().default(0),
    updatedCount: integer("updated_count").notNull().default(0),
    duplicateCount: integer("duplicate_count").notNull().default(0),
    failedCount: integer("failed_count").notNull().default(0),
    cursor: jsonb("cursor"),
    errorCode: text("error_code"),
    ...timestamps,
  },
  (table) => [index("job_ingestion_runs_source_started_idx").on(table.sourceId, table.startedAt)],
);

export const jobMatches = pgTable(
  "job_matches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => candidateProfiles.id),
    preferenceId: uuid("preference_id")
      .notNull()
      .references(() => jobPreferences.id),
    overallScore: numeric("overall_score", { precision: 5, scale: 2 }).notNull(),
    skillsScore: numeric("skills_score", { precision: 5, scale: 2 }).notNull(),
    experienceScore: numeric("experience_score", { precision: 5, scale: 2 }).notNull(),
    responsibilitiesScore: numeric("responsibilities_score", { precision: 5, scale: 2 }).notNull(),
    preferenceScore: numeric("preference_score", { precision: 5, scale: 2 }).notNull(),
    locationScore: numeric("location_score", { precision: 5, scale: 2 }).notNull(),
    educationScore: numeric("education_score", { precision: 5, scale: 2 }).notNull(),
    otherScore: numeric("other_score", { precision: 5, scale: 2 }).notNull(),
    vectorSimilarity: numeric("vector_similarity", { precision: 6, scale: 5 }),
    strengths: jsonb("strengths").notNull().default([]),
    partialMatches: jsonb("partial_matches").notNull().default([]),
    gaps: jsonb("gaps").notNull().default([]),
    explanation: jsonb("explanation").notNull(),
    recommendation: text("recommendation").notNull(),
    weights: jsonb("weights").notNull(),
    algorithmVersion: text("algorithm_version").notNull(),
    aiProvider: text("ai_provider"),
    aiModel: text("ai_model"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("job_matches_version_idx").on(
      table.userId,
      table.jobId,
      table.profileId,
      table.preferenceId,
      table.algorithmVersion,
    ),
    index("job_matches_user_score_idx").on(table.userId, table.overallScore),
    check(
      "job_matches_score_bounds_check",
      sql`${table.overallScore} >= 0 AND ${table.overallScore} <= 100`,
    ),
  ],
);

export const savedJobs = pgTable(
  "saved_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [uniqueIndex("saved_jobs_user_job_idx").on(table.userId, table.jobId)],
);

export const applications = pgTable(
  "applications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id),
    resumeId: uuid("resume_id").references(() => resumes.id, { onDelete: "set null" }),
    status: applicationStatus("status").notNull().default("applying"),
    sourceUrl: text("source_url"),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
    nextActionAt: timestamp("next_action_at", { withTimezone: true }),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("applications_user_job_idx").on(table.userId, table.jobId),
    index("applications_user_status_updated_idx").on(table.userId, table.status, table.updatedAt),
  ],
);

export const applicationStatusEvents = pgTable(
  "application_status_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    fromStatus: applicationStatus("from_status"),
    toStatus: applicationStatus("to_status").notNull(),
    changedBy: text("changed_by").notNull(),
    note: text("note"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("application_status_events_application_idx").on(table.applicationId, table.occurredAt),
  ],
);

export const applicationMaterials = pgTable(
  "application_materials",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    version: integer("version").notNull(),
    content: text("content").notNull(),
    structuredContent: jsonb("structured_content"),
    sourceFacts: jsonb("source_facts").notNull(),
    generationStatus: processingStatus("generation_status").notNull().default("queued"),
    aiProvider: text("ai_provider"),
    aiModel: text("ai_model"),
    promptVersion: text("prompt_version"),
    userReviewedAt: timestamp("user_reviewed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("application_materials_version_idx").on(
      table.applicationId,
      table.type,
      table.version,
    ),
  ],
);

export const userFeedback = pgTable(
  "user_feedback",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    matchId: uuid("match_id").references(() => jobMatches.id, { onDelete: "set null" }),
    feedbackType: text("feedback_type").notNull(),
    reasonCode: text("reason_code"),
    comment: text("comment"),
    ...timestamps,
  },
  (table) => [index("user_feedback_user_created_idx").on(table.userId, table.createdAt)],
);

export const processingJobs = pgTable(
  "processing_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    type: text("type").notNull(),
    status: processingStatus("status").notNull().default("queued"),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    payload: jsonb("payload").notNull().default({}),
    idempotencyKey: text("idempotency_key"),
    progress: integer("progress").notNull().default(0),
    attemptCount: integer("attempt_count").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    availableAt: timestamp("available_at", { withTimezone: true }).defaultNow().notNull(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockedBy: text("locked_by"),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
    lastErrorCode: text("last_error_code"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("processing_jobs_idempotency_idx").on(table.idempotencyKey),
    index("processing_jobs_claim_idx").on(table.status, table.availableAt),
  ],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: uuid("resource_id"),
    outcome: text("outcome").notNull(),
    requestId: text("request_id"),
    ipHash: text("ip_hash"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("audit_events_user_created_idx").on(table.userId, table.createdAt)],
);

export const usageCounters = pgTable(
  "usage_counters",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    scope: text("scope").notNull(),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(0),
    costUnits: numeric("cost_units", { precision: 14, scale: 4 }).notNull().default("0"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("usage_counters_user_scope_period_idx").on(
      table.userId,
      table.scope,
      table.periodStart,
    ),
  ],
);

export const emailThreads = pgTable(
  "email_threads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    gmailThreadId: text("gmail_thread_id").notNull(),
    subject: text("subject"),
    ...timestamps,
  },
  (table) => [uniqueIndex("email_threads_user_thread_idx").on(table.userId, table.gmailThreadId)],
);

export const emailMessages = pgTable(
  "email_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    threadId: uuid("thread_id").references(() => emailThreads.id, { onDelete: "cascade" }),
    providerMessageId: text("provider_message_id").notNull(),
    sender: text("sender").notNull(),
    recipient: text("recipient"),
    subject: text("subject"),
    snippet: text("snippet"),
    bodyText: text("body_text"),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
    classification: emailCategory("classification"),
    classificationConfidence: numeric("classification_confidence", { precision: 4, scale: 3 }),
    applicationId: uuid("application_id").references(() => applications.id, { onDelete: "set null" }),
    matchStatus: emailMatchStatus("match_status").notNull().default("unmatched"),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("email_messages_user_provider_idx").on(table.userId, table.providerMessageId),
    index("email_messages_user_received_idx").on(table.userId, table.receivedAt),
    index("email_messages_application_idx").on(table.applicationId),
  ],
);

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    jobId: uuid("job_id").references(() => jobs.id, { onDelete: "set null" }),
    company: text("company").notNull(),
    name: text("name"),
    role: text("role"),
    email: text("email"),
    source: contactSource("source").notNull(),
    confidence: numeric("confidence", { precision: 4, scale: 3 }).notNull().default("1"),
    ...timestamps,
  },
  (table) => [index("contacts_user_created_idx").on(table.userId, table.createdAt)],
);

export const outreachMessages = pgTable(
  "outreach_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    jobId: uuid("job_id").references(() => jobs.id, { onDelete: "set null" }),
    applicationId: uuid("application_id").references(() => applications.id, { onDelete: "set null" }),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    status: outreachStatus("status").notNull().default("draft"),
    followUpCount: integer("follow_up_count").notNull().default(0),
    maxFollowUps: integer("max_follow_ups").notNull().default(1),
    sourceFacts: jsonb("source_facts").notNull().default({}),
    aiProvider: text("ai_provider"),
    aiModel: text("ai_model"),
    promptVersion: text("prompt_version"),
    providerMessageId: text("provider_message_id"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("outreach_messages_user_status_idx").on(table.userId, table.status),
    index("outreach_messages_contact_idx").on(table.contactId),
  ],
);

export const outreachEvents = pgTable(
  "outreach_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    outreachId: uuid("outreach_id")
      .notNull()
      .references(() => outreachMessages.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    responseCategory: outreachResponseCategory("response_category"),
    note: text("note"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("outreach_events_outreach_idx").on(table.outreachId, table.occurredAt)],
);

export type Job = typeof jobs.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type ApplicationMaterial = typeof applicationMaterials.$inferSelect;
export type EmailMessage = typeof emailMessages.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type OutreachMessage = typeof outreachMessages.$inferSelect;

