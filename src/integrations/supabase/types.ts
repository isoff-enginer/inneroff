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
      access_codes: {
        Row: {
          code_hash: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          failed_attempts: number
          id: string
          is_active: boolean
          label: string | null
          last_failed_at: string | null
          last_used_at: string | null
          locked_until: string | null
          max_attempts: number
          rotated_at: string | null
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          failed_attempts?: number
          id?: string
          is_active?: boolean
          label?: string | null
          last_failed_at?: string | null
          last_used_at?: string | null
          locked_until?: string | null
          max_attempts?: number
          rotated_at?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          failed_attempts?: number
          id?: string
          is_active?: boolean
          label?: string | null
          last_failed_at?: string | null
          last_used_at?: string | null
          locked_until?: string | null
          max_attempts?: number
          rotated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      account_entries: {
        Row: {
          amount: number
          category_id: string
          created_at: string
          created_by: string | null
          dispatch_id: string | null
          entry_type: string
          id: string
          notes: string | null
          payment_id: string | null
          store_id: string
        }
        Insert: {
          amount: number
          category_id: string
          created_at?: string
          created_by?: string | null
          dispatch_id?: string | null
          entry_type: string
          id?: string
          notes?: string | null
          payment_id?: string | null
          store_id: string
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string
          created_by?: string | null
          dispatch_id?: string | null
          entry_type?: string
          id?: string
          notes?: string | null
          payment_id?: string | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_entries_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_entries_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_entries_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_hash: string | null
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_hash?: string | null
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_hash?: string | null
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      authorized_devices: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          device_fingerprint: string | null
          device_name: string | null
          device_public_key: string | null
          failed_auth_attempts: number
          first_seen_at: string | null
          id: string
          last_ip_hash: string | null
          last_seen_at: string | null
          locked_until: string | null
          platform: string | null
          push_token: string | null
          revoked_at: string | null
          revoked_by: string | null
          status: Database["public"]["Enums"]["device_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          device_fingerprint?: string | null
          device_name?: string | null
          device_public_key?: string | null
          failed_auth_attempts?: number
          first_seen_at?: string | null
          id?: string
          last_ip_hash?: string | null
          last_seen_at?: string | null
          locked_until?: string | null
          platform?: string | null
          push_token?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          status?: Database["public"]["Enums"]["device_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          device_fingerprint?: string | null
          device_name?: string | null
          device_public_key?: string | null
          failed_auth_attempts?: number
          first_seen_at?: string | null
          id?: string
          last_ip_hash?: string | null
          last_seen_at?: string | null
          locked_until?: string | null
          platform?: string | null
          push_token?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          status?: Database["public"]["Enums"]["device_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "authorized_devices_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "authorized_devices_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "authorized_devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_members: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          left_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          left_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          left_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          message_ttl_hours: number
          title: string | null
          type: Database["public"]["Enums"]["conversation_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          message_ttl_hours?: number
          title?: string | null
          type?: Database["public"]["Enums"]["conversation_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          message_ttl_hours?: number
          title?: string | null
          type?: Database["public"]["Enums"]["conversation_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_items: {
        Row: {
          category_id: string
          created_at: string
          dispatch_id: string
          id: string
          product_id: string
          quantity: number
          total_value: number | null
          unit_value: number
        }
        Insert: {
          category_id: string
          created_at?: string
          dispatch_id: string
          id?: string
          product_id: string
          quantity: number
          total_value?: number | null
          unit_value?: number
        }
        Update: {
          category_id?: string
          created_at?: string
          dispatch_id?: string
          id?: string
          product_id?: string
          quantity?: number
          total_value?: number | null
          unit_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_items_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatches: {
        Row: {
          created_at: string
          created_by: string | null
          dispatch_number: number
          dispatched_at: string | null
          from_factory_id: string | null
          from_location_type: Database["public"]["Enums"]["location_type"]
          from_store_id: string | null
          from_warehouse_id: string | null
          id: string
          notes: string | null
          received_at: string | null
          received_by: string | null
          status: Database["public"]["Enums"]["dispatch_status"]
          to_factory_id: string | null
          to_location_type: Database["public"]["Enums"]["location_type"]
          to_store_id: string | null
          to_warehouse_id: string | null
          total_value: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dispatch_number?: never
          dispatched_at?: string | null
          from_factory_id?: string | null
          from_location_type: Database["public"]["Enums"]["location_type"]
          from_store_id?: string | null
          from_warehouse_id?: string | null
          id?: string
          notes?: string | null
          received_at?: string | null
          received_by?: string | null
          status?: Database["public"]["Enums"]["dispatch_status"]
          to_factory_id?: string | null
          to_location_type: Database["public"]["Enums"]["location_type"]
          to_store_id?: string | null
          to_warehouse_id?: string | null
          total_value?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dispatch_number?: never
          dispatched_at?: string | null
          from_factory_id?: string | null
          from_location_type?: Database["public"]["Enums"]["location_type"]
          from_store_id?: string | null
          from_warehouse_id?: string | null
          id?: string
          notes?: string | null
          received_at?: string | null
          received_by?: string | null
          status?: Database["public"]["Enums"]["dispatch_status"]
          to_factory_id?: string | null
          to_location_type?: Database["public"]["Enums"]["location_type"]
          to_store_id?: string | null
          to_warehouse_id?: string | null
          total_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispatches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatches_from_factory_id_fkey"
            columns: ["from_factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatches_from_store_id_fkey"
            columns: ["from_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatches_from_warehouse_id_fkey"
            columns: ["from_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatches_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatches_to_factory_id_fkey"
            columns: ["to_factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatches_to_store_id_fkey"
            columns: ["to_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatches_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          approved_by: string | null
          category: string | null
          created_at: string
          created_by: string
          description: string | null
          expense_date: string
          factory_id: string | null
          id: string
          status: Database["public"]["Enums"]["expense_status"]
          store_id: string | null
          title: string
          updated_at: string
          warehouse_id: string | null
        }
        Insert: {
          amount: number
          approved_by?: string | null
          category?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          expense_date?: string
          factory_id?: string | null
          id?: string
          status?: Database["public"]["Enums"]["expense_status"]
          store_id?: string | null
          title: string
          updated_at?: string
          warehouse_id?: string | null
        }
        Update: {
          amount?: number
          approved_by?: string | null
          category?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          expense_date?: string
          factory_id?: string | null
          id?: string
          status?: Database["public"]["Enums"]["expense_status"]
          store_id?: string | null
          title?: string
          updated_at?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      factories: {
        Row: {
          address: string | null
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      factory_users: {
        Row: {
          created_at: string
          factory_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          factory_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          factory_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "factory_users_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factory_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_balances: {
        Row: {
          factory_id: string | null
          id: string
          location_type: Database["public"]["Enums"]["location_type"]
          product_id: string
          quantity: number
          store_id: string | null
          updated_at: string
          warehouse_id: string | null
        }
        Insert: {
          factory_id?: string | null
          id?: string
          location_type: Database["public"]["Enums"]["location_type"]
          product_id: string
          quantity?: number
          store_id?: string | null
          updated_at?: string
          warehouse_id?: string | null
        }
        Update: {
          factory_id?: string | null
          id?: string
          location_type?: Database["public"]["Enums"]["location_type"]
          product_id?: string
          quantity?: number
          store_id?: string | null
          updated_at?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_balances_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_balances_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_balances_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_balances_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          category_id: string
          created_at: string
          created_by: string | null
          from_factory_id: string | null
          from_location_type:
            | Database["public"]["Enums"]["location_type"]
            | null
          from_store_id: string | null
          from_warehouse_id: string | null
          id: string
          movement_type: Database["public"]["Enums"]["inventory_movement_type"]
          notes: string | null
          product_id: string
          quantity: number
          reference_id: string | null
          reference_type: string | null
          to_factory_id: string | null
          to_location_type: Database["public"]["Enums"]["location_type"] | null
          to_store_id: string | null
          to_warehouse_id: string | null
          total_value: number | null
          unit_value: number
        }
        Insert: {
          category_id: string
          created_at?: string
          created_by?: string | null
          from_factory_id?: string | null
          from_location_type?:
            | Database["public"]["Enums"]["location_type"]
            | null
          from_store_id?: string | null
          from_warehouse_id?: string | null
          id?: string
          movement_type: Database["public"]["Enums"]["inventory_movement_type"]
          notes?: string | null
          product_id: string
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          to_factory_id?: string | null
          to_location_type?: Database["public"]["Enums"]["location_type"] | null
          to_store_id?: string | null
          to_warehouse_id?: string | null
          total_value?: number | null
          unit_value?: number
        }
        Update: {
          category_id?: string
          created_at?: string
          created_by?: string | null
          from_factory_id?: string | null
          from_location_type?:
            | Database["public"]["Enums"]["location_type"]
            | null
          from_store_id?: string | null
          from_warehouse_id?: string | null
          id?: string
          movement_type?: Database["public"]["Enums"]["inventory_movement_type"]
          notes?: string | null
          product_id?: string
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          to_factory_id?: string | null
          to_location_type?: Database["public"]["Enums"]["location_type"] | null
          to_store_id?: string | null
          to_warehouse_id?: string | null
          total_value?: number | null
          unit_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_from_factory_id_fkey"
            columns: ["from_factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_from_store_id_fkey"
            columns: ["from_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_from_warehouse_id_fkey"
            columns: ["from_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_to_factory_id_fkey"
            columns: ["to_factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_to_store_id_fkey"
            columns: ["to_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      losses: {
        Row: {
          amount: number
          approved_by: string | null
          created_at: string
          created_by: string
          description: string | null
          factory_id: string | null
          id: string
          loss_date: string
          product_id: string | null
          quantity: number | null
          status: Database["public"]["Enums"]["loss_status"]
          store_id: string | null
          title: string
          updated_at: string
          warehouse_id: string | null
        }
        Insert: {
          amount: number
          approved_by?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          factory_id?: string | null
          id?: string
          loss_date?: string
          product_id?: string | null
          quantity?: number | null
          status?: Database["public"]["Enums"]["loss_status"]
          store_id?: string | null
          title: string
          updated_at?: string
          warehouse_id?: string | null
        }
        Update: {
          amount?: number
          approved_by?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          factory_id?: string | null
          id?: string
          loss_date?: string
          product_id?: string | null
          quantity?: number | null
          status?: Database["public"]["Enums"]["loss_status"]
          store_id?: string | null
          title?: string
          updated_at?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "losses_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "losses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "losses_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "losses_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "losses_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "losses_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      message_attachments: {
        Row: {
          attachment_type: Database["public"]["Enums"]["attachment_type"]
          created_at: string
          encrypted_filename: string | null
          encrypted_key: string | null
          encrypted_mime_type: string | null
          encrypted_size: number | null
          encryption_version: string | null
          expires_at: string
          id: string
          message_id: string
          storage_path: string
        }
        Insert: {
          attachment_type: Database["public"]["Enums"]["attachment_type"]
          created_at?: string
          encrypted_filename?: string | null
          encrypted_key?: string | null
          encrypted_mime_type?: string | null
          encrypted_size?: number | null
          encryption_version?: string | null
          expires_at: string
          id?: string
          message_id: string
          storage_path: string
        }
        Update: {
          attachment_type?: Database["public"]["Enums"]["attachment_type"]
          created_at?: string
          encrypted_filename?: string | null
          encrypted_key?: string | null
          encrypted_mime_type?: string | null
          encrypted_size?: number | null
          encryption_version?: string | null
          expires_at?: string
          id?: string
          message_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_key_envelopes: {
        Row: {
          created_at: string
          device_id: string
          encrypted_message_key: string
          id: string
          key_algorithm: string
          message_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          encrypted_message_key: string
          id?: string
          key_algorithm: string
          message_id: string
        }
        Update: {
          created_at?: string
          device_id?: string
          encrypted_message_key?: string
          id?: string
          key_algorithm?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_key_envelopes_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "authorized_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_key_envelopes_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          ciphertext: string | null
          conversation_id: string
          created_at: string
          encrypted_metadata: string | null
          expires_at: string
          id: string
          message_type: Database["public"]["Enums"]["message_type"]
          sender_id: string
          sent_at: string
        }
        Insert: {
          ciphertext?: string | null
          conversation_id: string
          created_at?: string
          encrypted_metadata?: string | null
          expires_at?: string
          id?: string
          message_type?: Database["public"]["Enums"]["message_type"]
          sender_id: string
          sent_at?: string
        }
        Update: {
          ciphertext?: string | null
          conversation_id?: string
          created_at?: string
          encrypted_metadata?: string | null
          expires_at?: string
          id?: string
          message_type?: Database["public"]["Enums"]["message_type"]
          sender_id?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_events: {
        Row: {
          actor_id: string | null
          body: string
          created_at: string
          data: Json
          destination_id: string | null
          destination_type: string | null
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          processed: boolean
          processed_at: string | null
          source_id: string | null
          source_type: string | null
          title: string
        }
        Insert: {
          actor_id?: string | null
          body: string
          created_at?: string
          data?: Json
          destination_id?: string | null
          destination_type?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          processed?: boolean
          processed_at?: string | null
          source_id?: string | null
          source_type?: string | null
          title: string
        }
        Update: {
          actor_id?: string | null
          body?: string
          created_at?: string
          data?: Json
          destination_id?: string | null
          destination_type?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          processed?: boolean
          processed_at?: string | null
          source_id?: string | null
          source_type?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      operational_sessions: {
        Row: {
          created_at: string
          device_id: string
          expires_at: string
          id: string
          last_activity_at: string
          revoked_at: string | null
          revoked_by: string | null
          status: Database["public"]["Enums"]["session_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          expires_at?: string
          id?: string
          last_activity_at?: string
          revoked_at?: string | null
          revoked_by?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string
          expires_at?: string
          id?: string
          last_activity_at?: string
          revoked_at?: string | null
          revoked_by?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operational_sessions_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "authorized_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_sessions_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      operations_admin_store_access: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          store_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          store_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operations_admin_store_access_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operations_admin_store_access_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operations_admin_store_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      operations_admin_stores: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          notes: string | null
          operations_admin_id: string
          revoked_at: string | null
          revoked_by: string | null
          store_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          operations_admin_id: string
          revoked_at?: string | null
          revoked_by?: string | null
          store_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          operations_admin_id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operations_admin_stores_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operations_admin_stores_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operations_admin_stores_operations_admin_id_fkey"
            columns: ["operations_admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operations_admin_stores_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operations_admin_stores_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      operations_admin_warehouse_access: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          user_id: string
          warehouse_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          user_id: string
          warehouse_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          user_id?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operations_admin_warehouse_access_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operations_admin_warehouse_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operations_admin_warehouse_access_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      operations_admin_warehouses: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          is_active: boolean
          notes: string | null
          operations_admin_id: string
          revoked_at: string | null
          revoked_by: string | null
          warehouse_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          operations_admin_id: string
          revoked_at?: string | null
          revoked_by?: string | null
          warehouse_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          operations_admin_id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operations_admin_warehouses_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operations_admin_warehouses_operations_admin_id_fkey"
            columns: ["operations_admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operations_admin_warehouses_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operations_admin_warehouses_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_allocations: {
        Row: {
          amount: number
          created_at: string
          dispatch_id: string
          id: string
          payment_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          dispatch_id: string
          id?: string
          payment_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          dispatch_id?: string
          id?: string
          payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_allocations_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          category_id: string
          collected_by: string | null
          created_at: string
          id: string
          notes: string | null
          payment_number: number
          received_at: string
          status: Database["public"]["Enums"]["payment_status"]
          store_id: string
        }
        Insert: {
          amount: number
          category_id: string
          collected_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          payment_number?: never
          received_at?: string
          status?: Database["public"]["Enums"]["payment_status"]
          store_id: string
        }
        Update: {
          amount?: number
          category_id?: string
          collected_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          payment_number?: never
          received_at?: string
          status?: Database["public"]["Enums"]["payment_status"]
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_collected_by_fkey"
            columns: ["collected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
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
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category_id: string
          cost_value: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          sku: string | null
          unit_name: string
          unit_value: number
          updated_at: string
        }
        Insert: {
          category_id: string
          cost_value?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sku?: string | null
          unit_name?: string
          unit_value?: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          cost_value?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sku?: string | null
          unit_name?: string
          unit_value?: number
          updated_at?: string
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
          avatar_url: string | null
          created_at: string
          display_name: string | null
          full_name: string
          id: string
          last_seen_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          full_name: string
          id: string
          last_seen_at?: string | null
          role: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          full_name?: string
          id?: string
          last_seen_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          is_active: boolean
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          is_active?: boolean
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          is_active?: boolean
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          amount: number
          category_id: string
          created_at: string
          id: string
          payment_id: string
          sale_date: string
          store_id: string
        }
        Insert: {
          amount: number
          category_id: string
          created_at?: string
          id?: string
          payment_id: string
          sale_date?: string
          store_id: string
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string
          id?: string
          payment_id?: string
          sale_date?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: true
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      security_events: {
        Row: {
          created_at: string
          device_id: string | null
          event_type: string
          id: string
          ip_hash: string | null
          metadata: Json
          success: boolean
          user_agent_hash: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          event_type: string
          id?: string
          ip_hash?: string | null
          metadata?: Json
          success?: boolean
          user_agent_hash?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string | null
          event_type?: string
          id?: string
          ip_hash?: string | null
          metadata?: Json
          success?: boolean
          user_agent_hash?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_events_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "authorized_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      store_accounts: {
        Row: {
          category_id: string
          id: string
          outstanding_balance: number | null
          store_id: string
          total_delivered: number
          total_paid: number
          updated_at: string
        }
        Insert: {
          category_id: string
          id?: string
          outstanding_balance?: number | null
          store_id: string
          total_delivered?: number
          total_paid?: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          id?: string
          outstanding_balance?: number | null
          store_id?: string
          total_delivered?: number
          total_paid?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_accounts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_accounts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_users: {
        Row: {
          created_at: string
          id: string
          store_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          store_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_users_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address: string | null
          code: string
          created_at: string
          id: string
          name: string
          notes: string | null
          status: Database["public"]["Enums"]["store_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          status?: Database["public"]["Enums"]["store_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["store_status"]
          updated_at?: string
        }
        Relationships: []
      }
      user_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          created_by: string
          email: string
          expires_at: string
          full_name: string
          id: string
          requested_role: Database["public"]["Enums"]["app_role"]
          status: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by: string
          email: string
          expires_at?: string
          full_name: string
          id?: string
          requested_role: Database["public"]["Enums"]["app_role"]
          status?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by?: string
          email?: string
          expires_at?: string
          full_name?: string
          id?: string
          requested_role?: Database["public"]["Enums"]["app_role"]
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_invitations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_users: {
        Row: {
          created_at: string
          id: string
          user_id: string
          warehouse_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          warehouse_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_users_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          address: string | null
          code: string
          created_at: string
          id: string
          is_active: boolean
          is_primary: boolean
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_primary?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_primary?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_main_warehouse_inventory: {
        Args: {
          p_notes?: string
          p_product_id: string
          p_quantity_delta: number
        }
        Returns: number
      }
      approve_device: { Args: { p_device_id: string }; Returns: undefined }
      assert_active_user: { Args: never; Returns: undefined }
      assign_operations_admin_store: {
        Args: { p_operations_admin_id: string; p_store_id: string }
        Returns: string
      }
      assign_operations_admin_warehouse: {
        Args: { p_operations_admin_id: string; p_warehouse_id: string }
        Returns: string
      }
      can_access_factory: { Args: { target_factory: string }; Returns: boolean }
      can_access_store: { Args: { target_store: string }; Returns: boolean }
      can_access_warehouse: {
        Args: { target_warehouse: string }
        Returns: boolean
      }
      can_create_dispatch_to_store: {
        Args: { target_store: string }
        Returns: boolean
      }
      can_manage_security: { Args: never; Returns: boolean }
      can_manage_store: { Args: { target_store: string }; Returns: boolean }
      can_operate_store: { Args: { target_store: string }; Returns: boolean }
      can_operations_admin_access_store: {
        Args: { target_store: string }
        Returns: boolean
      }
      can_operations_admin_access_warehouse: {
        Args: { target_warehouse: string }
        Returns: boolean
      }
      can_use_application: { Args: never; Returns: boolean }
      create_operational_session: {
        Args: { p_device_id: string; p_user_id: string }
        Returns: string
      }
      current_profile: {
        Args: never
        Returns: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          full_name: string
          id: string
          last_seen_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_expired_messages: { Args: never; Returns: number }
      disable_access_code: { Args: { p_user_id: string }; Returns: undefined }
      ensure_store_account: {
        Args: { target_category: string; target_store: string }
        Returns: string
      }
      expire_operational_sessions: { Args: never; Returns: number }
      get_primary_warehouse: { Args: never; Returns: string }
      has_role: {
        Args: { required_role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      is_access_code_available: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      is_active_user: { Args: never; Returns: boolean }
      is_big_mama: { Args: never; Returns: boolean }
      is_boss: { Args: never; Returns: boolean }
      is_boss_admin: { Args: never; Returns: boolean }
      is_device_authorized: { Args: { p_device_id: string }; Returns: boolean }
      is_factory: { Args: never; Returns: boolean }
      is_operational_session_valid: {
        Args: { p_session_id: string }
        Returns: boolean
      }
      is_operations_admin: { Args: never; Returns: boolean }
      is_operations_admin_for_store: {
        Args: { target_store: string }
        Returns: boolean
      }
      lock_user_access: { Args: { p_user_id: string }; Returns: undefined }
      my_accessible_store_ids: { Args: never; Returns: string[] }
      operations_admin_can_access_store: {
        Args: { target_store: string }
        Returns: boolean
      }
      operations_admin_can_access_warehouse: {
        Args: { target_warehouse: string }
        Returns: boolean
      }
      reactivate_user: { Args: { p_user_id: string }; Returns: undefined }
      receive_factory_dispatch: {
        Args: { p_dispatch_id: string }
        Returns: undefined
      }
      receive_into_main_warehouse: {
        Args: {
          p_notes?: string
          p_product_id: string
          p_quantity: number
          p_reference_id?: string
          p_reference_type?: string
          p_unit_value?: number
        }
        Returns: number
      }
      register_access_code_failure: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      register_access_code_success: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      register_device_auth_failure: {
        Args: { p_device_id: string }
        Returns: undefined
      }
      register_dispatch: { Args: { p_dispatch_id: string }; Returns: undefined }
      register_factory_dispatch: {
        Args: { p_dispatch_id: string }
        Returns: undefined
      }
      register_factory_production: {
        Args: {
          p_factory_id: string
          p_notes?: string
          p_product_id: string
          p_quantity: number
        }
        Returns: number
      }
      register_payment: {
        Args: {
          p_amount: number
          p_category_id: string
          p_notes?: string
          p_store_id: string
        }
        Returns: string
      }
      reset_access_code_attempts: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      reset_device_auth_failures: {
        Args: { p_device_id: string }
        Returns: undefined
      }
      revoke_access_code: { Args: { p_user_id: string }; Returns: undefined }
      revoke_device:
        | { Args: { p_device_id: string }; Returns: undefined }
        | {
            Args: { p_device_id: string; p_reason?: string }
            Returns: undefined
          }
      revoke_operational_session: {
        Args: { p_session_id: string }
        Returns: undefined
      }
      revoke_operations_admin_store: {
        Args: { p_assignment_id: string }
        Returns: undefined
      }
      revoke_operations_admin_warehouse: {
        Args: { p_assignment_id: string }
        Returns: undefined
      }
      revoke_user: { Args: { p_user_id: string }; Returns: undefined }
      revoke_user_access: { Args: { p_user_id: string }; Returns: undefined }
      rotate_access_code: {
        Args: { p_code_hash: string; p_expires_at?: string; p_user_id: string }
        Returns: string
      }
      run_security_cleanup: { Args: never; Returns: Json }
      set_access_code: {
        Args: {
          p_code: string
          p_expires_at?: string
          p_label?: string
          p_user_id: string
        }
        Returns: string
      }
      touch_operational_session: {
        Args: { p_session_id: string }
        Returns: undefined
      }
      verify_access_code: {
        Args: { p_code: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "boss" | "boss_admin" | "operations_admin" | "factory"
      attachment_type: "voice" | "image" | "video" | "document" | "other"
      conversation_type: "direct" | "group"
      device_status: "pending" | "active" | "revoked"
      dispatch_status:
        | "draft"
        | "pending"
        | "dispatched"
        | "received"
        | "cancelled"
      expense_status: "pending" | "approved" | "rejected"
      inventory_movement_type:
        | "production"
        | "receipt"
        | "dispatch"
        | "adjustment"
        | "loss"
        | "return"
      location_type: "factory" | "warehouse" | "store"
      loss_status: "reported" | "approved" | "rejected"
      message_type: "text" | "voice" | "image" | "file" | "system"
      payment_status: "confirmed" | "voided"
      session_status: "active" | "revoked" | "expired"
      store_status: "active" | "inactive" | "closed"
      user_status: "active" | "suspended" | "revoked"
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
      app_role: ["boss", "boss_admin", "operations_admin", "factory"],
      attachment_type: ["voice", "image", "video", "document", "other"],
      conversation_type: ["direct", "group"],
      device_status: ["pending", "active", "revoked"],
      dispatch_status: [
        "draft",
        "pending",
        "dispatched",
        "received",
        "cancelled",
      ],
      expense_status: ["pending", "approved", "rejected"],
      inventory_movement_type: [
        "production",
        "receipt",
        "dispatch",
        "adjustment",
        "loss",
        "return",
      ],
      location_type: ["factory", "warehouse", "store"],
      loss_status: ["reported", "approved", "rejected"],
      message_type: ["text", "voice", "image", "file", "system"],
      payment_status: ["confirmed", "voided"],
      session_status: ["active", "revoked", "expired"],
      store_status: ["active", "inactive", "closed"],
      user_status: ["active", "suspended", "revoked"],
    },
  },
} as const
