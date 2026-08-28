"use client";

import { useEffect, useState } from "react";

type Profile = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  locationText: string | null;
  countryCode: string | null;
  professionalSummary: string | null;
  yearsExperience: string | null;
  skills: Array<{ name: string; category: string }>;
};

export function ProfileEditor() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    locationText: "",
    countryCode: "",
    professionalSummary: "",
    yearsExperience: "",
  });
  const [status, setStatus] = useState("Loading profile...");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetch("/api/profiles")
        .then((response) => response.json())
        .then(async (result: { data: Array<{ id: string }> }) => {
          const current =
            result.data[0] ??
            (await (await fetch("/api/profiles", { method: "POST" })).json()).data;
          const detail = await fetch(`/api/profiles/${current.id}`);
          const detailResult = (await detail.json()) as { data: Profile };
          setProfile(detailResult.data);
          setForm({
            name: detailResult.data.name ?? "",
            email: detailResult.data.email ?? "",
            phone: detailResult.data.phone ?? "",
            locationText: detailResult.data.locationText ?? "",
            countryCode: detailResult.data.countryCode ?? "",
            professionalSummary: detailResult.data.professionalSummary ?? "",
            yearsExperience: detailResult.data.yearsExperience ?? "",
          });
          setStatus("");
        })
        .catch(() => setStatus("We could not load your profile."));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    setPending(true);
    setStatus("");
    const response = await fetch(`/api/profiles/${profile.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...form,
        yearsExperience: form.yearsExperience ? Number(form.yearsExperience) : null,
        skills: profile.skills,
        experiences: [],
        education: [],
        projects: [],
        certifications: [],
        languages: [],
        links: [],
      }),
    });
    setPending(false);
    setStatus(response.ok ? "Profile saved." : "Review the fields and try again.");
  }

  if (!profile) return <p>{status}</p>;

  return (
    <form className="profile-editor" onSubmit={save}>
      <div className="profile-heading">
        <div>
          <p className="step-number">Candidate profile</p>
          <h2>Make the extracted profile yours.</h2>
          <p>
            Review and edit the facts used for future matching. User edits are treated as verified.
          </p>
        </div>
        <button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save profile"}
        </button>
      </div>
      <div className="profile-grid">
        {(
          ["name", "email", "phone", "locationText", "countryCode", "yearsExperience"] as const
        ).map((field) => (
          <label key={field}>
            {field === "locationText"
              ? "Location"
              : field === "yearsExperience"
                ? "Years of experience"
                : field[0].toUpperCase() + field.slice(1)}
            <input
              name={field}
              type={field === "email" ? "email" : field === "yearsExperience" ? "number" : "text"}
              value={form[field]}
              onChange={(event) => setForm({ ...form, [field]: event.target.value })}
            />
          </label>
        ))}
      </div>
      <label>
        Professional summary
        <textarea
          name="professionalSummary"
          rows={6}
          value={form.professionalSummary}
          onChange={(event) => setForm({ ...form, professionalSummary: event.target.value })}
        />
      </label>
      {status ? (
        <p className="profile-status" role="status">
          {status}
        </p>
      ) : null}
    </form>
  );
}
