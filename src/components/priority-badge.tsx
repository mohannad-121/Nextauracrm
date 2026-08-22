import { Flame, Minus, ArrowUp, type LucideIcon } from "lucide-react";
import { PRIORITY_LABELS, type Priority } from "@/lib/constants";
import { useI18n } from "@/lib/i18n";

const styles: Record<Priority, { className: string; Icon: LucideIcon }> = {
  low: { className: "border-slate-500/30 bg-slate-500/10 text-slate-300", Icon: Minus },
  normal: { className: "border-blue-500/30 bg-blue-500/10 text-blue-300", Icon: Minus },
  high: { className: "border-amber-500/35 bg-amber-500/10 text-amber-300", Icon: ArrowUp },
  urgent: { className: "border-rose-500/40 bg-rose-500/15 text-rose-200", Icon: Flame },
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  const { lang } = useI18n();
  const { className, Icon } = styles[priority];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs ${className}`}
    >
      <Icon className="h-3 w-3" />
      {PRIORITY_LABELS[priority][lang]}
    </span>
  );
}
