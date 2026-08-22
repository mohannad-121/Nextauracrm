import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { GripVertical, Plus, UserRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate, fmtMoney, type RequestStatus } from "@/lib/constants";
import { StatusBadge } from "@/components/status-badge";
import { RequestDetailPanel } from "@/components/request-detail-panel";

const columns: { label: string; status: RequestStatus; hint: string }[] = [
  {
    label: "Leads",
    status: "new_lead",
    hint: "Qualify and make first contact",
  },
  { label: "Quotes", status: "quote_sent", hint: "Follow up and negotiate" },
  {
    label: "Approved",
    status: "approved",
    hint: "Assign an owner and plan work",
  },
  {
    label: "Delivery",
    status: "in_progress",
    hint: "Deliver quality work on time",
  },
  { label: "Won", status: "completed", hint: "Close out and retain" },
];
type Card = {
  id: string;
  request_number: string | null;
  customer_name: string;
  business_name: string | null;
  project_title: string;
  status: RequestStatus;
  priority: string;
  agreed_price: number | null;
  currency: string | null;
  next_follow_up_date: string | null;
  expected_delivery_date: string | null;
  assigned_to: string | null;
};
export const Route = createFileRoute("/_authenticated/pipeline")({
  component: PipelinePage,
  head: () => ({ meta: [{ title: "Pipeline — NextAura AI" }] }),
});
function PipelinePage() {
  const queryClient = useQueryClient();
  const [dragging, setDragging] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const { data: cards = [] } = useQuery({
    queryKey: ["pipeline"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_requests")
        .select(
          "id,request_number,customer_name,business_name,project_title,status,priority,agreed_price,currency,next_follow_up_date,expected_delivery_date,assigned_to",
        )
        .is("archived_at", null)
        .not("status", "in", "(cancelled,rejected,delivered)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as Card[]) ?? [];
    },
  });
  const byColumn = useMemo(
    () =>
      columns.map((column) => ({
        ...column,
        cards: cards.filter((card) => card.status === column.status),
      })),
    [cards],
  );
  async function move(status: RequestStatus) {
    if (!dragging) return;
    const { error } = await supabase.from("client_requests").update({ status }).eq("id", dragging);
    if (error) toast.error(error.message);
    else {
      toast.success("Pipeline updated");
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["client-requests"] });
    }
    setDragging(null);
  }
  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[.16em] text-primary">OPERATIONS</p>
          <h1 className="text-2xl font-semibold">Sales & delivery pipeline</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Drag a card to advance it. Each stage has one clear operational next action.
          </p>
        </div>
        <a
          href="/requests"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent/20"
        >
          <Plus className="h-4 w-4" />
          New request
        </a>
      </div>
      <div className="grid min-w-[1100px] grid-cols-5 gap-3">
        {byColumn.map((column) => (
          <section
            key={column.status}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => move(column.status)}
            className="rounded-xl border border-border bg-card/35 p-3"
          >
            <header className="border-b border-border pb-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{column.label}</h2>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                  {column.cards.length}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{column.hint}</p>
            </header>
            <div className="mt-3 space-y-2">
              {column.cards.map((card) => (
                <button
                  draggable
                  onDragStart={() => setDragging(card.id)}
                  onClick={() => setSelected(card.id)}
                  key={card.id}
                  className="w-full rounded-lg border border-border bg-background/80 p-3 text-start shadow-sm hover:border-primary/50"
                >
                  <div className="flex justify-between gap-2">
                    <p className="line-clamp-2 text-sm font-medium">{card.project_title}</p>
                    <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    <UserRound className="mr-1 inline h-3 w-3" />
                    {card.customer_name}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <StatusBadge status={card.status} />
                    <span className="text-xs">
                      {fmtMoney(card.agreed_price, card.currency ?? "JOD")}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-amber-300">
                    Next:{" "}
                    {card.next_follow_up_date
                      ? `follow up ${fmtDate(card.next_follow_up_date)}`
                      : card.expected_delivery_date
                        ? `deliver ${fmtDate(card.expected_delivery_date)}`
                        : "set next action"}
                  </p>
                </button>
              ))}
              {!column.cards.length && (
                <div className="rounded-lg border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
                  Drop a deal here
                </div>
              )}
            </div>
          </section>
        ))}
      </div>
      <RequestDetailPanel
        requestId={selected}
        onClose={() => setSelected(null)}
        onEdit={() => setSelected(null)}
      />
    </div>
  );
}
