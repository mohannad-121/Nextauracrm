import { supabase } from "@/integrations/supabase/client";
import { STATUS_LABELS } from "@/lib/constants";
import { getBusinessCategory } from "@/lib/business-categories";

type RequestRecord = {
  id: string;
  request_number: string | null;
  customer_name: string;
  business_name: string | null;
  project_title: string;
  status: string;
  priority: string;
  payment_status: string;
  agreed_price: number | null;
  amount_paid: number;
  estimated_cost: number | null;
  currency: string | null;
  expected_delivery_date: string | null;
  next_follow_up_date: string | null;
  actual_delivery_date: string | null;
  request_date: string;
  archived_at: string | null;
};

type ClientRecord = {
  id: string;
  display_name: string;
  business_name: string | null;
  source: string | null;
  archived_at: string | null;
};

type TaskRecord = {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_at: string | null;
};

type InvoiceRecord = {
  id: string;
  invoice_number: string;
  status: string;
  total_amount: number;
  currency: string;
  due_date: string | null;
};

type MilestoneRecord = {
  id: string;
  title: string;
  status: string;
  amount: number;
  due_date: string | null;
};

type PaymentRecord = {
  id: string;
  amount: number;
  currency: string;
  payment_date: string;
  method: string;
};

type CareerRecord = {
  id: string;
  field: string;
  archived_at: string | null;
};

type CountRecord = { id: string };

type QueryResult<T> = {
  data: T[] | null;
  error: { code?: string; message: string } | null;
};

type CrmSnapshot = {
  requests: RequestRecord[];
  deletedRequests: RequestRecord[];
  clients: ClientRecord[];
  tasks: TaskRecord[];
  invoices: InvoiceRecord[];
  milestones: MilestoneRecord[];
  payments: PaymentRecord[];
  careers: CareerRecord[];
  files: CountRecord[];
  activities: CountRecord[];
  categories: CountRecord[];
  services: CountRecord[];
  isAdmin: boolean;
  unavailable: string[];
};

const FINISHED_STATUSES = new Set(["completed", "delivered", "cancelled", "rejected"]);
const INCOMPLETE_TASK_STATUSES = new Set(["open", "in_progress"]);
const STOP_WORDS = new Set([
  "about",
  "active",
  "all",
  "and",
  "are",
  "client",
  "clients",
  "does",
  "for",
  "from",
  "have",
  "how",
  "list",
  "look",
  "much",
  "need",
  "project",
  "projects",
  "request",
  "requests",
  "show",
  "tell",
  "that",
  "the",
  "this",
  "what",
  "which",
  "with",
]);

const EMOJI = {
  assistant: "\u{1F916}",
  chart: "\u{1F4CA}",
  client: "\u{1F465}",
  money: "\u{1F4B0}",
  paid: "\u{2705}",
  warning: "\u{26A0}\u{FE0F}",
  task: "\u{1F4CB}",
  calendar: "\u{1F4C5}",
  invoice: "\u{1F9FE}",
  folder: "\u{1F4C1}",
  archive: "\u{1F5D1}\u{FE0F}",
  sparkle: "\u{2728}",
  search: "\u{1F50D}",
} as const;

function getRows<T>(result: QueryResult<T>): T[] {
  return result.data ?? [];
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

function dateLabel(value: string | null): string {
  if (!value) return "not set";
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
  } catch {
    return value;
  }
}

function amountByCurrency<T>(
  rows: T[],
  getAmount: (row: T) => number,
  getCurrency: (row: T) => string | null | undefined,
): Map<string, number> {
  const totals = new Map<string, number>();
  rows.forEach((row) => {
    const currency = getCurrency(row) || "JOD";
    totals.set(currency, (totals.get(currency) ?? 0) + getAmount(row));
  });
  return totals;
}

function formatTotals(totals: Map<string, number>): string {
  if (totals.size === 0) return money(0, "JOD");
  return [...totals.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([currency, value]) => money(value, currency))
    .join(" | ");
}

function formatStatus(status: string): string {
  return STATUS_LABELS[status as keyof typeof STATUS_LABELS]?.en ?? status.replaceAll("_", " ");
}

function activeRequests(snapshot: CrmSnapshot): RequestRecord[] {
  return snapshot.requests.filter((request) => !FINISHED_STATUSES.has(request.status));
}

function requestBalance(request: RequestRecord): number {
  return Math.max(0, Number(request.agreed_price ?? 0) - Number(request.amount_paid ?? 0));
}

function requestReference(request: RequestRecord): string {
  return request.request_number || request.project_title;
}

async function loadCrmSnapshot(): Promise<CrmSnapshot> {
  const [
    requestsResult,
    deletedRequestsResult,
    clientsResult,
    tasksResult,
    invoicesResult,
    milestonesResult,
    paymentsResult,
    careersResult,
    filesResult,
    activitiesResult,
    categoriesResult,
    servicesResult,
    roleResult,
  ] = await Promise.all([
    supabase
      .from("client_requests")
      .select(
        "id,request_number,customer_name,business_name,project_title,status,priority,payment_status,agreed_price,amount_paid,estimated_cost,currency,expected_delivery_date,next_follow_up_date,actual_delivery_date,request_date,archived_at",
      )
      .is("archived_at", null)
      .limit(500),
    supabase
      .from("client_requests")
      .select(
        "id,request_number,customer_name,business_name,project_title,status,priority,payment_status,agreed_price,amount_paid,estimated_cost,currency,expected_delivery_date,next_follow_up_date,actual_delivery_date,request_date,archived_at",
      )
      .not("archived_at", "is", null)
      .limit(500),
    supabase
      .from("clients")
      .select("id,display_name,business_name,source,archived_at")
      .is("archived_at", null)
      .limit(500),
    supabase.from("client_tasks").select("id,title,status,priority,due_at").limit(500),
    supabase
      .from("invoices")
      .select("id,invoice_number,status,total_amount,currency,due_date")
      .limit(500),
    supabase.from("payment_milestones").select("id,title,status,amount,due_date").limit(500),
    supabase.from("request_payments").select("id,amount,currency,payment_date,method").limit(500),
    supabase
      .from("career_profiles")
      .select("id,field,archived_at")
      .is("archived_at", null)
      .limit(500),
    supabase.from("client_files").select("id").limit(500),
    supabase.from("request_activities").select("id").limit(500),
    supabase.from("project_categories").select("id").limit(500),
    supabase.from("project_services").select("id").limit(500),
    supabase.from("user_roles").select("role").maybeSingle(),
  ]);

  const results = [
    ["clients", clientsResult],
    ["tasks", tasksResult],
    ["invoices", invoicesResult],
    ["payment milestones", milestonesResult],
    ["payments", paymentsResult],
    ["career profiles", careersResult],
    ["files", filesResult],
    ["project activity", activitiesResult],
    ["categories", categoriesResult],
    ["services", servicesResult],
  ] as const;

  return {
    requests: getRows(requestsResult as QueryResult<RequestRecord>),
    deletedRequests: getRows(deletedRequestsResult as QueryResult<RequestRecord>),
    clients: getRows(clientsResult as QueryResult<ClientRecord>),
    tasks: getRows(tasksResult as QueryResult<TaskRecord>),
    invoices: getRows(invoicesResult as QueryResult<InvoiceRecord>),
    milestones: getRows(milestonesResult as QueryResult<MilestoneRecord>),
    payments: getRows(paymentsResult as QueryResult<PaymentRecord>),
    careers: getRows(careersResult as QueryResult<CareerRecord>),
    files: getRows(filesResult as QueryResult<CountRecord>),
    activities: getRows(activitiesResult as QueryResult<CountRecord>),
    categories: getRows(categoriesResult as QueryResult<CountRecord>),
    services: getRows(servicesResult as QueryResult<CountRecord>),
    isAdmin: roleResult.data?.role === "admin",
    unavailable: results.filter(([, result]) => result.error).map(([name]) => name),
  };
}

function helpResponse(): string {
  return [
    `${EMOJI.assistant} I am connected to the live CRM. I can help you control the whole workspace:`,
    `${EMOJI.folder} Projects: pipeline, status, category, delivery dates, and project search.`,
    `${EMOJI.client} Clients: total clients, business categories, and sources.`,
    `${EMOJI.money} Money: agreed revenue, received, unpaid balances, estimated costs, and estimated profit.`,
    `${EMOJI.invoice} Finance: payments, invoices, payment milestones, and overdue amounts.`,
    `${EMOJI.task} Work: open tasks, follow-ups, overdue delivery, files, and activity.`,
    `${EMOJI.chart} Career Portal: talent-directory totals and fields.`,
    `${EMOJI.archive} Deleted Projects: available only when your permissions allow it.`,
    "Try: 'How much money is still unpaid?', 'What needs attention today?', or 'Find the project for [client name]'.",
  ].join("\n\n");
}

function overviewResponse(snapshot: CrmSnapshot): string {
  const active = activeRequests(snapshot);
  const agreed = amountByCurrency(
    snapshot.requests,
    (request) => Number(request.agreed_price ?? 0),
    (request) => request.currency,
  );
  const paid = amountByCurrency(
    snapshot.requests,
    (request) => Number(request.amount_paid ?? 0),
    (request) => request.currency,
  );
  const remaining = amountByCurrency(
    snapshot.requests,
    requestBalance,
    (request) => request.currency,
  );
  const today = new Date().toISOString().slice(0, 10);
  const followUps = active.filter(
    (request) => request.next_follow_up_date && request.next_follow_up_date <= today,
  );
  const overdueDelivery = active.filter(
    (request) => request.expected_delivery_date && request.expected_delivery_date < today,
  );
  const openTasks = snapshot.tasks.filter((task) => INCOMPLETE_TASK_STATUSES.has(task.status));

  return [
    `${EMOJI.chart} Live CRM overview`,
    `${EMOJI.folder} ${snapshot.requests.length} projects | ${active.length} active | ${snapshot.clients.length} clients.`,
    `${EMOJI.money} Agreed: ${formatTotals(agreed)} | received: ${formatTotals(paid)} | still unpaid: ${formatTotals(remaining)}.`,
    `${EMOJI.warning} Needs attention: ${followUps.length} follow-up${followUps.length === 1 ? "" : "s"}, ${overdueDelivery.length} overdue deliver${overdueDelivery.length === 1 ? "y" : "ies"}, and ${openTasks.length} open task${openTasks.length === 1 ? "" : "s"}.`,
    `${EMOJI.invoice} ${snapshot.invoices.length} invoices | ${snapshot.payments.length} payment entries | ${snapshot.milestones.length} payment milestones.`,
    `${EMOJI.client} ${snapshot.categories.length} project categories | ${snapshot.services.length} services | ${snapshot.files.length} client files.`,
    `${EMOJI.chart} ${snapshot.careers.length} active talent profiles.`,
  ].join("\n\n");
}

function projectResponse(snapshot: CrmSnapshot): string {
  const counts = new Map<string, number>();
  snapshot.requests.forEach((request) =>
    counts.set(request.status, (counts.get(request.status) ?? 0) + 1),
  );
  const categories = new Map<string, number>();
  snapshot.requests.forEach((request) => {
    const category = getBusinessCategory(request.business_name).label;
    categories.set(category, (categories.get(category) ?? 0) + 1);
  });

  const statusBreakdown = [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 8)
    .map(([status, count]) => `- ${formatStatus(status)}: ${count}`)
    .join("\n");
  const categoryBreakdown = [...categories.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([category, count]) => `- ${category}: ${count}`)
    .join("\n");

  return [
    `${EMOJI.folder} Project pipeline`,
    `${snapshot.requests.length} total projects; ${activeRequests(snapshot).length} are currently active.`,
    statusBreakdown || "No project statuses yet.",
    `${EMOJI.chart} Biggest project categories:\n${categoryBreakdown || "No categories yet."}`,
  ].join("\n\n");
}

function financialResponse(snapshot: CrmSnapshot): string {
  const requests = snapshot.requests;
  const agreed = amountByCurrency(
    requests,
    (request) => Number(request.agreed_price ?? 0),
    (request) => request.currency,
  );
  const paid = amountByCurrency(
    requests,
    (request) => Number(request.amount_paid ?? 0),
    (request) => request.currency,
  );
  const unpaid = amountByCurrency(requests, requestBalance, (request) => request.currency);
  const costs = amountByCurrency(
    requests,
    (request) => Number(request.estimated_cost ?? 0),
    (request) => request.currency,
  );
  const estimatedProfit = amountByCurrency(
    requests,
    (request) => Number(request.agreed_price ?? 0) - Number(request.estimated_cost ?? 0),
    (request) => request.currency,
  );
  const recordedPayments = amountByCurrency(
    snapshot.payments,
    (payment) => Number(payment.amount ?? 0),
    (payment) => payment.currency,
  );
  const unpaidProjects = requests.filter((request) => requestBalance(request) > 0);
  const fullyPaid = requests.filter(
    (request) => Number(request.agreed_price ?? 0) > 0 && requestBalance(request) === 0,
  );
  const biggestBalances = unpaidProjects
    .toSorted((left, right) => requestBalance(right) - requestBalance(left))
    .slice(0, 5)
    .map(
      (request) =>
        `- ${requestReference(request)} (${request.customer_name}): ${money(requestBalance(request), request.currency || "JOD")}`,
    );

  return [
    `${EMOJI.money} Money and profitability`,
    `Agreed revenue: ${formatTotals(agreed)}.`,
    `${EMOJI.paid} Received: ${formatTotals(paid)}. Payment records entered: ${formatTotals(recordedPayments)}.`,
    `${EMOJI.warning} Still unpaid: ${formatTotals(unpaid)} across ${unpaidProjects.length} project${unpaidProjects.length === 1 ? "" : "s"}.`,
    `Estimated project costs: ${formatTotals(costs)}. Estimated gross profit (agreed minus estimated cost): ${formatTotals(estimatedProfit)}.`,
    `${fullyPaid.length} project${fullyPaid.length === 1 ? " is" : "s are"} fully paid.`,
    biggestBalances.length
      ? `${EMOJI.search} Largest balances to collect:\n${biggestBalances.join("\n")}`
      : `${EMOJI.paid} No outstanding project balances found.`,
  ].join("\n\n");
}

function attentionResponse(snapshot: CrmSnapshot): string {
  const today = new Date().toISOString().slice(0, 10);
  const active = activeRequests(snapshot);
  const followUps = active
    .filter((request) => request.next_follow_up_date && request.next_follow_up_date <= today)
    .toSorted((left, right) =>
      (left.next_follow_up_date || "").localeCompare(right.next_follow_up_date || ""),
    );
  const overdueDelivery = active
    .filter((request) => request.expected_delivery_date && request.expected_delivery_date < today)
    .toSorted((left, right) =>
      (left.expected_delivery_date || "").localeCompare(right.expected_delivery_date || ""),
    );
  const overdueTasks = snapshot.tasks
    .filter(
      (task) =>
        INCOMPLETE_TASK_STATUSES.has(task.status) &&
        task.due_at &&
        task.due_at.slice(0, 10) <= today,
    )
    .toSorted((left, right) => (left.due_at || "").localeCompare(right.due_at || ""));

  const lines = [
    ...followUps
      .slice(0, 5)
      .map(
        (request) =>
          `${EMOJI.calendar} Follow up: ${requestReference(request)} - ${request.customer_name} (${dateLabel(request.next_follow_up_date)})`,
      ),
    ...overdueDelivery
      .slice(0, 5)
      .map(
        (request) =>
          `${EMOJI.warning} Delivery overdue: ${requestReference(request)} - ${request.customer_name} (${dateLabel(request.expected_delivery_date)})`,
      ),
    ...overdueTasks
      .slice(0, 5)
      .map((task) => `${EMOJI.task} Task: ${task.title} (${dateLabel(task.due_at)})`),
  ];

  return lines.length
    ? `${EMOJI.warning} What needs attention\n\n${lines.join("\n")}`
    : `${EMOJI.paid} Everything is clear right now. There are no due follow-ups, overdue deliveries, or overdue tasks in the records you can access.`;
}

function clientsResponse(snapshot: CrmSnapshot): string {
  const categories = new Map<string, number>();
  const sources = new Map<string, number>();
  snapshot.clients.forEach((client) => {
    const category = getBusinessCategory(client.business_name).label;
    categories.set(category, (categories.get(category) ?? 0) + 1);
    const source = client.source || "Unattributed";
    sources.set(source, (sources.get(source) ?? 0) + 1);
  });
  const topCategories = [...categories.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 6)
    .map(([name, count]) => `- ${name}: ${count}`)
    .join("\n");
  const topSources = [...sources.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4)
    .map(([name, count]) => `- ${name}: ${count}`)
    .join("\n");

  return [
    `${EMOJI.client} Client overview`,
    `${snapshot.clients.length} active client profile${snapshot.clients.length === 1 ? "" : "s"} are available to you.`,
    `${EMOJI.chart} Categories:\n${topCategories || "No categories yet."}`,
    `${EMOJI.search} Sources:\n${topSources || "No sources yet."}`,
  ].join("\n\n");
}

function invoiceResponse(snapshot: CrmSnapshot): string {
  const invoiceTotals = amountByCurrency(
    snapshot.invoices,
    (invoice) => Number(invoice.total_amount ?? 0),
    (invoice) => invoice.currency,
  );
  const overdue = snapshot.invoices.filter((invoice) => invoice.status === "overdue");
  const milestones = snapshot.milestones.filter((milestone) => milestone.status === "overdue");
  const overdueMilestoneTotal = amountByCurrency(
    milestones,
    (milestone) => Number(milestone.amount ?? 0),
    () => "JOD",
  );

  return [
    `${EMOJI.invoice} Invoices and payment milestones`,
    `${snapshot.invoices.length} invoices totaling ${formatTotals(invoiceTotals)}.`,
    `${EMOJI.warning} ${overdue.length} overdue invoice${overdue.length === 1 ? "" : "s"} and ${milestones.length} overdue milestone${milestones.length === 1 ? "" : "s"}.`,
    milestones.length
      ? `Overdue milestone amount: ${formatTotals(overdueMilestoneTotal)}.`
      : `${EMOJI.paid} No overdue milestone amount is recorded.`,
  ].join("\n\n");
}

function taskResponse(snapshot: CrmSnapshot): string {
  const open = snapshot.tasks.filter((task) => INCOMPLETE_TASK_STATUSES.has(task.status));
  const priority = new Map<string, number>();
  open.forEach((task) => priority.set(task.priority, (priority.get(task.priority) ?? 0) + 1));
  const breakdown = [...priority.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([name, count]) => `- ${name.replaceAll("_", " ")}: ${count}`)
    .join("\n");

  return [
    `${EMOJI.task} Work and activity`,
    `${open.length} open task${open.length === 1 ? "" : "s"}; ${snapshot.activities.length} recorded project activit${snapshot.activities.length === 1 ? "y" : "ies"}; ${snapshot.files.length} client file${snapshot.files.length === 1 ? "" : "s"}.`,
    breakdown || `${EMOJI.paid} No open tasks.`,
  ].join("\n\n");
}

function careerResponse(snapshot: CrmSnapshot): string {
  const fields = new Map<string, number>();
  snapshot.careers.forEach((profile) =>
    fields.set(profile.field, (fields.get(profile.field) ?? 0) + 1),
  );
  const breakdown = [...fields.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 8)
    .map(([field, count]) => `- ${field}: ${count}`)
    .join("\n");
  return [
    `${EMOJI.client} Talent directory`,
    `${snapshot.careers.length} active talent profile${snapshot.careers.length === 1 ? "" : "s"}.`,
    breakdown || "No career profiles are available yet.",
  ].join("\n\n");
}

function deletedProjectsResponse(snapshot: CrmSnapshot): string {
  if (!snapshot.isAdmin) {
    return `${EMOJI.archive} Deleted Projects is protected. I can only show that data to accounts with administrator access.`;
  }

  return snapshot.deletedRequests.length
    ? `${EMOJI.archive} There are ${snapshot.deletedRequests.length} deleted project${snapshot.deletedRequests.length === 1 ? "" : "s"}. Open Deleted Projects from the sidebar to review or restore them with the protected confirmation.`
    : `${EMOJI.paid} There are no deleted projects right now.`;
}

function findProjects(snapshot: CrmSnapshot, prompt: string): RequestRecord[] {
  const words = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/gi, " ")
    .split(" ")
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));
  if (words.length === 0) return [];

  return snapshot.requests
    .map((request) => {
      const searchable = [
        request.request_number,
        request.customer_name,
        request.business_name,
        request.project_title,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return { request, score: words.filter((word) => searchable.includes(word)).length };
    })
    .filter((match) => match.score > 0)
    .toSorted((left, right) => right.score - left.score)
    .slice(0, 5)
    .map((match) => match.request);
}

function projectSearchResponse(projects: RequestRecord[]): string {
  return [
    `${EMOJI.search} I found ${projects.length} matching project${projects.length === 1 ? "" : "s"}:`,
    ...projects.map((project) => {
      const amount = money(Number(project.agreed_price ?? 0), project.currency || "JOD");
      const received = money(Number(project.amount_paid ?? 0), project.currency || "JOD");
      const balance = money(requestBalance(project), project.currency || "JOD");
      return [
        `- ${requestReference(project)}: ${project.project_title} for ${project.customer_name}.`,
        `  ${formatStatus(project.status)} | agreed ${amount} | received ${received} | remaining ${balance}.`,
        `  Estimated cost: ${money(Number(project.estimated_cost ?? 0), project.currency || "JOD")} | delivery: ${dateLabel(project.expected_delivery_date)} | next follow-up: ${dateLabel(project.next_follow_up_date)}.`,
      ].join("\n");
    }),
  ].join("\n\n");
}

function includesAny(text: string, values: string[]): boolean {
  return values.some((value) => text.includes(value));
}

function isHelpQuestion(text: string): boolean {
  return includesAny(text, [
    "help",
    "what can you",
    "what do you",
    "which is it",
    "what is this",
    "how do i use",
    "\u0645\u0633\u0627\u0639\u062f\u0629",
    "\u0645\u0627\u0630\u0627 \u062a\u0633\u062a\u0637\u064a\u0639",
  ]);
}

function isBroadQuestion(text: string): boolean {
  return includesAny(text, [
    "overview",
    "everything",
    "all data",
    "business summary",
    "summary",
    "\u0645\u0644\u062e\u0635",
    "\u0643\u0644 \u0634\u064a",
  ]);
}

export async function answerCrmQuestion(prompt: string): Promise<string> {
  const snapshot = await loadCrmSnapshot();
  const normalized = prompt.toLowerCase().trim();

  if (isHelpQuestion(normalized)) return helpResponse();
  if (isBroadQuestion(normalized)) return overviewResponse(snapshot);

  if (
    includesAny(normalized, [
      "delete",
      "deleted",
      "restore",
      "archive",
      "\u0645\u062d\u0630\u0648\u0641",
      "\u0627\u0633\u062a\u0639\u0627\u062f",
    ])
  ) {
    return deletedProjectsResponse(snapshot);
  }
  if (
    includesAny(normalized, [
      "money",
      "revenue",
      "paid",
      "unpaid",
      "payment",
      "received",
      "remaining",
      "cost",
      "profit",
      "balance",
      "\u0645\u0627\u0644",
      "\u062f\u0641\u0639",
      "\u0645\u062f\u0641\u0648\u0639",
      "\u062a\u0643\u0644\u0641\u0629",
      "\u0631\u0628\u062d",
    ])
  ) {
    return financialResponse(snapshot);
  }
  if (
    includesAny(normalized, [
      "invoice",
      "milestone",
      "\u0641\u0627\u062a\u0648\u0631\u0629",
      "\u0642\u0633\u0637",
    ])
  ) {
    return invoiceResponse(snapshot);
  }
  if (
    includesAny(normalized, [
      "follow",
      "due",
      "overdue",
      "today",
      "attention",
      "urgent",
      "\u0645\u062a\u0627\u0628\u0639\u0629",
      "\u0645\u062a\u0623\u062e\u0631",
      "\u0627\u0644\u064a\u0648\u0645",
    ])
  ) {
    return attentionResponse(snapshot);
  }
  if (
    includesAny(normalized, [
      "task",
      "work",
      "activity",
      "file",
      "\u0645\u0647\u0645\u0629",
      "\u0645\u0644\u0641",
    ])
  ) {
    return taskResponse(snapshot);
  }
  if (
    includesAny(normalized, [
      "career",
      "talent",
      "candidate",
      "profile",
      "\u0648\u0638\u0627\u0626\u0641",
      "\u0645\u0631\u0634\u062d",
    ])
  ) {
    return careerResponse(snapshot);
  }
  if (
    includesAny(normalized, [
      "client",
      "customer",
      "category",
      "coffee",
      "restaurant",
      "beauty",
      "\u0639\u0645\u064a\u0644",
      "\u062a\u0635\u0646\u064a\u0641",
    ])
  ) {
    return clientsResponse(snapshot);
  }
  if (
    includesAny(normalized, [
      "project",
      "request",
      "pipeline",
      "lead",
      "status",
      "\u0645\u0634\u0631\u0648\u0639",
      "\u0637\u0644\u0628",
      "\u062d\u0627\u0644\u0629",
    ])
  ) {
    return projectResponse(snapshot);
  }

  const matches = findProjects(snapshot, prompt);
  if (matches.length) return projectSearchResponse(matches);

  const unavailable = snapshot.unavailable.length
    ? ` Some sections are not available to this account right now: ${snapshot.unavailable.join(", ")}.`
    : "";
  return `${EMOJI.assistant} I did not find a clear match for that question, but I can still help. Ask for an overview, a client or project by name, money paid or unpaid, estimated costs, tasks, follow-ups, invoices, payments, files, careers, or deleted projects.${unavailable}`;
}
