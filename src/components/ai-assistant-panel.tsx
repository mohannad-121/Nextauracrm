import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bot, Loader2, Send, Sparkles, UserRound } from "lucide-react";
import { answerCrmQuestion } from "@/lib/crm-assistant";
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
    "\u2728 I am your live CRM assistant. Ask me about any client, project, payment, unpaid balance, estimated cost, task, follow-up, invoice, file, category, career profile, or deleted project.",
};

const SUGGESTIONS = [
  "\u{1F4B0} How much money has been paid?",
  "\u{26A0}\u{FE0F} What needs attention today?",
  "\u{1F4C1} Show the project pipeline",
  "\u{1F465} Give me a client breakdown",
  "\u{1F9FE} Show invoices and milestones",
  "\u{1F4CA} Give me the full business overview",
];

const CAPABILITIES = [
  "\u{1F465} Clients",
  "\u{1F4C1} Projects",
  "\u{1F4B0} Money",
  "\u{1F4CB} Tasks",
  "\u{1F4C5} Follow-ups",
  "\u{1F9FE} Invoices",
  "\u{1F5D1}\u{FE0F} Deleted",
];

function messageId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
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
      const response = await answerCrmQuestion(cleanPrompt);
      setMessages((current) => [
        ...current,
        { id: messageId(), role: "assistant", content: response },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load live CRM data.";
      setMessages((current) => [
        ...current,
        {
          id: messageId(),
          role: "assistant",
          content: `\u{26A0}\u{FE0F} I could not complete that request: ${message}`,
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
            <span className="text-xs font-semibold uppercase tracking-[0.18em]">
              Live CRM intelligence
            </span>
          </div>
          <SheetTitle>AI Assistant</SheetTitle>
          <SheetDescription>
            Answers are generated from the live records your account is allowed to access.
          </SheetDescription>
          <div className="flex flex-wrap gap-1.5 pt-2">
            {CAPABILITIES.map((capability) => (
              <span
                key={capability}
                className="rounded-full border border-primary/25 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary"
              >
                {capability}
              </span>
            ))}
          </div>
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
              Checking live CRM intelligence...
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
          <form onSubmit={submitPrompt} className="flex min-w-0 gap-2">
            <Input
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Ask anything about your CRM..."
              aria-label="Ask the AI Assistant"
              disabled={loading}
              autoComplete="off"
              className="min-w-0 flex-1"
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
