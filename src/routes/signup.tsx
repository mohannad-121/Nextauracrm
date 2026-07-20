import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { LanguageSwitcher } from "@/components/language-switcher";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create account — NextAura AI" }] }),
  component: SignupPage,
});

function SignupPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (password !== confirmPassword) {
      toast.error(t("passwordsDoNotMatch"));
      return;
    }

    if (password.length < 8) {
      toast.error(t("passwordTooShort"));
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    if (data.session) {
      toast.success(t("accountCreated"));
      navigate({ to: "/dashboard" });
      return;
    }

    setConfirmationSent(true);
    setPassword("");
    setConfirmPassword("");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <Link to="/" className="brand-gradient-text font-semibold">
          {t("brand")}
        </Link>
        <LanguageSwitcher />
      </header>
      <main className="flex-1 flex items-center justify-center px-6 py-10">
        <div
          className="w-full max-w-md glass-card p-8 space-y-6"
          style={{ boxShadow: "var(--shadow-glow)" }}
        >
          {confirmationSent ? (
            <div className="space-y-5 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold">{t("checkEmail")}</h1>
                <p className="text-sm text-muted-foreground">
                  {t("confirmationSent")} <span className="text-foreground">{email}</span>.
                </p>
              </div>
              <Link
                to="/login"
                className="inline-flex w-full items-center justify-center rounded-lg brand-gradient-bg py-2.5 font-medium text-primary-foreground"
              >
                {t("backToSignIn")}
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-2 text-center">
                <h1 className="text-2xl font-semibold">{t("signupTitle")}</h1>
                <p className="text-sm text-muted-foreground">{t("signupSubtitle")}</p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="full-name" className="text-sm">
                    {t("fullName")}
                  </label>
                  <input
                    id="full-name"
                    type="text"
                    required
                    autoComplete="name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-input border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="signup-email" className="text-sm">
                    {t("email")}
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-input border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="signup-password" className="text-sm">
                    {t("password")}
                  </label>
                  <input
                    id="signup-password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-input border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <p className="text-xs text-muted-foreground">{t("passwordHint")}</p>
                </div>
                <div className="space-y-2">
                  <label htmlFor="confirm-password" className="text-sm">
                    {t("confirmPassword")}
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-input border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full brand-gradient-bg text-primary-foreground font-medium py-2.5 rounded-lg disabled:opacity-50"
                >
                  {loading ? t("loading") : t("createAccount")}
                </button>
              </form>
              <p className="text-center text-sm text-muted-foreground">
                {t("alreadyHaveAccount")}{" "}
                <Link to="/login" className="font-medium text-foreground hover:underline">
                  {t("signIn")}
                </Link>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
