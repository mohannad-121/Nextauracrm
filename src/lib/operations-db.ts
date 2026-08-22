import { supabase } from "@/integrations/supabase/client";

export type Client = {
  id: string;
  display_name: string;
  business_name: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  country: string | null;
  city: string | null;
  preferred_language: string;
  source: string | null;
  notes: string | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};
export type ClientTask = {
  id: string;
  request_id: string | null;
  client_id: string | null;
  title: string;
  description: string | null;
  status: "open" | "in_progress" | "done" | "cancelled";
  priority: "low" | "normal" | "high" | "urgent";
  assigned_to: string | null;
  due_at: string | null;
  reminder_at: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
};
export type Invoice = {
  id: string;
  request_id: string;
  invoice_number: string;
  status: "draft" | "sent" | "partially_paid" | "paid" | "overdue" | "void";
  issue_date: string;
  due_date: string | null;
  currency: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes: string | null;
  line_items: unknown[];
  created_at: string;
};
export type Milestone = {
  id: string;
  request_id: string;
  invoice_id: string | null;
  title: string;
  amount: number;
  due_date: string | null;
  status: "pending" | "paid" | "overdue" | "cancelled";
  paid_at: string | null;
  notes: string | null;
};
export type ClientFile = {
  id: string;
  request_id: string | null;
  client_id: string | null;
  path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};
export type AutomationRule = {
  key: string;
  label: string;
  enabled: boolean;
  config: Record<string, unknown>;
  updated_at: string;
};
type ErrorShape = { message: string } | null;
type Result<T> = { data: T | null; error: ErrorShape };

type Query<T> = PromiseLike<Result<T[]>> & {
  select: (columns?: string) => Query<T>;
  eq: (column: string, value: string | boolean | null) => Query<T>;
  is: (column: string, value: null) => Query<T>;
  in: (column: string, values: string[]) => Query<T>;
  order: (column: string, options?: { ascending?: boolean }) => Query<T>;
  limit: (count: number) => Query<T>;
  insert: (value: Partial<T> | Partial<T>[]) => Mutation<T>;
  update: (value: Partial<T>) => Mutation<T>;
  delete: () => Mutation<T>;
};
type Mutation<T> = Query<T> & {
  select: (columns?: string) => Mutation<T>;
  single: () => Promise<Result<T>>;
};
type OperationsDb = {
  from: <T>(table: string) => Query<T>;
  rpc: (name: string) => Promise<Result<Record<string, number>>>;
};

// New operational tables are introduced by a migration. This small typed facade keeps the app
// deployable until Supabase's generated types are refreshed from the connected project.
export const operationsDb = supabase as unknown as OperationsDb;
