import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import {
  fmtMoney,
  fmtDate,
  REQUEST_STATUSES,
  STATUS_LABELS,
  type Priority,
  type RequestStatus,
} from "@/lib/constants";
import { StatusBadge } from "@/components/status-badge";
import { RequestFormDrawer } from "@/components/request-form-drawer";
import {
  Plus,
  Search,
  Phone,
  MessageCircle,
  Pencil,
  Archive,
  Columns3,
  ListFilter,
  PanelRightOpen,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { PriorityBadge } from "@/components/priority-badge";
import { RequestDetailPanel } from "@/components/request-detail-panel";
import { BusinessCategoryBadge } from "@/components/business-category-badge";
import { getBusinessCategory, type BusinessCategory } from "@/lib/business-categories";

export const Route = createFileRoute("/_authenticated/requests")({
  head: () => ({ meta: [{ title: "Client Requests — NextAura AI" }] }),
  component: RequestsPage,
});

type Quick =
  | "all"
  | "active"
  | "new_leads"
  | "quotes"
  | "approved"
  | "in_progress"
  | "overdue"
  | "follow_today"
  | "follow_week"
  | "waiting"
  | "unpaid"
  | "completed";
type Column = "priority" | "delivery" | "followUp" | "money";
const DEFAULT_COLUMNS: Record<Column, boolean> = {
  priority: true,
  delivery: true,
  followUp: true,
  money: true,
};

const QUICK_FILTERS = new Set<Quick>([
  "all",
  "active",
  "new_leads",
  "quotes",
  "approved",
  "in_progress",
  "overdue",
  "follow_today",
  "follow_week",
  "waiting",
  "unpaid",
  "completed",
]);

function initialQuickFilter(): Quick {
  if (typeof window === "undefined") return "all";
  const quick = new URLSearchParams(window.location.search).get("quick");
  return quick && QUICK_FILTERS.has(quick as Quick) ? (quick as Quick) : "all";
}

function RequestsPage() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [quick, setQuick] = useState<Quick>(initialQuickFilter);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });
  const [detailId, setDetailId] = useState<string | null>(null);
  const [compact, setCompact] = useState(
    () =>
      typeof window !== "undefined" && localStorage.getItem("na_requests_density") === "compact",
  );
  const [columns, setColumns] = useState<Record<Column, boolean>>(() => {
    if (typeof window === "undefined") return DEFAULT_COLUMNS;
    try {
      return {
        ...DEFAULT_COLUMNS,
        ...JSON.parse(localStorage.getItem("na_request_columns") ?? "{}"),
      };
    } catch {
      return DEFAULT_COLUMNS;
    }
  });
  const [showColumns, setShowColumns] = useState(false);
  const deferredQuery = useDeferredValue(q);

  useEffect(() => {
    const openNew = () => setDrawer({ open: true, id: null });
    window.addEventListener("nextaura:new-request", openNew);
    const requestedId = new URLSearchParams(window.location.search).get("open");
    if (requestedId) setDetailId(requestedId);
    return () => window.removeEventListener("nextaura:new-request", openNew);
  }, []);

  useEffect(() => {
    localStorage.setItem("na_requests_density", compact ? "compact" : "comfortable");
  }, [compact]);
  useEffect(() => {
    localStorage.setItem("na_request_columns", JSON.stringify(columns));
  }, [columns]);

  const { data, isLoading } = useQuery({
    queryKey: ["client-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_requests")
        .select(
          "id,request_number,customer_name,business_name,project_title,status,agreed_price,amount_paid,currency,expected_delivery_date,next_follow_up_date,priority,phone,whatsapp,assigned_to,archived_at,project_categories(name_en,name_ar)",
        )
        .is("archived_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  const categories = useMemo(() => {
    const grouped = new Map<string, { category: BusinessCategory; count: number }>();
    (data ?? []).forEach((request) => {
      const category = getBusinessCategory(request.business_name);
      const current = grouped.get(category.key);
      grouped.set(category.key, { category, count: (current?.count ?? 0) + 1 });
    });
    return [...grouped.values()].toSorted(
      (a, b) => b.count - a.count || a.category.label.localeCompare(b.category.label),
    );
  }, [data]);
  const filtered = useMemo(() => {
    let rows = data ?? [];
    if (deferredQuery.trim()) {
      const s = deferredQuery.toLowerCase();
      rows = rows.filter((r) =>
        [r.request_number, r.customer_name, r.business_name, r.project_title, r.phone].some((v) =>
          v?.toString().toLowerCase().includes(s),
        ),
      );
    }
    if (statusFilter) rows = rows.filter((r) => r.status === statusFilter);
    switch (quick) {
      case "active":
        rows = rows.filter((r) => !["completed", "cancelled", "rejected"].includes(r.status));
        break;
      case "new_leads":
        rows = rows.filter((r) => r.status === "new_lead");
        break;
      case "quotes":
        rows = rows.filter((r) => ["quote_sent", "negotiating"].includes(r.status));
        break;
      case "approved":
        rows = rows.filter((r) => r.status === "approved");
        break;
      case "in_progress":
        rows = rows.filter((r) => r.status === "in_progress");
        break;
      case "overdue":
        rows = rows.filter(
          (r) =>
            r.expected_delivery_date &&
            r.expected_delivery_date < today &&
            !["completed", "delivered", "cancelled", "rejected"].includes(r.status),
        );
        break;
      case "follow_today":
        rows = rows.filter((r) => r.next_follow_up_date === today);
        break;
      case "follow_week": {
        const weekAhead = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
        rows = rows.filter(
          (r) =>
            r.next_follow_up_date &&
            r.next_follow_up_date >= today &&
            r.next_follow_up_date <= weekAhead,
        );
        break;
      }
      case "waiting":
        rows = rows.filter((r) => r.status === "waiting_for_client");
        break;
      case "unpaid":
        rows = rows.filter((r) => Number(r.amount_paid ?? 0) < Number(r.agreed_price ?? 0));
        break;
      case "completed":
        rows = rows.filter((r) => r.status === "completed");
        break;
    }
    if (selectedCategory) {
      rows = rows.filter(
        (request) => getBusinessCategory(request.business_name).key === selectedCategory,
      );
    }
    return rows;
  }, [data, deferredQuery, statusFilter, quick, today, selectedCategory]);

  async function archive(id: string) {
    if (!confirm("Archive this request?")) return;
    const { error } = await supabase
      .from("client_requests")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Archived");
      qc.invalidateQueries();
    }
  }

  const quicks: { k: Quick; label: string }[] = [
    { k: "all", label: t("all") },
    { k: "active", label: "Active" },
    { k: "new_leads", label: "New leads" },
    { k: "quotes", label: "Quotes" },
    { k: "approved", label: "Approved" },
    { k: "in_progress", label: "In progress" },
    { k: "overdue", label: "Overdue" },
    { k: "follow_today", label: "Follow-ups today" },
    { k: "follow_week", label: "Follow-ups this week" },
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
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-md bg-input border border-border text-sm"
        >
          <option value="">
            {t("status")} — {t("all")}
          </option>
          {REQUEST_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s][lang]}
            </option>
          ))}
        </select>
        <div className="relative ms-auto flex items-center gap-1">
          <button
            onClick={() => setCompact((value) => !value)}
            className={`rounded-md border px-2.5 py-2 text-xs ${compact ? "border-primary/40 bg-primary/10 text-primary" : "border-border hover:bg-accent/20"}`}
            title="Toggle dense operator mode"
          >
            <ListFilter className="inline h-3.5 w-3.5" />{" "}
            <span className="hidden lg:inline">Dense</span>
          </button>
          <button
            onClick={() => setShowColumns((value) => !value)}
            className="rounded-md border border-border px-2.5 py-2 text-xs hover:bg-accent/20"
            title="Choose visible columns"
          >
            <Columns3 className="inline h-3.5 w-3.5" />{" "}
            <span className="hidden lg:inline">Columns</span>
          </button>
          {showColumns && (
            <div className="absolute end-0 top-11 z-20 w-48 rounded-lg border border-border bg-popover p-2 shadow-xl">
              <p className="px-2 pb-1 text-xs font-medium">Visible columns</p>
              {(Object.keys(DEFAULT_COLUMNS) as Column[]).map((column) => (
                <label
                  key={column}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs capitalize hover:bg-accent/20"
                >
                  <input
                    type="checkbox"
                    checked={columns[column]}
                    onChange={() =>
                      setColumns((current) => ({ ...current, [column]: !current[column] }))
                    }
                  />
                  {column === "followUp" ? "Follow-up" : column}
                </label>
              ))}
            </div>
          )}
        </div>
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

      {!isLoading && (
        <section aria-labelledby="request-categories-heading">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 id="request-categories-heading" className="font-semibold">
                Browse projects by category
              </h2>
              <p className="text-sm text-muted-foreground">
                Choose a category to show only its client requests.
              </p>
            </div>
            <span className="text-sm text-muted-foreground">
              {data?.length ?? 0} total projects
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              aria-pressed={!selectedCategory}
              className={`flex min-h-24 cursor-pointer items-center justify-between rounded-xl border p-4 text-start transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                !selectedCategory
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card/55 hover:border-primary/40 hover:bg-accent/10"
              }`}
            >
              <span>
                <span className="block font-semibold">All projects</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  View every category
                </span>
              </span>
              <span className="text-2xl font-semibold text-primary">{data?.length ?? 0}</span>
            </button>
            {categories.map(({ category, count }) => (
              <button
                key={category.key}
                type="button"
                onClick={() => setSelectedCategory(category.key)}
                aria-pressed={selectedCategory === category.key}
                className={`flex min-h-24 cursor-pointer items-center justify-between rounded-xl border p-4 text-start transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  selectedCategory === category.key
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card/55 hover:border-primary/40 hover:bg-accent/10"
                }`}
              >
                <span className="min-w-0">
                  <BusinessCategoryBadge category={category.label} />
                  <span className="mt-2 block text-xs text-muted-foreground">
                    View projects in this category
                  </span>
                </span>
                <span className="text-2xl font-semibold text-primary">{count}</span>
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {filtered.length} project{filtered.length === 1 ? "" : "s"}
              {selectedCategory
                ? ` in ${categories.find((item) => item.category.key === selectedCategory)?.category.label ?? "this category"}`
                : " shown"}
            </p>
            {selectedCategory ? (
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className="text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Clear category
              </button>
            ) : null}
          </div>
        </section>
      )}

      {isLoading ? (
        <div className="text-muted-foreground">{t("loading")}</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-8 text-center text-muted-foreground">{t("noResults")}</div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="glass-card overflow-x-auto hidden md:block">
            <table className={`w-full text-sm ${compact ? "[&_td]:py-1.5 [&_th]:py-1.5" : ""}`}>
              <thead className="text-xs text-muted-foreground border-b border-border">
                <tr>
                  <th className="text-start px-3 py-2">#</th>
                  <th className="text-start px-3 py-2">{t("customer")}</th>
                  <th className="text-start px-3 py-2">{t("projectTitle")}</th>
                  <th className="text-start px-3 py-2">{t("status")}</th>
                  {columns.priority && <th className="text-start px-3 py-2">{t("priority")}</th>}
                  {columns.money && (
                    <>
                      <th className="text-start px-3 py-2">{t("agreedPrice")}</th>
                      <th className="text-start px-3 py-2">{t("paid")}</th>
                    </>
                  )}
                  {columns.delivery && (
                    <th className="text-start px-3 py-2">{t("expectedDelivery")}</th>
                  )}
                  {columns.followUp && (
                    <th className="text-start px-3 py-2">{t("nextFollowUp")}</th>
                  )}
                  <th className="text-end px-3 py-2">{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setDetailId(r.id)}
                    className="cursor-pointer border-b border-border/60 hover:bg-accent/10"
                  >
                    <td className="px-3 py-2 font-mono text-xs">{r.request_number}</td>
                    <td className="px-3 py-2">
                      <div>{r.customer_name}</div>
                      {r.business_name && (
                        <div className="text-xs text-muted-foreground">{r.business_name}</div>
                      )}
                    </td>
                    <td className="px-3 py-2">{r.project_title}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={r.status as RequestStatus} />
                    </td>
                    {columns.priority && (
                      <td className="px-3 py-2">
                        <PriorityBadge priority={r.priority as Priority} />
                      </td>
                    )}
                    {columns.money && (
                      <>
                        <td className="px-3 py-2">
                          {fmtMoney(Number(r.agreed_price ?? 0), r.currency ?? "JOD")}
                        </td>
                        <td className="px-3 py-2">
                          {fmtMoney(Number(r.amount_paid ?? 0), r.currency ?? "JOD")}
                        </td>
                      </>
                    )}
                    {columns.delivery && (
                      <td className="px-3 py-2">{fmtDate(r.expected_delivery_date)}</td>
                    )}
                    {columns.followUp && (
                      <td className="px-3 py-2">{fmtDate(r.next_follow_up_date)}</td>
                    )}
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        {r.phone && (
                          <a
                            onClick={(e) => e.stopPropagation()}
                            href={`tel:${r.phone}`}
                            className="p-1.5 rounded hover:bg-accent/20"
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                        )}
                        {r.whatsapp && (
                          <a
                            onClick={(e) => e.stopPropagation()}
                            href={`https://wa.me/${r.whatsapp.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded hover:bg-accent/20"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailId(r.id);
                          }}
                          className="p-1.5 rounded hover:bg-accent/20"
                          aria-label="Open request"
                        >
                          <PanelRightOpen className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDrawer({ open: true, id: r.id });
                          }}
                          className="p-1.5 rounded hover:bg-accent/20"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            archive(r.id);
                          }}
                          className="p-1.5 rounded hover:bg-destructive/20"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((r) => (
              <div
                key={r.id}
                role="button"
                tabIndex={0}
                onClick={() => setDetailId(r.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setDetailId(r.id);
                }}
                className="glass-card w-full cursor-pointer p-4 space-y-2 text-start hover:bg-accent/10"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-muted-foreground">
                    {r.request_number}
                  </span>
                  <StatusBadge status={r.status as RequestStatus} />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">{r.project_title}</div>
                  <PriorityBadge priority={r.priority as Priority} />
                </div>
                <div className="text-sm text-muted-foreground">
                  {r.customer_name}
                  {r.business_name ? ` · ${r.business_name}` : ""}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">{t("agreedPrice")}:</span>{" "}
                    {fmtMoney(Number(r.agreed_price ?? 0), r.currency ?? "JOD")}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("paid")}:</span>{" "}
                    {fmtMoney(Number(r.amount_paid ?? 0), r.currency ?? "JOD")}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("expectedDelivery")}:</span>{" "}
                    {fmtDate(r.expected_delivery_date)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("nextFollowUp")}:</span>{" "}
                    {fmtDate(r.next_follow_up_date)}
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  {r.phone && (
                    <a
                      onClick={(e) => e.stopPropagation()}
                      href={`tel:${r.phone}`}
                      className="text-xs px-3 py-1.5 rounded-full border border-border"
                    >
                      Call
                    </a>
                  )}
                  {r.whatsapp && (
                    <a
                      onClick={(e) => e.stopPropagation()}
                      href={`https://wa.me/${r.whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs px-3 py-1.5 rounded-full border border-border"
                    >
                      WhatsApp
                    </a>
                  )}
                  <span className="text-xs text-primary ms-auto">Open</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <RequestFormDrawer
        open={drawer.open}
        onClose={() => setDrawer({ open: false, id: null })}
        requestId={drawer.id}
      />
      <RequestDetailPanel
        requestId={detailId}
        onClose={() => setDetailId(null)}
        onEdit={(id) => {
          setDetailId(null);
          setDrawer({ open: true, id });
        }}
      />
    </div>
  );
}
