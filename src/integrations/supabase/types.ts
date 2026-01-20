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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      analysis_report_counters: {
        Row: {
          created_at: string | null
          current_value: number
          id: string
          prefix: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_value?: number
          id?: string
          prefix: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_value?: number
          id?: string
          prefix?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      analysis_reports: {
        Row: {
          analysis_data: Json
          created_at: string | null
          id: string
          input_summary: string | null
          sequence_number: string
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          analysis_data: Json
          created_at?: string | null
          id?: string
          input_summary?: string | null
          sequence_number: string
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          analysis_data?: Json
          created_at?: string | null
          id?: string
          input_summary?: string | null
          sequence_number?: string
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      approval_audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          performed_by: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          performed_by?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          performed_by?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      approval_matrix_versions: {
        Row: {
          change_summary: string | null
          changed_by: string | null
          created_at: string
          id: string
          snapshot: Json
          version_number: number
        }
        Insert: {
          change_summary?: string | null
          changed_by?: string | null
          created_at?: string
          id?: string
          snapshot: Json
          version_number: number
        }
        Update: {
          change_summary?: string | null
          changed_by?: string | null
          created_at?: string
          id?: string
          snapshot?: Json
          version_number?: number
        }
        Relationships: []
      }
      approval_overrides: {
        Row: {
          bypass_levels: number[] | null
          category: Database["public"]["Enums"]["approval_category"] | null
          conditions: Json
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          max_amount: number | null
          name_ar: string
          name_en: string
          override_type: Database["public"]["Enums"]["override_type"]
          require_justification: boolean
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          bypass_levels?: number[] | null
          category?: Database["public"]["Enums"]["approval_category"] | null
          conditions?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          max_amount?: number | null
          name_ar: string
          name_en: string
          override_type: Database["public"]["Enums"]["override_type"]
          require_justification?: boolean
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          bypass_levels?: number[] | null
          category?: Database["public"]["Enums"]["approval_category"] | null
          conditions?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          max_amount?: number | null
          name_ar?: string
          name_en?: string
          override_type?: Database["public"]["Enums"]["override_type"]
          require_justification?: boolean
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      approval_roles: {
        Row: {
          code: string
          created_at: string
          description: string | null
          hierarchy_level: number
          id: string
          is_active: boolean
          name_ar: string
          name_en: string
          permissions: Json | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          hierarchy_level?: number
          id?: string
          is_active?: boolean
          name_ar: string
          name_en: string
          permissions?: Json | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          hierarchy_level?: number
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string
          permissions?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      approval_rule_approvers: {
        Row: {
          approval_role_id: string
          can_delegate: boolean
          created_at: string
          id: string
          is_mandatory: boolean
          rule_id: string
          sequence_order: number
        }
        Insert: {
          approval_role_id: string
          can_delegate?: boolean
          created_at?: string
          id?: string
          is_mandatory?: boolean
          rule_id: string
          sequence_order?: number
        }
        Update: {
          approval_role_id?: string
          can_delegate?: boolean
          created_at?: string
          id?: string
          is_mandatory?: boolean
          rule_id?: string
          sequence_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "approval_rule_approvers_approval_role_id_fkey"
            columns: ["approval_role_id"]
            isOneToOne: false
            referencedRelation: "approval_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_rule_approvers_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "approval_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_rules: {
        Row: {
          auto_approve_below: number | null
          category: Database["public"]["Enums"]["approval_category"]
          conditions: Json | null
          created_at: string
          created_by: string | null
          currency: string
          department_id: string | null
          escalation_hours: number | null
          id: string
          is_active: boolean
          max_amount: number | null
          metadata: Json | null
          min_amount: number
          name_ar: string
          name_en: string
          requires_sequential: boolean
          updated_at: string
          version: number
        }
        Insert: {
          auto_approve_below?: number | null
          category: Database["public"]["Enums"]["approval_category"]
          conditions?: Json | null
          created_at?: string
          created_by?: string | null
          currency?: string
          department_id?: string | null
          escalation_hours?: number | null
          id?: string
          is_active?: boolean
          max_amount?: number | null
          metadata?: Json | null
          min_amount?: number
          name_ar: string
          name_en: string
          requires_sequential?: boolean
          updated_at?: string
          version?: number
        }
        Update: {
          auto_approve_below?: number | null
          category?: Database["public"]["Enums"]["approval_category"]
          conditions?: Json | null
          created_at?: string
          created_by?: string | null
          currency?: string
          department_id?: string | null
          escalation_hours?: number | null
          id?: string
          is_active?: boolean
          max_amount?: number | null
          metadata?: Json | null
          min_amount?: number
          name_ar?: string
          name_en?: string
          requires_sequential?: boolean
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "approval_rules_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_thresholds: {
        Row: {
          approver_role: string
          approver_role_ar: string
          created_at: string
          id: string
          is_active: boolean
          max_amount: number | null
          min_amount: number
          module: string
          sequence_order: number
          updated_at: string
        }
        Insert: {
          approver_role: string
          approver_role_ar: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_amount?: number | null
          min_amount?: number
          module: string
          sequence_order?: number
          updated_at?: string
        }
        Update: {
          approver_role?: string
          approver_role_ar?: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_amount?: number | null
          min_amount?: number
          module?: string
          sequence_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      approval_workflow_actions: {
        Row: {
          acted_at: string | null
          approval_role_id: string | null
          approver_id: string | null
          comments: string | null
          created_at: string
          delegated_from: string | null
          id: string
          rejection_reason: string | null
          sequence_order: number
          status: Database["public"]["Enums"]["approval_status"]
          workflow_id: string
        }
        Insert: {
          acted_at?: string | null
          approval_role_id?: string | null
          approver_id?: string | null
          comments?: string | null
          created_at?: string
          delegated_from?: string | null
          id?: string
          rejection_reason?: string | null
          sequence_order: number
          status?: Database["public"]["Enums"]["approval_status"]
          workflow_id: string
        }
        Update: {
          acted_at?: string | null
          approval_role_id?: string | null
          approver_id?: string | null
          comments?: string | null
          created_at?: string
          delegated_from?: string | null
          id?: string
          rejection_reason?: string | null
          sequence_order?: number
          status?: Database["public"]["Enums"]["approval_status"]
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_workflow_actions_approval_role_id_fkey"
            columns: ["approval_role_id"]
            isOneToOne: false
            referencedRelation: "approval_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_workflow_actions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "approval_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_workflows: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["approval_category"]
          completed_at: string | null
          created_at: string
          currency: string
          current_level: number
          id: string
          initiated_by: string | null
          override_id: string | null
          override_justification: string | null
          reference_code: string
          reference_id: string
          rule_id: string | null
          status: Database["public"]["Enums"]["approval_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          category: Database["public"]["Enums"]["approval_category"]
          completed_at?: string | null
          created_at?: string
          currency?: string
          current_level?: number
          id?: string
          initiated_by?: string | null
          override_id?: string | null
          override_justification?: string | null
          reference_code: string
          reference_id: string
          rule_id?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["approval_category"]
          completed_at?: string | null
          created_at?: string
          currency?: string
          current_level?: number
          id?: string
          initiated_by?: string | null
          override_id?: string | null
          override_justification?: string | null
          reference_code?: string
          reference_id?: string
          rule_id?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_workflows_override_id_fkey"
            columns: ["override_id"]
            isOneToOne: false
            referencedRelation: "approval_overrides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_workflows_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "approval_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      company_documents: {
        Row: {
          created_at: string
          document_name: string
          document_type: string
          extracted_data: Json | null
          file_path: string
          file_type: string
          id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          document_name: string
          document_type: string
          extracted_data?: Json | null
          file_path: string
          file_type: string
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          document_name?: string
          document_type?: string
          extracted_data?: Json | null
          file_path?: string
          file_type?: string
          id?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          address_ar: string | null
          address_en: string | null
          city: string | null
          company_name_ar: string | null
          company_name_en: string
          country: string | null
          created_at: string
          created_by: string | null
          default_currency: string | null
          email: string | null
          id: string
          logo_url: string | null
          phone: string | null
          region: string | null
          trade_license_expiry: string
          trade_license_number: string
          updated_at: string
          updated_by: string | null
          vat_number: string | null
          website: string | null
        }
        Insert: {
          address_ar?: string | null
          address_en?: string | null
          city?: string | null
          company_name_ar?: string | null
          company_name_en: string
          country?: string | null
          created_at?: string
          created_by?: string | null
          default_currency?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          region?: string | null
          trade_license_expiry: string
          trade_license_number: string
          updated_at?: string
          updated_by?: string | null
          vat_number?: string | null
          website?: string | null
        }
        Update: {
          address_ar?: string | null
          address_en?: string | null
          city?: string | null
          company_name_ar?: string | null
          company_name_en?: string
          country?: string | null
          created_at?: string
          created_by?: string | null
          default_currency?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          region?: string | null
          trade_license_expiry?: string
          trade_license_number?: string
          updated_at?: string
          updated_by?: string | null
          vat_number?: string | null
          website?: string | null
        }
        Relationships: []
      }
      cost_centers: {
        Row: {
          code: string
          created_at: string
          department_id: string | null
          id: string
          is_active: boolean
          name_ar: string
          name_en: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          department_id?: string | null
          id?: string
          is_active?: boolean
          name_ar: string
          name_en: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          department_id?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_centers_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name_ar: string
          name_en: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar: string
          name_en: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string
          updated_at?: string
        }
        Relationships: []
      }
      document_assignments: {
        Row: {
          assigned_at: string
          assigned_from: string | null
          assigned_to: string
          document_id: string
          document_type: string
          id: string
          notes: string | null
        }
        Insert: {
          assigned_at?: string
          assigned_from?: string | null
          assigned_to: string
          document_id: string
          document_type: string
          id?: string
          notes?: string | null
        }
        Update: {
          assigned_at?: string
          assigned_from?: string | null
          assigned_to?: string
          document_id?: string
          document_type?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_assignments_assigned_from_fkey"
            columns: ["assigned_from"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_assignments_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          base_currency: string
          created_at: string | null
          fetched_at: string | null
          id: string
          rate: number
          target_currency: string
          updated_at: string | null
        }
        Insert: {
          base_currency: string
          created_at?: string | null
          fetched_at?: string | null
          id?: string
          rate: number
          target_currency: string
          updated_at?: string | null
        }
        Update: {
          base_currency?: string
          created_at?: string | null
          fetched_at?: string | null
          id?: string
          rate?: number
          target_currency?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      goods_receipt_items: {
        Row: {
          created_at: string
          id: string
          inspection_notes: string | null
          inventory_item_id: string | null
          po_item_id: string
          quality_status: Database["public"]["Enums"]["quality_status"]
          quantity_ordered: number
          quantity_received: number
          quantity_rejected: number
          receipt_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          inspection_notes?: string | null
          inventory_item_id?: string | null
          po_item_id: string
          quality_status?: Database["public"]["Enums"]["quality_status"]
          quantity_ordered?: number
          quantity_received?: number
          quantity_rejected?: number
          receipt_id: string
        }
        Update: {
          created_at?: string
          id?: string
          inspection_notes?: string | null
          inventory_item_id?: string | null
          po_item_id?: string
          quality_status?: Database["public"]["Enums"]["quality_status"]
          quantity_ordered?: number
          quantity_received?: number
          quantity_rejected?: number
          receipt_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goods_receipt_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipt_items_po_item_id_fkey"
            columns: ["po_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipt_items_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "goods_receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      goods_receipts: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          po_id: string
          receipt_code: string
          receipt_date: string
          received_by: string | null
          status: Database["public"]["Enums"]["goods_receipt_status"]
          updated_at: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          po_id: string
          receipt_code: string
          receipt_date?: string
          received_by?: string | null
          status?: Database["public"]["Enums"]["goods_receipt_status"]
          updated_at?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          po_id?: string
          receipt_code?: string
          receipt_date?: string
          received_by?: string | null
          status?: Database["public"]["Enums"]["goods_receipt_status"]
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goods_receipts_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipts_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_categories: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name_ar: string
          name_en: string
          parent_category_id: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name_ar: string
          name_en: string
          parent_category_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string
          parent_category_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "inventory_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category_id: string | null
          code: string
          created_at: string
          created_by: string | null
          currency: string
          current_stock: number
          description: string | null
          id: string
          is_active: boolean
          is_stockable: boolean
          lead_time_days: number | null
          max_stock_level: number | null
          min_stock_level: number
          name_ar: string
          name_en: string
          reorder_point: number
          specifications: string | null
          unit: string
          unit_price: number
          updated_at: string
          warehouse_location: string | null
        }
        Insert: {
          category_id?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          currency?: string
          current_stock?: number
          description?: string | null
          id?: string
          is_active?: boolean
          is_stockable?: boolean
          lead_time_days?: number | null
          max_stock_level?: number | null
          min_stock_level?: number
          name_ar: string
          name_en: string
          reorder_point?: number
          specifications?: string | null
          unit?: string
          unit_price?: number
          updated_at?: string
          warehouse_location?: string | null
        }
        Update: {
          category_id?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          current_stock?: number
          description?: string | null
          id?: string
          is_active?: boolean
          is_stockable?: boolean
          lead_time_days?: number | null
          max_stock_level?: number | null
          min_stock_level?: number
          name_ar?: string
          name_en?: string
          reorder_point?: number
          specifications?: string | null
          unit?: string
          unit_price?: number
          updated_at?: string
          warehouse_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "inventory_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_tokens: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          id: string
          token: string
          used: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          token: string
          used?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          token?: string
          used?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      petty_cash_claims: {
        Row: {
          balance_remaining: number | null
          claim_code: string
          claim_date: string
          created_at: string
          created_by: string | null
          currency: string
          gm_approved_at: string | null
          gm_approved_by: string | null
          gm_rejection_reason: string | null
          id: string
          paid_at: string | null
          paid_by: string | null
          payment_date: string | null
          payment_reference: string | null
          pdf_generated_at: string | null
          pdf_url: string | null
          project_id: string | null
          replenishment_amount: number
          status: Database["public"]["Enums"]["petty_cash_status"]
          total_allocated: number
          total_spent: number
          updated_at: string
        }
        Insert: {
          balance_remaining?: number | null
          claim_code: string
          claim_date?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          gm_approved_at?: string | null
          gm_approved_by?: string | null
          gm_rejection_reason?: string | null
          id?: string
          paid_at?: string | null
          paid_by?: string | null
          payment_date?: string | null
          payment_reference?: string | null
          pdf_generated_at?: string | null
          pdf_url?: string | null
          project_id?: string | null
          replenishment_amount?: number
          status?: Database["public"]["Enums"]["petty_cash_status"]
          total_allocated?: number
          total_spent?: number
          updated_at?: string
        }
        Update: {
          balance_remaining?: number | null
          claim_code?: string
          claim_date?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          gm_approved_at?: string | null
          gm_approved_by?: string | null
          gm_rejection_reason?: string | null
          id?: string
          paid_at?: string | null
          paid_by?: string | null
          payment_date?: string | null
          payment_reference?: string | null
          pdf_generated_at?: string | null
          pdf_url?: string | null
          project_id?: string | null
          replenishment_amount?: number
          status?: Database["public"]["Enums"]["petty_cash_status"]
          total_allocated?: number
          total_spent?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "petty_cash_claims_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petty_cash_claims_gm_approved_by_fkey"
            columns: ["gm_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petty_cash_claims_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petty_cash_claims_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      petty_cash_items: {
        Row: {
          amount: number
          claim_id: string
          created_at: string
          description: string
          expense_date: string | null
          id: string
          item_number: number
          receipt_attached: boolean
          receipt_url: string | null
        }
        Insert: {
          amount?: number
          claim_id: string
          created_at?: string
          description: string
          expense_date?: string | null
          id?: string
          item_number: number
          receipt_attached?: boolean
          receipt_url?: string | null
        }
        Update: {
          amount?: number
          claim_id?: string
          created_at?: string
          description?: string
          expense_date?: string | null
          id?: string
          item_number?: number
          receipt_attached?: boolean
          receipt_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "petty_cash_items_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "petty_cash_claims"
            referencedColumns: ["id"]
          },
        ]
      }
      po_copies: {
        Row: {
          created_at: string
          currency: string
          email_sent_at: string | null
          email_sent_to: string | null
          email_status: string | null
          generated_at: string
          generated_by: string | null
          id: string
          pdf_html: string | null
          po_code: string
          po_id: string
          total_amount: number
          vendor_id: string | null
          vendor_name: string | null
        }
        Insert: {
          created_at?: string
          currency?: string
          email_sent_at?: string | null
          email_sent_to?: string | null
          email_status?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          pdf_html?: string | null
          po_code: string
          po_id: string
          total_amount?: number
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          email_sent_at?: string | null
          email_sent_to?: string | null
          email_status?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          pdf_html?: string | null
          po_code?: string
          po_id?: string
          total_amount?: number
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "po_copies_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_copies_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department_id: string | null
          email: string | null
          full_name: string | null
          id: string
          is_subscribed: boolean | null
          line_manager_id: string | null
          phone: string | null
          preferred_language: string
          subscription_plan: string | null
          trial_expires_at: string | null
          trial_started_at: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department_id?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_subscribed?: boolean | null
          line_manager_id?: string | null
          phone?: string | null
          preferred_language?: string
          subscription_plan?: string | null
          trial_expires_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_subscribed?: boolean | null
          line_manager_id?: string | null
          phone?: string | null
          preferred_language?: string
          subscription_plan?: string | null
          trial_expires_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_line_manager_id_fkey"
            columns: ["line_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_alerts: {
        Row: {
          alert_type: Database["public"]["Enums"]["project_alert_type"]
          created_at: string
          current_value: number | null
          id: string
          is_dismissed: boolean
          is_read: boolean
          message_ar: string
          message_en: string
          project_id: string
          threshold_percentage: number | null
        }
        Insert: {
          alert_type: Database["public"]["Enums"]["project_alert_type"]
          created_at?: string
          current_value?: number | null
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          message_ar: string
          message_en: string
          project_id: string
          threshold_percentage?: number | null
        }
        Update: {
          alert_type?: Database["public"]["Enums"]["project_alert_type"]
          created_at?: string
          current_value?: number | null
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          message_ar?: string
          message_en?: string
          project_id?: string
          threshold_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_alerts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_budget_transactions: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          id: string
          project_id: string
          reference_code: string | null
          reference_id: string | null
          reference_type: string
          transaction_type: Database["public"]["Enums"]["budget_transaction_type"]
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          id?: string
          project_id: string
          reference_code?: string | null
          reference_id?: string | null
          reference_type: string
          transaction_type: Database["public"]["Enums"]["budget_transaction_type"]
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          id?: string
          project_id?: string
          reference_code?: string | null
          reference_id?: string | null
          reference_type?: string
          transaction_type?: Database["public"]["Enums"]["budget_transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "project_budget_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_budget_transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_milestones: {
        Row: {
          completed_date: string | null
          created_at: string
          description: string | null
          due_date: string
          id: string
          name_ar: string
          name_en: string
          project_id: string
          status: Database["public"]["Enums"]["milestone_status"]
          updated_at: string
          weight_percentage: number
        }
        Insert: {
          completed_date?: string | null
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          name_ar: string
          name_en: string
          project_id: string
          status?: Database["public"]["Enums"]["milestone_status"]
          updated_at?: string
          weight_percentage?: number
        }
        Update: {
          completed_date?: string | null
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          name_ar?: string
          name_en?: string
          project_id?: string
          status?: Database["public"]["Enums"]["milestone_status"]
          updated_at?: string
          weight_percentage?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_team_members: {
        Row: {
          added_at: string
          added_by: string | null
          id: string
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          id?: string
          project_id: string
          role?: string
          user_id: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          id?: string
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_team_members_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_team_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_variations: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          currency: string
          description_ar: string
          description_en: string
          id: string
          justification: string | null
          project_id: string
          status: Database["public"]["Enums"]["approval_status"]
          updated_at: string
          variation_code: string
          variation_date: string | null
          variation_type: Database["public"]["Enums"]["variation_type"]
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description_ar: string
          description_en: string
          id?: string
          justification?: string | null
          project_id: string
          status?: Database["public"]["Enums"]["approval_status"]
          updated_at?: string
          variation_code: string
          variation_date?: string | null
          variation_type: Database["public"]["Enums"]["variation_type"]
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description_ar?: string
          description_en?: string
          id?: string
          justification?: string | null
          project_id?: string
          status?: Database["public"]["Enums"]["approval_status"]
          updated_at?: string
          variation_code?: string
          variation_date?: string | null
          variation_type?: Database["public"]["Enums"]["variation_type"]
        }
        Relationships: [
          {
            foreignKeyName: "project_variations_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_variations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_variations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          actual_end_date: string | null
          budget_committed: number
          budget_consumed: number
          client_name: string | null
          client_reference: string | null
          code: string
          cost_center_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          department_id: string | null
          description: string | null
          end_date: string | null
          extended_at: string | null
          extension_reason: string | null
          id: string
          initial_end_date: string | null
          initial_start_date: string | null
          manager_id: string | null
          name_ar: string
          name_en: string
          original_budget: number
          progress_percentage: number
          project_type: Database["public"]["Enums"]["project_type"]
          revised_budget: number
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
        }
        Insert: {
          actual_end_date?: string | null
          budget_committed?: number
          budget_consumed?: number
          client_name?: string | null
          client_reference?: string | null
          code: string
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          department_id?: string | null
          description?: string | null
          end_date?: string | null
          extended_at?: string | null
          extension_reason?: string | null
          id?: string
          initial_end_date?: string | null
          initial_start_date?: string | null
          manager_id?: string | null
          name_ar: string
          name_en: string
          original_budget?: number
          progress_percentage?: number
          project_type?: Database["public"]["Enums"]["project_type"]
          revised_budget?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Update: {
          actual_end_date?: string | null
          budget_committed?: number
          budget_consumed?: number
          client_name?: string | null
          client_reference?: string | null
          code?: string
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          department_id?: string | null
          description?: string | null
          end_date?: string | null
          extended_at?: string | null
          extension_reason?: string | null
          id?: string
          initial_end_date?: string | null
          initial_start_date?: string | null
          manager_id?: string | null
          name_ar?: string
          name_en?: string
          original_budget?: number
          progress_percentage?: number
          project_type?: Database["public"]["Enums"]["project_type"]
          revised_budget?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          created_at: string
          description_ar: string
          description_en: string
          id: string
          item_number: number
          po_id: string
          pr_item_id: string | null
          quantity: number
          received_quantity: number
          specifications: string | null
          total_price: number
          unit: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          description_ar: string
          description_en: string
          id?: string
          item_number: number
          po_id: string
          pr_item_id?: string | null
          quantity?: number
          received_quantity?: number
          specifications?: string | null
          total_price?: number
          unit?: string
          unit_price?: number
        }
        Update: {
          created_at?: string
          description_ar?: string
          description_en?: string
          id?: string
          item_number?: number
          po_id?: string
          pr_item_id?: string | null
          quantity?: number
          received_quantity?: number
          specifications?: string | null
          total_price?: number
          unit?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_pr_item_id_fkey"
            columns: ["pr_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_request_items"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          code: string
          cost_center_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          delivery_address: string | null
          delivery_date: string | null
          delivery_terms: string | null
          department_id: string | null
          description: string | null
          id: string
          issued_at: string | null
          issued_by: string | null
          payment_terms: string | null
          pr_id: string
          pr_total_amount: number
          procurement_type: Database["public"]["Enums"]["procurement_type"]
          project_id: string | null
          status: Database["public"]["Enums"]["procurement_status"]
          subtotal: number
          tax_amount: number
          terms_conditions: string | null
          title_ar: string
          title_en: string
          total_amount: number
          updated_at: string
          vendor_id: string
          workflow_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          code: string
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          delivery_address?: string | null
          delivery_date?: string | null
          delivery_terms?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          issued_at?: string | null
          issued_by?: string | null
          payment_terms?: string | null
          pr_id: string
          pr_total_amount?: number
          procurement_type: Database["public"]["Enums"]["procurement_type"]
          project_id?: string | null
          status?: Database["public"]["Enums"]["procurement_status"]
          subtotal?: number
          tax_amount?: number
          terms_conditions?: string | null
          title_ar: string
          title_en: string
          total_amount?: number
          updated_at?: string
          vendor_id: string
          workflow_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          code?: string
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          delivery_address?: string | null
          delivery_date?: string | null
          delivery_terms?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          issued_at?: string | null
          issued_by?: string | null
          payment_terms?: string | null
          pr_id?: string
          pr_total_amount?: number
          procurement_type?: Database["public"]["Enums"]["procurement_type"]
          project_id?: string | null
          status?: Database["public"]["Enums"]["procurement_status"]
          subtotal?: number
          tax_amount?: number
          terms_conditions?: string | null
          title_ar?: string
          title_en?: string
          total_amount?: number
          updated_at?: string
          vendor_id?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_pr_id_fkey"
            columns: ["pr_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "approval_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_request_items: {
        Row: {
          created_at: string
          description_ar: string
          description_en: string
          id: string
          item_number: number
          pr_id: string
          quantity: number
          rfq_item_id: string | null
          specifications: string | null
          total_price: number
          unit: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          description_ar: string
          description_en: string
          id?: string
          item_number: number
          pr_id: string
          quantity?: number
          rfq_item_id?: string | null
          specifications?: string | null
          total_price?: number
          unit?: string
          unit_price?: number
        }
        Update: {
          created_at?: string
          description_ar?: string
          description_en?: string
          id?: string
          item_number?: number
          pr_id?: string
          quantity?: number
          rfq_item_id?: string | null
          specifications?: string | null
          total_price?: number
          unit?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_request_items_pr_id_fkey"
            columns: ["pr_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_request_items_rfq_item_id_fkey"
            columns: ["rfq_item_id"]
            isOneToOne: false
            referencedRelation: "rfq_items"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          code: string
          cost_center_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          delivery_address: string | null
          department_id: string | null
          description: string | null
          exception_attachment: string | null
          exception_reason: string | null
          id: string
          is_exception: boolean | null
          is_locked: boolean
          justification: string | null
          locked_at: string | null
          non_recommended_justification: string | null
          procurement_type: Database["public"]["Enums"]["procurement_type"]
          project_id: string | null
          requested_by: string | null
          required_date: string | null
          rfq_id: string | null
          rfq_id_linked: string | null
          status: Database["public"]["Enums"]["procurement_status"]
          subtotal: number
          tax_amount: number
          title_ar: string
          title_en: string
          total_amount: number
          updated_at: string
          vendor_id: string | null
          workflow_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          code: string
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          delivery_address?: string | null
          department_id?: string | null
          description?: string | null
          exception_attachment?: string | null
          exception_reason?: string | null
          id?: string
          is_exception?: boolean | null
          is_locked?: boolean
          justification?: string | null
          locked_at?: string | null
          non_recommended_justification?: string | null
          procurement_type: Database["public"]["Enums"]["procurement_type"]
          project_id?: string | null
          requested_by?: string | null
          required_date?: string | null
          rfq_id?: string | null
          rfq_id_linked?: string | null
          status?: Database["public"]["Enums"]["procurement_status"]
          subtotal?: number
          tax_amount?: number
          title_ar: string
          title_en: string
          total_amount?: number
          updated_at?: string
          vendor_id?: string | null
          workflow_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          code?: string
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          delivery_address?: string | null
          department_id?: string | null
          description?: string | null
          exception_attachment?: string | null
          exception_reason?: string | null
          id?: string
          is_exception?: boolean | null
          is_locked?: boolean
          justification?: string | null
          locked_at?: string | null
          non_recommended_justification?: string | null
          procurement_type?: Database["public"]["Enums"]["procurement_type"]
          project_id?: string | null
          requested_by?: string | null
          required_date?: string | null
          rfq_id?: string | null
          rfq_id_linked?: string | null
          status?: Database["public"]["Enums"]["procurement_status"]
          subtotal?: number
          tax_amount?: number
          title_ar?: string
          title_en?: string
          total_amount?: number
          updated_at?: string
          vendor_id?: string | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requests_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requests_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requests_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requests_rfq_id_linked_fkey"
            columns: ["rfq_id_linked"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requests_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requests_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "approval_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      report_downloads: {
        Row: {
          downloaded_at: string
          downloaded_by: string | null
          file_format: string
          file_path: string | null
          id: string
          parameters: Json | null
          report_name: string
          report_type: string
        }
        Insert: {
          downloaded_at?: string
          downloaded_by?: string | null
          file_format: string
          file_path?: string | null
          id?: string
          parameters?: Json | null
          report_name: string
          report_type: string
        }
        Update: {
          downloaded_at?: string
          downloaded_by?: string | null
          file_format?: string
          file_path?: string | null
          id?: string
          parameters?: Json | null
          report_name?: string
          report_type?: string
        }
        Relationships: []
      }
      rfi_items: {
        Row: {
          created_at: string
          description_ar: string
          description_en: string
          id: string
          item_number: number
          quantity: number
          rfi_id: string
          specifications: string | null
          unit: string
        }
        Insert: {
          created_at?: string
          description_ar: string
          description_en: string
          id?: string
          item_number: number
          quantity?: number
          rfi_id: string
          specifications?: string | null
          unit?: string
        }
        Update: {
          created_at?: string
          description_ar?: string
          description_en?: string
          id?: string
          item_number?: number
          quantity?: number
          rfi_id?: string
          specifications?: string | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfi_items_rfi_id_fkey"
            columns: ["rfi_id"]
            isOneToOne: false
            referencedRelation: "rfis"
            referencedColumns: ["id"]
          },
        ]
      }
      rfi_vendors: {
        Row: {
          id: string
          invited_at: string
          response_date: string | null
          response_notes: string | null
          response_received: boolean
          rfi_id: string
          vendor_id: string
        }
        Insert: {
          id?: string
          invited_at?: string
          response_date?: string | null
          response_notes?: string | null
          response_received?: boolean
          rfi_id: string
          vendor_id: string
        }
        Update: {
          id?: string
          invited_at?: string
          response_date?: string | null
          response_notes?: string | null
          response_received?: boolean
          rfi_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfi_vendors_rfi_id_fkey"
            columns: ["rfi_id"]
            isOneToOne: false
            referencedRelation: "rfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfi_vendors_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      rfis: {
        Row: {
          assigned_buyer_id: string | null
          code: string
          cost_center_id: string | null
          created_at: string
          created_by: string | null
          department_id: string | null
          description: string | null
          due_date: string | null
          id: string
          notes: string | null
          original_requester_id: string | null
          priority: string | null
          procurement_type: Database["public"]["Enums"]["procurement_type"]
          project_id: string | null
          requested_by: string | null
          service_description: string | null
          service_documents: Json | null
          status: Database["public"]["Enums"]["procurement_status"]
          title_ar: string
          title_en: string
          updated_at: string
        }
        Insert: {
          assigned_buyer_id?: string | null
          code: string
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          original_requester_id?: string | null
          priority?: string | null
          procurement_type: Database["public"]["Enums"]["procurement_type"]
          project_id?: string | null
          requested_by?: string | null
          service_description?: string | null
          service_documents?: Json | null
          status?: Database["public"]["Enums"]["procurement_status"]
          title_ar: string
          title_en: string
          updated_at?: string
        }
        Update: {
          assigned_buyer_id?: string | null
          code?: string
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          original_requester_id?: string | null
          priority?: string | null
          procurement_type?: Database["public"]["Enums"]["procurement_type"]
          project_id?: string | null
          requested_by?: string | null
          service_description?: string | null
          service_documents?: Json | null
          status?: Database["public"]["Enums"]["procurement_status"]
          title_ar?: string
          title_en?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfis_assigned_buyer_id_fkey"
            columns: ["assigned_buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_audit_logs: {
        Row: {
          action: string
          action_details: Json | null
          id: string
          ip_address: string | null
          performed_at: string
          performed_by: string | null
          rfq_id: string
          user_agent: string | null
        }
        Insert: {
          action: string
          action_details?: Json | null
          id?: string
          ip_address?: string | null
          performed_at?: string
          performed_by?: string | null
          rfq_id: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          action_details?: Json | null
          id?: string
          ip_address?: string | null
          performed_at?: string
          performed_by?: string | null
          rfq_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rfq_audit_logs_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_audit_logs_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_items: {
        Row: {
          created_at: string
          description_ar: string
          description_en: string
          id: string
          item_number: number
          quantity: number
          rfi_item_id: string | null
          rfq_id: string
          specifications: string | null
          unit: string
        }
        Insert: {
          created_at?: string
          description_ar: string
          description_en: string
          id?: string
          item_number: number
          quantity?: number
          rfi_item_id?: string | null
          rfq_id: string
          specifications?: string | null
          unit?: string
        }
        Update: {
          created_at?: string
          description_ar?: string
          description_en?: string
          id?: string
          item_number?: number
          quantity?: number
          rfi_item_id?: string | null
          rfq_id?: string
          specifications?: string | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfq_items_rfi_item_id_fkey"
            columns: ["rfi_item_id"]
            isOneToOne: false
            referencedRelation: "rfi_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_items_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_vendor_prices: {
        Row: {
          id: string
          notes: string | null
          rfq_item_id: string
          rfq_vendor_id: string
          total_price: number
          unit_price: number
        }
        Insert: {
          id?: string
          notes?: string | null
          rfq_item_id: string
          rfq_vendor_id: string
          total_price?: number
          unit_price?: number
        }
        Update: {
          id?: string
          notes?: string | null
          rfq_item_id?: string
          rfq_vendor_id?: string
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "rfq_vendor_prices_rfq_item_id_fkey"
            columns: ["rfq_item_id"]
            isOneToOne: false
            referencedRelation: "rfq_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_vendor_prices_rfq_vendor_id_fkey"
            columns: ["rfq_vendor_id"]
            isOneToOne: false
            referencedRelation: "rfq_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_vendors: {
        Row: {
          attachments: Json | null
          commercial_score: number | null
          currency: string | null
          delivery_days: number | null
          delivery_score: number | null
          deviation_notes: string | null
          email_error: string | null
          email_sent: boolean | null
          email_sent_at: string | null
          id: string
          invited_at: string
          is_recommended: boolean | null
          is_responsive: boolean | null
          is_selected: boolean
          landed_cost: number | null
          notes: string | null
          overall_score: number | null
          payment_terms: string | null
          quotation_amount: number | null
          quotation_date: string | null
          quotation_issue_date: string | null
          quotation_received: boolean
          rfq_id: string
          specification_compliance: Json | null
          submission_token: string | null
          submitted_at: string | null
          submitted_by_email: string | null
          submitted_by_name: string | null
          tax_amount: number | null
          technical_deviations: string | null
          technical_score: number | null
          token_expires_at: string | null
          total_amount: number | null
          validity_days: number | null
          vendor_id: string
          vendor_response_date: string | null
          warranty_days: number | null
          warranty_terms: string | null
        }
        Insert: {
          attachments?: Json | null
          commercial_score?: number | null
          currency?: string | null
          delivery_days?: number | null
          delivery_score?: number | null
          deviation_notes?: string | null
          email_error?: string | null
          email_sent?: boolean | null
          email_sent_at?: string | null
          id?: string
          invited_at?: string
          is_recommended?: boolean | null
          is_responsive?: boolean | null
          is_selected?: boolean
          landed_cost?: number | null
          notes?: string | null
          overall_score?: number | null
          payment_terms?: string | null
          quotation_amount?: number | null
          quotation_date?: string | null
          quotation_issue_date?: string | null
          quotation_received?: boolean
          rfq_id: string
          specification_compliance?: Json | null
          submission_token?: string | null
          submitted_at?: string | null
          submitted_by_email?: string | null
          submitted_by_name?: string | null
          tax_amount?: number | null
          technical_deviations?: string | null
          technical_score?: number | null
          token_expires_at?: string | null
          total_amount?: number | null
          validity_days?: number | null
          vendor_id: string
          vendor_response_date?: string | null
          warranty_days?: number | null
          warranty_terms?: string | null
        }
        Update: {
          attachments?: Json | null
          commercial_score?: number | null
          currency?: string | null
          delivery_days?: number | null
          delivery_score?: number | null
          deviation_notes?: string | null
          email_error?: string | null
          email_sent?: boolean | null
          email_sent_at?: string | null
          id?: string
          invited_at?: string
          is_recommended?: boolean | null
          is_responsive?: boolean | null
          is_selected?: boolean
          landed_cost?: number | null
          notes?: string | null
          overall_score?: number | null
          payment_terms?: string | null
          quotation_amount?: number | null
          quotation_date?: string | null
          quotation_issue_date?: string | null
          quotation_received?: boolean
          rfq_id?: string
          specification_compliance?: Json | null
          submission_token?: string | null
          submitted_at?: string | null
          submitted_by_email?: string | null
          submitted_by_name?: string | null
          tax_amount?: number | null
          technical_deviations?: string | null
          technical_score?: number | null
          token_expires_at?: string | null
          total_amount?: number | null
          validity_days?: number | null
          vendor_id?: string
          vendor_response_date?: string | null
          warranty_days?: number | null
          warranty_terms?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rfq_vendors_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_vendors_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      rfqs: {
        Row: {
          ai_comparison: Json | null
          ai_recommendation: string | null
          analysis_triggered_at: string | null
          analysis_triggered_by: string | null
          assigned_buyer_id: string | null
          code: string
          converted_to_pr_at: string | null
          converted_to_pr_by: string | null
          cost_center_id: string | null
          created_at: string
          created_by: string | null
          department_id: string | null
          description: string | null
          email_dispatch_date: string | null
          evaluation_criteria: Json | null
          id: string
          is_standalone: boolean | null
          is_vendor_override: boolean | null
          procurement_type: Database["public"]["Enums"]["procurement_type"]
          project_id: string | null
          quotes_ready_notification_sent: boolean | null
          recommended_vendor_id: string | null
          requested_by: string | null
          rfi_id: string | null
          selected_vendor_id: string | null
          status: Database["public"]["Enums"]["procurement_status"]
          submission_deadline: string | null
          terms_conditions: string | null
          title_ar: string
          title_en: string
          updated_at: string
          valid_until: string | null
          vendor_selection_justification: string | null
        }
        Insert: {
          ai_comparison?: Json | null
          ai_recommendation?: string | null
          analysis_triggered_at?: string | null
          analysis_triggered_by?: string | null
          assigned_buyer_id?: string | null
          code: string
          converted_to_pr_at?: string | null
          converted_to_pr_by?: string | null
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          email_dispatch_date?: string | null
          evaluation_criteria?: Json | null
          id?: string
          is_standalone?: boolean | null
          is_vendor_override?: boolean | null
          procurement_type: Database["public"]["Enums"]["procurement_type"]
          project_id?: string | null
          quotes_ready_notification_sent?: boolean | null
          recommended_vendor_id?: string | null
          requested_by?: string | null
          rfi_id?: string | null
          selected_vendor_id?: string | null
          status?: Database["public"]["Enums"]["procurement_status"]
          submission_deadline?: string | null
          terms_conditions?: string | null
          title_ar: string
          title_en: string
          updated_at?: string
          valid_until?: string | null
          vendor_selection_justification?: string | null
        }
        Update: {
          ai_comparison?: Json | null
          ai_recommendation?: string | null
          analysis_triggered_at?: string | null
          analysis_triggered_by?: string | null
          assigned_buyer_id?: string | null
          code?: string
          converted_to_pr_at?: string | null
          converted_to_pr_by?: string | null
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          email_dispatch_date?: string | null
          evaluation_criteria?: Json | null
          id?: string
          is_standalone?: boolean | null
          is_vendor_override?: boolean | null
          procurement_type?: Database["public"]["Enums"]["procurement_type"]
          project_id?: string | null
          quotes_ready_notification_sent?: boolean | null
          recommended_vendor_id?: string | null
          requested_by?: string | null
          rfi_id?: string | null
          selected_vendor_id?: string | null
          status?: Database["public"]["Enums"]["procurement_status"]
          submission_deadline?: string | null
          terms_conditions?: string | null
          title_ar?: string
          title_en?: string
          updated_at?: string
          valid_until?: string | null
          vendor_selection_justification?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rfqs_assigned_buyer_id_fkey"
            columns: ["assigned_buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfqs_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfqs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfqs_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfqs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfqs_recommended_vendor_id_fkey"
            columns: ["recommended_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfqs_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfqs_rfi_id_fkey"
            columns: ["rfi_id"]
            isOneToOne: false
            referencedRelation: "rfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfqs_selected_vendor_id_fkey"
            columns: ["selected_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      role_requests: {
        Row: {
          admin_approved_at: string | null
          admin_approved_by: string | null
          admin_comments: string | null
          created_at: string
          id: string
          justification: string
          line_manager_approved_at: string | null
          line_manager_comments: string | null
          line_manager_id: string | null
          requested_role: Database["public"]["Enums"]["app_role"]
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_approved_at?: string | null
          admin_approved_by?: string | null
          admin_comments?: string | null
          created_at?: string
          id?: string
          justification: string
          line_manager_approved_at?: string | null
          line_manager_comments?: string | null
          line_manager_id?: string | null
          requested_role: Database["public"]["Enums"]["app_role"]
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_approved_at?: string | null
          admin_approved_by?: string | null
          admin_comments?: string | null
          created_at?: string
          id?: string
          justification?: string
          line_manager_approved_at?: string | null
          line_manager_comments?: string | null
          line_manager_id?: string | null
          requested_role?: Database["public"]["Enums"]["app_role"]
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_requests_admin_approved_by_fkey"
            columns: ["admin_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_requests_line_manager_id_fkey"
            columns: ["line_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sequence_counters: {
        Row: {
          created_at: string
          current_value: number
          format_pattern: string
          id: string
          prefix: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_value?: number
          format_pattern?: string
          id?: string
          prefix: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_value?: number
          format_pattern?: string
          id?: string
          prefix?: string
          updated_at?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          balance_after: number
          cost_center_id: string | null
          created_at: string
          id: string
          inventory_item_id: string
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          notes: string | null
          performed_by: string | null
          project_id: string | null
          quantity: number
          reference_code: string | null
          reference_id: string | null
          reference_type: string | null
          warehouse_location: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          balance_after: number
          cost_center_id?: string | null
          created_at?: string
          id?: string
          inventory_item_id: string
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          notes?: string | null
          performed_by?: string | null
          project_id?: string | null
          quantity: number
          reference_code?: string | null
          reference_id?: string | null
          reference_type?: string | null
          warehouse_location?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          balance_after?: number
          cost_center_id?: string | null
          created_at?: string
          id?: string
          inventory_item_id?: string
          movement_type?: Database["public"]["Enums"]["stock_movement_type"]
          notes?: string | null
          performed_by?: string | null
          project_id?: string | null
          quantity?: number
          reference_code?: string | null
          reference_id?: string | null
          reference_type?: string | null
          warehouse_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      system_audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_code: string | null
          entity_id: string
          entity_type: string
          exception_type: string | null
          id: string
          ip_address: string | null
          is_exception: boolean | null
          justification: string | null
          new_values: Json | null
          old_values: Json | null
          performed_by: string | null
          user_agent: string | null
          user_name: string | null
          user_role: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_code?: string | null
          entity_id: string
          entity_type: string
          exception_type?: string | null
          id?: string
          ip_address?: string | null
          is_exception?: boolean | null
          justification?: string | null
          new_values?: Json | null
          old_values?: Json | null
          performed_by?: string | null
          user_agent?: string | null
          user_name?: string | null
          user_role?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_code?: string | null
          entity_id?: string
          entity_type?: string
          exception_type?: string | null
          id?: string
          ip_address?: string | null
          is_exception?: boolean | null
          justification?: string | null
          new_values?: Json | null
          old_values?: Json | null
          performed_by?: string | null
          user_agent?: string | null
          user_name?: string | null
          user_role?: string | null
        }
        Relationships: []
      }
      user_approvers: {
        Row: {
          approver_role: string
          assigned_at: string
          assigned_by: string | null
          id: string
          is_active: boolean
          max_approval_amount: number | null
          modules: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          approver_role: string
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          is_active?: boolean
          max_approval_amount?: number | null
          modules?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          approver_role?: string
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          is_active?: boolean
          max_approval_amount?: number | null
          modules?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_approvers_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_approvers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      users_extended: {
        Row: {
          device_bound_at: string | null
          device_id: string | null
          device_info: Json | null
          email: string
          is_whitelisted: boolean | null
          registered_at: string | null
          user_id: string
          username: string
          valid_until: string
        }
        Insert: {
          device_bound_at?: string | null
          device_id?: string | null
          device_info?: Json | null
          email: string
          is_whitelisted?: boolean | null
          registered_at?: string | null
          user_id: string
          username: string
          valid_until?: string
        }
        Update: {
          device_bound_at?: string | null
          device_id?: string | null
          device_info?: Json | null
          email?: string
          is_whitelisted?: boolean | null
          registered_at?: string | null
          user_id?: string
          username?: string
          valid_until?: string
        }
        Relationships: []
      }
      vendor_bank_details: {
        Row: {
          account_name: string
          account_number: string
          bank_name: string
          created_at: string
          currency: string | null
          iban: string | null
          id: string
          is_primary: boolean
          swift_code: string | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          account_name: string
          account_number: string
          bank_name: string
          created_at?: string
          currency?: string | null
          iban?: string | null
          id?: string
          is_primary?: boolean
          swift_code?: string | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_name?: string
          created_at?: string
          currency?: string | null
          iban?: string | null
          id?: string
          is_primary?: boolean
          swift_code?: string | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_bank_details_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_categories: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name_ar: string
          name_en: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name_ar: string
          name_en: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string
          updated_at?: string
        }
        Relationships: []
      }
      vendor_category_mappings: {
        Row: {
          category_id: string
          created_at: string
          id: string
          vendor_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          vendor_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_category_mappings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "vendor_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_category_mappings_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_contacts: {
        Row: {
          created_at: string
          designation: string | null
          email: string | null
          id: string
          is_primary: boolean
          name: string
          phone: string | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          designation?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean
          name: string
          phone?: string | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          designation?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean
          name?: string
          phone?: string | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_contacts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_document_alerts: {
        Row: {
          alert_date: string
          alert_type: string
          created_at: string
          document_id: string
          id: string
          is_sent: boolean | null
          sent_at: string | null
          vendor_id: string
        }
        Insert: {
          alert_date: string
          alert_type: string
          created_at?: string
          document_id: string
          id?: string
          is_sent?: boolean | null
          sent_at?: string | null
          vendor_id: string
        }
        Update: {
          alert_date?: string
          alert_type?: string
          created_at?: string
          document_id?: string
          id?: string
          is_sent?: boolean | null
          sent_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_document_alerts_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "vendor_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_document_alerts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_documents: {
        Row: {
          ai_confidence_score: number | null
          classification:
            | Database["public"]["Enums"]["vendor_document_classification"]
            | null
          document_type: Database["public"]["Enums"]["vendor_document_type"]
          expiry_date: string | null
          extracted_data: Json | null
          extraction_status: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          is_verified: boolean | null
          mime_type: string | null
          original_filename: string | null
          parent_document_id: string | null
          uploaded_at: string
          uploaded_by: string | null
          vendor_id: string
          verified_at: string | null
          verified_by: string | null
          version: number | null
        }
        Insert: {
          ai_confidence_score?: number | null
          classification?:
            | Database["public"]["Enums"]["vendor_document_classification"]
            | null
          document_type: Database["public"]["Enums"]["vendor_document_type"]
          expiry_date?: string | null
          extracted_data?: Json | null
          extraction_status?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          is_verified?: boolean | null
          mime_type?: string | null
          original_filename?: string | null
          parent_document_id?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
          vendor_id: string
          verified_at?: string | null
          verified_by?: string | null
          version?: number | null
        }
        Update: {
          ai_confidence_score?: number | null
          classification?:
            | Database["public"]["Enums"]["vendor_document_classification"]
            | null
          document_type?: Database["public"]["Enums"]["vendor_document_type"]
          expiry_date?: string | null
          extracted_data?: Json | null
          extraction_status?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          is_verified?: boolean | null
          mime_type?: string | null
          original_filename?: string | null
          parent_document_id?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
          vendor_id?: string
          verified_at?: string | null
          verified_by?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_documents_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "vendor_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_documents_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_documents_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_due_diligence_reports: {
        Row: {
          created_at: string
          file_path: string | null
          generated_by: string | null
          id: string
          report_data: Json
          vendor_id: string
          vendor_name: string
        }
        Insert: {
          created_at?: string
          file_path?: string | null
          generated_by?: string | null
          id?: string
          report_data: Json
          vendor_id: string
          vendor_name: string
        }
        Update: {
          created_at?: string
          file_path?: string | null
          generated_by?: string | null
          id?: string
          report_data?: Json
          vendor_id?: string
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_due_diligence_reports_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address_ar: string | null
          address_en: string | null
          ai_insights: Json | null
          approved_at: string | null
          approved_by: string | null
          category_id: string | null
          city: string | null
          code: string
          company_name_ar: string
          company_name_en: string
          country: string | null
          created_at: string
          created_by: string | null
          email: string
          id: string
          is_active: boolean
          notes: string | null
          phone: string | null
          rating_score: number | null
          risk_score: number | null
          status: Database["public"]["Enums"]["vendor_status"]
          tax_registration_no: string | null
          trade_license_expiry: string | null
          trade_license_no: string | null
          updated_at: string
          vendor_type: Database["public"]["Enums"]["vendor_type"]
          website: string | null
        }
        Insert: {
          address_ar?: string | null
          address_en?: string | null
          ai_insights?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          category_id?: string | null
          city?: string | null
          code: string
          company_name_ar: string
          company_name_en: string
          country?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          id?: string
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          rating_score?: number | null
          risk_score?: number | null
          status?: Database["public"]["Enums"]["vendor_status"]
          tax_registration_no?: string | null
          trade_license_expiry?: string | null
          trade_license_no?: string | null
          updated_at?: string
          vendor_type?: Database["public"]["Enums"]["vendor_type"]
          website?: string | null
        }
        Update: {
          address_ar?: string | null
          address_en?: string | null
          ai_insights?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          category_id?: string | null
          city?: string | null
          code?: string
          company_name_ar?: string
          company_name_en?: string
          country?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          rating_score?: number | null
          risk_score?: number | null
          status?: Database["public"]["Enums"]["vendor_status"]
          tax_registration_no?: string | null
          trade_license_expiry?: string | null
          trade_license_no?: string | null
          updated_at?: string
          vendor_type?: Database["public"]["Enums"]["vendor_type"]
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "vendor_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_trade_license_expiry: { Args: never; Returns: undefined }
      cleanup_expired_reset_tokens: { Args: never; Returns: undefined }
      create_matrix_snapshot: {
        Args: { _change_summary?: string }
        Returns: string
      }
      find_approval_rule: {
        Args: {
          _amount: number
          _category: Database["public"]["Enums"]["approval_category"]
          _department_id?: string
        }
        Returns: string
      }
      get_analysis_report_sequence: { Args: { _type: string }; Returns: string }
      get_category_code: { Args: { _name: string }; Returns: string }
      get_cost_center_code: { Args: { _name: string }; Returns: string }
      get_department_code: { Args: { _name: string }; Returns: string }
      get_material_code: { Args: { _category_code: string }; Returns: string }
      get_new_material_code: {
        Args: { _category_name?: string }
        Returns: string
      }
      get_next_sequence_code: { Args: { _prefix: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_approval_audit: {
        Args: {
          _action: string
          _entity_id: string
          _entity_type: string
          _new_values?: Json
          _old_values?: Json
        }
        Returns: undefined
      }
      log_system_audit: {
        Args: {
          _action: string
          _entity_code?: string
          _entity_id: string
          _entity_type: string
          _exception_type?: string
          _is_exception?: boolean
          _justification?: string
          _new_values?: Json
          _old_values?: Json
        }
        Returns: undefined
      }
      process_goods_receipt: {
        Args: { _receipt_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "buyer" | "approver" | "viewer"
      approval_category:
        | "purchase_request"
        | "purchase_order"
        | "contracts"
        | "capex"
        | "payments"
        | "float_cash"
      approval_status:
        | "pending"
        | "approved"
        | "rejected"
        | "escalated"
        | "auto_approved"
      budget_transaction_type:
        | "allocation"
        | "commitment"
        | "expense"
        | "refund"
      goods_receipt_status: "pending" | "partial" | "complete"
      milestone_status: "pending" | "in_progress" | "completed" | "delayed"
      override_type:
        | "emergency_purchase"
        | "single_source_justification"
        | "capex_special"
        | "float_cash_replenishment"
        | "budget_override"
      petty_cash_status:
        | "draft"
        | "pending_gm_approval"
        | "approved_pending_payment"
        | "paid"
        | "rejected"
      procurement_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "approved"
        | "rejected"
        | "cancelled"
        | "completed"
      procurement_type: "material" | "service" | "subcontract"
      project_alert_type:
        | "budget_warning"
        | "budget_exceeded"
        | "timeline_warning"
        | "timeline_exceeded"
      project_status: "draft" | "active" | "on_hold" | "completed" | "cancelled"
      project_type: "construction" | "maintenance" | "capex" | "service"
      quality_status: "pending" | "passed" | "failed" | "partial"
      stock_movement_type:
        | "goods_receipt"
        | "issue"
        | "adjustment"
        | "transfer"
        | "return"
      variation_type: "addition" | "deduction" | "scope_change"
      vendor_document_classification:
        | "trade_license"
        | "establishment_card"
        | "vat_certificate"
        | "insurance"
        | "bank_details"
        | "compliance_certificate"
        | "quality_certification"
        | "identity_document"
        | "contract_agreement"
        | "miscellaneous"
      vendor_document_type:
        | "trade_license"
        | "tax_certificate"
        | "bank_letter"
        | "insurance"
        | "other"
      vendor_status: "pending" | "approved" | "suspended" | "blacklisted"
      vendor_type: "material" | "service" | "subcontractor"
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
      app_role: ["admin", "manager", "buyer", "approver", "viewer"],
      approval_category: [
        "purchase_request",
        "purchase_order",
        "contracts",
        "capex",
        "payments",
        "float_cash",
      ],
      approval_status: [
        "pending",
        "approved",
        "rejected",
        "escalated",
        "auto_approved",
      ],
      budget_transaction_type: [
        "allocation",
        "commitment",
        "expense",
        "refund",
      ],
      goods_receipt_status: ["pending", "partial", "complete"],
      milestone_status: ["pending", "in_progress", "completed", "delayed"],
      override_type: [
        "emergency_purchase",
        "single_source_justification",
        "capex_special",
        "float_cash_replenishment",
        "budget_override",
      ],
      petty_cash_status: [
        "draft",
        "pending_gm_approval",
        "approved_pending_payment",
        "paid",
        "rejected",
      ],
      procurement_status: [
        "draft",
        "submitted",
        "under_review",
        "approved",
        "rejected",
        "cancelled",
        "completed",
      ],
      procurement_type: ["material", "service", "subcontract"],
      project_alert_type: [
        "budget_warning",
        "budget_exceeded",
        "timeline_warning",
        "timeline_exceeded",
      ],
      project_status: ["draft", "active", "on_hold", "completed", "cancelled"],
      project_type: ["construction", "maintenance", "capex", "service"],
      quality_status: ["pending", "passed", "failed", "partial"],
      stock_movement_type: [
        "goods_receipt",
        "issue",
        "adjustment",
        "transfer",
        "return",
      ],
      variation_type: ["addition", "deduction", "scope_change"],
      vendor_document_classification: [
        "trade_license",
        "establishment_card",
        "vat_certificate",
        "insurance",
        "bank_details",
        "compliance_certificate",
        "quality_certification",
        "identity_document",
        "contract_agreement",
        "miscellaneous",
      ],
      vendor_document_type: [
        "trade_license",
        "tax_certificate",
        "bank_letter",
        "insurance",
        "other",
      ],
      vendor_status: ["pending", "approved", "suspended", "blacklisted"],
      vendor_type: ["material", "service", "subcontractor"],
    },
  },
} as const
