import { getBusinessCategory } from "@/lib/business-categories";

type CategoryStyle = {
  dot: string;
  badge: string;
  text: string;
};

const CATEGORY_STYLES: Array<{ match: RegExp; style: CategoryStyle }> = [
  {
    match: /coffee|cafe|café/i,
    style: {
      dot: "bg-amber-700",
      badge: "border-amber-700/40 bg-amber-950/55",
      text: "text-amber-200",
    },
  },
  {
    match: /restaurant|food|bakery|catering/i,
    style: {
      dot: "bg-stone-100",
      badge: "border-stone-300/25 bg-stone-900/70",
      text: "text-stone-100",
    },
  },
  {
    match: /beauty|spa|salon|nail|barber/i,
    style: {
      dot: "bg-pink-400",
      badge: "border-pink-400/30 bg-pink-500/10",
      text: "text-pink-200",
    },
  },
  {
    match: /fashion|clothing|boutique|apparel/i,
    style: {
      dot: "bg-violet-400",
      badge: "border-violet-400/30 bg-violet-500/10",
      text: "text-violet-200",
    },
  },
  {
    match: /gym|fitness|sport|wellness/i,
    style: {
      dot: "bg-lime-400",
      badge: "border-lime-400/30 bg-lime-500/10",
      text: "text-lime-200",
    },
  },
  {
    match: /health|medical|clinic|dental|pharmacy/i,
    style: {
      dot: "bg-emerald-400",
      badge: "border-emerald-400/30 bg-emerald-500/10",
      text: "text-emerald-200",
    },
  },
  {
    match: /school|education|academy|training/i,
    style: { dot: "bg-sky-400", badge: "border-sky-400/30 bg-sky-500/10", text: "text-sky-200" },
  },
  {
    match: /real estate|property|apartment|construction/i,
    style: {
      dot: "bg-blue-400",
      badge: "border-blue-400/30 bg-blue-500/10",
      text: "text-blue-200",
    },
  },
  {
    match: /car|auto|automotive/i,
    style: {
      dot: "bg-orange-400",
      badge: "border-orange-400/30 bg-orange-500/10",
      text: "text-orange-200",
    },
  },
  {
    match: /tech|software|digital|ai|marketing/i,
    style: {
      dot: "bg-cyan-400",
      badge: "border-cyan-400/30 bg-cyan-500/10",
      text: "text-cyan-200",
    },
  },
  {
    match: /shop|store|retail|market/i,
    style: {
      dot: "bg-yellow-400",
      badge: "border-yellow-400/30 bg-yellow-500/10",
      text: "text-yellow-200",
    },
  },
];

const FALLBACK_STYLES: CategoryStyle[] = [
  { dot: "bg-teal-400", badge: "border-teal-400/30 bg-teal-500/10", text: "text-teal-200" },
  { dot: "bg-indigo-400", badge: "border-indigo-400/30 bg-indigo-500/10", text: "text-indigo-200" },
  { dot: "bg-rose-400", badge: "border-rose-400/30 bg-rose-500/10", text: "text-rose-200" },
  {
    dot: "bg-fuchsia-400",
    badge: "border-fuchsia-400/30 bg-fuchsia-500/10",
    text: "text-fuchsia-200",
  },
];

function fallbackStyle(category: string) {
  const hash = [...category.toLowerCase()].reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
  return FALLBACK_STYLES[hash % FALLBACK_STYLES.length];
}

export function BusinessCategoryBadge({ category }: { category: string | null | undefined }) {
  const businessCategory = getBusinessCategory(category);
  const style =
    CATEGORY_STYLES.find(({ match }) => match.test(businessCategory.label))?.style ??
    fallbackStyle(businessCategory.label);

  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${style.badge} ${style.text}`}
      title={businessCategory.label}
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} aria-hidden="true" />
      <span className="truncate">{businessCategory.label}</span>
    </span>
  );
}
