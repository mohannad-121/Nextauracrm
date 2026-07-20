import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { CAREER_STATUSES, type CareerStatus } from "@/lib/constants";
import { toast } from "sonner";
import { FileDown, ExternalLink, Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/careers")({
  head: () => ({ meta: [{ title: "Career Applications — NextAura AI" }] }),
  component: AdminCareers,
});

function AdminCareers() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["career-apps"],
    queryFn: async () => (await supabase.from("career_applications").select("*").is("archived_at", null).order("submitted_at", { ascending: false })).data ?? [],
  });

  const filtered = (data ?? []).filter(a => {
    if (statusFilter && a.status !== statusFilter) return false;
    if (q.trim()) {
      const s = q.toLowerCase();
      return [a.full_name, a.email, a.field_of_interest, a.country].some(v => v?.toString().toLowerCase().includes(s));
    }
    return true;
  });

  async function setStatus(id: string, status: CareerStatus) {
    const { error } = await supabase.from("career_applications").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["career-apps"] }); }
  }

  async function setRating(id: string, internal_rating: number) {
    const { error } = await supabase.from("career_applications").update({ internal_rating }).eq("id", id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["career-apps"] });
  }

  async function archive(id: string) {
    if (!confirm("Archive this application?")) return;
    const { error } = await supabase.from("career_applications").update({ archived_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["career-apps"] });
  }

  async function downloadCV(path: string) {
    const { data, error } = await supabase.storage.from("cvs").createSignedUrl(path, 60);
    if (error || !data) { toast.error("Could not generate download link"); return; }
    window.open(data.signedUrl, "_blank");
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{t("careerApps")}</h1>
        <p className="text-sm text-muted-foreground">Review incoming applications and manage the talent pool.</p>
      </div>

      <div className="glass-card p-3 flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} className="flex-1 min-w-[200px] px-3 py-2 rounded-md bg-input border border-border text-sm" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-md bg-input border border-border text-sm">
          <option value="">All statuses</option>
          {CAREER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">{t("loading")}</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-8 text-center text-muted-foreground">{t("empty")}</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtered.map(a => (
            <div key={a.id} className="glass-card p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{a.full_name}</div>
                  <div className="text-xs text-muted-foreground">{a.field_of_interest} · {a.experience_level ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{a.country ?? "—"} · {new Date(a.submitted_at).toLocaleDateString()}</div>
                </div>
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(n => (
                    <button key={n} onClick={() => setRating(a.id, n)}>
                      <Star className={`w-4 h-4 ${n <= (a.internal_rating ?? 0) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">{a.email} · {a.phone ?? "—"}</div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {a.linkedin_url && <a href={a.linkedin_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border"><ExternalLink className="w-3 h-3" /> LinkedIn</a>}
                {a.portfolio_url && <a href={a.portfolio_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border"><ExternalLink className="w-3 h-3" /> Portfolio</a>}
                {a.cv_path && <button onClick={() => downloadCV(a.cv_path!)} className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border"><FileDown className="w-3 h-3" /> CV</button>}
              </div>
              <div className="flex items-center gap-2 pt-2">
                <select value={a.status} onChange={(e) => setStatus(a.id, e.target.value as CareerStatus)} className="text-xs px-2 py-1 rounded bg-input border border-border">
                  {CAREER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={() => archive(a.id)} className="ms-auto text-xs px-3 py-1.5 rounded border border-border hover:bg-destructive/20">{t("archive")}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}