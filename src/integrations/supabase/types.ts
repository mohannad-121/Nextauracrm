export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_sessions: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      career_applications: {
        Row: {
          archived_at: string | null
          availability: string | null
          city: string | null
          consent: boolean
          country: string | null
          cover_letter: string | null
          current_job_title: string | null
          cv_path: string | null
          email: string
          expected_compensation: string | null
          experience_level: string | null
          field_of_interest: string
          full_name: string
          id: string
          internal_notes: string | null
          internal_rating: number | null
          key_skills: string | null
          linkedin_url: string | null
          personal_website: string | null
          phone: string | null
          portfolio_url: string | null
          preferred_language: string | null
          preferred_work_type: string | null
          short_intro: string | null
          status: Database["public"]["Enums"]["career_status"]
          submitted_at: string
          updated_at: string
          whatsapp: string | null
          years_of_experience: number | null
        }
        Insert: {
          archived_at?: string | null
          availability?: string | null
          city?: string | null
          consent?: boolean
          country?: string | null
          cover_letter?: string | null
          current_job_title?: string | null
          cv_path?: string | null
          email: string
          expected_compensation?: string | null
          experience_level?: string | null
          field_of_interest: string
          full_name: string
          id?: string
          internal_notes?: string | null
          internal_rating?: number | null
          key_skills?: string | null
          linkedin_url?: string | null
          personal_website?: string | null
          phone?: string | null
          portfolio_url?: string | null
          preferred_language?: string | null
          preferred_work_type?: string | null
          short_intro?: string | null
          status?: Database["public"]["Enums"]["career_status"]
          submitted_at?: string
          updated_at?: string
          whatsapp?: string | null
          years_of_experience?: number | null
        }
        Update: {
          archived_at?: string | null
          availability?: string | null
          city?: string | null
          consent?: boolean
          country?: string | null
          cover_letter?: string | null
          current_job_title?: string | null
          cv_path?: string | null
          email?: string
          expected_compensation?: string | null
          experience_level?: string | null
          field_of_interest?: string
          full_name?: string
          id?: string
          internal_notes?: string | null
          internal_rating?: number | null
          key_skills?: string | null
          linkedin_url?: string | null
          personal_website?: string | null
          phone?: string | null
          portfolio_url?: string | null
          preferred_language?: string | null
          preferred_work_type?: string | null
          short_intro?: string | null
          status?: Database["public"]["Enums"]["career_status"]
          submitted_at?: string
          updated_at?: string
          whatsapp?: string | null
          years_of_experience?: number | null
        }
        Relationships: []
      }
      client_requests: {
        Row: {
          actual_delivery_date: string | null
          agreed_price: number | null
          agreement_date: string | null
          amount_paid: number
          archived_at: string | null
          assigned_to: string | null
          business_name: string | null
          cancellation_reason: string | null
          category_id: string | null
          city: string | null
          contact_source: string | null
          country: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          customer_name: string
          customer_requirements: string | null
          email: string | null
          estimated_cost: number | null
          expected_delivery_date: string | null
          first_contact_date: string | null
          id: string
          internal_notes: string | null
          next_follow_up_date: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          phone: string | null
          phone_secondary: string | null
          preferred_language: string | null
          priority: Database["public"]["Enums"]["priority_level"]
          project_description: string | null
          project_start_date: string | null
          project_title: string
          quote_date: string | null
          quoted_price: number | null
          rejection_reason: string | null
          request_date: string
          request_number: string | null
          requested_services: Json | null
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          actual_delivery_date?: string | null
          agreed_price?: number | null
          agreement_date?: string | null
          amount_paid?: number
          archived_at?: string | null
          assigned_to?: string | null
          business_name?: string | null
          cancellation_reason?: string | null
          category_id?: string | null
          city?: string | null
          contact_source?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          customer_name: string
          customer_requirements?: string | null
          email?: string | null
          estimated_cost?: number | null
          expected_delivery_date?: string | null
          first_contact_date?: string | null
          id?: string
          internal_notes?: string | null
          next_follow_up_date?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          phone?: string | null
          phone_secondary?: string | null
          preferred_language?: string | null
          priority?: Database["public"]["Enums"]["priority_level"]
          project_description?: string | null
          project_start_date?: string | null
          project_title: string
          quote_date?: string | null
          quoted_price?: number | null
          rejection_reason?: string | null
          request_date?: string
          request_number?: string | null
          requested_services?: Json | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          actual_delivery_date?: string | null
          agreed_price?: number | null
          agreement_date?: string | null
          amount_paid?: number
          archived_at?: string | null
          assigned_to?: string | null
          business_name?: string | null
          cancellation_reason?: string | null
          category_id?: string | null
          city?: string | null
          contact_source?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          customer_name?: string
          customer_requirements?: string | null
          email?: string | null
          estimated_cost?: number | null
          expected_delivery_date?: string | null
          first_contact_date?: string | null
          id?: string
          internal_notes?: string | null
          next_follow_up_date?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          phone?: string | null
          phone_secondary?: string | null
          preferred_language?: string | null
          priority?: Database["public"]["Enums"]["priority_level"]
          project_description?: string | null
          project_start_date?: string | null
          project_title?: string
          quote_date?: string | null
          quoted_price?: number | null
          rejection_reason?: string | null
          request_date?: string
          request_number?: string | null
          requested_services?: Json | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_requests_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "project_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          preferred_language: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          preferred_language?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          preferred_language?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name_ar: string | null
          name_en: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar?: string | null
          name_en: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar?: string | null
          name_en?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      project_services: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name_ar: string | null
          name_en: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar?: string | null
          name_en: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar?: string | null
          name_en?: string
          slug?: string
        }
        Relationships: []
      }
      request_activities: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          content: string | null
          created_at: string
          created_by: string | null
          id: string
          request_id: string
        }
        Insert: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          request_id: string
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_activities_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "client_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          note: string | null
          payment_date: string
          recorded_by: string | null
          reference: string | null
          request_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          note?: string | null
          payment_date?: string
          recorded_by?: string | null
          reference?: string | null
          request_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          note?: string | null
          payment_date?: string
          recorded_by?: string | null
          reference?: string | null
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_payments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "client_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_service_links: {
        Row: {
          request_id: string
          service_id: string
        }
        Insert: {
          request_id: string
          service_id: string
        }
        Update: {
          request_id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_service_links_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "client_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_service_links_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "project_services"
            referencedColumns: ["id"]
          },
        ]
      }
      request_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          new_status: Database["public"]["Enums"]["request_status"]
          note: string | null
          previous_status: Database["public"]["Enums"]["request_status"] | null
          request_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status: Database["public"]["Enums"]["request_status"]
          note?: string | null
          previous_status?: Database["public"]["Enums"]["request_status"] | null
          request_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["request_status"]
          note?: string | null
          previous_status?: Database["public"]["Enums"]["request_status"] | null
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_status_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "client_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      activity_type:
        | "note"
        | "call"
        | "whatsapp"
        | "email"
        | "meeting"
        | "status_change"
        | "payment"
        | "quote"
        | "delivery"
        | "other"
      app_role: "admin" | "manager" | "staff"
      career_status:
        | "new"
        | "reviewing"
        | "potential_match"
        | "contacted"
        | "interview_planned"
        | "talent_pool"
        | "rejected"
        | "hired"
        | "archived"
      payment_method:
        | "cash"
        | "bank_transfer"
        | "cliq"
        | "paypal"
        | "card"
        | "other"
      payment_status:
        | "not_quoted"
        | "quoted"
        | "awaiting_deposit"
        | "partially_paid"
        | "fully_paid"
        | "refunded"
        | "cancelled"
      priority_level: "low" | "normal" | "high" | "urgent"
      request_status:
        | "new_lead"
        | "contacted"
        | "requirements_gathering"
        | "preparing_quote"
        | "quote_sent"
        | "negotiating"
        | "approved"
        | "in_progress"
        | "waiting_for_client"
        | "testing"
        | "delivered"
        | "completed"
        | "on_hold"
        | "rejected"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      activity_type: [
        "note",
        "call",
        "whatsapp",
        "email",
        "meeting",
        "status_change",
        "payment",
        "quote",
        "delivery",
        "other",
      ],
      app_role: ["admin", "manager", "staff"],
      career_status: [
        "new",
        "reviewing",
        "potential_match",
        "contacted",
        "interview_planned",
        "talent_pool",
        "rejected",
        "hired",
        "archived",
      ],
      payment_method: [
        "cash",
        "bank_transfer",
        "cliq",
        "paypal",
        "card",
        "other",
      ],
      payment_status: [
        "not_quoted",
        "quoted",
        "awaiting_deposit",
        "partially_paid",
        "fully_paid",
        "refunded",
        "cancelled",
      ],
      priority_level: ["low", "normal", "high", "urgent"],
      request_status: [
        "new_lead",
        "contacted",
        "requirements_gathering",
        "preparing_quote",
        "quote_sent",
        "negotiating",
        "approved",
        "in_progress",
        "waiting_for_client",
        "testing",
        "delivered",
        "completed",
        "on_hold",
        "rejected",
        "cancelled",
      ],
    },
  },
} as const
