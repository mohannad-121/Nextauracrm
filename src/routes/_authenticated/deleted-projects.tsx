import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArchiveRestore, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate, fmtMoney } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type DeletedProject = {
  id: string;
  request_number: string | null;
  customer_name: string;
  business_name: string | null;
  project_title: string;
  agreed_price: number | null;
  currency: string | null;
  archived_at: string;
};

export const Route = createFileRoute("/_authenticated/deleted-projects")({
  head: () => ({ meta: [{ title: "Deleted Projects â€” NextAura AI" }] }),
  component: DeletedProjectsPage,
});

function DeletedProjectsPage() {
  const queryClient = useQueryClient();
  const [selectedProject, setSelectedProject] = useState<DeletedProject | null>(null);
  const [restoreCode, setRestoreCode] = useState("");
  const [restoring, setRestoring] = useState(false);
  const { data: canManageDeletedProjects, isLoading: permissionLoading } = useQuery({
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
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["deleted-projects"],
    enabled: Boolean(canManageDeletedProjects),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_requests")
        .select(
          "id,request_number,customer_name,business_name,project_title,agreed_price,currency,archived_at",
        )
        .not("archived_at", "is", null)
        .order("archived_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DeletedProject[];
    },
  });

  async function restoreProject() {
    if (!selectedProject || restoreCode !== "0000" || !canManageDeletedProjects) return;

    setRestoring(true);
    const { error } = await supabase
      .from("client_requests")
      .update({ archived_at: null })
      .eq("id", selectedProject.id);
    setRestoring(false);

    if (error) {
      toast.error("Unable to restore this project.");
      return;
    }

    toast.success("Project restored.");
    queryClient.invalidateQueries();
    setSelectedProject(null);
    setRestoreCode("");
  }

  if (permissionLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!canManageDeletedProjects)
    return <p className="text-sm text-muted-foreground">Not available.</p>;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold tracking-[.16em] text-primary">ARCHIVE</p>
        <h1 className="text-2xl font-semibold">Deleted Projects</h1>
        <p className="mt-1 text-sm text-muted-foreground">Restore a deleted project when needed.</p>
      </div>

      {projectsLoading ? (
        <p className="text-sm text-muted-foreground">Loading projects…</p>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No deleted projects.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <article key={project.id} className="rounded-xl border border-border bg-card/55 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-muted-foreground">
                    {project.request_number}
                  </p>
                  <h2 className="mt-1 truncate font-semibold">{project.project_title}</h2>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {project.customer_name}
                    {project.business_name ? ` · ${project.business_name}` : ""}
                  </p>
                </div>
                <ArchiveRestore className="h-5 w-5 shrink-0 text-muted-foreground" />
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3 text-xs">
                <span>{fmtMoney(project.agreed_price, project.currency ?? "JOD")}</span>
                <span className="text-muted-foreground">
                  Deleted {fmtDate(project.archived_at)}
                </span>
              </div>
              <button
                onClick={() => setSelectedProject(project)}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <RotateCcw className="h-4 w-4" />
                Restore project
              </button>
            </article>
          ))}
        </div>
      )}

      <AlertDialog
        open={Boolean(selectedProject)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedProject(null);
            setRestoreCode("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore project?</AlertDialogTitle>
            <AlertDialogDescription>
              This project will return to the active project list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={restoreCode}
            onChange={(event) => setRestoreCode(event.target.value)}
            className="w-full rounded-md border border-input bg-input px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
            aria-label="Confirmation code"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoring}>Cancel</AlertDialogCancel>
            <button
              type="button"
              onClick={restoreProject}
              disabled={restoreCode !== "0000" || restoring}
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
            >
              {restoring ? "Restoring…" : "Restore project"}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
