import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  FileText,
  FolderOpen,
  Pencil,
  Phone,
  ReceiptText,
  StickyNote,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate, fmtMoney, type RequestStatus, type Priority } from "@/lib/constants";
import type { Database } from "@/integrations/supabase/types";
import { StatusBadge } from "@/components/status-badge";
import { PriorityBadge } from "@/components/priority-badge";
import { RequestStageProgress } from "@/components/request-stage-progress";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  RequestActivityTab,
  RequestFilesTab,
  RequestPaymentsTab,
  RequestTasksTab,
} from "@/components/request-operations-tabs";

type Props = {
  requestId: string | null;
  onClose: () => void;
  onEdit: (id: string) => void;
};
type Tab = "overview" | "activity" | "tasks" | "files" | "payments";
type ClientRequest = Database["public"]["Tables"]["client_requests"]["Row"];

const tabs: { id: Tab; label: string; Icon: typeof FileText }[] = [
  { id: "overview", label: "Overview", Icon: FileText },
  { id: "activity", label: "Activity", Icon: StickyNote },
  { id: "tasks", label: "Tasks", Icon: CalendarClock },
  { id: "files", label: "Files", Icon: FolderOpen },
  { id: "payments", label: "Payments", Icon: ReceiptText },
];

export function RequestDetailPanel({ requestId, onClose, onEdit }: Props) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("overview");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteCode, setDeleteCode] = useState("");
  const [deleting, setDeleting] = useState(false);
  const { data: request, isLoading } = useQuery({
    queryKey: ["client-request", requestId],
    enabled: Boolean(requestId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_requests")
        .select("*")
        .eq("id", requestId!)
        .single();
      if (error) throw error;
      return data;
    },
  });
  const { data: canDeleteProject = false } = useQuery({
    queryKey: ["project-delete-permission"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return false;

      const { data: role, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .maybeSingle();
      if (error) throw error;
      return role?.role === "admin";
    },
  });
  if (!requestId) return null;
  const outstanding = Math.max(
    0,
    Number(request?.agreed_price ?? 0) - Number(request?.amount_paid ?? 0),
  );

  async function archiveProject() {
    if (!request || deleteCode !== "0000" || !canDeleteProject) return;

    setDeleting(true);
    const { error } = await supabase
      .from("client_requests")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", request.id);
    setDeleting(false);

    if (error) {
      toast.error("Unable to delete this project.");
      return;
    }

    toast.success("Project moved to Deleted Projects.");
    queryClient.invalidateQueries();
    setDeleteOpen(false);
    setDeleteCode("");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal aria-label="Request details">
      <button
        className="absolute inset-0 cursor-default bg-black/60"
        onClick={onClose}
        aria-label="Close request details"
      />
      <section className="relative ms-auto flex h-full w-full max-w-2xl flex-col border-s border-border bg-background shadow-2xl">
        <header className="border-b border-border bg-background/95 px-5 py-4 backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-xs text-muted-foreground">
                {request?.request_number ?? "Request"}
              </p>
              <h2 className="truncate text-lg font-semibold">
                {isLoading ? "Loading…" : request?.project_title}
              </h2>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => request && onEdit(request.id)}
                className="rounded-md p-2 hover:bg-accent/20"
                aria-label="Edit request"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={onClose}
                className="rounded-md p-2 hover:bg-accent/20"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          {request && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge status={request.status as RequestStatus} />
              <PriorityBadge priority={request.priority as Priority} />
            </div>
          )}
          {request && (
            <div className="mt-4">
              <RequestStageProgress status={request.status} />
            </div>
          )}
        </header>
        <nav
          className="flex gap-1 overflow-x-auto border-b border-border px-3"
          aria-label="Request sections"
        >
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-xs ${tab === id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </nav>
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading request…</p>
          ) : (
            request && <DetailContent tab={tab} request={request} outstanding={outstanding} />
          )}
          {request && canDeleteProject && (
            <div className="mt-5 border-t border-destructive/30 bg-destructive/5 pt-5">
              <button
                onClick={() => setDeleteOpen(true)}
                className="inline-flex items-center gap-2 rounded-md bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Delete project
              </button>
            </div>
          )}
        </div>
      </section>
      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setDeleteCode("");
        }}
      >
        <AlertDialogContent className="border-destructive/50">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to delete this project. It can be restored from Deleted Projects.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={deleteCode}
            onChange={(event) => setDeleteCode(event.target.value)}
            className="w-full rounded-md border border-input bg-input px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-destructive"
            aria-label="Confirmation code"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <button
              type="button"
              onClick={archiveProject}
              disabled={deleteCode !== "0000" || deleting}
              className="inline-flex h-10 items-center justify-center rounded-md bg-destructive px-4 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:pointer-events-none disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Delete project"}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DetailContent({
  tab,
  request,
  outstanding,
}: {
  tab: Tab;
  request: ClientRequest;
  outstanding: number;
}) {
  if (tab === "overview")
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <Metric
            label="Agreed"
            value={fmtMoney(request.agreed_price, request.currency ?? "JOD")}
          />
          <Metric
            label="Outstanding"
            value={fmtMoney(outstanding, request.currency ?? "JOD")}
            alert={outstanding > 0}
          />
        </div>
        <Info
          title="Client"
          icon={UserRound}
          lines={[
            request.customer_name,
            request.business_name,
            request.email,
            request.phone,
          ].filter(Boolean)}
        />
        <Info
          title="Project"
          icon={FileText}
          lines={[
            request.project_description || "No description added.",
            request.customer_requirements && `Requirements: ${request.customer_requirements}`,
          ].filter(Boolean)}
        />
        <Info
          title="Dates"
          icon={CalendarClock}
          lines={[
            `Delivery: ${fmtDate(request.expected_delivery_date)}`,
            `Follow-up: ${fmtDate(request.next_follow_up_date)}`,
          ]}
        />
      </div>
    );
  if (tab === "activity") return <RequestActivityTab request={request} />;
  if (tab === "tasks") return <RequestTasksTab request={request} />;
  if (tab === "files") return <RequestFilesTab request={request} />;
  return <RequestPaymentsTab request={request} />;
}

function Metric({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card/50 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${alert ? "text-amber-300" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}
function Info({
  title,
  icon: Icon,
  lines,
}: {
  title: string;
  icon: typeof FileText;
  lines: string[];
}) {
  return (
    <section className="rounded-xl border border-border bg-card/40 p-4">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </h3>
      {lines.map((line, index) => (
        <p key={index} className="mt-1 text-sm text-muted-foreground">
          {line}
        </p>
      ))}
    </section>
  );
}
