"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Field {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options?: { label: string; value: string }[];
}

interface Form {
  id: string;
  title: string;
  fields: Field[];
}

interface ShareData {
  token: string;
  form: Form;
  permissions: {
    anonymousSubmissionAllowed: boolean;
    requiresPassword: boolean;
  };
  expiresAt: string | null;
}

export default function ShareFormPage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [values, setValues] = useState<Record<string, string | number | readonly string[] | undefined>>({});
  const [password, setPassword] = useState<string>("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchForm() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/share/${token}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Form not found");
        setShareData(json);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }
    if (token) fetchForm();
  }, [token]);

  const handleChange = (fieldId: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [fieldId]: value as string | number | readonly string[] | undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareData) return;
    setError(null);
    setSubmitting(true);
    try {
      const body: { answers: { fieldId: string; value: unknown }[]; password?: string } = {
        answers: shareData.form.fields.map(f => ({ fieldId: f.id, value: values[f.id] })),
      };
      if (shareData.permissions.requiresPassword) {
        body.password = password;
      }
      const res = await fetch(`/api/forms/${shareData.form.id}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Submission failed");
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--surface)" }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: "var(--accent-primary)" }}></div>
          <p style={{ color: "var(--text-secondary)" }}>Loading form…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--surface)" }}>
        <div className="w-full max-w-md rounded-2xl border p-8 shadow-xl text-center" style={{ background: "var(--surface-panel)", borderColor: "var(--border-subtle)", boxShadow: "var(--shadow-lg)" }}>
          <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>Error</h2>
          <p style={{ color: "var(--text-secondary)" }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!shareData) return null;

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--surface)" }}>
        <div className="w-full max-w-md rounded-2xl border p-8 shadow-xl text-center" style={{ background: "var(--surface-panel)", borderColor: "var(--border-subtle)", boxShadow: "var(--shadow-lg)" }}>
          <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>Thank you!</h2>
          <p style={{ color: "var(--text-secondary)" }}>Your response has been recorded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ background: "var(--surface)" }}>
      <div className="w-full max-w-lg rounded-2xl border p-8 shadow-xl" style={{ background: "var(--surface-panel)", borderColor: "var(--border-subtle)", boxShadow: "var(--shadow-lg)" }}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <h1 className="text-2xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>{shareData.form.title}</h1>

          {shareData.permissions.requiresPassword && (
            <div className="space-y-2">
              <label className="block text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Password *</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full rounded-md border px-3 py-2"
                style={{ background: "var(--surface-card)", borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
                placeholder="Enter the share password"
              />
            </div>
          )}

          {shareData.form.fields.map((field) => (
            <div key={field.id} className="space-y-2">
              <label className="block text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
                {field.label}{field.required ? " *" : ""}
              </label>
              {field.type === "short_text" || field.type === "email" ? (
                <input
                  type={field.type === "email" ? "email" : "text"}
                  required={field.required}
                  value={values[field.id] || ""}
                  onChange={e => handleChange(field.id, e.target.value)}
                  className="w-full rounded-md border px-3 py-2"
                  style={{ background: "var(--surface-card)", borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
                />
              ) : field.type === "long_text" ? (
                <textarea
                  required={field.required}
                  value={values[field.id] || ""}
                  onChange={e => handleChange(field.id, e.target.value)}
                  className="w-full rounded-md border px-3 py-2 resize-none"
                  rows={4}
                  style={{ background: "var(--surface-card)", borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
                />
              ) : field.type === "number" ? (
                <input
                  type="number"
                  required={field.required}
                  value={values[field.id] || ""}
                  onChange={e => handleChange(field.id, e.target.value)}
                  className="w-full rounded-md border px-3 py-2"
                  style={{ background: "var(--surface-card)", borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
                />
              ) : field.type === "dropdown" ? (
                <select
                  required={field.required}
                  value={values[field.id] || ""}
                  onChange={e => handleChange(field.id, e.target.value)}
                  className="w-full rounded-md border px-3 py-2"
                  style={{ background: "var(--surface-card)", borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
                >
                  <option value="">Select…</option>
                  {(field.options || []).map((opt: { label: string; value: string }, idx: number) => (
                    <option key={idx} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : field.type === "checkbox" ? (
                <div className="flex flex-wrap gap-2">
                  {(field.options || []).map((opt: { label: string; value: string }, idx: number) => (
                    <label key={idx} className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Array.isArray(values[field.id]) && Array.isArray(values[field.id]) ? (values[field.id] as readonly string[]).includes(opt.value) : false}
                        onChange={e => {
                          const val = opt.value;
                          const arr = Array.isArray(values[field.id]) ? values[field.id] as string[] : [];
                          handleChange(field.id, e.target.checked ? [...arr, val] : arr.filter((v: string) => v !== val));
                        }}
                        className="rounded"
                      />
                      <span className="text-sm" style={{ color: "var(--text-primary)" }}>{opt.label}</span>
                    </label>
                  ))}
                </div>
              ) : field.type === "date" ? (
                <input
                  type="date"
                  required={field.required}
                  value={values[field.id] || ""}
                  onChange={e => handleChange(field.id, e.target.value)}
                  className="w-full rounded-md border px-3 py-2"
                  style={{ background: "var(--surface-card)", borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
                />
              ) : null}
            </div>
          ))}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md font-semibold py-3 mt-4 shadow-md hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "var(--accent-primary)", color: "var(--text-inverse)" }}
          >
            {submitting ? "Submitting…" : "Submit Response"}
          </button>
        </form>
      </div>
    </div>
  );
}
