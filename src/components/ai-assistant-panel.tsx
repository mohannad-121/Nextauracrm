import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bot, Loader2, Send, Sparkles, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_LABELS, type RequestStatus } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type AiAssistantPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

const INITIAL_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "I can summarize your live CRM data. Ask about the request pipeline, follow-ups, payments, or the talent directory.",
};

const SUGGESTIONS = [
  "Summarize the request pipeline",
  "Which follow-ups are due?",
  "Show the payment summary",
  "Summarize the talent directory",
];

const FINISHED_STATUSES = new Set(["completed", "cancelled", "rejected"]);

function messageId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

function money(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

async function pipelineSummary(): Promise<string> {
  const { data, error } = await supabase
    .from("client_requests")
    .select("status")
    .is("archived_at", null)
    .limit(500);

  if (error) throw error;

  const counts = new Map<string, number>();
  for (const request of data) {
    counts.set(request.status, (counts.get(request.status) ?? 0) + 1);
  }

  const active = data.filter((request) => !FINISHED_STATUSES.has(request.status)).length;
  const breakdown = Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1])
    .map(([status, count]) => `• ${STATUS_LABELS[status as RequestStatus]?.en ?? status}: ${count}`)
    .join("\n");

  return data.length === 0
    ? "There are no client requests yet."
    : `There are ${data.length} requests in total and ${active} are active.\n\n${breakdown}`;
}

async function followUpSummary(): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("client_requests")
    .select("request_number,customer_name,project_title,next_follow_up_date,status")
    .is("archived_at", null)
    .not("next_follow_up_date", "is", null)
    .lte("next_follow_up_date", today)
    .order("next_follow_up_date", { ascending: true })
    .limit(20);

  if (error) throw error;

  const due = data.filter((request) => !FINISHED_STATUSES.has(request.status));
  if (due.length === 0) return "No active follow-ups are due today or overdue.";

  const lines = due.map((request) => {
    const reference = request.request_number ?? request.project_title;
    const timing = request.next_follow_up_date === today ? "today" : request.next_follow_up_date;
    return `• ${reference} — ${request.customer_name} (${timing})`;
  });

  return `${due.length} active follow-up${due.length === 1 ? " is" : "s are"} due:\n\n${lines.join("\n")}`;
}

async function paymentSummary(): Promise<string> {
  const { data, error } = await supabase
    .from("client_requests")
    .select("agreed_price,amount_paid,currency")
    .is("archived_at", null)
    .limit(500);

  if (error) throw error;

  const totals = new Map<string, { agreed: number; paid: number }>();
  for (const request of data) {
    const currency = request.currency || "JOD";
    const current = totals.get(currency) ?? { agreed: 0, paid: 0 };
    current.agreed += Number(request.agreed_price ?? 0);
    current.paid += Number(request.amount_paid ?? 0);
    totals.set(currency, current);
  }

  if (totals.size === 0) return "There are no payment records yet.";

  return Array.from(totals.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([currency, total]) => {
      const remaining = total.agreed - total.paid;
      return `${currency}: agreed ${money(total.agreed, currency)}, received ${money(total.paid, currency)}, remaining ${money(remaining, currency)}.`;
    })
    .join("\n");
}

async function talentSummary(): Promise<string> {
  const { data, error } = await supabase
    .from("career_profiles")
    .select("field")
    .is("archived_at", null)
    .limit(500);

  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") {
      return "The internal Career Portal migration has not been installed yet. Run the latest Supabase migration, then try again.";
    }
    throw error;
  }

  if (data.length === 0) return "The talent directory is empty. Add profiles from Career Portal.";

  const fields = new Map<string, number>();
  for (const profile of data) {
    fields.set(profile.field, (fields.get(profile.field) ?? 0) + 1);
  }

  const breakdown = Array.from(fields.entries())
    .sort((left, right) => right[1] - left[1])
    .map(([field, count]) => `• ${field}: ${count}`)
    .join("\n");

  return `There are ${data.length} active profiles in the internal talent directory.\n\n${breakdown}`;
}

async function answerPrompt(prompt: string): Promise<string> {
  const normalized = prompt.toLowerCase();

  if (/follow|due|overdue/.test(normalized)) return followUpSummary();
  if (/pay|revenue|money|received|remaining/.test(normalized)) return paymentSummary();
  if (/career|talent|people|candidate|profile/.test(normalized)) return talentSummary();
  if (/request|pipeline|status|lead|project|summary|overview/.test(normalized)) {
    return pipelineSummary();
  }

  return "I currently understand questions about the request pipeline, due follow-ups, payments, and the talent directory. Choose a suggestion below or ask using one of those topics.";
}

export function AiAssistantPanel({ open, onOpenChange }: AiAssistantPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendPrompt(value: string) {
    const cleanPrompt = value.trim();
    if (!cleanPrompt || loading) return;

    setMessages((current) => [...current, { id: messageId(), role: "user", content: cleanPrompt }]);
    setPrompt("");
    setLoading(true);

    try {
      const response = await answerPrompt(cleanPrompt);
      setMessages((current) => [
        ...current,
        { id: messageId(), role: "assistant", content: response },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load CRM data.";
      setMessages((current) => [
        ...current,
        {
          id: messageId(),
          role: "assistant",
          content: `I could not complete that request: ${message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function submitPrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendPrompt(prompt);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border p-5 pr-12 text-left">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em]">Live CRM data</span>
          </div>
          <SheetTitle>AI Assistant</SheetTitle>
          <SheetDescription>
            Quick answers based only on records your account is allowed to see.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-2 ${message.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  message.role === "assistant" ? "brand-gradient-bg" : "bg-secondary"
                }`}
              >
                {message.role === "assistant" ? (
                  <Bot className="h-4 w-4 text-primary-foreground" />
                ) : (
                  <UserRound className="h-4 w-4" />
                )}
              </div>
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm leading-6 ${
                  message.role === "assistant"
                    ? "border border-border bg-card"
                    : "bg-primary text-primary-foreground"
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking CRM data…
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="border-t border-border p-4">
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                disabled={loading}
                onClick={() => void sendPrompt(suggestion)}
                className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent/30 hover:text-foreground disabled:opacity-50"
              >
                {suggestion}
              </button>
            ))}
          </div>
          <form onSubmit={submitPrompt} className="flex gap-2">
            <Input
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Ask about your CRM…"
              aria-label="Ask the AI Assistant"
              disabled={loading}
              autoComplete="off"
            />
            <Button
              type="submit"
              size="icon"
              disabled={loading || !prompt.trim()}
              aria-label="Send"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Send />}
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
