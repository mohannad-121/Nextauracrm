import { useI18n } from "@/lib/i18n";

export function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  return (
    <div className="inline-flex rounded-lg border border-border overflow-hidden text-xs">
      <button
        onClick={() => setLang("en")}
        className={`px-3 py-1.5 ${lang === "en" ? "bg-primary text-primary-foreground" : "hover:bg-accent/20"}`}
      >
        EN
      </button>
      <button
        onClick={() => setLang("ar")}
        className={`px-3 py-1.5 ${lang === "ar" ? "bg-primary text-primary-foreground" : "hover:bg-accent/20"}`}
      >
        عربي
      </button>
    </div>
  );
}