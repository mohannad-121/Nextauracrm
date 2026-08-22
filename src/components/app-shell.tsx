import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Sparkles,
  LogOut,
  Menu,
  Search,
  X,
  Building2,
  KanbanSquare,
  ListTodo,
  BarChart3,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import { AiAssistantPanel } from "@/components/ai-assistant-panel";
import { CommandMenu } from "@/components/command-menu";

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  function createRequest() {
    navigate({ to: "/requests" });
    window.setTimeout(() => window.dispatchEvent(new Event("nextaura:new-request")), 0);
  }

  const items = [
    { to: "/dashboard", icon: LayoutDashboard, label: t("dashboard") },
    { to: "/requests", icon: Users, label: t("requests") },
    { to: "/clients", icon: Building2, label: "Clients" },
    { to: "/pipeline", icon: KanbanSquare, label: "Pipeline" },
    { to: "/tasks", icon: ListTodo, label: "My work" },
    { to: "/reports", icon: BarChart3, label: "Reports" },
    { to: "/careers", icon: Briefcase, label: t("careerApps") },
  ] as const;

  const nav = (
    <nav className="flex flex-col gap-1 p-3">
      <div className="px-3 py-4 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg brand-gradient-bg" />
        <div className="font-semibold brand-gradient-text">{t("brand")}</div>
      </div>
      {items.map((it) => {
        const active = pathname === it.to || pathname.startsWith(it.to + "/");
        return (
          <Link
            key={it.to}
            to={it.to}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/40"
            }`}
          >
            <it.icon className="w-4 h-4" />
            {it.label}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setAssistantOpen(true);
        }}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/40"
      >
        <Sparkles className="w-4 h-4" />
        {t("aiAssistant")}
      </button>
      <div className="mt-auto pt-4 border-t border-sidebar-border">
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-destructive/20 text-sidebar-foreground"
        >
          <LogOut className="w-4 h-4" />
          {t("signOut")}
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-60 bg-sidebar border-e border-sidebar-border sticky top-0 h-screen">
        {nav}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 start-0 w-64 bg-sidebar border-e border-sidebar-border flex flex-col">
            {nav}
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-14 flex items-center justify-between px-4 md:px-6 border-b border-border bg-background/85 backdrop-blur">
          <button
            className="md:hidden p-2 rounded-lg hover:bg-accent/20"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex-1" />
          <button
            onClick={() => setCommandOpen(true)}
            className="me-3 hidden w-56 items-center justify-between rounded-lg border border-border bg-card/50 px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent/20 md:flex"
            aria-label="Open command menu"
          >
            <span className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5" />
              Search or run a command
            </span>
            <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px]">⌘ K</kbd>
          </button>
          <LanguageSwitcher />
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
      <AiAssistantPanel open={assistantOpen} onOpenChange={setAssistantOpen} />
      <CommandMenu
        open={commandOpen}
        onOpenChange={setCommandOpen}
        onNewRequest={createRequest}
        onOpenAssistant={() => setAssistantOpen(true)}
      />
    </div>
  );
}
