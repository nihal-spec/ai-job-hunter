"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface MaterialRecord {
  id: string;
  applicationId: string;
  type: string;
  version: number;
  content: string;
  structuredContent: Record<string, unknown> | null;
  userReviewedAt: string | null;
  createdAt: string;
}

interface ApplicationData {
  application: {
    id: string;
    status: string;
    notes: string | null;
    sourceUrl: string | null;
    appliedAt: string | null;
    nextActionAt: string | null;
  };
  job: {
    id: string;
    title: string;
    companyName: string;
    locationText: string | null;
    workplaceMode: string | null;
    description: string;
  };
  events: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    changedBy: string;
    note: string | null;
    occurredAt: string;
  }>;
}

export function AssistantWorkspace({ applicationId }: { applicationId: string }) {
  const [appData, setAppData] = useState<ApplicationData | null>(null);
  const [materials, setMaterials] = useState<MaterialRecord[]>([]);
  const [activeTab, setActiveTab] = useState<"cover_letter" | "tailored_resume" | "screening" | "history">("cover_letter");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Cover letter options
  const [tone, setTone] = useState<"professional" | "enthusiastic" | "technical" | "concise">("professional");
  const [coverLetterEdit, setCoverLetterEdit] = useState("");

  // Tailored resume options
  const [resumeEdit, setResumeEdit] = useState("");

  // Screening questions options
  const [screeningInput, setScreeningInput] = useState(
    "Why are you interested in this role?\nHow many years of relevant software engineering experience do you have?\nWhat experience do you have with the technologies mentioned in this job description?",
  );
  const [screeningEdit, setScreeningEdit] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [appRes, matRes] = await Promise.all([
        fetch(`/api/applications/${applicationId}`, { cache: "no-store" }),
        fetch(`/api/applications/${applicationId}/materials`, { cache: "no-store" }),
      ]);

      if (appRes.ok) {
        const json = await appRes.json();
        setAppData(json.data);
      }
      if (matRes.ok) {
        const json = await matRes.json();
        const list: MaterialRecord[] = json.data || [];
        setMaterials(list);

        const latestCover = list.find((m) => m.type === "cover_letter");
        if (latestCover && !coverLetterEdit) setCoverLetterEdit(latestCover.content);

        const latestResume = list.find((m) => m.type === "tailored_resume_recommendations");
        if (latestResume && !resumeEdit) setResumeEdit(latestResume.content);

        const latestScreening = list.find((m) => m.type === "screening_answers");
        if (latestScreening && !screeningEdit) setScreeningEdit(latestScreening.content);
      }
    } catch {
      setMessage("Error loading application data.");
    }
  }, [applicationId, coverLetterEdit, resumeEdit, screeningEdit]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  async function generateCoverLetter() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/applications/${applicationId}/cover-letters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error?.message || "Failed to generate cover letter.");
      } else {
        setCoverLetterEdit(data.data.material.content);
        setMessage("Generated new cover letter draft based strictly on verified profile facts.");
        await loadData();
      }
    } catch {
      setMessage("Failed to generate cover letter.");
    } finally {
      setLoading(false);
    }
  }

  async function generateResumeRecommendations() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/applications/${applicationId}/tailored-resume-recommendations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error?.message || "Failed to generate resume recommendations.");
      } else {
        setResumeEdit(data.data.material.content);
        setMessage("Generated tailored resume advice highlighting verified candidate qualifications.");
        await loadData();
      }
    } catch {
      setMessage("Failed to generate tailored resume recommendations.");
    } finally {
      setLoading(false);
    }
  }

  async function generateScreening() {
    setLoading(true);
    setMessage(null);
    const questions = screeningInput
      .split("\n")
      .map((q) => q.trim())
      .filter((q) => q.length > 2);

    if (questions.length === 0) {
      setMessage("Please enter at least one question.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/applications/${applicationId}/screening-answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error?.message || "Failed to generate screening answers.");
      } else {
        setScreeningEdit(data.data.material.content);
        setMessage("Generated truthful answers to screening questions.");
        await loadData();
      }
    } catch {
      setMessage("Failed to generate screening answers.");
    } finally {
      setLoading(false);
    }
  }

  async function saveMaterialEdit(type: string, content: string, markReviewed = false) {
    const target = materials.find((m) => m.type === type);
    if (!target) {
      setMessage("Generate a draft first before saving edits.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/applications/${applicationId}/materials/${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, markReviewed }),
      });
      if (res.ok) {
        setMessage(markReviewed ? "Saved and marked as reviewed!" : "Edits saved successfully.");
        await loadData();
      } else {
        setMessage("Failed to save changes.");
      }
    } catch {
      setMessage("Failed to save changes.");
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text: string) {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const latestCover = materials.find((m) => m.type === "cover_letter");
  const latestResume = materials.find((m) => m.type === "tailored_resume_recommendations");
  const latestScreening = materials.find((m) => m.type === "screening_answers");

  return (
    <div className="assistant-container" style={{ display: "grid", gap: "2rem", maxWidth: "64rem" }}>
      <header className="assistant-header" style={{ borderBottom: "1px solid var(--line)", paddingBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <p className="eyebrow" style={{ margin: "0 0 0.5rem" }}>AI Application Assistant</p>
            <h1 style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", margin: "0 0 0.5rem" }}>
              {appData?.job ? `${appData.job.title} at ${appData.job.companyName}` : "Application Assistant"}
            </h1>
            <p style={{ color: "var(--muted)", margin: 0 }}>
              Status: <strong>{appData?.application.status}</strong> • {appData?.job.locationText || "Remote/Flexible"}
            </p>
          </div>
          <Link href="/applications" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 700, fontSize: "0.9rem" }}>
            ← Back to Tracker
          </Link>
        </div>

        {/* Safety & Truthfulness Notice */}
        <div
          style={{
            marginTop: "1.25rem",
            padding: "0.85rem 1.15rem",
            borderRadius: "0.5rem",
            backgroundColor: "var(--accent-soft)",
            border: "1px solid #c2d8c9",
            color: "var(--ink)",
            fontSize: "0.85rem",
            lineHeight: 1.5,
          }}
        >
          <strong>🛡️ Truthfulness & Privacy Guarantee:</strong> Materials are generated strictly from your verified candidate profile facts. AI never invents skills or credentials. All materials are editable drafts; you retain 100% human control over final submissions.
        </div>
      </header>

      {message && (
        <div
          role="status"
          style={{
            padding: "0.75rem 1rem",
            borderRadius: "0.5rem",
            background: "var(--surface)",
            border: "1px solid var(--line)",
            fontSize: "0.9rem",
          }}
        >
          {message}
        </div>
      )}

      {/* Tabs Navigation */}
      <nav style={{ display: "flex", gap: "0.5rem", borderBottom: "2px solid var(--line)", paddingBottom: "0.5rem", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => setActiveTab("cover_letter")}
          style={{
            background: activeTab === "cover_letter" ? "var(--accent)" : "transparent",
            color: activeTab === "cover_letter" ? "white" : "var(--ink)",
            border: "1px solid var(--line)",
            padding: "0.5rem 1rem",
            borderRadius: "0.4rem",
            fontSize: "0.85rem",
          }}
        >
          📄 Cover Letter {latestCover && `(v${latestCover.version})`}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("tailored_resume")}
          style={{
            background: activeTab === "tailored_resume" ? "var(--accent)" : "transparent",
            color: activeTab === "tailored_resume" ? "white" : "var(--ink)",
            border: "1px solid var(--line)",
            padding: "0.5rem 1rem",
            borderRadius: "0.4rem",
            fontSize: "0.85rem",
          }}
        >
          🎯 Tailored Resume Advice {latestResume && `(v${latestResume.version})`}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("screening")}
          style={{
            background: activeTab === "screening" ? "var(--accent)" : "transparent",
            color: activeTab === "screening" ? "white" : "var(--ink)",
            border: "1px solid var(--line)",
            padding: "0.5rem 1rem",
            borderRadius: "0.4rem",
            fontSize: "0.85rem",
          }}
        >
          💬 Screening Answers {latestScreening && `(v${latestScreening.version})`}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("history")}
          style={{
            background: activeTab === "history" ? "var(--accent)" : "transparent",
            color: activeTab === "history" ? "white" : "var(--ink)",
            border: "1px solid var(--line)",
            padding: "0.5rem 1rem",
            borderRadius: "0.4rem",
            fontSize: "0.85rem",
          }}
        >
          🕒 History ({materials.length})
        </button>
      </nav>

      {/* Tab: Cover Letter */}
      {activeTab === "cover_letter" && (
        <section style={{ display: "grid", gap: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 700 }}>
                Tone:
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value as typeof tone)}
                  style={{ marginLeft: "0.5rem", padding: "0.35rem 0.5rem", borderRadius: "0.4rem", border: "1px solid var(--line)" }}
                >
                  <option value="professional">Professional</option>
                  <option value="enthusiastic">Enthusiastic</option>
                  <option value="technical">Technical</option>
                  <option value="concise">Concise</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => void generateCoverLetter()}
                disabled={loading}
                style={{ minHeight: "2.2rem", padding: "0.35rem 0.85rem", fontSize: "0.85rem" }}
              >
                {loading ? "Generating..." : latestCover ? "Regenerate Draft (New Version)" : "Generate Cover Letter"}
              </button>
            </div>
            {latestCover && (
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => copyToClipboard(coverLetterEdit)}
                  style={{ background: "var(--surface)", color: "var(--ink)", borderColor: "var(--line)", minHeight: "2.2rem", fontSize: "0.85rem" }}
                >
                  {copied ? "✓ Copied!" : "📋 Copy"}
                </button>
                <button
                  type="button"
                  onClick={() => void saveMaterialEdit("cover_letter", coverLetterEdit, true)}
                  disabled={loading}
                  style={{ minHeight: "2.2rem", padding: "0.35rem 0.85rem", fontSize: "0.85rem" }}
                >
                  {latestCover.userReviewedAt ? "✓ Reviewed (Save Changes)" : "Mark as Reviewed"}
                </button>
              </div>
            )}
          </div>

          <div style={{ display: "grid", gap: "0.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--muted)" }}>
              <span>Editable Cover Letter Draft</span>
              {latestCover?.userReviewedAt && <span style={{ color: "var(--accent)", fontWeight: 700 }}>✓ Human Reviewed on {new Date(latestCover.userReviewedAt).toLocaleDateString()}</span>}
            </div>
            <textarea
              rows={16}
              value={coverLetterEdit}
              onChange={(e) => setCoverLetterEdit(e.target.value)}
              placeholder="Click 'Generate Cover Letter' to draft a tailored letter based on your verified experiences..."
              style={{
                width: "100%",
                padding: "1rem",
                borderRadius: "0.5rem",
                border: "1px solid var(--line)",
                background: "white",
                fontFamily: "inherit",
                fontSize: "0.95rem",
                lineHeight: 1.6,
              }}
            />
          </div>
        </section>
      )}

      {/* Tab: Tailored Resume Recommendations */}
      {activeTab === "tailored_resume" && (
        <section style={{ display: "grid", gap: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--muted)" }}>
              Actionable advice on which verified skills & achievements to emphasize for this role.
            </p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={() => void generateResumeRecommendations()}
                disabled={loading}
                style={{ minHeight: "2.2rem", padding: "0.35rem 0.85rem", fontSize: "0.85rem" }}
              >
                {loading ? "Analyzing..." : latestResume ? "Refresh Recommendations" : "Generate Resume Advice"}
              </button>
              {latestResume && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(resumeEdit)}
                  style={{ background: "var(--surface)", color: "var(--ink)", borderColor: "var(--line)", minHeight: "2.2rem", fontSize: "0.85rem" }}
                >
                  {copied ? "✓ Copied!" : "📋 Copy"}
                </button>
              )}
            </div>
          </div>

          <textarea
            rows={16}
            value={resumeEdit}
            onChange={(e) => setResumeEdit(e.target.value)}
            placeholder="Click 'Generate Resume Advice' to view strategic optimization guidance..."
            style={{
              width: "100%",
              padding: "1rem",
              borderRadius: "0.5rem",
              border: "1px solid var(--line)",
              background: "white",
              fontFamily: "monospace",
              fontSize: "0.9rem",
              lineHeight: 1.6,
            }}
          />
        </section>
      )}

      {/* Tab: Screening Questions */}
      {activeTab === "screening" && (
        <section style={{ display: "grid", gap: "1.5rem" }}>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.85rem", fontWeight: 700 }}>
              Enter application questions (one per line):
            </label>
            <textarea
              rows={4}
              value={screeningInput}
              onChange={(e) => setScreeningInput(e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "0.5rem",
                border: "1px solid var(--line)",
                background: "white",
                fontSize: "0.9rem",
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
              <button
                type="button"
                onClick={() => void generateScreening()}
                disabled={loading}
                style={{ minHeight: "2.2rem", padding: "0.35rem 0.85rem", fontSize: "0.85rem" }}
              >
                {loading ? "Drafting Answers..." : "Suggest Truthful Answers"}
              </button>
            </div>
          </div>

          {screeningEdit && (
            <div style={{ display: "grid", gap: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>Suggested Responses:</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(screeningEdit)}
                  style={{ background: "var(--surface)", color: "var(--ink)", borderColor: "var(--line)", minHeight: "2rem", fontSize: "0.8rem" }}
                >
                  {copied ? "✓ Copied!" : "📋 Copy All"}
                </button>
              </div>
              <textarea
                rows={12}
                value={screeningEdit}
                onChange={(e) => setScreeningEdit(e.target.value)}
                style={{
                  width: "100%",
                  padding: "1rem",
                  borderRadius: "0.5rem",
                  border: "1px solid var(--line)",
                  background: "white",
                  fontFamily: "inherit",
                  fontSize: "0.9rem",
                  lineHeight: 1.6,
                }}
              />
            </div>
          )}
        </section>
      )}

      {/* Tab: Version History */}
      {activeTab === "history" && (
        <section style={{ display: "grid", gap: "1rem" }}>
          <h2 style={{ fontSize: "1.25rem", margin: 0 }}>Generated Materials History</h2>
          {materials.length === 0 ? (
            <p style={{ color: "var(--muted)" }}>No materials have been generated for this application yet.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.75rem" }}>
              {materials.map((m) => (
                <li
                  key={m.id}
                  style={{
                    padding: "1rem",
                    borderRadius: "0.5rem",
                    border: "1px solid var(--line)",
                    background: "var(--surface)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "0.75rem",
                  }}
                >
                  <div>
                    <strong>{m.type.replace(/_/g, " ").toUpperCase()} (Version {m.version})</strong>
                    <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", color: "var(--muted)" }}>
                      Generated: {new Date(m.createdAt).toLocaleString()} {m.userReviewedAt && `• Reviewed on ${new Date(m.userReviewedAt).toLocaleDateString()}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (m.type === "cover_letter") {
                        setCoverLetterEdit(m.content);
                        setActiveTab("cover_letter");
                      } else if (m.type === "tailored_resume_recommendations") {
                        setResumeEdit(m.content);
                        setActiveTab("tailored_resume");
                      } else {
                        setScreeningEdit(m.content);
                        setActiveTab("screening");
                      }
                    }}
                    style={{
                      background: "transparent",
                      color: "var(--accent)",
                      borderColor: "var(--accent)",
                      minHeight: "2rem",
                      fontSize: "0.8rem",
                    }}
                  >
                    View in Editor
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
