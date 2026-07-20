import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { fmtMoney, fmtDate, REQUEST_STATUSES, STATUS_LABELS } from "@/lib/constants";
import { StatusBadge } from "@/components/status-badge";
import { RequestFormDrawer } from "@/components/request-form-drawer";
import { Plus, Search, Phone, MessageCircle, Pencil, Archive } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/requests")({
  head: () => ({ meta: [{ title: "Client Requests — NextAura AI" }] }),
  component: RequestsPage,
});

type Quick = "all" | "new_leads" | "quotes" | "in_progress" | "overdue" | "waiting" | "unpaid" | "completed";

function RequestsPage() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [quick, setQuick] = useState<Quick>("all");
  const [drawer, setDrawer] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });

  const { data, isLoading } = useQuery({
    queryKey: ["client-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_requests")
        .select("id,request_number,customer_name,business_name,project_title,status,agreed_price,amount_paid,currency,expected_delivery_date,next_follow_up_date,priority,phone,whatsapp,assigned_to,archived_at,project_categories(name_en,name_ar)")
        .is("archived_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  const filtered = useMemo(() => {
    let rows = data ?? [];
    if (q.trim()) {
      const s = q.toLowerCase();
      rows = rows.filter(r =>
        [r.request_number, r.customer_name, r.business_name, r.project_title, r.phone]
          .some(v => v?.toString().toLowerCase().includes(s))
      );
    }
    if (statusFilter) rows = rows.filter(r => r.status === statusFilter);
    switch (quick) {
      case "new_leads": rows = rows.filter(r => r.status === "new_lead"); break;
      case "quotes": rows = rows.filter(r => ["quote_sent","negotiating"].includes(r.status)); break;
      case "in_progress": rows = rows.filter(r => r.status === "in_progress"); break;
      case "overdue": rows = rows.filter(r => r.expected_delivery_date && r.expected_delivery_date < today && !["completed","delivered","cancelled","rejected"].includes(r.status)); break;
      case "waiting": rows = rows.filter(r => r.status === "waiting_for_client"); break;
      case "unpaid": rows = rows.filter(r => Number(r.amount_paid ?? 0) < Number(r.agreed_price ?? 0)); break;
      case "completed": rows = rows.filter(r => r.status === "completed"); break;
    }
    return rows;
  }, [data, q, statusFilter, quick, today]);

  async function archive(id: string) {
    if (!confirm("Archive this request?")) return;
    const { error } = await supabase.from("client_requests").update({ archived_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Archived"); qc.invalidateQueries(); }
  }

  const quicks: { k: Quick; label: string }[] = [
    { k: "all", label: t("all") },
    { k: "new_leads", label: "New leads" },
    { k: "quotes", label: "Quotes" },
    { k: "in_progress", label: "In progress" },
    { k: "overdue", label: "Overdue" },
    { k: "waiting", label: "Waiting" },
    { k: "unpaid", label: "Unpaid" },
    { k: "completed", label: "Completed" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("requests")}</h1>
          <p className="text-sm text-muted-foreground">Track every client request end-to-end.</p>
        </div>
        <button
          onClick={() => setDrawer({ open: true, id: null })}
          className="brand-gradient-bg text-primary-foreground font-medium px-4 py-2 rounded-lg inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> {t("newRequest")}
        </button>
      </div>

      <div className="glass-card p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("search")}
            className="w-full ps-9 pe-3 py-2 rounded-md bg-input border border-border text-sm"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-md bg-input border border-border text-sm">
          <option value="">{t("status")} — {t("all")}</option>
          {REQUEST_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s][lang]}</option>)}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        {quicks.map(({ k, label }) => (
          <button
            key={k}
            onClick={() => setQuick(k)}
            className={`text-xs px-3 py-1.5 rounded-full border ${quick === k ? "brand-gradient-bg border-transparent text-primary-foreground" : "border-border hover:bg-accent/20"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">{t("loading")}</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-8 text-center text-muted-foreground">{t("noResults")}</div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="glass-card overflow-x-auto hidden md:block">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b border-border">
                <tr>
                  <th className="text-start px-3 py-2">#</th>
                  <th className="text-start px-3 py-2">{t("customer")}</th>
                  <th className="text-start px-3 py-2">{t("projectTitle")}</th>
                  <th className="text-start px-3 py-2">{t("status")}</th>
                  <th className="text-start px-3 py-2">{t("agreedPrice")}</th>
                  <th className="text-start px-3 py-2">{t("paid")}</th>
                  <th className="text-start px-3 py-2">{t("expectedDelivery")}</th>
                  <th className="text-start px-3 py-2">{t("nextFollowUp")}</th>
                  <th className="text-end px-3 py-2">{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-b border-border/60 hover:bg-accent/10">
                    <td className="px-3 py-2 font-mono text-xs">{r.request_number}</td>
                    <td className="px-3 py-2">
                      <div>{r.customer_name}</div>
                      {r.business_name && <div className="text-xs text-muted-foreground">{r.business_name}</div>}
                    </td>
                    <td className="px-3 py-2">{r.project_title}</td>
                    <td className="px-3 py-2"><StatusBadge status={r.status as any} /></td>
                    <td className="px-3 py-2">{fmtMoney(Number(r.agreed_price ?? 0), r.currency ?? "JOD")}</td>
                    <td className="px-3 py-2">{fmtMoney(Number(r.amount_paid ?? 0), r.currency ?? "JOD")}</td>
                    <td className="px-3 py-2">{fmtDate(r.expected_delivery_date)}</td>
                    <td className="px-3 py-2">{fmtDate(r.next_follow_up_date)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        {r.phone && <a href={`tel:${r.phone}`} className="p-1.5 rounded hover:bg-accent/20"><Phone className="w-4 h-4" /></a>}
                        {r.whatsapp && (
                          <a href={`https://wa.me/${r.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="p-1.5 rounded hover:bg-accent/20">
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        )}
                        <button onClick={() => setDrawer({ open: true, id: r.id })} className="p-1.5 rounded hover:bg-accent/20"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => archive(r.id)} className="p-1.5 rounded hover:bg-destructive/20"><Archive className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map(r => (
              <div key={r.id} className="glass-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-muted-foreground">{r.request_number}</span>
                  <StatusBadge status={r.status as any} />
                </div>
                <div className="font-medium">{r.project_title}</div>
                <div className="text-sm text-muted-foreground">{r.customer_name}{r.business_name ? ` · ${r.business_name}` : ""}</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">{t("agreedPrice")}:</span> {fmtMoney(Number(r.agreed_price ?? 0), r.currency ?? "JOD")}</div>
                  <div><span className="text-muted-foreground">{t("paid")}:</span> {fmtMoney(Number(r.amount_paid ?? 0), r.currency ?? "JOD")}</div>
                  <div><span className="text-muted-foreground">{t("expectedDelivery")}:</span> {fmtDate(r.expected_delivery_date)}</div>
                  <div><span className="text-muted-foreground">{t("nextFollowUp")}:</span> {fmtDate(r.next_follow_up_date)}</div>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  {r.phone && <a href={`tel:${r.phone}`} className="text-xs px-3 py-1.5 rounded-full border border-border">Call</a>}
                  {r.whatsapp && <a href={`https://wa.me/${r.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="text-xs px-3 py-1.5 rounded-full border border-border">WhatsApp</a>}
                  <button onClick={() => setDrawer({ open: true, id: r.id })} className="text-xs px-3 py-1.5 rounded-full brand-gradient-bg text-primary-foreground ms-auto">{t("edit")}</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <RequestFormDrawer open={drawer.open} onClose={() => setDrawer({ open: false, id: null })} requestId={drawer.id} />
    </div>
  );
}