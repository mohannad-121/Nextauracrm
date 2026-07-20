import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { fmtMoney, STATUS_LABELS, type RequestStatus } from "@/lib/constants";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import {
  AlertTriangle,
  BriefcaseBusiness,
  Clock,
  DollarSign,
  TrendingUp,
  Users2,
  FileClock,
  type LucideIcon,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — NextAura AI" }] }),
  component: DashboardPage,
});

const BRAND_COLORS = ["#5aa9ff", "#a879ff", "#4dd6c8", "#ffb74d", "#ff7285", "#7dd3fc"];

function useDashboardData() {
  return useQuery({
    queryKey: ["dashboard-data"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const weekAhead = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

      const [requestsRes, careersRes] = await Promise.all([
        supabase
          .from("client_requests")
          .select(
            "id,status,category_id,agreed_price,amount_paid,currency,next_follow_up_date,expected_delivery_date,assigned_to,archived_at,project_categories(name_en,name_ar,slug)",
          )
          .is("archived_at", null),
        supabase
          .from("career_profiles")
          .select("id", { count: "exact", head: false })
          .is("archived_at", null),
      ]);
      if (requestsRes.error) throw requestsRes.error;
      const rows = requestsRes.data ?? [];

      const byStatus: Record<string, number> = {};
      const byCat: Record<string, number> = {};
      let agreed = 0,
        paid = 0;
      const attention: { id: string; label: string; kind: string }[] = [];

      for (const r of rows) {
        byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
        const cat = r.project_categories?.name_en ?? "Uncategorized";
        byCat[cat] = (byCat[cat] ?? 0) + 1;
        agreed += Number(r.agreed_price ?? 0);
        paid += Number(r.amount_paid ?? 0);
        if (
          r.expected_delivery_date &&
          r.expected_delivery_date < today &&
          !["completed", "delivered", "cancelled", "rejected"].includes(r.status)
        ) {
          attention.push({ id: r.id, label: `Overdue delivery`, kind: "overdue" });
        }
        if (r.next_follow_up_date && r.next_follow_up_date <= today) {
          attention.push({ id: r.id, label: `Follow-up due`, kind: "followup" });
        }
        if (!r.assigned_to && ["approved", "in_progress"].includes(r.status)) {
          attention.push({ id: r.id, label: `Unassigned`, kind: "unassigned" });
        }
      }

      return {
        rows,
        byStatus,
        byCat,
        agreed,
        paid,
        remaining: agreed - paid,
        active: rows.filter((r) => !["completed", "cancelled", "rejected"].includes(r.status))
          .length,
        newLeads: byStatus["new_lead"] ?? 0,
        quotesAwaiting: (byStatus["quote_sent"] ?? 0) + (byStatus["negotiating"] ?? 0),
        approved: byStatus["approved"] ?? 0,
        inProgress: byStatus["in_progress"] ?? 0,
        overdue: rows.filter(
          (r) =>
            r.expected_delivery_date &&
            r.expected_delivery_date < today &&
            !["completed", "delivered", "cancelled", "rejected"].includes(r.status),
        ).length,
        followToday: rows.filter((r) => r.next_follow_up_date === today).length,
        followWeek: rows.filter(
          (r) =>
            r.next_follow_up_date &&
            r.next_follow_up_date >= today &&
            r.next_follow_up_date <= weekAhead,
        ).length,
        careerCount: careersRes.data?.length ?? 0,
        attention: attention.slice(0, 10),
      };
    },
  });
}

function Card({
  title,
  value,
  icon: Icon,
  accent,
}: {
  title: string;
  value: string | number;
  icon: LucideIcon;
  accent?: boolean;
}) {
  return (
    <div className="glass-card p-4 flex items-start justify-between">
      <div>
        <div className="text-xs text-muted-foreground">{title}</div>
        <div className={`text-2xl font-semibold mt-1 ${accent ? "brand-gradient-text" : ""}`}>
          {value}
        </div>
      </div>
      <div className="w-9 h-9 rounded-lg brand-gradient-bg opacity-80 flex items-center justify-center">
        <Icon className="w-4 h-4 text-primary-foreground" />
      </div>
    </div>
  );
}

function DashboardPage() {
  const { t, lang } = useI18n();
  const { data, isLoading } = useDashboardData();

  if (isLoading || !data) {
    return <div className="text-muted-foreground">{t("loading")}</div>;
  }

  const statusData = Object.entries(data.byStatus).map(([k, v]) => ({
    name: STATUS_LABELS[k as RequestStatus]?.[lang] ?? k,
    value: v,
  }));
  const catData = Object.entries(data.byCat).map(([k, v]) => ({ name: k, value: v }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("dashboard")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of client requests, revenue, and follow-ups.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card title={t("activeRequests")} value={data.active} icon={Users2} accent />
        <Card title={t("newLeads")} value={data.newLeads} icon={TrendingUp} />
        <Card title={t("quotesAwaiting")} value={data.quotesAwaiting} icon={FileClock} />
        <Card title={t("approvedProjects")} value={data.approved} icon={TrendingUp} />
        <Card title={t("inProgress")} value={data.inProgress} icon={Clock} />
        <Card title={t("overdue")} value={data.overdue} icon={AlertTriangle} />
        <Card title={t("followUpsToday")} value={data.followToday} icon={Clock} />
        <Card title={t("followUpsWeek")} value={data.followWeek} icon={Clock} />
        <Card title={t("agreedRevenue")} value={fmtMoney(data.agreed)} icon={DollarSign} accent />
        <Card title={t("received")} value={fmtMoney(data.paid)} icon={DollarSign} />
        <Card title={t("remaining")} value={fmtMoney(data.remaining)} icon={DollarSign} />
        <Card title={t("careerApps")} value={data.careerCount} icon={BriefcaseBusiness} />
      </div>

      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <h2 className="font-semibold">{t("needsAttention")}</h2>
        </div>
        {data.attention.length === 0 ? (
          <p className="text-sm text-muted-foreground">All clear — no urgent items.</p>
        ) : (
          <ul className="divide-y divide-border">
            {data.attention.map((a, i) => (
              <li key={a.id + i} className="py-2 flex items-center justify-between text-sm">
                <span>{a.label}</span>
                <a href={`/requests?open=${a.id}`} className="text-primary hover:underline">
                  Open
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-4">
          <h3 className="text-sm font-medium mb-3">{t("requestsByStatus")}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#94a3b8", fontSize: 10 }}
                  interval={0}
                  angle={-30}
                  textAnchor="end"
                  height={70}
                />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="value" fill="#5aa9ff" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass-card p-4">
          <h3 className="text-sm font-medium mb-3">{t("requestsByCategory")}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={catData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {catData.map((_, i) => (
                    <Cell key={i} fill={BRAND_COLORS[i % BRAND_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: 8,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
