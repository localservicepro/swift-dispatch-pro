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
      activity_logs: {
        Row: {
          action_type: string
          admin_id: string
          created_at: string
          description: string
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          target_details: Json | null
          target_id: string | null
          target_type: string
          user_agent: string | null
        }
        Insert: {
          action_type: string
          admin_id: string
          created_at?: string
          description: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          target_details?: Json | null
          target_id?: string | null
          target_type: string
          user_agent?: string | null
        }
        Update: {
          action_type?: string
          admin_id?: string
          created_at?: string
          description?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          target_details?: Json | null
          target_id?: string | null
          target_type?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_payment_methods: {
        Row: {
          card_brand: string
          card_exp_month: number
          card_exp_year: number
          card_last_four: string
          created_at: string
          customer_id: string
          id: string
          is_active: boolean
          is_default: boolean
          stripe_customer_id: string
          stripe_payment_method_id: string
          updated_at: string
        }
        Insert: {
          card_brand: string
          card_exp_month: number
          card_exp_year: number
          card_last_four: string
          created_at?: string
          customer_id: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          stripe_customer_id: string
          stripe_payment_method_id: string
          updated_at?: string
        }
        Update: {
          card_brand?: string
          card_exp_month?: number
          card_exp_year?: number
          card_last_four?: string
          created_at?: string
          customer_id?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          stripe_customer_id?: string
          stripe_payment_method_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_payment_methods_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_pricing_tiers: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          customer_id: string
          id: string
          is_active: boolean
          pricing_tier_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          customer_id: string
          id?: string
          is_active?: boolean
          pricing_tier_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          customer_id?: string
          id?: string
          is_active?: boolean
          pricing_tier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_pricing_tiers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_pricing_tiers_pricing_tier_id_fkey"
            columns: ["pricing_tier_id"]
            isOneToOne: false
            referencedRelation: "pricing_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          auth_user_id: string | null
          billing_preferences: Json | null
          created_at: string
          customer_type: string
          email: string
          first_name: string
          full_address: string
          ghl_contact_id: string | null
          id: string
          is_active: boolean
          last_name: string
          last_synced_to_ghl: string | null
          phone: string | null
          sms_notifications_enabled: boolean
          sms_opt_out_date: string | null
          stripe_customer_id: string | null
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
          ghl_contact_id?: string | null
          id?: string
          is_active?: boolean
          last_name: string
          last_synced_to_ghl?: string | null
          phone?: string | null
          sms_notifications_enabled?: boolean
          sms_opt_out_date?: string | null
          stripe_customer_id?: string | null
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
          ghl_contact_id?: string | null
          id?: string
          is_active?: boolean
          last_name?: string
          last_synced_to_ghl?: string | null
          phone?: string | null
          sms_notifications_enabled?: boolean
          sms_opt_out_date?: string | null
          stripe_customer_id?: string | null
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
      delivery_routes: {
        Row: {
          actual_distance: number | null
          actual_duration: number | null
          created_at: string
          driver_id: string
          estimated_distance: number | null
          estimated_duration: number | null
          id: string
          order_id: string
          route_data: Json
          status: string | null
          updated_at: string
          waypoints: Json
        }
        Insert: {
          actual_distance?: number | null
          actual_duration?: number | null
          created_at?: string
          driver_id: string
          estimated_distance?: number | null
          estimated_duration?: number | null
          id?: string
          order_id: string
          route_data: Json
          status?: string | null
          updated_at?: string
          waypoints: Json
        }
        Update: {
          actual_distance?: number | null
          actual_duration?: number | null
          created_at?: string
          driver_id?: string
          estimated_distance?: number | null
          estimated_duration?: number | null
          id?: string
          order_id?: string
          route_data?: Json
          status?: string | null
          updated_at?: string
          waypoints?: Json
        }
        Relationships: [
          {
            foreignKeyName: "delivery_routes_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_routes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_status_updates: {
        Row: {
          accuracy: number | null
          created_at: string | null
          driver_id: string
          gps_coordinates: Json | null
          heading: number | null
          id: string
          location: Json | null
          new_status: Database["public"]["Enums"]["order_status"]
          notes: string | null
          old_status: Database["public"]["Enums"]["order_status"] | null
          order_id: string
          speed: number | null
        }
        Insert: {
          accuracy?: number | null
          created_at?: string | null
          driver_id: string
          gps_coordinates?: Json | null
          heading?: number | null
          id?: string
          location?: Json | null
          new_status: Database["public"]["Enums"]["order_status"]
          notes?: string | null
          old_status?: Database["public"]["Enums"]["order_status"] | null
          order_id: string
          speed?: number | null
        }
        Update: {
          accuracy?: number | null
          created_at?: string | null
          driver_id?: string
          gps_coordinates?: Json | null
          heading?: number | null
          id?: string
          location?: Json | null
          new_status?: Database["public"]["Enums"]["order_status"]
          notes?: string | null
          old_status?: Database["public"]["Enums"]["order_status"] | null
          order_id?: string
          speed?: number | null
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
      driver_locations: {
        Row: {
          accuracy: number | null
          created_at: string
          driver_id: string
          heading: number | null
          id: string
          latitude: number
          longitude: number
          order_id: string | null
          speed: number | null
          timestamp: string
        }
        Insert: {
          accuracy?: number | null
          created_at?: string
          driver_id: string
          heading?: number | null
          id?: string
          latitude: number
          longitude: number
          order_id?: string | null
          speed?: number | null
          timestamp?: string
        }
        Update: {
          accuracy?: number | null
          created_at?: string
          driver_id?: string
          heading?: number | null
          id?: string
          latitude?: number
          longitude?: number
          order_id?: string | null
          speed?: number | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_locations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_locations_order_id_fkey"
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
      email_settings: {
        Row: {
          connection_status: string
          created_at: string
          email_provider: string
          id: string
          last_tested_at: string | null
          reply_to_email: string | null
          resend_api_key: string | null
          sender_email: string
          sender_name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          connection_status?: string
          created_at?: string
          email_provider?: string
          id?: string
          last_tested_at?: string | null
          reply_to_email?: string | null
          resend_api_key?: string | null
          sender_email?: string
          sender_name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          connection_status?: string
          created_at?: string
          email_provider?: string
          id?: string
          last_tested_at?: string | null
          reply_to_email?: string | null
          resend_api_key?: string | null
          sender_email?: string
          sender_name?: string
          updated_at?: string
          updated_by?: string | null
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
            referencedRelation: "product_pricing_calculated"
            referencedColumns: ["product_id"]
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
          deleted_at: string | null
          deleted_by: string | null
          delivery_address: string
          delivery_date: string | null
          delivery_fee: number | null
          delivery_method: Database["public"]["Enums"]["delivery_method"] | null
          delivery_time: string | null
          driver_id: string | null
          ghl_opportunity_id: string | null
          id: string
          is_split_order: boolean | null
          last_synced_to_ghl: string | null
          master_order_id: string | null
          order_number: string
          payment_date: string | null
          payment_method: string | null
          payment_status: string | null
          products: Json
          same_as_billing: boolean | null
          special_instructions: string | null
          split_number: number | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number | null
          total_amount: number
          truck_id: string | null
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
          deleted_at?: string | null
          deleted_by?: string | null
          delivery_address: string
          delivery_date?: string | null
          delivery_fee?: number | null
          delivery_method?:
            | Database["public"]["Enums"]["delivery_method"]
            | null
          delivery_time?: string | null
          driver_id?: string | null
          ghl_opportunity_id?: string | null
          id?: string
          is_split_order?: boolean | null
          last_synced_to_ghl?: string | null
          master_order_id?: string | null
          order_number: string
          payment_date?: string | null
          payment_method?: string | null
          payment_status?: string | null
          products: Json
          same_as_billing?: boolean | null
          special_instructions?: string | null
          split_number?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number | null
          total_amount: number
          truck_id?: string | null
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
          deleted_at?: string | null
          deleted_by?: string | null
          delivery_address?: string
          delivery_date?: string | null
          delivery_fee?: number | null
          delivery_method?:
            | Database["public"]["Enums"]["delivery_method"]
            | null
          delivery_time?: string | null
          driver_id?: string | null
          ghl_opportunity_id?: string | null
          id?: string
          is_split_order?: boolean | null
          last_synced_to_ghl?: string | null
          master_order_id?: string | null
          order_number?: string
          payment_date?: string | null
          payment_method?: string | null
          payment_status?: string | null
          products?: Json
          same_as_billing?: boolean | null
          special_instructions?: string | null
          split_number?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number | null
          total_amount?: number
          truck_id?: string | null
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
            foreignKeyName: "orders_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_master_order_id_fkey"
            columns: ["master_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_settings: {
        Row: {
          created_at: string
          currency: string
          default_delivery_fee: number
          gst_label: string
          gst_rate: number
          id: string
          include_gst_in_prices: boolean
          service_charge_rate: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          currency?: string
          default_delivery_fee?: number
          gst_label?: string
          gst_rate?: number
          id?: string
          include_gst_in_prices?: boolean
          service_charge_rate?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          default_delivery_fee?: number
          gst_label?: string
          gst_rate?: number
          id?: string
          include_gst_in_prices?: boolean
          service_charge_rate?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      pricing_tiers: {
        Row: {
          created_at: string
          description: string | null
          discount_percentage: number | null
          display_name: string
          id: string
          is_active: boolean
          is_default: boolean
          is_markup: boolean | null
          name: string
          percentage_adjustment: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_percentage?: number | null
          display_name: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          is_markup?: boolean | null
          name: string
          percentage_adjustment?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_percentage?: number | null
          display_name?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          is_markup?: boolean | null
          name?: string
          percentage_adjustment?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      product_attribute_values: {
        Row: {
          attribute_id: string
          created_at: string
          display_value: string
          hex_color: string | null
          id: string
          is_active: boolean
          sort_order: number
          value: string
        }
        Insert: {
          attribute_id: string
          created_at?: string
          display_value: string
          hex_color?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number
          value: string
        }
        Update: {
          attribute_id?: string
          created_at?: string
          display_value?: string
          hex_color?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_attribute_values_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "product_attributes"
            referencedColumns: ["id"]
          },
        ]
      }
      product_attributes: {
        Row: {
          attribute_type: Database["public"]["Enums"]["attribute_type"]
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          is_required: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          attribute_type?: Database["public"]["Enums"]["attribute_type"]
          created_at?: string
          display_name: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          attribute_type?: Database["public"]["Enums"]["attribute_type"]
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
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
      product_pricing: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          max_quantity: number | null
          min_quantity: number | null
          price: number
          pricing_tier_id: string
          product_id: string | null
          updated_at: string
          valid_from: string | null
          valid_to: string | null
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          max_quantity?: number | null
          min_quantity?: number | null
          price: number
          pricing_tier_id: string
          product_id?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          max_quantity?: number | null
          min_quantity?: number | null
          price?: number
          pricing_tier_id?: string
          product_id?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_pricing_pricing_tier_id_fkey"
            columns: ["pricing_tier_id"]
            isOneToOne: false
            referencedRelation: "pricing_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_pricing_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_pricing_calculated"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_pricing_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_pricing_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_pricing_calculated"
            referencedColumns: ["variant_id"]
          },
          {
            foreignKeyName: "product_pricing_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variant_attributes: {
        Row: {
          attribute_id: string
          attribute_value_id: string
          created_at: string
          id: string
          variant_id: string
        }
        Insert: {
          attribute_id: string
          attribute_value_id: string
          created_at?: string
          id?: string
          variant_id: string
        }
        Update: {
          attribute_id?: string
          attribute_value_id?: string
          created_at?: string
          id?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variant_attributes_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "product_attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variant_attributes_attribute_value_id_fkey"
            columns: ["attribute_value_id"]
            isOneToOne: false
            referencedRelation: "product_attribute_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variant_attributes_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_pricing_calculated"
            referencedColumns: ["variant_id"]
          },
          {
            foreignKeyName: "product_variant_attributes_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          price_adjustment: number
          product_id: string
          sku: string | null
          stock_quantity: number
          updated_at: string
          variant_name: string | null
          weight_adjustment: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          price_adjustment?: number
          product_id: string
          sku?: string | null
          stock_quantity?: number
          updated_at?: string
          variant_name?: string | null
          weight_adjustment?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          price_adjustment?: number
          product_id?: string
          sku?: string | null
          stock_quantity?: number
          updated_at?: string
          variant_name?: string | null
          weight_adjustment?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_pricing_calculated"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
          images: string[]
          is_active: boolean
          name: string
          price: number
          product_type: string
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
          images?: string[]
          is_active?: boolean
          name: string
          price: number
          product_type?: string
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
          images?: string[]
          is_active?: boolean
          name?: string
          price?: number
          product_type?: string
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
      stripe_settings: {
        Row: {
          connection_status: string
          created_at: string
          id: string
          is_live_mode: boolean
          last_tested_at: string | null
          live_publishable_key: string | null
          live_secret_key: string | null
          test_publishable_key: string | null
          test_secret_key: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          connection_status?: string
          created_at?: string
          id?: string
          is_live_mode?: boolean
          last_tested_at?: string | null
          live_publishable_key?: string | null
          live_secret_key?: string | null
          test_publishable_key?: string | null
          test_secret_key?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          connection_status?: string
          created_at?: string
          id?: string
          is_live_mode?: boolean
          last_tested_at?: string | null
          live_publishable_key?: string | null
          live_secret_key?: string | null
          test_publishable_key?: string | null
          test_secret_key?: string | null
          updated_at?: string
          updated_by?: string | null
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
      trucks: {
        Row: {
          capacity_tons: number | null
          created_at: string
          fuel_type: string | null
          id: string
          is_active: boolean
          last_maintenance_date: string | null
          next_maintenance_due: string | null
          notes: string | null
          registration_number: string
          status: string
          truck_type: Database["public"]["Enums"]["truck_type"]
          updated_at: string
          year_manufactured: number | null
        }
        Insert: {
          capacity_tons?: number | null
          created_at?: string
          fuel_type?: string | null
          id?: string
          is_active?: boolean
          last_maintenance_date?: string | null
          next_maintenance_due?: string | null
          notes?: string | null
          registration_number: string
          status?: string
          truck_type: Database["public"]["Enums"]["truck_type"]
          updated_at?: string
          year_manufactured?: number | null
        }
        Update: {
          capacity_tons?: number | null
          created_at?: string
          fuel_type?: string | null
          id?: string
          is_active?: boolean
          last_maintenance_date?: string | null
          next_maintenance_due?: string | null
          notes?: string | null
          registration_number?: string
          status?: string
          truck_type?: Database["public"]["Enums"]["truck_type"]
          updated_at?: string
          year_manufactured?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      product_pricing_calculated: {
        Row: {
          account_price: number | null
          base_price: number | null
          name: string | null
          price_adjustment: number | null
          product_id: string | null
          trade_price: number | null
          variant_base_price: number | null
          variant_id: string | null
          variant_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      create_driver: {
        Args: { driver_id: string; driver_name: string; driver_license: string }
        Returns: undefined
      }
      get_product_price: {
        Args: {
          product_id_param: string
          variant_id_param?: string
          customer_type_param?: string
        }
        Returns: number
      }
      is_current_user_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      log_admin_activity: {
        Args:
          | Record<PropertyKey, never>
          | {
              p_action_type: string
              p_target_type: string
              p_target_id?: string
              p_target_details?: Json
              p_old_values?: Json
              p_new_values?: Json
              p_description?: string
            }
        Returns: string
      }
      restore_order: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      soft_delete_order: {
        Args: { p_order_id: string; p_reason?: string }
        Returns: undefined
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
      attribute_type: "select" | "color" | "size" | "text" | "number"
      delivery_method: "delivery" | "pickup"
      order_status:
        | "requested"
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
      attribute_type: ["select", "color", "size", "text", "number"],
      delivery_method: ["delivery", "pickup"],
      order_status: [
        "requested",
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
