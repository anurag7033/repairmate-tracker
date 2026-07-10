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
          latitude: number | null
          longitude: number | null
          payment_method: Database["public"]["Enums"]["booking_payment_method"]
          payment_status: Database["public"]["Enums"]["booking_payment_status"]
          pincode: string
          preferred_date: string | null
          preferred_time_slot: string | null
          razorpay_payment_id: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          status: Database["public"]["Enums"]["booking_status"]
          terms_accepted: boolean
          tracking_id: string | null
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
          latitude?: number | null
          longitude?: number | null
          payment_method?: Database["public"]["Enums"]["booking_payment_method"]
          payment_status?: Database["public"]["Enums"]["booking_payment_status"]
          pincode: string
          preferred_date?: string | null
          preferred_time_slot?: string | null
          razorpay_payment_id?: string | null
          service_type?: Database["public"]["Enums"]["service_type"]
          status?: Database["public"]["Enums"]["booking_status"]
          terms_accepted?: boolean
          tracking_id?: string | null
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
          latitude?: number | null
          longitude?: number | null
          payment_method?: Database["public"]["Enums"]["booking_payment_method"]
          payment_status?: Database["public"]["Enums"]["booking_payment_status"]
          pincode?: string
          preferred_date?: string | null
          preferred_time_slot?: string | null
          razorpay_payment_id?: string | null
          service_type?: Database["public"]["Enums"]["service_type"]
          status?: Database["public"]["Enums"]["booking_status"]
          terms_accepted?: boolean
          tracking_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      customer_order_items: {
        Row: {
          created_at: string
          id: string
          line_total: number
          order_id: string
          product_code: string
          product_id: string | null
          product_name: string
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          line_total: number
          order_id: string
          product_code: string
          product_id?: string | null
          product_name: string
          quantity: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          line_total?: number
          order_id?: string
          product_code?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "customer_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "customer_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_orders: {
        Row: {
          admin_notes: string | null
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string
          delivery_address: string
          discount_amount: number
          grand_total: number
          id: string
          order_id: string
          order_status: string
          payment_method: string
          payment_status: string
          subtotal: number
          updated_at: string
          voucher_code: string | null
          voucher_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          delivery_address: string
          discount_amount?: number
          grand_total?: number
          id?: string
          order_id?: string
          order_status?: string
          payment_method: string
          payment_status?: string
          subtotal?: number
          updated_at?: string
          voucher_code?: string | null
          voucher_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          delivery_address?: string
          discount_amount?: number
          grand_total?: number
          id?: string
          order_id?: string
          order_status?: string
          payment_method?: string
          payment_status?: string
          subtotal?: number
          updated_at?: string
          voucher_code?: string | null
          voucher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_orders_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_requirements: {
        Row: {
          admin_notes: string | null
          created_at: string
          customer_name: string
          customer_phone: string
          id: string
          items: Json
          notes: string | null
          requirement_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          customer_name: string
          customer_phone: string
          id?: string
          items?: Json
          notes?: string | null
          requirement_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          customer_name?: string
          customer_phone?: string
          id?: string
          items?: Json
          notes?: string | null
          requirement_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string
          phone_normalized: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone: string
          phone_normalized: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          phone_normalized?: string
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          brand: string
          category: string
          created_at: string
          description: string
          discount_type: string
          discount_value: number
          final_price: number
          id: string
          image_url: string | null
          low_stock_threshold: number
          name: string
          product_code: string
          purchase_price: number
          selling_price: number
          status: string
          stock_quantity: number
          updated_at: string
        }
        Insert: {
          brand?: string
          category?: string
          created_at?: string
          description?: string
          discount_type?: string
          discount_value?: number
          final_price?: number
          id?: string
          image_url?: string | null
          low_stock_threshold?: number
          name: string
          product_code: string
          purchase_price?: number
          selling_price?: number
          status?: string
          stock_quantity?: number
          updated_at?: string
        }
        Update: {
          brand?: string
          category?: string
          created_at?: string
          description?: string
          discount_type?: string
          discount_value?: number
          final_price?: number
          id?: string
          image_url?: string | null
          low_stock_threshold?: number
          name?: string
          product_code?: string
          purchase_price?: number
          selling_price?: number
          status?: string
          stock_quantity?: number
          updated_at?: string
        }
        Relationships: []
      }
      repair_orders: {
        Row: {
          admin_discount: number
          advance_paid: number
          created_at: string
          customer_id: string | null
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
          pending_payment_received: number
          quotation: number
          repair_details: string | null
          status: Database["public"]["Enums"]["repair_status"]
          tracking_id: string
          updated_at: string
        }
        Insert: {
          admin_discount?: number
          advance_paid?: number
          created_at?: string
          customer_id?: string | null
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
          pending_payment_received?: number
          quotation?: number
          repair_details?: string | null
          status?: Database["public"]["Enums"]["repair_status"]
          tracking_id: string
          updated_at?: string
        }
        Update: {
          admin_discount?: number
          advance_paid?: number
          created_at?: string
          customer_id?: string | null
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
          pending_payment_received?: number
          quotation?: number
          repair_details?: string | null
          status?: Database["public"]["Enums"]["repair_status"]
          tracking_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "repair_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_invoice_items: {
        Row: {
          created_at: string
          discount: number
          id: string
          invoice_id: string
          line_total: number
          product_code: string
          product_id: string | null
          product_name: string
          profit_per_unit: number
          purchase_price: number
          quantity: number
          returned_quantity: number
          total_profit: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          discount?: number
          id?: string
          invoice_id: string
          line_total?: number
          product_code: string
          product_id?: string | null
          product_name: string
          profit_per_unit?: number
          purchase_price?: number
          quantity?: number
          returned_quantity?: number
          total_profit?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          discount?: number
          id?: string
          invoice_id?: string
          line_total?: number
          product_code?: string
          product_id?: string | null
          product_name?: string
          profit_per_unit?: number
          purchase_price?: number
          quantity?: number
          returned_quantity?: number
          total_profit?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "sales_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_invoice_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          new_balance: number
          note: string | null
          payment_method: string | null
          previous_balance: number
          updated_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          new_balance: number
          note?: string | null
          payment_method?: string | null
          previous_balance: number
          updated_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          new_balance?: number
          note?: string | null
          payment_method?: string | null
          previous_balance?: number
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_invoice_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "sales_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_invoice_return_items: {
        Row: {
          created_at: string
          id: string
          invoice_item_id: string | null
          product_code: string
          product_id: string | null
          product_name: string
          quantity: number
          refund_amount: number
          restock: boolean
          return_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_item_id?: string | null
          product_code: string
          product_id?: string | null
          product_name: string
          quantity: number
          refund_amount?: number
          restock?: boolean
          return_id: string
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          invoice_item_id?: string | null
          product_code?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          refund_amount?: number
          restock?: boolean
          return_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_invoice_return_items_invoice_item_id_fkey"
            columns: ["invoice_item_id"]
            isOneToOne: false
            referencedRelation: "sales_invoice_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoice_return_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoice_return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "sales_invoice_returns"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_invoice_returns: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          invoice_id: string
          reason: string | null
          refund_amount: number
          refund_method: string | null
          restock: boolean
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id: string
          reason?: string | null
          refund_amount?: number
          refund_method?: string | null
          restock?: boolean
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string
          reason?: string | null
          refund_amount?: number
          refund_method?: string | null
          restock?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "sales_invoice_returns_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "sales_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_invoices: {
        Row: {
          amount_received: number
          change_returned: number
          created_at: string
          customer_address: string | null
          customer_alt_phone: string | null
          customer_email: string | null
          customer_gst: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string
          grand_total: number
          gst_amount: number
          gst_percent: number
          id: string
          invoice_discount: number
          invoice_number: string
          notes: string | null
          payment_method: Database["public"]["Enums"]["sales_payment_method"]
          payment_status: Database["public"]["Enums"]["sales_payment_status"]
          product_discount_total: number
          remaining_amount: number
          subtotal: number
          total_profit: number
          total_purchase_cost: number
          total_returned: number
          updated_at: string
        }
        Insert: {
          amount_received?: number
          change_returned?: number
          created_at?: string
          customer_address?: string | null
          customer_alt_phone?: string | null
          customer_email?: string | null
          customer_gst?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone: string
          grand_total?: number
          gst_amount?: number
          gst_percent?: number
          id?: string
          invoice_discount?: number
          invoice_number?: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["sales_payment_method"]
          payment_status?: Database["public"]["Enums"]["sales_payment_status"]
          product_discount_total?: number
          remaining_amount?: number
          subtotal?: number
          total_profit?: number
          total_purchase_cost?: number
          total_returned?: number
          updated_at?: string
        }
        Update: {
          amount_received?: number
          change_returned?: number
          created_at?: string
          customer_address?: string | null
          customer_alt_phone?: string | null
          customer_email?: string | null
          customer_gst?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string
          grand_total?: number
          gst_amount?: number
          gst_percent?: number
          id?: string
          invoice_discount?: number
          invoice_number?: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["sales_payment_method"]
          payment_status?: Database["public"]["Enums"]["sales_payment_status"]
          product_discount_total?: number
          remaining_amount?: number
          subtotal?: number
          total_profit?: number
          total_purchase_cost?: number
          total_returned?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
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
      apply_voucher_public: {
        Args: { p_tracking_id: string; p_voucher_code: string }
        Returns: Json
      }
      apply_voucher_to_customer_order: {
        Args: { p_phone: string; p_subtotal: number; p_voucher_code: string }
        Returns: Json
      }
      generate_customer_order_id: { Args: never; Returns: string }
      generate_requirement_id: { Args: never; Returns: string }
      generate_sales_invoice_number: { Args: never; Returns: string }
      get_booking_by_id: {
        Args: { p_booking_id: string }
        Returns: {
          booking_id: string
          city: string
          created_at: string
          customer_name: string
          device_brand: string
          device_model: string
          device_type: Database["public"]["Enums"]["device_type"]
          id: string
          issue_description: string
          issue_type: string
          pincode: string
          preferred_date: string
          preferred_time_slot: string
          service_type: Database["public"]["Enums"]["service_type"]
          status: Database["public"]["Enums"]["booking_status"]
          tracking_id: string
          updated_at: string
        }[]
      }
      get_customers_with_stats: {
        Args: never
        Returns: {
          address: string
          created_at: string
          email: string
          id: string
          last_visit: string
          name: string
          notes: string
          pending_repairs: number
          phone: string
          total_repairs: number
          total_spent: number
          updated_at: string
        }[]
      }
      get_repair_by_tracking: {
        Args: { p_tracking_id: string }
        Returns: {
          admin_discount: number
          advance_paid: number
          created_at: string
          customer_name: string
          discount_amount: number
          id: string
          issue_description: string
          mobile_brand: string
          mobile_model: string
          payment_link: string
          payment_status: Database["public"]["Enums"]["payment_status"]
          pending_payment_received: number
          quotation: number
          repair_details: string
          status: Database["public"]["Enums"]["repair_status"]
          tracking_id: string
          updated_at: string
        }[]
      }
      mark_received_public: { Args: { p_tracking_id: string }; Returns: Json }
      normalize_phone: { Args: { p: string }; Returns: string }
      remove_voucher_public: {
        Args: { p_tracking_id: string }
        Returns: undefined
      }
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
        | "returned"
      sales_payment_method: "cash" | "upi" | "card" | "bank_transfer" | "mixed"
      sales_payment_status: "paid" | "partial" | "pending"
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
        "returned",
      ],
      sales_payment_method: ["cash", "upi", "card", "bank_transfer", "mixed"],
      sales_payment_status: ["paid", "partial", "pending"],
      service_type: ["pickup_drop", "doorstep", "visit_shop"],
    },
  },
} as const
