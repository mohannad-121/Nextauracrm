import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, FileText, Mail, MessageCircle, Phone, Plus, StickyNote, X } from "lucide-react";
import { toast } from "sonner";
import { operationsDb, type Client, type ClientTask, type Invoice } from "@/lib/operations-db";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate, fmtMoney } from "@/lib/constants";
import { BusinessCategoryBadge } from "@/components/business-category-badge";
import { Textarea } from "@/components/ui/textarea";

type RequestSummary = {
  id: string;
  request_number: string | null;
  project_title: string;
  status: string;
  agreed_price: number | null;
  amount_paid: number;
  currency: string | null;
  created_at: string;
};
type Props = { client: Client | null; onClose: () => void };

export function ClientProfileDrawer({ client, onClose }: Props) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const { data: requests = [] } = useQuery({
    queryKey: ["client-requests", client?.id],
    enabled: Boolean(client),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_requests")
        .select(
          "id,request_number,project_title,status,agreed_price,amount_paid,currency,created_at",
        )
        .eq("client_id", client!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as RequestSummary[];
    },
  });
  const { data: tasks = [] } = useQuery({
    queryKey: ["client-tasks", client?.id],
    enabled: Boolean(client),
    queryFn: async () => {
      const { data, error } = await operationsDb
        .from<ClientTask>("client_tasks")
        .select()
        .eq("client_id", client!.id)
        .order("due_at");
      if (error) throw error;
      return data ?? [];
    },
  });
  const requestIds = useMemo(() => requests.map((request) => request.id), [requests]);
  const { data: invoices = [] } = useQuery({
    queryKey: ["client-invoices", client?.id, requestIds.join(",")],
    enabled: requestIds.length > 0,
    queryFn: async () => {
      const { data, error } = await operationsDb
        .from<Invoice>("invoices")
        .select()
        .in("request_id", requestIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  if (!client) return null;
  const totalAgreed = requests.reduce(
    (total, request) => total + Number(request.agreed_price ?? 0),
    0,
  );
  const totalPaid = requests.reduce(
    (total, request) => total + Number(request.amount_paid ?? 0),
    0,
  );
  async function addNote() {
    if (!note.trim()) return;
    const firstRequest = requests[0];
    if (!firstRequest) {
      toast.error("Create a request for this client before adding an activity note.");
      return;
    }
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("request_activities").insert({
      request_id: firstRequest.id,
      activity_type: "note",
      content: `[Client note] ${note.trim()}`,
      created_by: auth.user?.id ?? null,
    });
    if (error) toast.error(error.message);
    else {
      setNote("");
      toast.success("Client note added");
      queryClient.invalidateQueries({
        queryKey: ["client-requests", client.id],
      });
    }
  }
  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal aria-label="Client profile">
      <button
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-label="Close client profile"
      />
      <section className="relative ms-auto flex h-full w-full max-w-2xl flex-col border-s border-border bg-background shadow-2xl">
        <header className="border-b border-border px-5 py-4">
          <div className="flex justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-xs text-primary">
                <Building2 className="h-4 w-4" />
                CLIENT PROFILE
              </p>
              <h2 className="mt-1 truncate text-xl font-semibold">{client.display_name}</h2>
              <div className="mt-2">
                <BusinessCategoryBadge category={client.business_name || "Independent client"} />
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-2 hover:bg-accent/20"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {client.phone && (
              <a
                href={`tel:${client.phone}`}
                className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 hover:bg-accent/20"
              >
                <Phone className="h-3 w-3" />
                Call
              </a>
            )}
            {client.whatsapp && (
              <a
                href={`https://wa.me/${client.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 hover:bg-accent/20"
              >
                <MessageCircle className="h-3 w-3" />
                WhatsApp
              </a>
            )}
            {client.email && (
              <a
                href={`mailto:${client.email}`}
                className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 hover:bg-accent/20"
              >
                <Mail className="h-3 w-3" />
                Email
              </a>
            )}
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <Metric label="Projects" value={String(requests.length)} />
            <Metric label="Agreed" value={fmtMoney(totalAgreed)} />
            <Metric label="Paid" value={fmtMoney(totalPaid)} />
          </div>
          <section className="rounded-xl border border-border p-4">
            <h3 className="font-medium">Projects</h3>
            <div className="mt-3 space-y-2">
              {requests.length ? (
                requests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between rounded-lg bg-card/60 p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{request.project_title}</p>
                      <p className="text-xs text-muted-foreground">
                        {request.request_number} · {request.status.replaceAll("_", " ")}
                      </p>
                    </div>
                    <span>{fmtMoney(request.agreed_price, request.currency ?? "JOD")}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No requests yet.</p>
              )}
            </div>
          </section>
          <section className="rounded-xl border border-border p-4">
            <h3 className="font-medium">Tasks</h3>
            <div className="mt-3 space-y-2">
              {tasks.length ? (
                tasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between text-sm">
                    <span>{task.title}</span>
                    <span className="text-xs text-muted-foreground">{fmtDate(task.due_at)}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No tasks due.</p>
              )}
            </div>
          </section>
          <section className="rounded-xl border border-border p-4">
            <h3 className="font-medium">Invoices</h3>
            <div className="mt-3 space-y-2">
              {invoices.length ? (
                invoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between text-sm">
                    <span>
                      {invoice.invoice_number}{" "}
                      <span className="text-xs text-muted-foreground">· {invoice.status}</span>
                    </span>
                    <span>{fmtMoney(invoice.total_amount, invoice.currency)}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No invoices created.</p>
              )}
            </div>
          </section>
          <section className="rounded-xl border border-border p-4">
            <h3 className="flex items-center gap-2 font-medium">
              <StickyNote className="h-4 w-4 text-primary" />
              Log client note
            </h3>
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              className="mt-3 w-full rounded-md border border-input bg-input p-2 text-sm"
              placeholder="Capture a call outcome, decision, or next step…"
            />
            <button
              onClick={addNote}
              className="mt-2 inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
            >
              <Plus className="h-3 w-3" />
              Add note
            </button>
          </section>
        </div>
      </section>
    </div>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
