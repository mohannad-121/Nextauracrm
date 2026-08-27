import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock3, Plus, UserRound } from "lucide-react";
import { toast } from "sonner";
import { operationsDb, type ClientTask } from "@/lib/operations-db";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate } from "@/lib/constants";
import { Input } from "@/components/ui/input";

type RequestName = { id: string; project_title: string; customer_name: string };
export const Route = createFileRoute("/_authenticated/tasks")({
  component: TasksPage,
  head: () => ({ meta: [{ title: "Tasks — NextAura AI" }] }),
});
function TasksPage() {
  const queryClient = useQueryClient();
  const [me, setMe] = useState<string | null>(null);
  const [onlyMine, setOnlyMine] = useState(true);
  const [adding, setAdding] = useState(false);
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);
  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await operationsDb
        .from<ClientTask>("client_tasks")
        .select()
        .order("due_at");
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: requests = [] } = useQuery({
    queryKey: ["task-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_requests")
        .select("id,project_title,customer_name")
        .is("archived_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as RequestName[]) ?? [];
    },
  });
  const visible = useMemo(
    () => tasks.filter((task) => !onlyMine || task.assigned_to === me || task.created_by === me),
    [tasks, onlyMine, me],
  );
  const today = new Date().toISOString().slice(0, 10);
  const dueToday = visible.filter(
    (task) => task.status !== "done" && task.due_at?.slice(0, 10) === today,
  );
  const overdue = visible.filter(
    (task) => task.status !== "done" && task.due_at && task.due_at.slice(0, 10) < today,
  );
  async function complete(task: ClientTask) {
    const { error } = await operationsDb
      .from<ClientTask>("client_tasks")
      .update({ status: "done", completed_at: new Date().toISOString() })
      .eq("id", task.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Task complete");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    }
  }
  async function addTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const requestId = String(form.get("request") || "");
    const due = String(form.get("due") || "");
    const { error } = await operationsDb.from<ClientTask>("client_tasks").insert({
      title: String(form.get("title") || "").trim(),
      request_id: requestId || null,
      assigned_to: me,
      created_by: me,
      priority: String(form.get("priority") || "normal") as ClientTask["priority"],
      due_at: due ? new Date(`${due}T09:00:00`).toISOString() : null,
      status: "open",
    } as Partial<ClientTask>);
    if (error) toast.error(error.message);
    else {
      setAdding(false);
      toast.success("Task created");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    }
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[.16em] text-primary">EXECUTION</p>
          <h1 className="text-2xl font-semibold">My work today</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tasks and reminders keep follow-ups and delivery ownership visible.
          </p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
          Add task
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Stat icon={Clock3} label="Due today" value={dueToday.length} tone="text-primary" />
        <Stat icon={Clock3} label="Overdue" value={overdue.length} tone="text-rose-300" />
        <Stat
          icon={CheckCircle2}
          label="Open work"
          value={visible.filter((task) => task.status !== "done").length}
          tone="text-emerald-300"
        />
      </div>
      <div className="flex items-center justify-between rounded-xl border border-border bg-card/50 px-4 py-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={onlyMine}
            onChange={(event) => setOnlyMine(event.target.checked)}
          />
          Only my tasks
        </label>
        <span className="text-xs text-muted-foreground">{visible.length} shown</span>
      </div>
      <div className="rounded-xl border border-border bg-card/50">
        {visible.length ? (
          visible.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0"
            >
              <button
                onClick={() => complete(task)}
                disabled={task.status === "done"}
                className={`rounded-full ${task.status === "done" ? "text-emerald-400" : "text-muted-foreground hover:text-primary"}`}
                aria-label="Complete task"
              >
                <CheckCircle2 className="h-5 w-5" />
              </button>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-medium ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}
                >
                  {task.title}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {requests.find((request) => request.id === task.request_id)?.project_title ||
                    "General client task"}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-1 text-xs ${task.priority === "urgent" ? "bg-rose-500/15 text-rose-200" : task.priority === "high" ? "bg-amber-500/15 text-amber-200" : "bg-muted text-muted-foreground"}`}
              >
                {task.priority}
              </span>
              <span className="w-24 text-end text-xs text-muted-foreground">
                {fmtDate(task.due_at)}
              </span>
            </div>
          ))
        ) : (
          <p className="p-10 text-center text-sm text-muted-foreground">
            No tasks in this view. Enjoy the clear slate.
          </p>
        )}
      </div>
      {adding && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <form
            onSubmit={addTask}
            className="w-full max-w-md rounded-xl bg-background p-5 shadow-2xl"
          >
            <h2 className="text-lg font-semibold">Create task</h2>
            <div className="mt-4 grid gap-3">
              <Input
                name="title"
                required
                placeholder="What needs to happen?"
                className="rounded-md border border-input bg-input px-3 py-2"
              />
              <select name="request" className="rounded-md border border-input bg-input px-3 py-2">
                <option value="">No linked request</option>
                {requests.map((request) => (
                  <option key={request.id} value={request.id}>
                    {request.project_title} — {request.customer_name}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  name="due"
                  type="date"
                  className="rounded-md border border-input bg-input px-3 py-2"
                />
                <select
                  name="priority"
                  className="rounded-md border border-input bg-input px-3 py-2"
                >
                  <option>normal</option>
                  <option>high</option>
                  <option>urgent</option>
                  <option>low</option>
                </select>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="rounded-md border border-border px-3 py-2 text-sm"
              >
                Cancel
              </button>
              <button className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
                Create task
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Clock3;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/55 p-4">
      <Icon className={`h-4 w-4 ${tone}`} />
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
