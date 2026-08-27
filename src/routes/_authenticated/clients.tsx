import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Mail, MessageCircle, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { ClientProfileDrawer } from "@/components/client-profile-drawer";
import { BusinessCategoryBadge } from "@/components/business-category-badge";
import { getBusinessCategory, type BusinessCategory } from "@/lib/business-categories";
import { operationsDb, type Client } from "@/lib/operations-db";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/clients")({
  component: ClientsPage,
  head: () => ({ meta: [{ title: "Clients — NextAura AI" }] }),
});

function ClientsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selected, setSelected] = useState<Client | null>(null);
  const [adding, setAdding] = useState(false);
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await operationsDb
        .from<Client>("clients")
        .select()
        .is("archived_at", null)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const categories = useMemo(() => {
    const grouped = new Map<string, { category: BusinessCategory; count: number }>();
    clients.forEach((client) => {
      const category = getBusinessCategory(client.business_name);
      const current = grouped.get(category.key);
      grouped.set(category.key, { category, count: (current?.count ?? 0) + 1 });
    });
    return [...grouped.values()].toSorted(
      (a, b) => b.count - a.count || a.category.label.localeCompare(b.category.label),
    );
  }, [clients]);
  const visibleClients = useMemo(() => {
    const term = search.trim().toLowerCase();
    const matchingClients = !term
      ? clients
      : clients.filter((client) =>
          [
            client.display_name,
            client.business_name,
            client.email,
            client.phone,
            client.source,
          ].some((value) => value?.toLowerCase().includes(term)),
        );
    return selectedCategory
      ? matchingClients.filter(
          (client) => getBusinessCategory(client.business_name).key === selectedCategory,
        )
      : matchingClients;
  }, [clients, search, selectedCategory]);
  async function addClient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    if (!name) return;
    const dedupe = email
      ? `email:${email.toLowerCase()}`
      : phone
        ? `phone:${phone.replace(/\D/g, "")}`
        : `name:${name.toLowerCase()}`;
    const { error } = await operationsDb.from<Client>("clients").insert({
      display_name: name,
      business_name: String(form.get("business") ?? "") || null,
      email: email || null,
      phone: phone || null,
      source: "Manual",
      preferred_language: "en",
      dedupe_key: dedupe,
    } as Partial<Client>);
    if (error) toast.error(error.message);
    else {
      toast.success("Client added");
      setAdding(false);
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    }
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[.16em] text-primary">RELATIONSHIPS</p>
          <h1 className="text-2xl font-semibold">Clients & companies</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every client profile brings their work, financial history, and conversations together.
          </p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
          Add client
        </button>
      </div>
      <div className="glass-card flex items-center gap-2 p-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          placeholder="Search company, client, email, phone, or source…"
        />
      </div>
      {isLoading ? (
        <p className="text-muted-foreground">Loading clients…</p>
      ) : (
        <>
          <section aria-labelledby="client-categories-heading">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 id="client-categories-heading" className="font-semibold">
                  Browse by category
                </h2>
                <p className="text-sm text-muted-foreground">
                  Choose a category to show only its clients.
                </p>
              </div>
              <span className="text-sm text-muted-foreground">{clients.length} total clients</span>
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
                  <span className="block font-semibold">All clients</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    View every category
                  </span>
                </span>
                <span className="text-2xl font-semibold text-primary">{clients.length}</span>
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
                      View clients in this category
                    </span>
                  </span>
                  <span className="text-2xl font-semibold text-primary">{count}</span>
                </button>
              ))}
            </div>
          </section>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {visibleClients.length} client{visibleClients.length === 1 ? "" : "s"}
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
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleClients.map((client) => (
              <button
                key={client.id}
                onClick={() => setSelected(client)}
                className="cursor-pointer rounded-xl border border-border bg-card/55 p-4 text-start transition-colors duration-200 hover:border-primary/40 hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{client.display_name}</p>
                    <div className="mt-1">
                      <BusinessCategoryBadge category={client.business_name} />
                    </div>
                  </div>
                  <Building2 className="h-5 w-5 shrink-0 text-muted-foreground" />
                </div>
                <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                  {client.email && (
                    <p className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5" />
                      {client.email}
                    </p>
                  )}
                  {client.phone && (
                    <p className="flex items-center gap-2">
                      <MessageCircle className="h-3.5 w-3.5" />
                      {client.phone}
                    </p>
                  )}
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs">
                  <span className="rounded-full bg-muted px-2 py-1">
                    {client.source || "Unattributed"}
                  </span>
                  <span>Open profile →</span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
      {!isLoading && visibleClients.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No client profiles match this search.
        </div>
      )}
      {adding && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <form
            onSubmit={addClient}
            className="w-full max-w-md rounded-xl border border-border bg-background p-5 shadow-2xl"
          >
            <h2 className="text-lg font-semibold">Add client</h2>
            <div className="mt-4 grid gap-3">
              {[
                ["name", "Full name *"],
                ["business", "Company"],
                ["email", "Email"],
                ["phone", "Phone / WhatsApp"],
              ].map(([name, label]) => (
                <label key={name} className="text-sm">
                  <span className="mb-1 block text-muted-foreground">{label}</span>
                  <Input
                    name={name}
                    required={name === "name"}
                    className="w-full rounded-md border border-input bg-input px-3 py-2"
                  />
                </label>
              ))}
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
                Save client
              </button>
            </div>
          </form>
        </div>
      )}
      <ClientProfileDrawer client={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
