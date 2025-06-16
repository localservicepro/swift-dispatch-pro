export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      customers: {
        Row: {
          auth_user_id: string | null
          billing_preferences: Json | null
          created_at: string
          customer_type: string
          email: string
          first_name: string
          full_address: string
          id: string
          is_active: boolean
          last_name: string
          phone: string | null
          suburb_id: string | null
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          billing_preferences?: Json | null
          created_at?: string
          customer_type: string
          email: string
          first_name: string
          full_address: string
          id?: string
          is_active?: boolean
          last_name: string
          phone?: string | null
          suburb_id?: string | null
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          billing_preferences?: Json | null
          created_at?: string
          customer_type?: string
          email?: string
          first_name?: string
          full_address?: string
          id?: string
          is_active?: boolean
          last_name?: string
          phone?: string | null
          suburb_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_suburb_id_fkey"
            columns: ["suburb_id"]
            isOneToOne: false
            referencedRelation: "suburbs"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_photos: {
        Row: {
          driver_id: string
          id: string
          order_id: string
          photo_type: string | null
          photo_url: string
          uploaded_at: string | null
        }
        Insert: {
          driver_id: string
          id?: string
          order_id: string
          photo_type?: string | null
          photo_url: string
          uploaded_at?: string | null
        }
        Update: {
          driver_id?: string
          id?: string
          order_id?: string
          photo_type?: string | null
          photo_url?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_photos_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_photos_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_status_updates: {
        Row: {
          created_at: string | null
          driver_id: string
          id: string
          location: Json | null
          new_status: Database["public"]["Enums"]["order_status"]
          notes: string | null
          old_status: Database["public"]["Enums"]["order_status"] | null
          order_id: string
        }
        Insert: {
          created_at?: string | null
          driver_id: string
          id?: string
          location?: Json | null
          new_status: Database["public"]["Enums"]["order_status"]
          notes?: string | null
          old_status?: Database["public"]["Enums"]["order_status"] | null
          order_id: string
        }
        Update: {
          created_at?: string | null
          driver_id?: string
          id?: string
          location?: Json | null
          new_status?: Database["public"]["Enums"]["order_status"]
          notes?: string | null
          old_status?: Database["public"]["Enums"]["order_status"] | null
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_status_updates_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_status_updates_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          created_at: string
          email_type: string
          error_message: string | null
          external_id: string | null
          id: string
          recipient_email: string
          sent_at: string
          status: string
          subject: string
        }
        Insert: {
          created_at?: string
          email_type: string
          error_message?: string | null
          external_id?: string | null
          id?: string
          recipient_email: string
          sent_at?: string
          status?: string
          subject: string
        }
        Update: {
          created_at?: string
          email_type?: string
          error_message?: string | null
          external_id?: string | null
          id?: string
          recipient_email?: string
          sent_at?: string
          status?: string
          subject?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          customer_email: string
          due_date: string
          id: string
          invoice_number: string
          order_id: string | null
          paid_at: string | null
          payment_url: string | null
          status: string | null
          stripe_payment_intent_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          customer_email: string
          due_date: string
          id?: string
          invoice_number: string
          order_id?: string | null
          paid_at?: string | null
          payment_url?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          customer_email?: string
          due_date?: string
          id?: string
          invoice_number?: string
          order_id?: string | null
          paid_at?: string | null
          payment_url?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string | null
          price_adjustment: number | null
          product_id: string | null
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id?: string | null
          price_adjustment?: number | null
          product_id?: string | null
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string | null
          price_adjustment?: number | null
          product_id?: string | null
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          adjustments: number | null
          admin_id: string | null
          created_at: string | null
          customer_address: string
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          delivery_date: string | null
          delivery_fee: number | null
          delivery_time: string | null
          driver_id: string | null
          id: string
          order_number: string
          payment_date: string | null
          payment_method: string | null
          payment_status: string | null
          products: Json
          special_instructions: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number | null
          total_amount: number
          truck_type: Database["public"]["Enums"]["truck_type"] | null
          updated_at: string | null
        }
        Insert: {
          adjustments?: number | null
          admin_id?: string | null
          created_at?: string | null
          customer_address: string
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          delivery_date?: string | null
          delivery_fee?: number | null
          delivery_time?: string | null
          driver_id?: string | null
          id?: string
          order_number: string
          payment_date?: string | null
          payment_method?: string | null
          payment_status?: string | null
          products: Json
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number | null
          total_amount: number
          truck_type?: Database["public"]["Enums"]["truck_type"] | null
          updated_at?: string | null
        }
        Update: {
          adjustments?: number | null
          admin_id?: string | null
          created_at?: string | null
          customer_address?: string
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          delivery_date?: string | null
          delivery_fee?: number | null
          delivery_time?: string | null
          driver_id?: string | null
          id?: string
          order_number?: string
          payment_date?: string | null
          payment_method?: string | null
          payment_status?: string | null
          products?: Json
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number | null
          total_amount?: number
          truck_type?: Database["public"]["Enums"]["truck_type"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          parent_category_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          parent_category_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          parent_category_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          category_id: string | null
          created_at: string
          description: string | null
          dimensions: string | null
          id: string
          is_active: boolean
          name: string
          price: number
          sku: string | null
          stock_quantity: number
          updated_at: string
          weight: number | null
        }
        Insert: {
          barcode?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          dimensions?: string | null
          id?: string
          is_active?: boolean
          name: string
          price: number
          sku?: string | null
          stock_quantity?: number
          updated_at?: string
          weight?: number | null
        }
        Update: {
          barcode?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          dimensions?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          sku?: string | null
          stock_quantity?: number
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      suburbs: {
        Row: {
          created_at: string
          delivery_rate: number
          id: string
          is_active: boolean
          name: string
          postcode: string
          state: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_rate?: number
          id?: string
          is_active?: boolean
          name: string
          postcode: string
          state: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_rate?: number
          id?: string
          is_active?: boolean
          name?: string
          postcode?: string
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_driver: {
        Args: { driver_id: string; driver_name: string; driver_license: string }
        Returns: undefined
      }
      is_current_user_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      update_order_status: {
        Args: {
          order_id: string
          new_status: Database["public"]["Enums"]["order_status"]
          notes?: string
          location?: Json
        }
        Returns: undefined
      }
    }
    Enums: {
      order_status:
        | "preparing"
        | "loading"
        | "en_route"
        | "delivered"
        | "cancelled"
      truck_type: "small" | "medium" | "large" | "crane"
      user_role: "admin" | "driver" | "customer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      order_status: [
        "preparing",
        "loading",
        "en_route",
        "delivered",
        "cancelled",
      ],
      truck_type: ["small", "medium", "large", "crane"],
      user_role: ["admin", "driver", "customer"],
    },
  },
} as const
