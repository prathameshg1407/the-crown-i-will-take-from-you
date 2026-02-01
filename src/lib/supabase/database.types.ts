// lib/supabase/database.types.ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";
export type TransactionType = "purchase" | "refund";
export type PurchaseType = "complete" | "custom";
export type TierType = "free" | "complete";
export type PaymentProvider = "razorpay" | "paypal";

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          password_hash: string;
          site_id: number;
          name: string | null;
          password_reset_token: string | null;
          password_reset_expires: string | null;
          tier: TierType;
          owned_chapters: number[];
          avatar_url: string | null;
          is_active: boolean;
          last_login: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          password_hash: string;
          site_id: number;
          name?: string | null;
          password_reset_token?: string | null;
          password_reset_expires?: string | null;
          tier?: TierType;
          owned_chapters?: number[];
          avatar_url?: string | null;
          is_active?: boolean;
          last_login?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          password_hash?: string;
          site_id?: number;
          name?: string | null;
          password_reset_token?: string | null;
          password_reset_expires?: string | null;
          tier?: TierType;
          owned_chapters?: number[];
          avatar_url?: string | null;
          is_active?: boolean;
          last_login?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "users_site_id_fkey";
            columns: ["site_id"];
            referencedRelation: "sites";
            referencedColumns: ["id"];
          },
        ];
      };
      sites: {
        Row: {
          id: number;
          site_key: string;
          site_name: string;
          domain: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: number;
          site_key: string;
          site_name: string;
          domain: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: number;
          site_key?: string;
          site_name?: string;
          domain?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      purchases: {
        Row: {
          id: string;
          user_id: string;
          purchase_type: PurchaseType;
          purchase_data: Json | null;
          amount: number;
          currency: string;
          payment_provider: PaymentProvider;
          razorpay_order_id: string | null;
          razorpay_payment_id: string | null;
          razorpay_signature: string | null;
          paypal_order_id: string | null;
          paypal_capture_id: string | null;
          original_currency: string | null;
          original_amount: number | null;
          status: PaymentStatus;
          transaction_type: TransactionType;
          payment_method: string | null;
          payment_email: string | null;
          payment_contact: string | null;
          refund_id: string | null;
          refund_amount: number | null;
          refund_reason: string | null;
          refunded_at: string | null;
          ip_address: string | null;
          user_agent: string | null;
          verified_at: string | null;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          purchase_type: PurchaseType;
          purchase_data?: Json | null;
          amount: number;
          currency?: string;
          payment_provider?: PaymentProvider;
          razorpay_order_id?: string | null;
          razorpay_payment_id?: string | null;
          razorpay_signature?: string | null;
          paypal_order_id?: string | null;
          paypal_capture_id?: string | null;
          original_currency?: string | null;
          original_amount?: number | null;
          status?: PaymentStatus;
          transaction_type?: TransactionType;
          payment_method?: string | null;
          payment_email?: string | null;
          payment_contact?: string | null;
          refund_id?: string | null;
          refund_amount?: number | null;
          refund_reason?: string | null;
          refunded_at?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          verified_at?: string | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          purchase_type?: PurchaseType;
          purchase_data?: Json | null;
          amount?: number;
          currency?: string;
          payment_provider?: PaymentProvider;
          razorpay_order_id?: string | null;
          razorpay_payment_id?: string | null;
          razorpay_signature?: string | null;
          paypal_order_id?: string | null;
          paypal_capture_id?: string | null;
          original_currency?: string | null;
          original_amount?: number | null;
          status?: PaymentStatus;
          transaction_type?: TransactionType;
          payment_method?: string | null;
          payment_email?: string | null;
          payment_contact?: string | null;
          refund_id?: string | null;
          refund_amount?: number | null;
          refund_reason?: string | null;
          refunded_at?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          verified_at?: string | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "purchases_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      reading_progress: {
        Row: {
          id: string;
          user_id: string;
          chapter_id: number;
          chapter_slug: string;
          is_completed: boolean;
          last_position: number;
          reading_time_seconds: number;
          started_at: string;
          completed_at: string | null;
          last_read_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          chapter_id: number;
          chapter_slug: string;
          is_completed?: boolean;
          last_position?: number;
          reading_time_seconds?: number;
          started_at?: string;
          completed_at?: string | null;
          last_read_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          chapter_id?: number;
          chapter_slug?: string;
          is_completed?: boolean;
          last_position?: number;
          reading_time_seconds?: number;
          started_at?: string;
          completed_at?: string | null;
          last_read_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reading_progress_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      reports: {
        Row: {
          id: string;
          message: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          message: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          message?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          user_id: string;
          refresh_token: string;
          access_token_jti: string | null;
          ip_address: string | null;
          user_agent: string | null;
          device_info: Json | null;
          expires_at: string;
          last_used_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          refresh_token: string;
          access_token_jti?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          device_info?: Json | null;
          expires_at: string;
          last_used_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          refresh_token?: string;
          access_token_jti?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          device_info?: Json | null;
          expires_at?: string;
          last_used_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          event_type: string;
          resource_type: string | null;
          resource_id: string | null;
          ip_address: string | null;
          user_agent: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          event_type: string;
          resource_type?: string | null;
          resource_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          event_type?: string;
          resource_type?: string | null;
          resource_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_user_accessible_chapters: {
        Args: { p_user_id: string };
        Returns: { chapter_id: number }[];
      };
      user_has_chapter_access: {
        Args: { p_user_id: string; p_chapter_id: number };
        Returns: boolean;
      };
      add_owned_chapters: {
        Args: { p_user_id: string; p_chapters: number[] };
        Returns: undefined;
      };
      clean_expired_sessions: {
        Args: Record<string, never>;
        Returns: number;
      };
    };
    Enums: {
      payment_status: PaymentStatus;
      transaction_type: TransactionType;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// Helper types
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

// Convenience exports
export type User = Tables<"users">;
export type UserInsert = TablesInsert<"users">;
export type UserUpdate = TablesUpdate<"users">;

export type Purchase = Tables<"purchases">;
export type PurchaseInsert = TablesInsert<"purchases">;
export type PurchaseUpdate = TablesUpdate<"purchases">;

export type ReadingProgress = Tables<"reading_progress">;
export type ReadingProgressInsert = TablesInsert<"reading_progress">;
export type ReadingProgressUpdate = TablesUpdate<"reading_progress">;

export type Session = Tables<"sessions">;
export type SessionInsert = TablesInsert<"sessions">;
export type SessionUpdate = TablesUpdate<"sessions">;

export type AuditLog = Tables<"audit_logs">;
export type AuditLogInsert = TablesInsert<"audit_logs">;
export type AuditLogUpdate = TablesUpdate<"audit_logs">;
