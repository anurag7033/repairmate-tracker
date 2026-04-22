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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          alternate_phone: string | null
          amount_paid: number
          assigned_technician: string | null
          booking_id: string
          city: string
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string
          device_brand: string
          device_model: string
          device_type: Database["public"]["Enums"]["device_type"]
          full_address: string
          id: string
          image_urls: string[]
          imei_serial: string | null
          internal_notes: string | null
          issue_description: string
          issue_type: string
          payment_method: Database["public"]["Enums"]["booking_payment_method"]
          payment_status: Database["public"]["Enums"]["booking_payment_status"]
          pincode: string
          preferred_date: string | null
          preferred_time_slot: string | null
          razorpay_payment_id: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          status: Database["public"]["Enums"]["booking_status"]
          terms_accepted: boolean
          updated_at: string
        }
        Insert: {
          alternate_phone?: string | null
          amount_paid?: number
          assigned_technician?: string | null
          booking_id: string
          city: string
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          device_brand: string
          device_model: string
          device_type?: Database["public"]["Enums"]["device_type"]
          full_address: string
          id?: string
          image_urls?: string[]
          imei_serial?: string | null
          internal_notes?: string | null
          issue_description: string
          issue_type: string
          payment_method?: Database["public"]["Enums"]["booking_payment_method"]
          payment_status?: Database["public"]["Enums"]["booking_payment_status"]
          pincode: string
          preferred_date?: string | null
          preferred_time_slot?: string | null
          razorpay_payment_id?: string | null
          service_type?: Database["public"]["Enums"]["service_type"]
          status?: Database["public"]["Enums"]["booking_status"]
          terms_accepted?: boolean
          updated_at?: string
        }
        Update: {
          alternate_phone?: string | null
          amount_paid?: number
          assigned_technician?: string | null
          booking_id?: string
          city?: string
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          device_brand?: string
          device_model?: string
          device_type?: Database["public"]["Enums"]["device_type"]
          full_address?: string
          id?: string
          image_urls?: string[]
          imei_serial?: string | null
          internal_notes?: string | null
          issue_description?: string
          issue_type?: string
          payment_method?: Database["public"]["Enums"]["booking_payment_method"]
          payment_status?: Database["public"]["Enums"]["booking_payment_status"]
          pincode?: string
          preferred_date?: string | null
          preferred_time_slot?: string | null
          razorpay_payment_id?: string | null
          service_type?: Database["public"]["Enums"]["service_type"]
          status?: Database["public"]["Enums"]["booking_status"]
          terms_accepted?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      repair_orders: {
        Row: {
          advance_paid: number
          created_at: string
          customer_name: string
          customer_phone: string
          discount_amount: number
          id: string
          imei_number: string | null
          issue_description: string | null
          mobile_brand: string
          mobile_model: string
          payment_link: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          quotation: number
          repair_details: string | null
          status: Database["public"]["Enums"]["repair_status"]
          tracking_id: string
          updated_at: string
        }
        Insert: {
          advance_paid?: number
          created_at?: string
          customer_name: string
          customer_phone: string
          discount_amount?: number
          id?: string
          imei_number?: string | null
          issue_description?: string | null
          mobile_brand: string
          mobile_model: string
          payment_link?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          quotation?: number
          repair_details?: string | null
          status?: Database["public"]["Enums"]["repair_status"]
          tracking_id: string
          updated_at?: string
        }
        Update: {
          advance_paid?: number
          created_at?: string
          customer_name?: string
          customer_phone?: string
          discount_amount?: number
          id?: string
          imei_number?: string | null
          issue_description?: string | null
          mobile_brand?: string
          mobile_model?: string
          payment_link?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          quotation?: number
          repair_details?: string | null
          status?: Database["public"]["Enums"]["repair_status"]
          tracking_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      voucher_redemptions: {
        Row: {
          amount_before: number
          customer_name: string
          customer_phone: string
          discount_applied: number
          final_amount: number
          id: string
          order_tracking_id: string
          redeemed_at: string
          voucher_id: string
        }
        Insert: {
          amount_before?: number
          customer_name?: string
          customer_phone?: string
          discount_applied?: number
          final_amount?: number
          id?: string
          order_tracking_id: string
          redeemed_at?: string
          voucher_id: string
        }
        Update: {
          amount_before?: number
          customer_name?: string
          customer_phone?: string
          discount_applied?: number
          final_amount?: number
          id?: string
          order_tracking_id?: string
          redeemed_at?: string
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voucher_redemptions_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      vouchers: {
        Row: {
          created_at: string
          discount_amount: number
          discount_percentage: number
          discount_type: string
          expiry_date: string | null
          id: string
          is_used: boolean
          max_order_amount: number
          min_order_amount: number
          status: string
          tracking_id: string | null
          usage_limit: number
          used_count: number
          voucher_code: string
          voucher_name: string
          voucher_type: string
        }
        Insert: {
          created_at?: string
          discount_amount?: number
          discount_percentage?: number
          discount_type?: string
          expiry_date?: string | null
          id?: string
          is_used?: boolean
          max_order_amount?: number
          min_order_amount?: number
          status?: string
          tracking_id?: string | null
          usage_limit?: number
          used_count?: number
          voucher_code: string
          voucher_name?: string
          voucher_type?: string
        }
        Update: {
          created_at?: string
          discount_amount?: number
          discount_percentage?: number
          discount_type?: string
          expiry_date?: string | null
          id?: string
          is_used?: boolean
          max_order_amount?: number
          min_order_amount?: number
          status?: string
          tracking_id?: string | null
          usage_limit?: number
          used_count?: number
          voucher_code?: string
          voucher_name?: string
          voucher_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      booking_payment_method: "online" | "cash"
      booking_payment_status: "pending" | "paid" | "failed" | "refunded"
      booking_status:
        | "pending"
        | "confirmed"
        | "assigned"
        | "in_progress"
        | "completed"
        | "cancelled"
      device_type: "mobile" | "laptop" | "tablet" | "other"
      payment_status: "pending" | "partial" | "paid"
      repair_status:
        | "received"
        | "diagnosing"
        | "waiting_for_parts"
        | "repairing"
        | "testing"
        | "completed"
        | "delivered"
      service_type: "pickup_drop" | "doorstep" | "visit_shop"
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
      booking_payment_method: ["online", "cash"],
      booking_payment_status: ["pending", "paid", "failed", "refunded"],
      booking_status: [
        "pending",
        "confirmed",
        "assigned",
        "in_progress",
        "completed",
        "cancelled",
      ],
      device_type: ["mobile", "laptop", "tablet", "other"],
      payment_status: ["pending", "partial", "paid"],
      repair_status: [
        "received",
        "diagnosing",
        "waiting_for_parts",
        "repairing",
        "testing",
        "completed",
        "delivered",
      ],
      service_type: ["pickup_drop", "doorstep", "visit_shop"],
    },
  },
} as const
