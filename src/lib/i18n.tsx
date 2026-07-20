import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type Lang = "en" | "ar";
type Dict = Record<string, string>;

const en: Dict = {
  brand: "NextAura AI",
  tagline: "Intelligent internal CRM",
  signIn: "Sign in",
  signUp: "Sign up",
  signOut: "Sign out",
  email: "Email",
  password: "Password",
  loginTitle: "Sign in to NextAura",
  loginSubtitle: "Sign in with your team account to open the CRM.",
  signupTitle: "Create your account",
  signupSubtitle:
    "The first account becomes the CRM administrator. Later accounts require administrator approval.",
  createAccount: "Create account",
  confirmPassword: "Confirm password",
  passwordHint: "Use at least 8 characters.",
  passwordsDoNotMatch: "Passwords do not match.",
  passwordTooShort: "Password must contain at least 8 characters.",
  accountCreated: "Account created. Welcome to NextAura.",
  checkEmail: "Check your email",
  confirmationSent: "We sent a confirmation link to",
  backToSignIn: "Back to sign in",
  alreadyHaveAccount: "Already have an account?",
  needAccount: "Need an account?",
  accessPendingTitle: "Access pending",
  accessPendingBody:
    "Your account is active, but a CRM administrator must assign your team role before you can continue.",
  dashboard: "Dashboard",
  requests: "Client Requests",
  careerApps: "Career Applications",
  aiAssistant: "AI Assistant",
  needsAttention: "Needs your attention",
  newLeads: "New leads",
  quotesAwaiting: "Quotes awaiting response",
  approvedProjects: "Approved projects",
  inProgress: "In progress",
  overdue: "Overdue",
  followUpsToday: "Follow-ups due today",
  followUpsWeek: "Follow-ups this week",
  agreedRevenue: "Total agreed revenue",
  received: "Total received",
  remaining: "Total remaining",
  activeRequests: "Active requests",
  requestsByStatus: "Requests by status",
  requestsByCategory: "Requests by category",
  monthlyRevenue: "Monthly revenue",
  paymentsReceived: "Payments received",
  newRequest: "New request",
  search: "Search…",
  filters: "Filters",
  export: "Export",
  all: "All",
  status: "Status",
  category: "Category",
  priority: "Priority",
  assignedTo: "Assigned to",
  customer: "Customer",
  business: "Business",
  projectTitle: "Project title",
  agreedPrice: "Agreed price",
  paid: "Paid",
  expectedDelivery: "Expected delivery",
  nextFollowUp: "Next follow-up",
  actions: "Actions",
  edit: "Edit",
  archive: "Archive",
  save: "Save",
  cancel: "Cancel",
  submit: "Submit",
  careersHeroTitle: "Build the Future with NextAura AI",
  careersHeroBody:
    "We are always interested in meeting talented people who are passionate about artificial intelligence, software development, design, marketing, automation, and digital products. Submit your profile to be considered for future opportunities at NextAura AI.",
  careersDisclaimer:
    "Submitting this form does not guarantee employment. Applications may be kept for future opportunities.",
  fullName: "Full name",
  phone: "Phone",
  whatsapp: "WhatsApp",
  country: "Country",
  city: "City",
  language: "Preferred language",
  field: "Field of interest",
  experience: "Experience level",
  years: "Years of experience",
  currentJob: "Current job title",
  linkedin: "LinkedIn",
  portfolio: "Portfolio / GitHub",
  website: "Personal website",
  cv: "CV (PDF / DOC / DOCX, max 5MB)",
  intro: "Short introduction",
  skills: "Key skills",
  workType: "Preferred work type",
  availability: "Availability",
  compensation: "Expected compensation",
  coverLetter: "Cover letter",
  consent: "I consent to NextAura AI storing my information for recruitment purposes.",
  submitted: "Thank you! Your application has been received.",
  submitError: "Something went wrong. Please try again.",
  noResults: "No matching records.",
  loading: "Loading…",
  empty: "Nothing here yet.",
};

const ar: Dict = {
  brand: "نكست أورا",
  tagline: "نظام CRM داخلي ذكي",
  signIn: "تسجيل الدخول",
  signUp: "إنشاء حساب",
  signOut: "تسجيل الخروج",
  email: "البريد الإلكتروني",
  password: "كلمة المرور",
  loginTitle: "تسجيل الدخول إلى نكست أورا",
  loginSubtitle: "دخول داخلي فقط. حسابات الفريق تُنشأ من قبل المسؤولين.",
  signupTitle: "إنشاء حسابك",
  signupSubtitle: "يصبح الحساب الأول مسؤول النظام. تحتاج الحسابات التالية إلى موافقة المسؤول.",
  createAccount: "إنشاء حساب",
  confirmPassword: "تأكيد كلمة المرور",
  passwordHint: "استخدم 8 أحرف على الأقل.",
  passwordsDoNotMatch: "كلمتا المرور غير متطابقتين.",
  passwordTooShort: "يجب أن تتكون كلمة المرور من 8 أحرف على الأقل.",
  accountCreated: "تم إنشاء الحساب. أهلاً بك في نكست أورا.",
  checkEmail: "تحقق من بريدك الإلكتروني",
  confirmationSent: "أرسلنا رابط التأكيد إلى",
  backToSignIn: "العودة إلى تسجيل الدخول",
  alreadyHaveAccount: "لديك حساب بالفعل؟",
  needAccount: "تحتاج إلى حساب؟",
  accessPendingTitle: "الوصول قيد الانتظار",
  accessPendingBody: "حسابك نشط، لكن يجب أن يعيّن لك مسؤول النظام دوراً في الفريق قبل المتابعة.",
  dashboard: "اللوحة الرئيسية",
  requests: "طلبات العملاء",
  careerApps: "طلبات التوظيف",
  aiAssistant: "المساعد الذكي",
  needsAttention: "يحتاج انتباهك",
  newLeads: "عملاء جدد",
  quotesAwaiting: "عروض بانتظار الرد",
  approvedProjects: "مشاريع معتمدة",
  inProgress: "قيد التنفيذ",
  overdue: "متأخر",
  followUpsToday: "متابعات اليوم",
  followUpsWeek: "متابعات هذا الأسبوع",
  agreedRevenue: "إجمالي الإيرادات المتفق عليها",
  received: "المستلم",
  remaining: "المتبقي",
  activeRequests: "الطلبات النشطة",
  requestsByStatus: "الطلبات حسب الحالة",
  requestsByCategory: "الطلبات حسب الفئة",
  monthlyRevenue: "الإيرادات الشهرية",
  paymentsReceived: "الدفعات المستلمة",
  newRequest: "طلب جديد",
  search: "بحث…",
  filters: "تصفية",
  export: "تصدير",
  all: "الكل",
  status: "الحالة",
  category: "الفئة",
  priority: "الأولوية",
  assignedTo: "المسؤول",
  customer: "العميل",
  business: "الشركة",
  projectTitle: "عنوان المشروع",
  agreedPrice: "السعر المتفق",
  paid: "مدفوع",
  expectedDelivery: "التسليم المتوقع",
  nextFollowUp: "المتابعة القادمة",
  actions: "إجراءات",
  edit: "تعديل",
  archive: "أرشفة",
  save: "حفظ",
  cancel: "إلغاء",
  submit: "إرسال",
  careersHeroTitle: "ابنِ المستقبل مع نكست أورا",
  careersHeroBody:
    "نبحث دائمًا عن مواهب شغوفة بالذكاء الاصطناعي وتطوير البرمجيات والتصميم والتسويق والأتمتة والمنتجات الرقمية. أرسل ملفك ليتم النظر فيه للفرص القادمة في نكست أورا.",
  careersDisclaimer: "إرسال هذا النموذج لا يضمن التوظيف. قد يتم الاحتفاظ بالطلبات لفرص مستقبلية.",
  fullName: "الاسم الكامل",
  phone: "رقم الهاتف",
  whatsapp: "واتساب",
  country: "البلد",
  city: "المدينة",
  language: "اللغة المفضلة",
  field: "المجال المهني",
  experience: "مستوى الخبرة",
  years: "سنوات الخبرة",
  currentJob: "المسمى الوظيفي الحالي",
  linkedin: "لينكدإن",
  portfolio: "المعرض / GitHub",
  website: "الموقع الشخصي",
  cv: "السيرة الذاتية (PDF / DOC / DOCX، حد أقصى 5MB)",
  intro: "نبذة قصيرة",
  skills: "أهم المهارات",
  workType: "نوع العمل المفضل",
  availability: "التوفر",
  compensation: "الراتب المتوقع",
  coverLetter: "خطاب تعريفي",
  consent: "أوافق على احتفاظ نكست أورا بمعلوماتي لأغراض التوظيف.",
  submitted: "شكرًا لك! تم استلام طلبك.",
  submitError: "حدث خطأ ما. حاول مرة أخرى.",
  noResults: "لا توجد نتائج مطابقة.",
  loading: "جارٍ التحميل…",
  empty: "لا يوجد شيء بعد.",
};

const dicts: Record<Lang, Dict> = { en, ar };

type Ctx = {
  lang: Lang;
  dir: "ltr" | "rtl";
  setLang: (l: Lang) => void;
  t: (key: keyof typeof en) => string;
};

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved =
      (typeof window !== "undefined" && (localStorage.getItem("na_lang") as Lang | null)) || null;
    if (saved === "en" || saved === "ar") setLangState(saved);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const value = useMemo<Ctx>(
    () => ({
      lang,
      dir: lang === "ar" ? "rtl" : "ltr",
      setLang: (l) => {
        setLangState(l);
        if (typeof window !== "undefined") localStorage.setItem("na_lang", l);
      },
      t: (key) => dicts[lang][key] ?? dicts.en[key] ?? String(key),
    }),
    [lang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
