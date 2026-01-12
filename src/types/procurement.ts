export type ProcurementType = 'material' | 'service' | 'subcontract';
export type ProcurementStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'cancelled' | 'completed';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';

// RFI Types
export interface RFI {
  id: string;
  code: string;
  title_en: string;
  title_ar: string;
  description?: string;
  procurement_type: ProcurementType;
  status: ProcurementStatus;
  project_id?: string;
  cost_center_id?: string;
  department_id?: string;
  requested_by?: string;
  due_date?: string;
  priority: Priority;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Relations
  project?: { id: string; name_en: string; name_ar: string; code: string };
  cost_center?: { id: string; name_en: string; name_ar: string; code: string };
  department?: { id: string; name_en: string; name_ar: string };
  requester?: { id: string; full_name: string; email: string };
}

export interface RFIItem {
  id: string;
  rfi_id: string;
  item_number: number;
  description_en: string;
  description_ar: string;
  quantity: number;
  unit: string;
  specifications?: string;
  created_at: string;
}

export interface RFIVendor {
  id: string;
  rfi_id: string;
  vendor_id: string;
  invited_at: string;
  response_received: boolean;
  response_date?: string;
  response_notes?: string;
  vendor?: { id: string; company_name_en: string; company_name_ar: string; code: string };
}

// RFQ Types
export interface RFQ {
  id: string;
  code: string;
  rfi_id?: string;
  title_en: string;
  title_ar: string;
  description?: string;
  procurement_type: ProcurementType;
  status: ProcurementStatus;
  project_id?: string;
  cost_center_id?: string;
  department_id?: string;
  requested_by?: string;
  submission_deadline?: string;
  valid_until?: string;
  terms_conditions?: string;
  evaluation_criteria?: Record<string, any>;
  ai_comparison?: Record<string, any>;
  ai_recommendation?: string;
  recommended_vendor_id?: string;
  selected_vendor_id?: string;
  vendor_selection_justification?: string;
  is_vendor_override?: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Relations
  rfi?: { id: string; code: string; title_en: string; title_ar: string };
  project?: { id: string; name_en: string; name_ar: string; code: string };
  cost_center?: { id: string; name_en: string; name_ar: string; code: string };
  department?: { id: string; name_en: string; name_ar: string };
}

export interface RFQItem {
  id: string;
  rfq_id: string;
  rfi_item_id?: string;
  item_number: number;
  description_en: string;
  description_ar: string;
  quantity: number;
  unit: string;
  specifications?: string;
  created_at: string;
}

export interface RFQVendor {
  id: string;
  rfq_id: string;
  vendor_id: string;
  invited_at: string;
  quotation_received: boolean;
  quotation_date?: string;
  quotation_issue_date?: string;
  vendor_response_date?: string;
  quotation_amount?: number;
  total_amount?: number;
  currency?: string;
  validity_days?: number;
  delivery_days?: number;
  payment_terms?: string;
  technical_score?: number;
  commercial_score?: number;
  delivery_score?: number;
  overall_score?: number;
  is_responsive?: boolean;
  is_recommended?: boolean;
  is_selected: boolean;
  deviation_notes?: string;
  notes?: string;
  attachments?: any[];
  vendor?: { id: string; company_name_en: string; company_name_ar: string; code: string };
}

export interface RFQVendorPrice {
  id: string;
  rfq_vendor_id: string;
  rfq_item_id: string;
  unit_price: number;
  total_price: number;
  notes?: string;
}

// Purchase Request Types
export interface PurchaseRequest {
  id: string;
  code: string;
  rfq_id?: string;
  title_en: string;
  title_ar: string;
  description?: string;
  procurement_type: ProcurementType;
  status: ProcurementStatus;
  project_id?: string;
  cost_center_id?: string;
  department_id?: string;
  requested_by?: string;
  vendor_id?: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  justification?: string;
  required_date?: string;
  delivery_address?: string;
  is_locked: boolean;
  locked_at?: string;
  approved_by?: string;
  approved_at?: string;
  workflow_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Relations
  rfq?: { id: string; code: string };
  project?: { id: string; name_en: string; name_ar: string; code: string };
  cost_center?: { id: string; name_en: string; name_ar: string; code: string };
  department?: { id: string; name_en: string; name_ar: string };
  vendor?: { id: string; company_name_en: string; company_name_ar: string; code: string };
}

export interface PurchaseRequestItem {
  id: string;
  pr_id: string;
  rfq_item_id?: string;
  item_number: number;
  description_en: string;
  description_ar: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  specifications?: string;
  created_at: string;
}

// Purchase Order Types
export interface PurchaseOrder {
  id: string;
  code: string;
  pr_id: string;
  title_en: string;
  title_ar: string;
  description?: string;
  procurement_type: ProcurementType;
  status: ProcurementStatus;
  project_id?: string;
  cost_center_id?: string;
  department_id?: string;
  vendor_id: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  pr_total_amount: number;
  payment_terms?: string;
  delivery_terms?: string;
  delivery_date?: string;
  delivery_address?: string;
  terms_conditions?: string;
  issued_by?: string;
  issued_at?: string;
  approved_by?: string;
  approved_at?: string;
  workflow_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Relations
  pr?: { id: string; code: string };
  project?: { id: string; name_en: string; name_ar: string; code: string };
  cost_center?: { id: string; name_en: string; name_ar: string; code: string };
  department?: { id: string; name_en: string; name_ar: string };
  vendor?: { id: string; company_name_en: string; company_name_ar: string; code: string };
}

export interface PurchaseOrderItem {
  id: string;
  po_id: string;
  pr_item_id?: string;
  item_number: number;
  description_en: string;
  description_ar: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  specifications?: string;
  received_quantity: number;
  created_at: string;
}

// Form Data Types
export interface RFIFormData {
  title_en: string;
  title_ar: string;
  description?: string;
  procurement_type: ProcurementType;
  project_id?: string;
  cost_center_id?: string;
  department_id?: string;
  due_date?: string;
  priority: Priority;
  notes?: string;
  assigned_buyer_id?: string;
  service_description?: string;
  service_documents?: any[];
}

export interface RFQFormData {
  title_en: string;
  title_ar: string;
  description?: string;
  procurement_type: ProcurementType;
  rfi_id?: string;
  project_id?: string;
  cost_center_id?: string;
  department_id?: string;
  submission_deadline?: string;
  valid_until?: string;
  terms_conditions?: string;
}

export interface PRFormData {
  title_en: string;
  title_ar: string;
  description?: string;
  procurement_type: ProcurementType;
  rfq_id?: string;
  rfq_id_linked?: string;
  project_id?: string;
  cost_center_id?: string;
  department_id?: string;
  vendor_id?: string;
  justification?: string;
  required_date?: string;
  delivery_address?: string;
  currency?: string;
  subtotal?: number;
  tax_amount?: number;
  total_amount?: number;
  is_exception?: boolean;
  exception_reason?: string;
  exception_attachment?: string;
}

export interface POFormData {
  title_en: string;
  title_ar: string;
  description?: string;
  payment_terms?: string;
  delivery_terms?: string;
  delivery_date?: string;
  delivery_address?: string;
  terms_conditions?: string;
}

export interface ItemFormData {
  description_en: string;
  description_ar: string;
  quantity: number;
  unit: string;
  unit_price?: number;
  total_price?: number;
  specifications?: string;
  rfq_item_id?: string;
}
