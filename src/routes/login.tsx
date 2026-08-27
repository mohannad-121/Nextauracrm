import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — NextAura AI" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back");
    navigate({ to: "/dashboard" });
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
          className="w-full max-w-md glass-card p-8 space-y-6"
          style={{ boxShadow: "var(--shadow-glow)" }}
        >
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold">{t("loginTitle")}</h1>
            <p className="text-sm text-muted-foreground">{t("loginSubtitle")}</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm">{t("email")}</label>
              <Input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-input border border-border focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm">{t("password")}</label>
              <Input
                id="login-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-input border border-border focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full brand-gradient-bg text-primary-foreground font-medium py-2.5 rounded-lg disabled:opacity-50"
            >
              {loading ? t("loading") : t("signIn")}
            </button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            {t("needAccount")}{" "}
            <Link to="/signup" className="font-medium text-foreground hover:underline">
              {t("createAccount")}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
