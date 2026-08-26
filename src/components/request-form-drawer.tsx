import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X } from "lucide-react";
import {
  REQUEST_STATUSES,
  STATUS_LABELS,
  PAYMENT_STATUSES,
  PAYMENT_LABELS,
  PRIORITIES,
  PRIORITY_LABELS,
  CURRENCIES,
  CONTACT_SOURCES,
} from "@/lib/constants";
import { useI18n } from "@/lib/i18n";
import type { Database } from "@/integrations/supabase/types";

type Props = { open: boolean; onClose: () => void; requestId?: string | null };

const emptyForm = {
  customer_name: "",
  business_name: "",
  email: "",
  phone: "",
  phone_secondary: "",
  whatsapp: "",
  country: "Jordan",
  city: "",
  preferred_language: "en",
  contact_source: "WhatsApp",
  project_title: "",
  category_id: "",
  project_description: "",
  customer_requirements: "",
  internal_notes: "",
  quoted_price: "",
  agreed_price: "",
  currency: "JOD",
  estimated_cost: "",
  payment_status: "not_quoted",
  status: "new_lead",
  priority: "normal",
  request_date: new Date().toISOString().slice(0, 10),
  first_contact_date: "",
  quote_date: "",
  agreement_date: "",
  project_start_date: "",
  expected_delivery_date: "",
  actual_delivery_date: "",
  next_follow_up_date: "",
  assigned_to: "",
  rejection_reason: "",
  cancellation_reason: "",
};

type RequestForm = typeof emptyForm;
type RequestFormKey = keyof RequestForm;
type ClientRequestInsert = Database["public"]["Tables"]["client_requests"]["Insert"];

const DATE_FIELDS = [
  ["request_date", "Request date"],
  ["first_contact_date", "First contact"],
  ["quote_date", "Quote date"],
  ["agreement_date", "Agreement date"],
  ["project_start_date", "Project start"],
  ["expected_delivery_date", "Expected delivery"],
  ["actual_delivery_date", "Actual delivery"],
  ["next_follow_up_date", "Next follow-up"],
] as const satisfies ReadonlyArray<readonly [RequestFormKey, string]>;

function Field({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="glass-card p-4 space-y-3">
      <h3 className="text-sm font-semibold brand-gradient-text">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

export function RequestFormDrawer({ open, onClose, requestId }: Props) {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [form, setForm] = useState<RequestForm>(emptyForm);
  const [amountPaid, setAmountPaid] = useState(0);
  const [newPaymentAmount, setNewPaymentAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () =>
      (
        await supabase
          .from("project_categories")
          .select("id,slug,name_en,name_ar")
          .eq("is_active", true)
          .order("sort_order")
      ).data ?? [],
  });

  const { data: staff } = useQuery({
    queryKey: ["staff-profiles"],
    queryFn: async () => (await supabase.from("profiles").select("id,full_name,email")).data ?? [],
  });

  useEffect(() => {
    if (!open) return;
    if (!requestId) {
      setForm(emptyForm);
      setAmountPaid(0);
      setNewPaymentAmount("");
      return;
    }
    supabase
      .from("client_requests")
      .select("*")
      .eq("id", requestId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;

        setForm(
          Object.fromEntries(
            (Object.keys(emptyForm) as RequestFormKey[]).map((key) => [
              key,
              data[key] == null ? "" : String(data[key]),
            ]),
          ) as RequestForm,
        );
        setAmountPaid(Number(data.amount_paid ?? 0));
        setNewPaymentAmount("");
      });
  }, [open, requestId]);

  if (!open) return null;

  function upd(key: RequestFormKey, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customer_name || !form.project_title) {
      toast.error("Customer name and project title are required");
      return;
    }
    const paymentToRecord = newPaymentAmount === "" ? 0 : Number(newPaymentAmount);
    if (!Number.isFinite(paymentToRecord) || paymentToRecord < 0) {
      toast.error("Enter a valid payment amount");
      return;
    }

    setSaving(true);
    const payload = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [key, value === "" ? null : value]),
    ) as ClientRequestInsert;
    payload.quoted_price = form.quoted_price ? Number(form.quoted_price) : null;
    payload.agreed_price = form.agreed_price ? Number(form.agreed_price) : null;
    payload.estimated_cost = form.estimated_cost ? Number(form.estimated_cost) : null;

    const { data: userRes } = await supabase.auth.getUser();
    if (!requestId) payload.created_by = userRes.user?.id ?? null;

    const q = requestId
      ? supabase
          .from("client_requests")
          .update(payload)
          .eq("id", requestId)
          .select("id,agreed_price,amount_paid")
          .single()
      : supabase
          .from("client_requests")
          .insert(payload)
          .select("id,agreed_price,amount_paid")
          .single();
    const { data: savedRequest, error } = await q;
    if (error) {
      setSaving(false);
      toast.error(error.message);
      return;
    }

    if (paymentToRecord > 0 && savedRequest) {
      const { data: userRes } = await supabase.auth.getUser();
      const { error: paymentError } = await supabase.from("request_payments").insert({
        request_id: savedRequest.id,
        amount: paymentToRecord,
        currency: form.currency || "JOD",
        recorded_by: userRes.user?.id ?? null,
      });
      if (paymentError) {
        setSaving(false);
        toast.error(`Request saved, but payment was not recorded: ${paymentError.message}`);
        return;
      }

      const totalPaid = Number(savedRequest.amount_paid ?? 0) + paymentToRecord;
      setAmountPaid(totalPaid);
      setNewPaymentAmount("");
      const agreedPrice = Number(savedRequest.agreed_price ?? 0);
      if (agreedPrice > 0) {
        const payment_status = totalPaid >= agreedPrice ? "fully_paid" : "partially_paid";
        const { error: statusError } = await supabase
          .from("client_requests")
          .update({ payment_status })
          .eq("id", savedRequest.id);
        if (statusError) {
          setSaving(false);
          toast.error(`Payment recorded, but status could not be updated: ${statusError.message}`);
          qc.invalidateQueries();
          return;
        }
      }
    }

    setSaving(false);
    toast.success(
      paymentToRecord > 0
        ? "Request and payment recorded"
        : requestId
          ? "Request updated"
          : "Request created",
    );
    qc.invalidateQueries();
    onClose();
  }

  const input =
    "w-full px-3 py-2 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-1 focus:ring-ring";

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative ms-auto w-full max-w-3xl h-full bg-background border-s border-border overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 border-b border-border bg-background/90 backdrop-blur">
          <h2 className="font-semibold">{requestId ? t("edit") : t("newRequest")}</h2>
          <button onClick={onClose} className="p-2 rounded hover:bg-accent/20">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={save} className="p-5 space-y-4">
          <Section title="Customer Information">
            <Field label={t("fullName") + " *"}>
              <input
                required
                className={input}
                value={form.customer_name}
                onChange={(e) => upd("customer_name", e.target.value)}
              />
            </Field>
            <Field label={t("business")}>
              <input
                className={input}
                value={form.business_name}
                onChange={(e) => upd("business_name", e.target.value)}
              />
            </Field>
            <Field label={t("email")}>
              <input
                type="email"
                className={input}
                value={form.email}
                onChange={(e) => upd("email", e.target.value)}
              />
            </Field>
            <Field label={t("phone")}>
              <input
                className={input}
                value={form.phone}
                onChange={(e) => upd("phone", e.target.value)}
              />
            </Field>
            <Field label="Secondary phone">
              <input
                className={input}
                value={form.phone_secondary}
                onChange={(e) => upd("phone_secondary", e.target.value)}
              />
            </Field>
            <Field label={t("whatsapp")}>
              <input
                className={input}
                value={form.whatsapp}
                onChange={(e) => upd("whatsapp", e.target.value)}
              />
            </Field>
            <Field label={t("country")}>
              <input
                className={input}
                value={form.country}
                onChange={(e) => upd("country", e.target.value)}
              />
            </Field>
            <Field label={t("city")}>
              <input
                className={input}
                value={form.city}
                onChange={(e) => upd("city", e.target.value)}
              />
            </Field>
            <Field label={t("language")}>
              <select
                className={input}
                value={form.preferred_language}
                onChange={(e) => upd("preferred_language", e.target.value)}
              >
                <option value="en">English</option>
                <option value="ar">العربية</option>
              </select>
            </Field>
            <Field label="Contact source">
              <select
                className={input}
                value={form.contact_source ?? ""}
                onChange={(e) => upd("contact_source", e.target.value)}
              >
                {CONTACT_SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          </Section>

          <Section title="Project Information">
            <Field label={t("projectTitle") + " *"}>
              <input
                required
                className={input}
                value={form.project_title}
                onChange={(e) => upd("project_title", e.target.value)}
              />
            </Field>
            <Field label={t("category")}>
              <select
                className={input}
                value={form.category_id ?? ""}
                onChange={(e) => upd("category_id", e.target.value)}
              >
                <option value="">—</option>
                {(categories ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {lang === "ar" ? (c.name_ar ?? c.name_en) : c.name_en}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("priority")}>
              <select
                className={input}
                value={form.priority}
                onChange={(e) => upd("priority", e.target.value)}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABELS[p][lang]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("status")}>
              <select
                className={input}
                value={form.status}
                onChange={(e) => upd("status", e.target.value)}
              >
                {REQUEST_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s][lang]}
                  </option>
                ))}
              </select>
            </Field>
            <div className="md:col-span-2">
              <Field label="Project description">
                <textarea
                  rows={3}
                  className={input}
                  value={form.project_description ?? ""}
                  onChange={(e) => upd("project_description", e.target.value)}
                />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Customer requirements">
                <textarea
                  rows={3}
                  className={input}
                  value={form.customer_requirements ?? ""}
                  onChange={(e) => upd("customer_requirements", e.target.value)}
                />
              </Field>
            </div>
          </Section>

          <Section title="Pricing & Payment">
            <Field label="Quoted price">
              <input
                type="number"
                min="0"
                step="0.01"
                className={input}
                value={form.quoted_price ?? ""}
                onChange={(e) => upd("quoted_price", e.target.value)}
              />
            </Field>
            <Field label={t("agreedPrice")}>
              <input
                type="number"
                min="0"
                step="0.01"
                className={input}
                value={form.agreed_price ?? ""}
                onChange={(e) => upd("agreed_price", e.target.value)}
              />
            </Field>
            <Field label="Currency">
              <select
                className={input}
                value={form.currency}
                onChange={(e) => upd("currency", e.target.value)}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Estimated cost">
              <input
                type="number"
                min="0"
                step="0.01"
                className={input}
                value={form.estimated_cost ?? ""}
                onChange={(e) => upd("estimated_cost", e.target.value)}
              />
            </Field>
            {requestId && (
              <>
                <Field label="Amount received so far">
                  <div className={`${input} flex items-center gap-2 bg-muted/50`}>
                    <span className="text-xs text-muted-foreground">{form.currency || "JOD"}</span>
                    <span className="font-medium tabular-nums">{amountPaid.toFixed(2)}</span>
                  </div>
                </Field>
                <Field label="Add payment received now">
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    inputMode="decimal"
                    className={input}
                    placeholder="e.g. 50.00"
                    value={newPaymentAmount}
                    onChange={(e) => setNewPaymentAmount(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter only the new amount the client paid. The total above and dashboard update
                    automatically.
                  </p>
                </Field>
              </>
            )}
            <Field label="Payment status">
              <select
                className={input}
                value={form.payment_status}
                onChange={(e) => upd("payment_status", e.target.value)}
              >
                {PAYMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {PAYMENT_LABELS[s][lang]}
                  </option>
                ))}
              </select>
            </Field>
          </Section>

          <Section title="Dates & Delivery">
            {DATE_FIELDS.map(([k, l]) => (
              <Field key={k} label={l}>
                <input
                  type="date"
                  className={input}
                  value={form[k] ?? ""}
                  onChange={(e) => upd(k, e.target.value)}
                />
              </Field>
            ))}
          </Section>

          <Section title="Internal Management">
            <Field label={t("assignedTo")}>
              <select
                className={input}
                value={form.assigned_to ?? ""}
                onChange={(e) => upd("assigned_to", e.target.value)}
              >
                <option value="">—</option>
                {(staff ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name ?? s.email}
                  </option>
                ))}
              </select>
            </Field>
            <div className="md:col-span-2">
              <Field label="Internal notes">
                <textarea
                  rows={3}
                  className={input}
                  value={form.internal_notes ?? ""}
                  onChange={(e) => upd("internal_notes", e.target.value)}
                />
              </Field>
            </div>
            {form.status === "rejected" && (
              <div className="md:col-span-2">
                <Field label="Rejection reason">
                  <input
                    className={input}
                    value={form.rejection_reason ?? ""}
                    onChange={(e) => upd("rejection_reason", e.target.value)}
                  />
                </Field>
              </div>
            )}
            {form.status === "cancelled" && (
              <div className="md:col-span-2">
                <Field label="Cancellation reason">
                  <input
                    className={input}
                    value={form.cancellation_reason ?? ""}
                    onChange={(e) => upd("cancellation_reason", e.target.value)}
                  />
                </Field>
              </div>
            )}
          </Section>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-border hover:bg-accent/20"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg brand-gradient-bg text-primary-foreground font-medium disabled:opacity-50"
            >
              {saving ? t("loading") : t("save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
