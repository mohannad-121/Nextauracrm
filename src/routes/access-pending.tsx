import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Clock3 } from "lucide-react";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/access-pending")({
  head: () => ({ meta: [{ title: "Access pending — NextAura AI" }] }),
  component: AccessPendingPage,
});

function AccessPendingPage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) navigate({ to: "/login", replace: true });
    });
  }, [navigate]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <Link to="/" className="brand-gradient-text font-semibold">
          {t("brand")}
        </Link>
        <LanguageSwitcher />
      </header>
      <main className="flex-1 flex items-center justify-center px-6">
        <div
          className="w-full max-w-md glass-card p-8 space-y-5 text-center"
          style={{ boxShadow: "var(--shadow-glow)" }}
        >
          <Clock3 className="mx-auto h-12 w-12 text-amber-300" />
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">{t("accessPendingTitle")}</h1>
            <p className="text-sm text-muted-foreground">{t("accessPendingBody")}</p>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="w-full rounded-lg border border-border py-2.5 font-medium hover:bg-accent/20"
          >
            {t("signOut")}
          </button>
        </div>
      </main>
    </div>
  );
}
