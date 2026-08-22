import { Check } from "lucide-react";

const STAGES = [
  { label: "Lead", statuses: ["new_lead", "contacted", "requirements_gathering"] },
  { label: "Quote", statuses: ["preparing_quote", "quote_sent", "negotiating"] },
  { label: "Approved", statuses: ["approved"] },
  { label: "Delivery", statuses: ["in_progress", "waiting_for_client", "testing"] },
  { label: "Complete", statuses: ["delivered", "completed"] },
];

export function RequestStageProgress({ status }: { status: string }) {
  const active = STAGES.findIndex((stage) => stage.statuses.includes(status));
  const completed = ["delivered", "completed"].includes(status);
  if (active < 0)
    return (
      <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        This request is {status.replaceAll("_", " ")}.
      </div>
    );

  return (
    <ol className="grid grid-cols-5 gap-1" aria-label="Request progress">
      {STAGES.map((stage, index) => {
        const reached = completed || index <= active;
        const current = index === active && !completed;
        return (
          <li key={stage.label} className="min-w-0">
            <div className={`flex h-1.5 rounded-full ${reached ? "bg-primary" : "bg-muted"}`} />
            <div
              className={`mt-2 flex items-center gap-1 text-[11px] ${current ? "font-semibold text-foreground" : reached ? "text-muted-foreground" : "text-muted-foreground/60"}`}
            >
              {reached && <Check className="h-3 w-3 shrink-0" />}
              {stage.label}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
