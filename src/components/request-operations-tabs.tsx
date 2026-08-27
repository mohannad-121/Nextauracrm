import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileDown, FilePlus2, Paperclip, Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  operationsDb,
  type ClientFile,
  type ClientTask,
  type Invoice,
  type Milestone,
} from "@/lib/operations-db";
import { fmtDate, fmtMoney } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type RequestData = {
  id: string;
  project_title: string;
  customer_name: string;
  currency: string | null;
  agreed_price: number | null;
  amount_paid: number;
};
export function RequestActivityTab({ request }: { request: RequestData }) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [type, setType] = useState<"note" | "call" | "whatsapp" | "email" | "meeting">("note");
  const { data: activities = [] } = useQuery({
    queryKey: ["request-activities", request.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("request_activities")
        .select("id,activity_type,content,created_at")
        .eq("request_id", request.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  async function add() {
    if (!content.trim()) return;
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("request_activities").insert({
      request_id: request.id,
      activity_type: type,
      content: content.trim(),
      created_by: auth.user?.id ?? null,
    });
    if (error) toast.error(error.message);
    else {
      setContent("");
      queryClient.invalidateQueries({
        queryKey: ["request-activities", request.id],
      });
      toast.success("Activity logged");
    }
  }
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border p-4">
        <div className="flex gap-2">
          <select
            value={type}
            onChange={(event) => setType(event.target.value as typeof type)}
            className="rounded-md border border-input bg-input px-2 text-xs"
          >
            {["note", "call", "whatsapp", "email", "meeting"].map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <Textarea
            rows={2}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            className="min-w-0 flex-1 rounded-md border border-input bg-input p-2 text-sm"
            placeholder="Record what happened and the next step…"
          />
        </div>
        <button
          onClick={add}
          className="mt-2 inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
        >
          <Plus className="h-3 w-3" />
          Log activity
        </button>
      </div>
      <ol className="space-y-3 border-s border-border ps-4">
        {activities.map((activity) => (
          <li key={activity.id} className="relative">
            <span className="absolute -start-[1.35rem] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
            <p className="text-xs font-medium uppercase tracking-wide text-primary">
              {activity.activity_type}
            </p>
            <p className="mt-1 text-sm">{activity.content || "No description"}</p>
            <p className="mt-1 text-xs text-muted-foreground">{fmtDate(activity.created_at)}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
export function RequestTasksTab({ request }: { request: RequestData }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const { data: tasks = [] } = useQuery({
    queryKey: ["request-tasks", request.id],
    queryFn: async () => {
      const { data, error } = await operationsDb
        .from<ClientTask>("client_tasks")
        .select()
        .eq("request_id", request.id)
        .order("due_at");
      if (error) throw error;
      return data ?? [];
    },
  });
  async function add() {
    if (!title.trim()) return;
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await operationsDb.from<ClientTask>("client_tasks").insert({
      request_id: request.id,
      title: title.trim(),
      status: "open",
      priority: "normal",
      created_by: auth.user?.id ?? null,
      assigned_to: auth.user?.id ?? null,
    } as Partial<ClientTask>);
    if (error) toast.error(error.message);
    else {
      setTitle("");
      queryClient.invalidateQueries({
        queryKey: ["request-tasks", request.id],
      });
    }
  }
  async function complete(task: ClientTask) {
    const { error } = await operationsDb
      .from<ClientTask>("client_tasks")
      .update({ status: "done", completed_at: new Date().toISOString() })
      .eq("id", task.id);
    if (error) toast.error(error.message);
    else
      queryClient.invalidateQueries({
        queryKey: ["request-tasks", request.id],
      });
  }
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="min-w-0 flex-1 rounded-md border border-input bg-input px-3 py-2 text-sm"
          placeholder="Create the next task…"
        />
        <button
          onClick={add}
          className="rounded-md bg-primary px-3 text-xs text-primary-foreground"
        >
          Add
        </button>
      </div>
      {tasks.map((task) => (
        <div key={task.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
          <button onClick={() => complete(task)} disabled={task.status === "done"}>
            <CheckCircle2
              className={`h-5 w-5 ${task.status === "done" ? "text-emerald-400" : "text-muted-foreground"}`}
            />
          </button>
          <div className="min-w-0 flex-1">
            <p
              className={
                task.status === "done" ? "text-sm line-through text-muted-foreground" : "text-sm"
              }
            >
              {task.title}
            </p>
            <p className="text-xs text-muted-foreground">Due {fmtDate(task.due_at)}</p>
          </div>
        </div>
      ))}
      {!tasks.length && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No tasks yet. Add the next concrete action.
        </p>
      )}
    </div>
  );
}
export function RequestFilesTab({ request }: { request: RequestData }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const { data: files = [] } = useQuery({
    queryKey: ["request-files", request.id],
    queryFn: async () => {
      const { data, error } = await operationsDb
        .from<ClientFile>("client_files")
        .select()
        .eq("request_id", request.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  async function upload(file: File | null) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Files must be 10MB or smaller.");
      return;
    }
    setUploading(true);
    const path = `${request.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error: storageError } = await supabase.storage.from("client-files").upload(path, file);
    if (storageError) {
      toast.error(storageError.message);
      setUploading(false);
      return;
    }
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await operationsDb.from<ClientFile>("client_files").insert({
      request_id: request.id,
      path,
      file_name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
      uploaded_by: auth.user?.id ?? null,
    } as Partial<ClientFile>);
    setUploading(false);
    if (error) toast.error(error.message);
    else {
      toast.success("File attached");
      queryClient.invalidateQueries({
        queryKey: ["request-files", request.id],
      });
    }
  }
  return (
    <div className="space-y-3">
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border p-5 text-sm hover:bg-accent/10">
        <Upload className="h-4 w-4" />
        {uploading ? "Uploading…" : "Attach a client file"}
        <input
          type="file"
          className="hidden"
          onChange={(event) => upload(event.target.files?.[0] ?? null)}
        />
      </label>
      {files.map((file) => (
        <div
          key={file.id}
          className="flex items-center justify-between rounded-lg border border-border p-3"
        >
          <span className="flex min-w-0 items-center gap-2 text-sm">
            <Paperclip className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">{file.file_name}</span>
          </span>
          <span className="text-xs text-muted-foreground">
            {file.size_bytes ? `${Math.ceil(file.size_bytes / 1024)} KB` : ""}
          </span>
        </div>
      ))}
      {!files.length && (
        <p className="py-8 text-center text-sm text-muted-foreground">No files attached.</p>
      )}
    </div>
  );
}
export function RequestPaymentsTab({ request }: { request: RequestData }) {
  const queryClient = useQueryClient();
  const { data: invoices = [] } = useQuery({
    queryKey: ["request-invoices", request.id],
    queryFn: async () => {
      const { data, error } = await operationsDb
        .from<Invoice>("invoices")
        .select()
        .eq("request_id", request.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: milestones = [] } = useQuery({
    queryKey: ["request-milestones", request.id],
    queryFn: async () => {
      const { data, error } = await operationsDb
        .from<Milestone>("payment_milestones")
        .select()
        .eq("request_id", request.id)
        .order("due_date");
      if (error) throw error;
      return data ?? [];
    },
  });
  async function createInvoice() {
    const raw = window.prompt("Invoice total", String(request.agreed_price ?? ""));
    const total = Number(raw);
    if (!Number.isFinite(total) || total <= 0) return;
    const due = window.prompt(
      "Due date (YYYY-MM-DD)",
      new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    );
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await operationsDb.from<Invoice>("invoices").insert({
      request_id: request.id,
      invoice_number: "",
      status: "draft",
      currency: request.currency ?? "JOD",
      subtotal: total,
      total_amount: total,
      tax_amount: 0,
      due_date: due || null,
      line_items: [{ description: request.project_title, amount: total }],
      created_by: auth.user?.id ?? null,
    } as Partial<Invoice>);
    if (error) toast.error(error.message);
    else {
      toast.success("Invoice created");
      queryClient.invalidateQueries({
        queryKey: ["request-invoices", request.id],
      });
    }
  }
  async function addMilestone() {
    const title = window.prompt("Milestone name", "Deposit");
    const amount = Number(window.prompt("Milestone amount", ""));
    if (!title || !Number.isFinite(amount) || amount <= 0) return;
    const { error } = await operationsDb.from<Milestone>("payment_milestones").insert({
      request_id: request.id,
      title,
      amount,
      status: "pending",
    } as Partial<Milestone>);
    if (error) toast.error(error.message);
    else
      queryClient.invalidateQueries({
        queryKey: ["request-milestones", request.id],
      });
  }
  function print(invoice: Invoice) {
    const popup = window.open("", "_blank", "noopener,noreferrer");
    if (!popup) return;
    popup.document.write(
      `<title>${invoice.invoice_number}</title><main style="font-family:Arial;max-width:700px;margin:48px auto"><h1>NextAura AI</h1><h2>Invoice ${invoice.invoice_number}</h2><p>Bill to: ${request.customer_name}</p><p>Project: ${request.project_title}</p><hr/><h2>${fmtMoney(invoice.total_amount, invoice.currency)}</h2><p>Due: ${invoice.due_date ?? "On receipt"}</p><p>${invoice.notes ?? "Thank you for working with NextAura AI."}</p></main>`,
    );
    popup.document.close();
    popup.print();
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={createInvoice}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
        >
          <FilePlus2 className="h-3.5 w-3.5" />
          Create invoice
        </button>
        <button
          onClick={addMilestone}
          className="rounded-md border border-border px-3 py-2 text-xs"
        >
          Add payment milestone
        </button>
      </div>
      <section>
        <h3 className="text-sm font-medium">Invoices</h3>
        <div className="mt-2 space-y-2">
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="flex items-center justify-between rounded-lg border border-border p-3 text-sm"
            >
              <span>
                {invoice.invoice_number}{" "}
                <span className="text-xs text-muted-foreground">· {invoice.status}</span>
              </span>
              <div className="flex items-center gap-2">
                <span>{fmtMoney(invoice.total_amount, invoice.currency)}</span>
                <button
                  onClick={() => print(invoice)}
                  className="rounded p-1.5 hover:bg-accent/20"
                  aria-label="Print invoice"
                >
                  <FileDown className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {!invoices.length && <p className="text-sm text-muted-foreground">No invoices yet.</p>}
        </div>
      </section>
      <section>
        <h3 className="text-sm font-medium">Payment milestones</h3>
        <div className="mt-2 space-y-2">
          {milestones.map((milestone) => (
            <div
              key={milestone.id}
              className="flex justify-between rounded-lg border border-border p-3 text-sm"
            >
              <span>
                {milestone.title}{" "}
                <span className="text-xs text-muted-foreground">· {milestone.status}</span>
              </span>
              <span>{fmtMoney(milestone.amount, request.currency ?? "JOD")}</span>
            </div>
          ))}
          {!milestones.length && (
            <p className="text-sm text-muted-foreground">
              Break the project into deposits or delivery milestones.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
