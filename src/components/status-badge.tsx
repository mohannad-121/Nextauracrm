import { STATUS_COLOR, STATUS_LABELS, type RequestStatus } from "@/lib/constants";
import { useI18n } from "@/lib/i18n";

export function StatusBadge({ status }: { status: RequestStatus }) {
  const { lang } = useI18n();
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs border ${STATUS_COLOR[status]}`}>
      {STATUS_LABELS[status]?.[lang] ?? status}
    </span>
  );
}