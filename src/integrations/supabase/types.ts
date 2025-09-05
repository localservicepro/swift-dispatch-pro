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
    PostgrestVersion: "12.2.3 (519615d)"
  }
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
      customer_contacts: {
        Row: {
          contact_role: string | null
          created_at: string
          customer_id: string
          email: string | null
          first_name: string
          id: string
          is_active: boolean
          is_primary_contact: boolean
          last_name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          contact_role?: string | null
          created_at?: string
          customer_id: string
          email?: string | null
          first_name: string
          id?: string
          is_active?: boolean
          is_primary_contact?: boolean
          last_name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          contact_role?: string | null
          created_at?: string
          customer_id?: string
          email?: string | null
          first_name?: string
          id?: string
          is_active?: boolean
          is_primary_contact?: boolean
          last_name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_credits: {
        Row: {
          amount: number
          created_at: string
          created_from_return_id: string | null
          customer_id: string
          description: string | null
          expires_at: string | null
          id: string
          source_order_id: string | null
          status: string
          updated_at: string
          used_in_order_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_from_return_id?: string | null
          customer_id: string
          description?: string | null
          expires_at?: string | null
          id?: string
          source_order_id?: string | null
          status?: string
          updated_at?: string
          used_in_order_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_from_return_id?: string | null
          customer_id?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          source_order_id?: string | null
          status?: string
          updated_at?: string
          used_in_order_id?: string | null
        }
        Relationships: []
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
          business_details: Json | null
          business_name: string | null
          company_name: string | null
          contact_role: string | null
          created_at: string
          customer_type: Database["public"]["Enums"]["customer_type"]
          email: string | null
          entity_type: Database["public"]["Enums"]["entity_type"] | null
          first_name: string | null
          full_address: string | null
          id: string
          is_active: boolean
          last_name: string | null
          phone: string | null
          sms_notifications_enabled: boolean
          sms_opt_out_date: string | null
          stop_credit: boolean
          stripe_customer_id: string | null
          suburb_id: string | null
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          billing_preferences?: Json | null
          business_details?: Json | null
          business_name?: string | null
          company_name?: string | null
          contact_role?: string | null
          created_at?: string
          customer_type: Database["public"]["Enums"]["customer_type"]
          email?: string | null
          entity_type?: Database["public"]["Enums"]["entity_type"] | null
          first_name?: string | null
          full_address?: string | null
          id?: string
          is_active?: boolean
          last_name?: string | null
          phone?: string | null
          sms_notifications_enabled?: boolean
          sms_opt_out_date?: string | null
          stop_credit?: boolean
          stripe_customer_id?: string | null
          suburb_id?: string | null
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          billing_preferences?: Json | null
          business_details?: Json | null
          business_name?: string | null
          company_name?: string | null
          contact_role?: string | null
          created_at?: string
          customer_type?: Database["public"]["Enums"]["customer_type"]
          email?: string | null
          entity_type?: Database["public"]["Enums"]["entity_type"] | null
          first_name?: string | null
          full_address?: string | null
          id?: string
          is_active?: boolean
          last_name?: string | null
          phone?: string | null
          sms_notifications_enabled?: boolean
          sms_opt_out_date?: string | null
          stop_credit?: boolean
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
          admin_email: string | null
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
          admin_email?: string | null
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
          admin_email?: string | null
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
          order_id: string
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
          order_id: string
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
          order_id?: string
          paid_at?: string | null
          payment_url?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
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
      order_returns: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          order_id: string
          processed_at: string | null
          processed_by: string | null
          return_date: string
          return_notes: string | null
          return_reason: string | null
          returned_items: Json
          status: string
          total_items_returned: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          order_id: string
          processed_at?: string | null
          processed_by?: string | null
          return_date?: string
          return_notes?: string | null
          return_reason?: string | null
          returned_items?: Json
          status?: string
          total_items_returned?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          order_id?: string
          processed_at?: string | null
          processed_by?: string | null
          return_date?: string
          return_notes?: string | null
          return_reason?: string | null
          returned_items?: Json
          status?: string
          total_items_returned?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_returns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_returns_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          adjustments: number | null
          admin_id: string | null
          contact_email: string | null
          contact_id: string | null
          contact_name: string | null
          contact_phone: string | null
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
          delivery_notes: string | null
          delivery_suburb_id: string | null
          delivery_time: string | null
          driver_id: string | null
          driver_name: string | null
          ghl_opportunity_id: string | null
          id: string
          is_split_order: boolean | null
          last_synced_to_ghl: string | null
          master_order_id: string | null
          order_notes: string | null
          order_number: string
          payment_date: string | null
          payment_method: string | null
          payment_status: string | null
          pickup_contact_name: string | null
          pickup_contact_phone: string | null
          pickup_date: string | null
          pickup_instructions: string | null
          pickup_location_address: string | null
          pickup_location_name: string | null
          pickup_time: string | null
          products: Json
          products_formatted: string | null
          purchase_order: string | null
          same_as_billing: boolean | null
          special_instructions: string | null
          split_number: number | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number | null
          total_amount: number
          truck_id: string | null
          truck_registration: string | null
          truck_type: Database["public"]["Enums"]["truck_type"] | null
          truck_type_display: string | null
          updated_at: string | null
        }
        Insert: {
          adjustments?: number | null
          admin_id?: string | null
          contact_email?: string | null
          contact_id?: string | null
          contact_name?: string | null
          contact_phone?: string | null
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
          delivery_notes?: string | null
          delivery_suburb_id?: string | null
          delivery_time?: string | null
          driver_id?: string | null
          driver_name?: string | null
          ghl_opportunity_id?: string | null
          id?: string
          is_split_order?: boolean | null
          last_synced_to_ghl?: string | null
          master_order_id?: string | null
          order_notes?: string | null
          order_number: string
          payment_date?: string | null
          payment_method?: string | null
          payment_status?: string | null
          pickup_contact_name?: string | null
          pickup_contact_phone?: string | null
          pickup_date?: string | null
          pickup_instructions?: string | null
          pickup_location_address?: string | null
          pickup_location_name?: string | null
          pickup_time?: string | null
          products: Json
          products_formatted?: string | null
          purchase_order?: string | null
          same_as_billing?: boolean | null
          special_instructions?: string | null
          split_number?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number | null
          total_amount: number
          truck_id?: string | null
          truck_registration?: string | null
          truck_type?: Database["public"]["Enums"]["truck_type"] | null
          truck_type_display?: string | null
          updated_at?: string | null
        }
        Update: {
          adjustments?: number | null
          admin_id?: string | null
          contact_email?: string | null
          contact_id?: string | null
          contact_name?: string | null
          contact_phone?: string | null
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
          delivery_notes?: string | null
          delivery_suburb_id?: string | null
          delivery_time?: string | null
          driver_id?: string | null
          driver_name?: string | null
          ghl_opportunity_id?: string | null
          id?: string
          is_split_order?: boolean | null
          last_synced_to_ghl?: string | null
          master_order_id?: string | null
          order_notes?: string | null
          order_number?: string
          payment_date?: string | null
          payment_method?: string | null
          payment_status?: string | null
          pickup_contact_name?: string | null
          pickup_contact_phone?: string | null
          pickup_date?: string | null
          pickup_instructions?: string | null
          pickup_location_address?: string | null
          pickup_location_name?: string | null
          pickup_time?: string | null
          products?: Json
          products_formatted?: string | null
          purchase_order?: string | null
          same_as_billing?: boolean | null
          special_instructions?: string | null
          split_number?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number | null
          total_amount?: number
          truck_id?: string | null
          truck_registration?: string | null
          truck_type?: Database["public"]["Enums"]["truck_type"] | null
          truck_type_display?: string | null
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
            foreignKeyName: "orders_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "customer_contacts"
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
            foreignKeyName: "orders_delivery_suburb_id_fkey"
            columns: ["delivery_suburb_id"]
            isOneToOne: false
            referencedRelation: "suburbs"
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
          gst_enabled: boolean
          gst_label: string
          gst_rate: number
          id: string
          include_gst_in_prices: boolean
          service_charge_rate: number
          stripe_connection_status: string
          stripe_last_tested_at: string | null
          stripe_live_publishable_key: string | null
          stripe_live_secret_key: string | null
          stripe_mode: string
          stripe_test_publishable_key: string | null
          stripe_test_secret_key: string | null
          stripe_webhook_secret: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          currency?: string
          default_delivery_fee?: number
          gst_enabled?: boolean
          gst_label?: string
          gst_rate?: number
          id?: string
          include_gst_in_prices?: boolean
          service_charge_rate?: number
          stripe_connection_status?: string
          stripe_last_tested_at?: string | null
          stripe_live_publishable_key?: string | null
          stripe_live_secret_key?: string | null
          stripe_mode?: string
          stripe_test_publishable_key?: string | null
          stripe_test_secret_key?: string | null
          stripe_webhook_secret?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          default_delivery_fee?: number
          gst_enabled?: boolean
          gst_label?: string
          gst_rate?: number
          id?: string
          include_gst_in_prices?: boolean
          service_charge_rate?: number
          stripe_connection_status?: string
          stripe_last_tested_at?: string | null
          stripe_live_publishable_key?: string | null
          stripe_live_secret_key?: string | null
          stripe_mode?: string
          stripe_test_publishable_key?: string | null
          stripe_test_secret_key?: string | null
          stripe_webhook_secret?: string | null
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
          allows_fractional_quantities: boolean
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          parent_category_id: string | null
        }
        Insert: {
          allows_fractional_quantities?: boolean
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          parent_category_id?: string | null
        }
        Update: {
          allows_fractional_quantities?: boolean
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
      product_special_items: {
        Row: {
          category_id: string | null
          created_at: string
          id: string
          product_id: string | null
          special_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          id?: string
          product_id?: string | null
          special_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          id?: string
          product_id?: string | null
          special_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_special_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_special_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_pricing_calculated"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_special_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_special_items_special_id_fkey"
            columns: ["special_id"]
            isOneToOne: false
            referencedRelation: "product_specials"
            referencedColumns: ["id"]
          },
        ]
      }
      product_specials: {
        Row: {
          created_at: string
          created_by: string | null
          current_uses: number | null
          customer_tiers: string[] | null
          description: string | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          end_date: string
          id: string
          is_active: boolean
          maximum_uses: number | null
          minimum_quantity: number | null
          name: string
          promotional_code: string | null
          special_type: Database["public"]["Enums"]["special_type"]
          start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_uses?: number | null
          customer_tiers?: string[] | null
          description?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          end_date: string
          id?: string
          is_active?: boolean
          maximum_uses?: number | null
          minimum_quantity?: number | null
          name: string
          promotional_code?: string | null
          special_type?: Database["public"]["Enums"]["special_type"]
          start_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_uses?: number | null
          customer_tiers?: string[] | null
          description?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          end_date?: string
          id?: string
          is_active?: boolean
          maximum_uses?: number | null
          minimum_quantity?: number | null
          name?: string
          promotional_code?: string | null
          special_type?: Database["public"]["Enums"]["special_type"]
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_specials_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          images: string[] | null
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
          images?: string[] | null
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
          images?: string[] | null
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
          delivery_rate: string
          distance_km: number | null
          id: string
          is_active: boolean
          name: string
          postcode: string
          state: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_rate: string
          distance_km?: number | null
          id?: string
          is_active?: boolean
          name: string
          postcode: string
          state: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_rate?: string
          distance_km?: number | null
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
      woocommerce_category_mapping: {
        Row: {
          created_at: string
          id: string
          local_category_id: string
          woocommerce_category_id: number
          woocommerce_slug: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          local_category_id: string
          woocommerce_category_id: number
          woocommerce_slug?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          local_category_id?: string
          woocommerce_category_id?: number
          woocommerce_slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "woocommerce_category_mapping_local_category_id_fkey"
            columns: ["local_category_id"]
            isOneToOne: true
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      woocommerce_customer_mapping: {
        Row: {
          created_at: string
          id: string
          last_local_modified: string | null
          last_synced_at: string | null
          last_wc_modified: string | null
          local_customer_id: string
          sync_errors: Json | null
          sync_status: string
          updated_at: string
          woocommerce_customer_id: number
          woocommerce_email: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_local_modified?: string | null
          last_synced_at?: string | null
          last_wc_modified?: string | null
          local_customer_id: string
          sync_errors?: Json | null
          sync_status?: string
          updated_at?: string
          woocommerce_customer_id: number
          woocommerce_email?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_local_modified?: string | null
          last_synced_at?: string | null
          last_wc_modified?: string | null
          local_customer_id?: string
          sync_errors?: Json | null
          sync_status?: string
          updated_at?: string
          woocommerce_customer_id?: number
          woocommerce_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "woocommerce_customer_mapping_local_customer_id_fkey"
            columns: ["local_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      woocommerce_order_mapping: {
        Row: {
          created_at: string
          id: string
          last_local_modified: string | null
          last_synced_at: string | null
          last_wc_modified: string | null
          local_order_id: string
          sync_errors: Json | null
          sync_status: string
          updated_at: string
          woocommerce_order_id: number
          woocommerce_order_number: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_local_modified?: string | null
          last_synced_at?: string | null
          last_wc_modified?: string | null
          local_order_id: string
          sync_errors?: Json | null
          sync_status?: string
          updated_at?: string
          woocommerce_order_id: number
          woocommerce_order_number?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_local_modified?: string | null
          last_synced_at?: string | null
          last_wc_modified?: string | null
          local_order_id?: string
          sync_errors?: Json | null
          sync_status?: string
          updated_at?: string
          woocommerce_order_id?: number
          woocommerce_order_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "woocommerce_order_mapping_local_order_id_fkey"
            columns: ["local_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      woocommerce_product_mapping: {
        Row: {
          created_at: string
          id: string
          last_local_modified: string | null
          last_synced_at: string | null
          last_wc_modified: string | null
          local_product_id: string
          sync_errors: Json | null
          sync_status: string
          updated_at: string
          woocommerce_product_id: number
          woocommerce_sku: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_local_modified?: string | null
          last_synced_at?: string | null
          last_wc_modified?: string | null
          local_product_id: string
          sync_errors?: Json | null
          sync_status?: string
          updated_at?: string
          woocommerce_product_id: number
          woocommerce_sku?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_local_modified?: string | null
          last_synced_at?: string | null
          last_wc_modified?: string | null
          local_product_id?: string
          sync_errors?: Json | null
          sync_status?: string
          updated_at?: string
          woocommerce_product_id?: number
          woocommerce_sku?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "woocommerce_product_mapping_local_product_id_fkey"
            columns: ["local_product_id"]
            isOneToOne: true
            referencedRelation: "product_pricing_calculated"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "woocommerce_product_mapping_local_product_id_fkey"
            columns: ["local_product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      woocommerce_sync_logs: {
        Row: {
          categories_processed: number | null
          completed_at: string | null
          customers_created: number | null
          customers_failed: number | null
          customers_processed: number | null
          customers_updated: number | null
          direction: string
          duration_seconds: number | null
          error_details: Json | null
          id: string
          orders_created: number | null
          orders_failed: number | null
          orders_processed: number | null
          orders_updated: number | null
          products_created: number | null
          products_failed: number | null
          products_processed: number | null
          products_updated: number | null
          settings_id: string | null
          started_at: string
          status: string
          sync_type: string
          triggered_by: string | null
        }
        Insert: {
          categories_processed?: number | null
          completed_at?: string | null
          customers_created?: number | null
          customers_failed?: number | null
          customers_processed?: number | null
          customers_updated?: number | null
          direction: string
          duration_seconds?: number | null
          error_details?: Json | null
          id?: string
          orders_created?: number | null
          orders_failed?: number | null
          orders_processed?: number | null
          orders_updated?: number | null
          products_created?: number | null
          products_failed?: number | null
          products_processed?: number | null
          products_updated?: number | null
          settings_id?: string | null
          started_at?: string
          status: string
          sync_type: string
          triggered_by?: string | null
        }
        Update: {
          categories_processed?: number | null
          completed_at?: string | null
          customers_created?: number | null
          customers_failed?: number | null
          customers_processed?: number | null
          customers_updated?: number | null
          direction?: string
          duration_seconds?: number | null
          error_details?: Json | null
          id?: string
          orders_created?: number | null
          orders_failed?: number | null
          orders_processed?: number | null
          orders_updated?: number | null
          products_created?: number | null
          products_failed?: number | null
          products_processed?: number | null
          products_updated?: number | null
          settings_id?: string | null
          started_at?: string
          status?: string
          sync_type?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "woocommerce_sync_logs_settings_id_fkey"
            columns: ["settings_id"]
            isOneToOne: false
            referencedRelation: "woocommerce_sync_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      woocommerce_sync_settings: {
        Row: {
          auto_sync_enabled: boolean
          consumer_key: string
          consumer_secret: string
          created_at: string
          created_by: string | null
          customer_sync_mode: string | null
          id: string
          is_active: boolean
          last_sync_at: string | null
          order_date_filter: string | null
          order_date_from: string | null
          order_date_to: string | null
          order_status_mapping: Json | null
          order_sync_direction: string | null
          store_url: string
          sync_categories: boolean
          sync_customers: boolean | null
          sync_direction: string
          sync_frequency: string
          sync_images: boolean
          sync_inventory: boolean
          sync_orders: boolean | null
          sync_pricing: boolean
          updated_at: string
        }
        Insert: {
          auto_sync_enabled?: boolean
          consumer_key: string
          consumer_secret: string
          created_at?: string
          created_by?: string | null
          customer_sync_mode?: string | null
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          order_date_filter?: string | null
          order_date_from?: string | null
          order_date_to?: string | null
          order_status_mapping?: Json | null
          order_sync_direction?: string | null
          store_url: string
          sync_categories?: boolean
          sync_customers?: boolean | null
          sync_direction?: string
          sync_frequency?: string
          sync_images?: boolean
          sync_inventory?: boolean
          sync_orders?: boolean | null
          sync_pricing?: boolean
          updated_at?: string
        }
        Update: {
          auto_sync_enabled?: boolean
          consumer_key?: string
          consumer_secret?: string
          created_at?: string
          created_by?: string | null
          customer_sync_mode?: string | null
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          order_date_filter?: string | null
          order_date_from?: string | null
          order_date_to?: string | null
          order_status_mapping?: Json | null
          order_sync_direction?: string | null
          store_url?: string
          sync_categories?: boolean
          sync_customers?: boolean | null
          sync_direction?: string
          sync_frequency?: string
          sync_images?: boolean
          sync_inventory?: boolean
          sync_orders?: boolean | null
          sync_pricing?: boolean
          updated_at?: string
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
      apply_credit_to_order: {
        Args: {
          amount_used_param: number
          credit_id_param: string
          order_id_param: string
        }
        Returns: undefined
      }
      bulk_update_suburb_status: {
        Args: { new_status: boolean; suburb_ids: string[] }
        Returns: number
      }
      calculate_special_price: {
        Args: {
          base_price: number
          customer_tier_param?: string
          product_id_param: string
        }
        Returns: number
      }
      check_stock_availability: {
        Args: { order_items: Json }
        Returns: {
          available_stock: number
          is_sufficient: boolean
          product_id: string
          product_name: string
          requested_quantity: number
        }[]
      }
      create_credit_from_return: {
        Args: {
          amount_param: number
          customer_id_param: string
          description_param?: string
          return_id_param: string
          source_order_id_param: string
        }
        Returns: string
      }
      create_driver: {
        Args: { driver_id: string; driver_license: string; driver_name: string }
        Returns: undefined
      }
      create_single_order: {
        Args: { p_order_data: Json }
        Returns: string
      }
      create_split_order: {
        Args: { p_master_order_data: Json; p_split_orders: Json[] }
        Returns: string[]
      }
      create_stock_split_order: {
        Args: { p_order_id: string }
        Returns: string[]
      }
      deduct_inventory: {
        Args: { order_id_param: string }
        Returns: undefined
      }
      determine_order_status: {
        Args: { order_items: Json }
        Returns: Database["public"]["Enums"]["order_status"]
      }
      format_products_text: {
        Args: { products_json: Json }
        Returns: string
      }
      generate_short_order_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_active_specials_for_product: {
        Args: { customer_tier_param?: string; product_id_param: string }
        Returns: {
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          end_date: string
          special_id: string
          special_name: string
        }[]
      }
      get_back_order_summary: {
        Args: Record<PropertyKey, never>
        Returns: {
          current_stock: number
          orders_count: number
          product_id: string
          product_name: string
          total_back_ordered: number
        }[]
      }
      get_low_stock_products: {
        Args: { threshold?: number }
        Returns: {
          category_name: string
          current_stock: number
          product_id: string
          product_name: string
        }[]
      }
      get_product_price: {
        Args: {
          customer_type_param?: string
          product_id_param: string
          variant_id_param?: string
        }
        Returns: number
      }
      get_stripe_settings: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_truck_display_info: {
        Args: { truck_type_param: Database["public"]["Enums"]["truck_type"] }
        Returns: string
      }
      hard_delete_order: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      hard_delete_split_order_group: {
        Args: { p_order_id: string }
        Returns: Json
      }
      has_mixed_stock_availability: {
        Args: { order_id_param: string }
        Returns: boolean
      }
      is_current_user_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      log_admin_activity: {
        Args: {
          p_action_type: string
          p_description?: string
          p_new_values?: Json
          p_old_values?: Json
          p_target_details?: Json
          p_target_id?: string
          p_target_type: string
        }
        Returns: string
      }
      process_return: {
        Args: { return_id_param: string }
        Returns: undefined
      }
      restore_inventory: {
        Args: { order_id_param: string }
        Returns: undefined
      }
      restore_order: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      restore_split_order_group: {
        Args: { p_order_id: string }
        Returns: Json
      }
      set_primary_contact: {
        Args: { p_contact_id: string; p_customer_id: string }
        Returns: undefined
      }
      soft_delete_order: {
        Args: { p_order_id: string; p_reason?: string }
        Returns: undefined
      }
      soft_delete_split_order_group: {
        Args: { p_order_id: string; p_reason?: string }
        Returns: Json
      }
      test_stripe_connection: {
        Args: { api_key: string; is_live?: boolean }
        Returns: Json
      }
      update_order_status: {
        Args: {
          location?: Json
          new_status: Database["public"]["Enums"]["order_status"]
          notes?: string
          order_id: string
        }
        Returns: undefined
      }
      update_payment_status: {
        Args: {
          p_new_status: string
          p_order_id: string
          p_payment_date?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      attribute_type: "select" | "color" | "size" | "text" | "number"
      customer_type: "trade" | "account" | "residential"
      delivery_method: "delivery" | "pickup" | "pickup_delivery"
      discount_type: "percentage" | "fixed_amount"
      entity_type: "individual" | "business"
      order_status:
        | "requested"
        | "preparing"
        | "loading"
        | "en_route"
        | "delivered"
        | "cancelled"
        | "back_order"
        | "pickup_scheduled"
        | "pickup_in_progress"
        | "pickup_complete"
      special_type:
        | "monthly"
        | "limited_time"
        | "flash_sale"
        | "seasonal"
        | "customer_tier"
      truck_type: "small" | "medium" | "large" | "crane"
      user_role: "admin" | "driver" | "customer"
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
      attribute_type: ["select", "color", "size", "text", "number"],
      customer_type: ["trade", "account", "residential"],
      delivery_method: ["delivery", "pickup", "pickup_delivery"],
      discount_type: ["percentage", "fixed_amount"],
      entity_type: ["individual", "business"],
      order_status: [
        "requested",
        "preparing",
        "loading",
        "en_route",
        "delivered",
        "cancelled",
        "back_order",
        "pickup_scheduled",
        "pickup_in_progress",
        "pickup_complete",
      ],
      special_type: [
        "monthly",
        "limited_time",
        "flash_sale",
        "seasonal",
        "customer_tier",
      ],
      truck_type: ["small", "medium", "large", "crane"],
      user_role: ["admin", "driver", "customer"],
    },
  },
} as const
