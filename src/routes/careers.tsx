import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import { CAREER_FIELDS, EXPERIENCE_LEVELS, WORK_TYPES } from "@/lib/constants";

export const Route = createFileRoute("/careers")({
  head: () => ({
    meta: [
      { title: "Careers — NextAura AI" },
      { name: "description", content: "Join NextAura AI. Submit your profile for future AI, software, design, and marketing opportunities." },
      { property: "og:title", content: "Careers — NextAura AI" },
      { property: "og:description", content: "Submit your profile for future opportunities at NextAura AI." },
    ],
  }),
  component: CareersPage,
});

const ALLOWED_CV = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

function CareersPage() {
  const { t, lang } = useI18n();
  const [form, setForm] = useState<any>({
    full_name: "", email: "", phone: "", whatsapp: "", country: "Jordan", city: "",
    preferred_language: lang, field_of_interest: CAREER_FIELDS[0], experience_level: EXPERIENCE_LEVELS[2],
    years_of_experience: "", current_job_title: "", linkedin_url: "", portfolio_url: "", personal_website: "",
    short_intro: "", key_skills: "", preferred_work_type: WORK_TYPES[0], availability: "",
    expected_compensation: "", cover_letter: "", consent: false,
  });
  const [cv, setCv] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  function upd(k: string, v: any) { setForm((f: any) => ({ ...f, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.consent) { toast.error("Please accept the consent."); return; }
    if (cv) {
      if (cv.size > 5 * 1024 * 1024) { toast.error("CV exceeds 5MB."); return; }
      if (!ALLOWED_CV.includes(cv.type)) { toast.error("Only PDF, DOC, or DOCX allowed."); return; }
    }
    setSubmitting(true);
    let cv_path: string | null = null;
    if (cv) {
      const ext = cv.name.split(".").pop() ?? "pdf";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("cvs").upload(path, cv, { contentType: cv.type, upsert: false });
      if (upErr) { setSubmitting(false); toast.error("CV upload failed: " + upErr.message); return; }
      cv_path = path;
    }
    const payload = { ...form, cv_path, years_of_experience: form.years_of_experience ? Number(form.years_of_experience) : null };
    const { error } = await supabase.from("career_applications").insert(payload);
    setSubmitting(false);
    if (error) { toast.error(t("submitError") + " " + error.message); return; }
    setDone(true);
    toast.success(t("submitted"));
  }

  const input = "w-full px-3 py-2 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-1 focus:ring-ring";

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between px-6 py-4">
        <Link to="/" className="brand-gradient-text font-semibold">{t("brand")}</Link>
        <LanguageSwitcher />
      </header>

      <section className="max-w-3xl mx-auto px-6 py-10 text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight brand-gradient-text">{t("careersHeroTitle")}</h1>
        <p className="text-muted-foreground">{t("careersHeroBody")}</p>
        <p className="text-xs text-muted-foreground italic">{t("careersDisclaimer")}</p>
      </section>

      <section className="max-w-3xl mx-auto px-6 pb-16">
        {done ? (
          <div className="glass-card p-8 text-center space-y-3">
            <div className="text-lg font-semibold">{t("submitted")}</div>
            <Link to="/" className="text-primary hover:underline">← Back to home</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="glass-card p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="space-y-1"><div className="text-xs text-muted-foreground">{t("fullName")} *</div><input required className={input} value={form.full_name} onChange={(e) => upd("full_name", e.target.value)} /></label>
              <label className="space-y-1"><div className="text-xs text-muted-foreground">{t("email")} *</div><input type="email" required className={input} value={form.email} onChange={(e) => upd("email", e.target.value)} /></label>
              <label className="space-y-1"><div className="text-xs text-muted-foreground">{t("phone")}</div><input className={input} value={form.phone} onChange={(e) => upd("phone", e.target.value)} /></label>
              <label className="space-y-1"><div className="text-xs text-muted-foreground">{t("whatsapp")}</div><input className={input} value={form.whatsapp} onChange={(e) => upd("whatsapp", e.target.value)} /></label>
              <label className="space-y-1"><div className="text-xs text-muted-foreground">{t("country")}</div><input className={input} value={form.country} onChange={(e) => upd("country", e.target.value)} /></label>
              <label className="space-y-1"><div className="text-xs text-muted-foreground">{t("city")}</div><input className={input} value={form.city} onChange={(e) => upd("city", e.target.value)} /></label>
              <label className="space-y-1"><div className="text-xs text-muted-foreground">{t("language")}</div>
                <select className={input} value={form.preferred_language} onChange={(e) => upd("preferred_language", e.target.value)}>
                  <option value="en">English</option><option value="ar">العربية</option>
                </select>
              </label>
              <label className="space-y-1"><div className="text-xs text-muted-foreground">{t("field")} *</div>
                <select className={input} required value={form.field_of_interest} onChange={(e) => upd("field_of_interest", e.target.value)}>
                  {CAREER_FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </label>
              <label className="space-y-1"><div className="text-xs text-muted-foreground">{t("experience")}</div>
                <select className={input} value={form.experience_level} onChange={(e) => upd("experience_level", e.target.value)}>
                  {EXPERIENCE_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </label>
              <label className="space-y-1"><div className="text-xs text-muted-foreground">{t("years")}</div><input type="number" min="0" step="0.5" className={input} value={form.years_of_experience} onChange={(e) => upd("years_of_experience", e.target.value)} /></label>
              <label className="space-y-1"><div className="text-xs text-muted-foreground">{t("currentJob")}</div><input className={input} value={form.current_job_title} onChange={(e) => upd("current_job_title", e.target.value)} /></label>
              <label className="space-y-1"><div className="text-xs text-muted-foreground">{t("linkedin")}</div><input type="url" className={input} value={form.linkedin_url} onChange={(e) => upd("linkedin_url", e.target.value)} /></label>
              <label className="space-y-1"><div className="text-xs text-muted-foreground">{t("portfolio")}</div><input type="url" className={input} value={form.portfolio_url} onChange={(e) => upd("portfolio_url", e.target.value)} /></label>
              <label className="space-y-1"><div className="text-xs text-muted-foreground">{t("website")}</div><input type="url" className={input} value={form.personal_website} onChange={(e) => upd("personal_website", e.target.value)} /></label>
              <label className="space-y-1"><div className="text-xs text-muted-foreground">{t("workType")}</div>
                <select className={input} value={form.preferred_work_type} onChange={(e) => upd("preferred_work_type", e.target.value)}>
                  {WORK_TYPES.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </label>
              <label className="space-y-1"><div className="text-xs text-muted-foreground">{t("availability")}</div><input className={input} value={form.availability} onChange={(e) => upd("availability", e.target.value)} /></label>
              <label className="space-y-1"><div className="text-xs text-muted-foreground">{t("compensation")}</div><input className={input} value={form.expected_compensation} onChange={(e) => upd("expected_compensation", e.target.value)} /></label>
              <label className="space-y-1 md:col-span-2"><div className="text-xs text-muted-foreground">{t("intro")}</div><textarea rows={2} className={input} value={form.short_intro} onChange={(e) => upd("short_intro", e.target.value)} /></label>
              <label className="space-y-1 md:col-span-2"><div className="text-xs text-muted-foreground">{t("skills")}</div><textarea rows={2} className={input} value={form.key_skills} onChange={(e) => upd("key_skills", e.target.value)} /></label>
              <label className="space-y-1 md:col-span-2"><div className="text-xs text-muted-foreground">{t("coverLetter")}</div><textarea rows={3} className={input} value={form.cover_letter} onChange={(e) => upd("cover_letter", e.target.value)} /></label>
              <label className="space-y-1 md:col-span-2"><div className="text-xs text-muted-foreground">{t("cv")}</div>
                <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setCv(e.target.files?.[0] ?? null)} className={input} />
              </label>
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={form.consent} onChange={(e) => upd("consent", e.target.checked)} className="mt-1" />
              <span>{t("consent")}</span>
            </label>
            <div className="flex justify-end">
              <button type="submit" disabled={submitting} className="brand-gradient-bg text-primary-foreground font-medium px-6 py-2.5 rounded-lg disabled:opacity-50">
                {submitting ? t("loading") : t("submit")}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}