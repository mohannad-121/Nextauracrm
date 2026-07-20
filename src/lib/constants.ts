export const REQUEST_STATUSES = [
  "new_lead","contacted","requirements_gathering","preparing_quote","quote_sent",
  "negotiating","approved","in_progress","waiting_for_client","testing","delivered",
  "completed","on_hold","rejected","cancelled",
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const STATUS_LABELS: Record<RequestStatus, { en: string; ar: string }> = {
  new_lead: { en: "New Lead", ar: "عميل جديد" },
  contacted: { en: "Contacted", ar: "تم التواصل" },
  requirements_gathering: { en: "Requirements", ar: "جمع المتطلبات" },
  preparing_quote: { en: "Preparing Quote", ar: "تحضير عرض" },
  quote_sent: { en: "Quote Sent", ar: "تم إرسال العرض" },
  negotiating: { en: "Negotiating", ar: "تفاوض" },
  approved: { en: "Approved", ar: "معتمد" },
  in_progress: { en: "In Progress", ar: "قيد التنفيذ" },
  waiting_for_client: { en: "Waiting for Client", ar: "بانتظار العميل" },
  testing: { en: "Testing", ar: "اختبار" },
  delivered: { en: "Delivered", ar: "تم التسليم" },
  completed: { en: "Completed", ar: "مكتمل" },
  on_hold: { en: "On Hold", ar: "معلق" },
  rejected: { en: "Rejected", ar: "مرفوض" },
  cancelled: { en: "Cancelled", ar: "ملغى" },
};

export const STATUS_COLOR: Record<RequestStatus, string> = {
  new_lead: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  contacted: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  requirements_gathering: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  preparing_quote: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  quote_sent: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  negotiating: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
  approved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  in_progress: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  waiting_for_client: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  testing: "bg-teal-500/15 text-teal-300 border-teal-500/30",
  delivered: "bg-green-500/15 text-green-300 border-green-500/30",
  completed: "bg-green-600/20 text-green-200 border-green-600/40",
  on_hold: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
  rejected: "bg-red-500/15 text-red-300 border-red-500/30",
  cancelled: "bg-red-600/20 text-red-200 border-red-600/40",
};

export const PAYMENT_STATUSES = [
  "not_quoted","quoted","awaiting_deposit","partially_paid","fully_paid","refunded","cancelled",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_LABELS: Record<PaymentStatus, { en: string; ar: string }> = {
  not_quoted: { en: "Not Quoted", ar: "بدون عرض" },
  quoted: { en: "Quoted", ar: "تم إرسال العرض" },
  awaiting_deposit: { en: "Awaiting Deposit", ar: "بانتظار الدفعة" },
  partially_paid: { en: "Partially Paid", ar: "دفع جزئي" },
  fully_paid: { en: "Fully Paid", ar: "مدفوع بالكامل" },
  refunded: { en: "Refunded", ar: "مسترد" },
  cancelled: { en: "Cancelled", ar: "ملغى" },
};

export const PRIORITIES = ["low","normal","high","urgent"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_LABELS: Record<Priority, { en: string; ar: string }> = {
  low: { en: "Low", ar: "منخفضة" },
  normal: { en: "Normal", ar: "عادية" },
  high: { en: "High", ar: "عالية" },
  urgent: { en: "Urgent", ar: "عاجلة" },
};

export const CAREER_FIELDS = [
  "AI and Machine Learning","Backend Development","Frontend Development","Full-Stack Development",
  "Mobile Development","UI/UX Design","Graphic Design","Digital Marketing","Content Creation",
  "Sales and Business Development","Project Management","Automation and Integrations","Internship","Other",
] as const;

export const EXPERIENCE_LEVELS = [
  "Student","Fresh Graduate","Junior","Mid-Level","Senior","Lead","Freelancer","Internship Applicant",
] as const;

export const WORK_TYPES = [
  "Full-Time","Part-Time","Internship","Freelance","Contract","Remote","Hybrid","On-Site","Open to Opportunities",
] as const;

export const CAREER_STATUSES = [
  "new","reviewing","potential_match","contacted","interview_planned","talent_pool","rejected","hired","archived",
] as const;
export type CareerStatus = (typeof CAREER_STATUSES)[number];

export const CURRENCIES = ["JOD","USD","AED","EUR","SAR","EGP"] as const;
export const CONTACT_SOURCES = ["WhatsApp","Website","Referral","LinkedIn","Instagram","Facebook","Email","Phone","Other"] as const;

export function fmtMoney(n: number | null | undefined, currency = "JOD") {
  if (n == null) return "—";
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(n));
}

export function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString(); } catch { return "—"; }
}