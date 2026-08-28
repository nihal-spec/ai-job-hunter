"use client";

import { useEffect, useState } from "react";

type Preference = {
  id: string;
  name: string;
  isActive: boolean;
  locations: string[];
  workplaceModes: string[];
  minSalary: string | null;
  salaryCurrency: string | null;
  maxExperienceYears: string | null;
};

const defaultPreference = {
  name: "",
  roles: "",
  locations: "",
  workplaceModes: ["remote"],
  minSalary: "",
  salaryCurrency: "INR",
  maxExperienceYears: "",
  employmentTypes: "full-time",
  excludedKeywords: "",
  preferredCompanies: "",
  skills: "",
};

export function PreferenceManager() {
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [form, setForm] = useState(defaultPreference);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("Loading preferences...");

  async function load() {
    const response = await fetch("/api/preferences", { cache: "no-store" });
    if (!response.ok) return setMessage("We could not load your preferences.");
    setPreferences(((await response.json()) as { data: Preference[] }).data);
    setMessage("");
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }
  function split(value: string) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const response = await fetch("/api/preferences", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        roles: split(form.roles),
        locations: split(form.locations),
        workplaceModes: form.workplaceModes,
        minSalary: form.minSalary ? Number(form.minSalary) : null,
        salaryCurrency: form.minSalary ? form.salaryCurrency : null,
        maxExperienceYears: form.maxExperienceYears ? Number(form.maxExperienceYears) : null,
        employmentTypes: split(form.employmentTypes),
        excludedKeywords: split(form.excludedKeywords),
        preferredCompanies: split(form.preferredCompanies),
        skills: split(form.skills).map((name) => ({ name, weight: 1 })),
      }),
    });
    setPending(false);
    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setMessage(result?.error?.message ?? "Review the preference fields.");
      return;
    }
    setForm(defaultPreference);
    setMessage("Preference profile saved.");
    await load();
  }

  async function activate(id: string) {
    const response = await fetch(`/api/preferences/${id}/activate`, { method: "POST" });
    if (response.ok) await load();
  }
  async function remove(id: string) {
    const response = await fetch(`/api/preferences/${id}`, { method: "DELETE" });
    if (response.ok) await load();
  }

  return (
    <section className="preference-manager" aria-labelledby="preference-title">
      <div className="preference-heading">
        <div>
          <p className="step-number">Search profile</p>
          <h2 id="preference-title">Define the work you want.</h2>
          <p>
            Keep roles, constraints, and exclusions in one reusable profile for future matching.
          </p>
        </div>
      </div>
      <form className="preference-form" onSubmit={save}>
        <div className="preference-grid">
          {(
            [
              "name",
              "roles",
              "locations",
              "employmentTypes",
              "excludedKeywords",
              "preferredCompanies",
              "skills",
            ] as const
          ).map((field) => (
            <label key={field}>
              {field === "name"
                ? "Profile name"
                : field === "roles"
                  ? "Target roles"
                  : field === "locations"
                    ? "Locations"
                    : field === "employmentTypes"
                      ? "Employment types"
                      : field === "excludedKeywords"
                        ? "Exclude keywords"
                        : field === "preferredCompanies"
                          ? "Preferred companies"
                          : "Preferred technologies"}
              <input
                value={form[field]}
                onChange={(event) => update(field, event.target.value)}
                placeholder={field === "name" ? "Frontend roles" : "Separate items with commas"}
                required={field === "name"}
              />
            </label>
          ))}
          <label>
            Minimum salary
            <input
              type="number"
              min="0"
              value={form.minSalary}
              onChange={(event) => update("minSalary", event.target.value)}
            />
          </label>
          <label>
            Currency
            <input
              maxLength={3}
              value={form.salaryCurrency}
              onChange={(event) => update("salaryCurrency", event.target.value.toUpperCase())}
            />
          </label>
          <label>
            Maximum experience (years)
            <input
              type="number"
              min="0"
              step="0.1"
              value={form.maxExperienceYears}
              onChange={(event) => update("maxExperienceYears", event.target.value)}
            />
          </label>
        </div>
        <button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save preference profile"}
        </button>
        {message ? (
          <p className="profile-status" role="status">
            {message}
          </p>
        ) : null}
      </form>
      <ul className="preference-list">
        {preferences.map((preference) => (
          <li key={preference.id} className="preference-item">
            <div>
              <strong>{preference.name}</strong>
              <span>
                {preference.locations.join(", ") || "Any location"} ·{" "}
                {preference.workplaceModes.join(", ") || "Any workplace"}
              </span>
            </div>
            <div className="preference-actions">
              <span className={preference.isActive ? "preference-active" : ""}>
                {preference.isActive ? "Active" : "Inactive"}
              </span>
              {!preference.isActive ? (
                <button type="button" onClick={() => activate(preference.id)}>
                  Activate
                </button>
              ) : null}
              <button type="button" onClick={() => remove(preference.id)}>
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
