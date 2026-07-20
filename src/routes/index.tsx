import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { t } = useI18n();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="text-lg font-semibold brand-gradient-text">{t("brand")}</div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Link
            to={signedIn ? "/dashboard" : "/login"}
            className="text-sm brand-gradient-bg text-primary-foreground font-medium px-4 py-2 rounded-lg"
          >
            {signedIn ? t("dashboard") : t("signIn")}
          </Link>
          {!signedIn && (
            <Link
              to="/signup"
              className="text-sm border border-border font-medium px-4 py-2 rounded-lg hover:bg-accent/20"
            >
              {t("signUp")}
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-2xl text-center space-y-6">
          <div className="inline-block px-3 py-1 rounded-full border border-border text-xs text-muted-foreground">
            Internal system · {t("brand")}
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            <span className="brand-gradient-text">{t("brand")}</span>
            <span className="block text-2xl md:text-3xl text-muted-foreground mt-3 font-normal">
              {t("tagline")}
            </span>
          </h1>
          <p className="text-muted-foreground">
            A focused internal CRM for tracking client requests, payments, follow-ups, and your
            private talent directory.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              to={signedIn ? "/dashboard" : "/login"}
              className="brand-gradient-bg text-primary-foreground font-medium px-6 py-3 rounded-lg"
            >
              {signedIn ? "Open dashboard" : t("signIn")}
            </Link>
            {!signedIn && (
              <Link
                to="/signup"
                className="border border-border px-6 py-3 rounded-lg hover:bg-accent/20"
              >
                {t("createAccount")}
              </Link>
            )}
          </div>
        </div>
      </main>

      <footer className="text-center text-xs text-muted-foreground py-6">
        © {new Date().getFullYear()} {t("brand")} · Jordan · UAE
      </footer>
    </div>
  );
}
