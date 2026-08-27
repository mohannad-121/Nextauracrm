import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, BriefcaseBusiness, ExternalLink, Pencil, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { CareerProfileDialog } from "@/components/career-profile-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type CareerProfile = Database["public"]["Tables"]["career_profiles"]["Row"];

export const Route = createFileRoute("/_authenticated/careers")({
  head: () => ({ meta: [{ title: "Career Portal — NextAura AI" }] }),
  component: CareerPortal,
});

function linkLabel(link: string): string {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return link;
  }
}

function CareerPortal() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [fieldFilter, setFieldFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<CareerProfile | null>(null);

  const {
    data = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["career-profiles"],
    queryFn: async () => {
      const result = await supabase
        .from("career_profiles")
        .select("*")
        .is("archived_at", null)
        .order("created_at", { ascending: false });

      if (result.error) throw result.error;
      return result.data;
    },
  });

  const fields = useMemo(
    () => Array.from(new Set(data.map((profile) => profile.field))).sort(),
    [data],
  );

  const filteredProfiles = useMemo(() => {
    const term = search.trim().toLowerCase();
    return data.filter((profile) => {
      if (fieldFilter && profile.field !== fieldFilter) return false;
      if (!term) return true;

      return [
        profile.full_name,
        profile.phone,
        profile.identity_number,
        profile.field,
        ...profile.links,
      ].some((value) => value.toLowerCase().includes(term));
    });
  }, [data, fieldFilter, search]);

  function addProfile() {
    setSelectedProfile(null);
    setDialogOpen(true);
  }

  function editProfile(profile: CareerProfile) {
    setSelectedProfile(profile);
    setDialogOpen(true);
  }

  async function archiveProfile(profile: CareerProfile) {
    if (!window.confirm(`Archive ${profile.full_name}?`)) return;

    const { error: archiveError } = await supabase
      .from("career_profiles")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", profile.id);

    if (archiveError) {
      toast.error(archiveError.message);
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ["career-profiles"] });
    toast.success("Career profile archived.");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-primary">
            <BriefcaseBusiness className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">Internal only</span>
          </div>
          <h1 className="text-2xl font-semibold">Career Portal</h1>
          <p className="text-sm text-muted-foreground">
            Build your own talent directory. There is no public application form.
          </p>
        </div>
        <Button onClick={addProfile}>
          <Plus />
          Add profile
        </Button>
      </div>

      <Card className="glass-card">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, phone, ID, field, or link…"
              className="w-full pl-9"
            />
          </div>
          <select
            aria-label="Filter by field"
            value={fieldFilter}
            onChange={(event) => setFieldFilter(event.target.value)}
            className="h-9 w-full shrink-0 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring sm:w-64"
          >
            <option value="">All fields</option>
            {fields.map((field) => (
              <option key={field} value={field}>
                {field}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {error ? (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="p-5 text-sm">
            The career portal database update is not installed yet. Run the latest Supabase
            migration, then reload this page.
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Loading profiles…</div>
      ) : filteredProfiles.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <BriefcaseBusiness className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">No career profiles yet</p>
              <p className="text-sm text-muted-foreground">
                Add people manually to start building the internal directory.
              </p>
            </div>
            <Button variant="outline" onClick={addProfile}>
              <Plus />
              Add the first profile
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filteredProfiles.map((profile) => (
            <Card key={profile.id} className="glass-card flex flex-col">
              <CardHeader className="space-y-3 p-5 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="truncate text-lg">{profile.full_name}</CardTitle>
                    <p className="mt-1 text-sm text-primary">{profile.field}</p>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Edit ${profile.full_name}`}
                    onClick={() => editProfile(profile)}
                  >
                    <Pencil />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4 p-5 pt-0">
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
                  <dt className="text-muted-foreground">Phone</dt>
                  <dd>{profile.phone}</dd>
                  <dt className="text-muted-foreground">ID</dt>
                  <dd className="font-mono text-xs">{profile.identity_number}</dd>
                </dl>

                {profile.links.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {profile.links.map((link) => (
                      <a
                        key={link}
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-accent/30"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {linkLabel(link)}
                      </a>
                    ))}
                  </div>
                )}

                <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
                  <span className="text-xs text-muted-foreground">
                    Added {new Date(profile.created_at).toLocaleDateString()}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => archiveProfile(profile)}
                  >
                    <Archive />
                    Archive
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CareerProfileDialog
        open={dialogOpen}
        profile={selectedProfile}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
