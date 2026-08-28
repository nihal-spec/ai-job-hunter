"use client";

import { ChangeEvent, useEffect, useState } from "react";

type Resume = {
  id: string;
  displayName: string;
  originalFileName: string;
  mediaType: string;
  fileSizeBytes: number;
  version: number;
  status: "uploaded" | "extracting" | "parsing" | "ready" | "failed" | "deleting";
  failureCode: string | null;
  createdAt: string;
};

function formatBytes(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function ResumeManager() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function loadResumes() {
    const response = await fetch("/api/resumes", { cache: "no-store" });
    if (!response.ok) {
      setError("We could not load your resumes.");
      return;
    }
    const result = (await response.json()) as { data: Resume[] };
    setResumes(result.data);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadResumes(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setPending(true);
    const form = new FormData();
    form.append("file", file);
    const response = await fetch("/api/resumes", { method: "POST", body: form });
    setPending(false);

    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setError(result?.error?.message ?? "We could not process your resume.");
      event.target.value = "";
      return;
    }

    event.target.value = "";
    await loadResumes();
  }

  async function remove(id: string) {
    setError(null);
    const response = await fetch(`/api/resumes/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setError("We could not delete that resume.");
      return;
    }
    setResumes((current) => current.filter((resume) => resume.id !== id));
  }

  return (
    <section className="resume-manager" aria-labelledby="resume-title">
      <div className="resume-heading">
        <div>
          <p className="step-number">Private documents</p>
          <h2 id="resume-title">Your resumes</h2>
          <p>Upload a PDF or DOCX. Files are stored privately and text is extracted for review.</p>
        </div>
        <label className="upload-button">
          {pending ? "Uploading..." : "Upload resume"}
          <input
            type="file"
            accept="application/pdf,.pdf,.docx"
            onChange={upload}
            disabled={pending}
          />
        </label>
      </div>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {resumes.length === 0 ? (
        <p className="resume-empty">No resumes uploaded yet.</p>
      ) : (
        <ul className="resume-list">
          {resumes.map((resume) => (
            <li key={resume.id} className="resume-item">
              <div>
                <strong>{resume.displayName}</strong>
                <span>
                  Version {resume.version} · {formatBytes(resume.fileSizeBytes)}
                </span>
              </div>
              <div className="resume-actions">
                <span className={`resume-status resume-status-${resume.status}`}>
                  {resume.status}
                </span>
                <button type="button" onClick={() => remove(resume.id)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
