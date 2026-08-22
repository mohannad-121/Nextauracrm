import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, CheckCircle2, Clock3, Play, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { operationsDb, type AutomationRule, type Invoice } from "@/lib/operations-db";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney } from "@/lib/constants";

type RequestRow = {
  id: string;
  status: string;
  contact_source: string | null;
  category_id: string | null;
  agreed_price: number | null;
  amount_paid: number;
  currency: string | null;
  created_at: string;
  expected_delivery_date: string | null;
  assigned_to: string | null;
};
export const Route = createFileRoute("/_authenticated/reports")({
  component: ReportsPage,
  head: () => ({ meta: [{ title: "Reports — NextAura AI" }] }),
});
function ReportsPage() {
  const queryClient = useQueryClient();
  const { data: requests = [] } = useQuery({
    queryKey: ["report-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_requests")
        .select(
          "id,status,contact_source,category_id,agreed_price,amount_paid,currency,created_at,expected_delivery_date,assigned_to",
        )
        .is("archived_at", null);
      if (error) throw error;
      return (data as RequestRow[]) ?? [];
    },
  });
  const { data: invoices = [] } = useQuery({
    queryKey: ["report-invoices"],
    queryFn: async () => {
      const { data, error } = await operationsDb.from<Invoice>("invoices").select();
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: rules = [] } = useQuery({
    queryKey: ["automation-rules"],
    queryFn: async () => {
      const { data, error } = await operationsDb
        .from<AutomationRule>("crm_automation_rules")
        .select();
      if (error) throw error;
      return data ?? [];
    },
  });
  const metrics = useMemo(() => {
    const won = requests.filter((request) =>
      ["approved", "in_progress", "delivered", "completed"].includes(request.status),
    );
    const closed = requests.filter((request) =>
      ["completed", "delivered", "cancelled", "rejected"].includes(request.status),
    );
    const agreed = requests.reduce(
      (total, request) => total + Number(request.agreed_price ?? 0),
      0,
    );
    const paid = requests.reduce((total, request) => total + Number(request.amount_paid ?? 0), 0);
    const forecast = requests
      .filter((request) => request.expected_delivery_date && request.status === "in_progress")
      .reduce(
        (total, request) =>
          total + Math.max(0, Number(request.agreed_price ?? 0) - Number(request.amount_paid ?? 0)),
        0,
      );
    const source = new Map<string, { total: number; won: number }>();
    requests.forEach((request) => {
      const key = request.contact_source || "Unattributed";
      const current = source.get(key) || { total: 0, won: 0 };
      current.total++;
      if (["approved", "in_progress", "delivered", "completed"].includes(request.status))
        current.won++;
      source.set(key, current);
    });
    return {
      conversion: requests.length ? Math.round((won.length / requests.length) * 100) : 0,
      closeDays: closed.length
        ? Math.round(
            closed.reduce(
              (total, request) =>
                total + (Date.now() - new Date(request.created_at).getTime()) / 86400000,
              0,
            ) / closed.length,
          )
        : 0,
      agreed,
      paid,
      forecast,
      source: [...source.entries()].sort((a, b) => b[1].total - a[1].total),
    };
  }, [requests]);
  async function toggle(rule: AutomationRule) {
    const { error } = await operationsDb
      .from<AutomationRule>("crm_automation_rules")
      .update({ enabled: !rule.enabled })
      .eq("key", rule.key);
    if (error) toast.error(error.message);
    else queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
  }
  async function run() {
    const { data, error } = await operationsDb.rpc("crm_apply_automations");
    if (error) toast.error(error.message);
    else {
      toast.success(
        `Automations run: ${data?.cold_leads ?? 0} cold leads, ${data?.overdue_invoices ?? 0} overdue invoices updated.`,
      );
      queryClient.invalidateQueries();
    }
  }
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold tracking-[.16em] text-primary">INTELLIGENCE</p>
        <h1 className="text-2xl font-semibold">Revenue & pipeline reporting</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Conversion, revenue, attribution, and forecast from the live CRM.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Metric icon={TrendingUp} label="Lead conversion" value={`${metrics.conversion}%`} />
        <Metric icon={Clock3} label="Avg. close age" value={`${metrics.closeDays} days`} />
        <Metric icon={BarChart3} label="Agreed revenue" value={fmtMoney(metrics.agreed)} />
        <Metric icon={CheckCircle2} label="Collected" value={fmtMoney(metrics.paid)} />
        <Metric icon={TrendingUp} label="Delivery forecast" value={fmtMoney(metrics.forecast)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card/55 p-5">
          <h2 className="font-semibold">Lead source attribution</h2>
          <div className="mt-4 space-y-3">
            {metrics.source.map(([source, values]) => (
              <div key={source}>
                <div className="flex justify-between text-sm">
                  <span>{source}</span>
                  <span className="text-muted-foreground">
                    {values.won}/{values.total} converted
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded bg-muted">
                  <div
                    className="h-full rounded bg-primary"
                    style={{
                      width: `${values.total ? (values.won / values.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-xl border border-border bg-card/55 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Automations</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Rules act on quotes, delivery, invoices, and cold leads.
              </p>
            </div>
            <button
              onClick={run}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
            >
              <Play className="h-3 w-3" />
              Run now
            </button>
          </div>
          <div className="mt-4 space-y-2">
            {rules.map((rule) => (
              <label
                key={rule.key}
                className="flex cursor-pointer items-center justify-between rounded-lg border border-border p-3 text-sm"
              >
                <span>{rule.label}</span>
                <input type="checkbox" checked={rule.enabled} onChange={() => toggle(rule)} />
              </label>
            ))}
          </div>
        </section>
      </div>
      <section className="rounded-xl border border-border bg-card/55 p-5">
        <h2 className="font-semibold">Overdue invoice balance</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {fmtMoney(
            invoices
              .filter((invoice) => invoice.status === "overdue")
              .reduce((total, invoice) => total + Number(invoice.total_amount), 0),
          )}{" "}
          across {invoices.filter((invoice) => invoice.status === "overdue").length} invoices.
        </p>
      </section>
    </div>
  );
}
function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/55 p-4">
      <Icon className="h-4 w-4 text-primary" />
      <p className="mt-3 text-xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
